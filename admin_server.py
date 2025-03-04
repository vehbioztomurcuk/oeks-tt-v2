import asyncio
import json
import logging
import os
import signal
import sys
from datetime import datetime
import websockets
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import mimetypes
from io import BytesIO
from urllib.parse import urlparse
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('combined_server')

# Load configuration
def load_config():
    try:
        with open('admin_config.json', 'r') as f:
            config = json.load(f)
            # Add default videos_dir if not present
            if 'videos_dir' not in config:
                config['videos_dir'] = 'videos'
            return config
    except FileNotFoundError:
        logger.error("Configuration file not found. Creating default config.")
        default_config = {
            "api_key": "oeks_secret_key_2024",
            "host": "0.0.0.0",
            "ws_port": 8765,
            "http_port": 8080,
            "screenshots_dir": "screenshots",
            "videos_dir": "videos"
        }
        with open('admin_config.json', 'w') as f:
            json.dump(default_config, f, indent=4)
        return default_config

# Ensure screenshots directory exists
def ensure_directories(base_dir, staff_id):
    staff_dir = os.path.join(base_dir, staff_id)
    os.makedirs(staff_dir, exist_ok=True)
    return staff_dir

# HTTP server handler
class HTTPHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        config = load_config()
        screenshots_dir = config.get("screenshots_dir", "screenshots")
        videos_dir = config.get("videos_dir", "videos")
        
        # Serve index.html for root path
        if self.path == "/" or self.path == "/index.html":
            try:
                with open("index.html", "rb") as f:
                    self.send_response(200)
                    self.send_header('Content-type', 'text/html')
                    self.end_headers()
                    self.wfile.write(f.read())
            except FileNotFoundError:
                self.send_response(404)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'Index file not found')
            return
        
        # API endpoint for staff list
        elif self.path == '/api/staff-list':
            response = get_staff_list()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            return
        
        # New API endpoint for staff screenshot history
        elif self.path.startswith('/api/staff-history/'):
            staff_id = self.path.split('/api/staff-history/')[1].split('?')[0]
            
            # Check for query parameters
            query_params = {}
            if '?' in self.path:
                query_string = self.path.split('?')[1]
                for param in query_string.split('&'):
                    if '=' in param:
                        key, value = param.split('=', 1)
                        query_params[key] = value
            
            # Default values
            limit = int(query_params.get('limit', '20'))
            date_filter = query_params.get('date', None)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            # Get staff screenshots directory
            staff_dir = os.path.join(screenshots_dir, staff_id)
            
            if not os.path.exists(staff_dir) or not os.path.isdir(staff_dir):
                self.wfile.write(json.dumps({"error": "Staff directory not found"}).encode())
                return
            
            # Get screenshot files
            screenshot_files = [f for f in os.listdir(staff_dir) if f.endswith('.jpg') and f != 'latest.jpg']
            
            # Apply date filter if provided (format: YYYYMMDD)
            if date_filter:
                screenshot_files = [f for f in screenshot_files if f.startswith(date_filter)]
            
            # Sort by modification time (newest first)
            screenshot_files.sort(key=lambda x: os.path.getmtime(os.path.join(staff_dir, x)), reverse=True)
            
            # Limit results
            screenshot_files = screenshot_files[:limit]
            
            # Build response
            history_items = []
            for file in screenshot_files:
                file_path = os.path.join(staff_dir, file)
                timestamp = datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                history_items.append({
                    "filename": file,
                    "path": f"/screenshots/{staff_id}/{file}",
                    "timestamp": timestamp
                })
            
            # Get available dates for filtering
            all_dates = set()
            for file in os.listdir(staff_dir):
                if file.endswith('.jpg') and file != 'latest.jpg' and len(file) >= 8:
                    date_part = file[:8]  # Extract YYYYMMDD part
                    if date_part.isdigit() and len(date_part) == 8:
                        all_dates.add(date_part)
            
            response = {
                "staffId": staff_id,
                "history": history_items,
                "availableDates": sorted(list(all_dates), reverse=True)
            }
            
            self.wfile.write(json.dumps(response).encode())
            return
        
        # Serve static files (screenshots)
        elif self.path.startswith('/screenshots/'):
            # Parse URL to extract path without query string
            parsed_url = urlparse(self.path)
            clean_path = parsed_url.path[1:]  # Remove leading slash but keep only the path
            file_path = os.path.join(os.getcwd(), clean_path)
            
            logger.info(f"Request for screenshot file: {self.path}, serving from: {file_path}")
            
            if os.path.exists(file_path) and os.path.isfile(file_path):
                self.send_response(200)
                
                # Determine content type
                content_type, _ = mimetypes.guess_type(file_path)
                if content_type:
                    self.send_header('Content-type', content_type)
                else:
                    self.send_header('Content-type', 'application/octet-stream')
                    
                # Important headers for images
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.send_header('Pragma', 'no-cache')
                self.send_header('Expires', '0')
                self.end_headers()
                
                try:
                    with open(file_path, 'rb') as f:
                        image_data = f.read()
                        self.wfile.write(image_data)
                        logger.info(f"Successfully served image file: {file_path} ({len(image_data)} bytes)")
                except Exception as e:
                    logger.error(f"Error reading file {file_path}: {e}")
                    self.wfile.write(b"Error reading file")
                return
            else:
                # Check if file exists without 'latest.jpg'
                if file_path.endswith('latest.jpg'):
                    staff_dir = os.path.dirname(file_path)
                    if os.path.exists(staff_dir) and os.path.isdir(staff_dir):
                        # Look for latest jpg file in directory
                        screenshot_files = [f for f in os.listdir(staff_dir) if f.endswith('.jpg') and f != 'latest.jpg']
                        if screenshot_files:
                            # Sort by modification time (newest first)
                            screenshot_files.sort(key=lambda x: os.path.getmtime(os.path.join(staff_dir, x)), reverse=True)
                            latest_file = screenshot_files[0]
                            latest_path = os.path.join(staff_dir, latest_file)
                            
                            # Create or update the latest.jpg symlink/copy
                            try:
                                if os.path.exists(file_path):
                                    os.remove(file_path)
                                if hasattr(os, 'symlink'):
                                    os.symlink(latest_file, file_path)
                                else:
                                    # If symlinks not supported, just copy the file
                                    with open(latest_path, 'rb') as src, open(file_path, 'wb') as dst:
                                        dst.write(src.read())
                                logger.info(f"Created/updated latest.jpg for {os.path.basename(staff_dir)}")
                                
                                # Now serve the file we just created
                                self.send_response(200)
                                self.send_header('Content-type', 'image/jpeg')
                                self.send_header('Access-Control-Allow-Origin', '*')
                                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                                self.end_headers()
                                
                                with open(file_path, 'rb') as f:
                                    image_data = f.read()
                                    self.wfile.write(image_data)
                                    logger.info(f"Successfully served newly created latest.jpg ({len(image_data)} bytes)")
                                return
                            except Exception as e:
                                logger.error(f"Error creating latest.jpg: {e}")
                
                logger.warning(f"Screenshot file not found: {file_path}")
                # Return 404 instead of a placeholder image
                self.send_response(404)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b"Screenshot not found")
                return
        
        # Handle CSS files
        elif self.path.startswith('/css/'):
            parsed_url = urlparse(self.path)
            clean_path = parsed_url.path[1:]  # Remove leading slash
            file_path = os.path.join(os.getcwd(), clean_path)
            
            logger.info(f"Request for CSS file: {self.path}, serving from: {file_path}")
            
            if os.path.exists(file_path) and os.path.isfile(file_path):
                self.send_response(200)
                self.send_header('Content-type', 'text/css')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                try:
                    with open(file_path, 'rb') as f:
                        self.wfile.write(f.read())
                        logger.info(f"Successfully served CSS file: {file_path}")
                except Exception as e:
                    logger.error(f"Error reading CSS file {file_path}: {e}")
                    self.wfile.write(b"Error reading file")
                return
            else:
                logger.warning(f"CSS file not found: {file_path}")
                self.send_response(404)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'CSS file not found')
                return
                
        # Handle JavaScript files
        elif self.path.startswith('/js/'):
            parsed_url = urlparse(self.path)
            clean_path = parsed_url.path[1:]  # Remove leading slash
            file_path = os.path.join(os.getcwd(), clean_path)
            
            logger.info(f"Request for JavaScript file: {self.path}, serving from: {file_path}")
            
            if os.path.exists(file_path) and os.path.isfile(file_path):
                self.send_response(200)
                self.send_header('Content-type', 'application/javascript')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                try:
                    with open(file_path, 'rb') as f:
                        self.wfile.write(f.read())
                        logger.info(f"Successfully served JavaScript file: {file_path}")
                except Exception as e:
                    logger.error(f"Error reading JavaScript file {file_path}: {e}")
                    self.wfile.write(b"Error reading file")
                return
            else:
                logger.warning(f"JavaScript file not found: {file_path}")
                self.send_response(404)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'JavaScript file not found')
                return
        
        # Add new endpoint for video streaming - improved to handle direct video files
        elif self.path.startswith('/videos/'):
            parsed_url = urlparse(self.path)
            clean_path = parsed_url.path[1:]
            file_path = os.path.join(os.getcwd(), clean_path)
            
            # Log the requested video path for debugging
            logger.info(f"Video request: {self.path}, file path: {file_path}")
            
            # Check if the path includes 'latest.mp4'
            if 'latest.mp4' in file_path:
                # Extract the staff_id
                parts = clean_path.split('/')
                if len(parts) >= 2:
                    staff_id = parts[1]
                    
                    # First check in staff subdirectory
                    staff_dir = os.path.join(videos_dir, staff_id)
                    logger.info(f"Looking for latest video for staff {staff_id} in {staff_dir}")
                    
                    if os.path.exists(staff_dir) and os.path.isdir(staff_dir):
                        # Find the latest MP4 file
                        video_files = [f for f in os.listdir(staff_dir) if f.endswith('.mp4')]
                        if video_files:
                            # Sort by modification time (newest first)
                            video_files.sort(key=lambda x: os.path.getmtime(os.path.join(staff_dir, x)), reverse=True)
                            latest_video = video_files[0]
                            file_path = os.path.join(staff_dir, latest_video)
                            logger.info(f"Found latest video: {latest_video}")
                        else:
                            logger.warning(f"No video files found for staff {staff_id} in subfolder")
                            
                            # Now check main videos directory for files starting with staff_id
                            matching_files = [f for f in os.listdir(videos_dir) 
                                            if f.endswith('.mp4') and f.startswith(f"{staff_id}-") 
                                            and os.path.isfile(os.path.join(videos_dir, f))]
                            
                            if matching_files:
                                # Sort by modification time (newest first)
                                matching_files.sort(key=lambda x: os.path.getmtime(os.path.join(videos_dir, x)), reverse=True)
                                latest_video = matching_files[0]
                                file_path = os.path.join(videos_dir, latest_video)
                                logger.info(f"Found latest video in main directory: {latest_video}")
                            else:
                                logger.warning(f"No video files found for staff {staff_id} in main directory")
                    else:
                        logger.warning(f"Staff video directory does not exist: {staff_dir}")
                        
                    # Always try directly in videos directory since that's how staff_app.py saves them
                    matching_files = [f for f in os.listdir(videos_dir) 
                                    if f.endswith('.mp4') and f.startswith(f"{staff_id}-") 
                                    and os.path.isfile(os.path.join(videos_dir, f))]
                    
                    if matching_files:
                        # Sort by modification time (newest first)
                        matching_files.sort(key=lambda x: os.path.getmtime(os.path.join(videos_dir, x)), reverse=True)
                        latest_video = matching_files[0]
                        file_path = os.path.join(videos_dir, latest_video)
                        logger.info(f"Found latest video in videos directory: {latest_video}")
                    else:
                        logger.warning(f"No video files found for staff {staff_id} anywhere")
            # Handle case of direct video file request (not "latest.mp4")
            elif clean_path.count('/') == 1 and clean_path.endswith('.mp4'):
                # This could be a direct reference to a video file in the root videos directory
                # like /videos/staff_id-MM-DD-YYYY.mp4
                video_filename = os.path.basename(clean_path)
                direct_file_path = os.path.join(videos_dir, video_filename)
                
                if os.path.exists(direct_file_path) and os.path.isfile(direct_file_path):
                    logger.info(f"Found direct video file: {direct_file_path}")
                    file_path = direct_file_path
                
            # Check if file exists
            if os.path.exists(file_path) and os.path.isfile(file_path):
                try:
                    file_size = os.path.getsize(file_path)
                    self.send_response(200)
                    self.send_header('Content-Type', 'video/mp4')
                    self.send_header('Content-Length', str(file_size))
                    self.send_header('Accept-Ranges', 'bytes')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                    self.end_headers()
                    
                    with open(file_path, 'rb') as f:
                        self.wfile.write(f.read())
                    logger.info(f"Successfully served video: {file_path}")
                except Exception as e:
                    logger.error(f"Error streaming video {file_path}: {e}")
                    self.send_error(500, "Internal Server Error")
            else:
                # Return 404 for missing videos
                logger.warning(f"Video file not found: {file_path}")
                self.send_response(404)
                self.send_header('Content-type', 'text/plain')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b"Video not found")
            return
        
        # Default - return 404
        self.send_response(404)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'Not Found')
    
    def do_HEAD(self):
        """Handle HEAD requests - needed for video loading checks by browsers"""
        parsed_url = urlparse(self.path)
        clean_path = parsed_url.path[1:]
        
        # Handle video files HEAD request
        if self.path.startswith('/videos/'):
            file_path = os.path.join(os.getcwd(), clean_path)
            videos_dir = config.get("videos_dir", "videos")
            
            # Process the path to find the actual video file, similar to do_GET
            if 'latest.mp4' in file_path:
                # Extract the staff_id
                parts = clean_path.split('/')
                if len(parts) >= 2:
                    staff_id = parts[1]
                    
                    # First check in staff subdirectory
                    staff_dir = os.path.join(videos_dir, staff_id)
                    if os.path.exists(staff_dir) and os.path.isdir(staff_dir):
                        video_files = [f for f in os.listdir(staff_dir) if f.endswith('.mp4')]
                        if video_files:
                            video_files.sort(key=lambda x: os.path.getmtime(os.path.join(staff_dir, x)), reverse=True)
                            latest_video = video_files[0]
                            file_path = os.path.join(staff_dir, latest_video)
                    
                    # If not found in staff dir, check main videos directory
                    if not os.path.exists(file_path) or not os.path.isfile(file_path):
                        matching_files = [f for f in os.listdir(videos_dir) 
                                        if f.endswith('.mp4') and f.startswith(f"{staff_id}-") 
                                        and os.path.isfile(os.path.join(videos_dir, f))]
                        
                        if matching_files:
                            matching_files.sort(key=lambda x: os.path.getmtime(os.path.join(videos_dir, x)), reverse=True)
                            latest_video = matching_files[0]
                            file_path = os.path.join(videos_dir, latest_video)
            
            # Handle direct video file request (not "latest.mp4")
            elif clean_path.count('/') == 1 and clean_path.endswith('.mp4'):
                video_filename = os.path.basename(clean_path)
                direct_file_path = os.path.join(videos_dir, video_filename)
                
                if os.path.exists(direct_file_path) and os.path.isfile(direct_file_path):
                    file_path = direct_file_path
            
            # Send appropriate HEAD response
            if os.path.exists(file_path) and os.path.isfile(file_path):
                file_size = os.path.getsize(file_path)
                self.send_response(200)
                self.send_header('Content-Type', 'video/mp4')
                self.send_header('Content-Length', str(file_size))
                self.send_header('Accept-Ranges', 'bytes')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.end_headers()
            else:
                self.send_response(404)
                self.send_header('Content-type', 'text/plain')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
        else:
            # For non-video HEAD requests
            self.send_response(200)
            self.end_headers()
    
    def log_message(self, format, *args):
        logger.info("%s - %s" % (self.address_string(), format % args))

# WebSocket server handler
async def handle_client(websocket):
    config = load_config()
    api_key = config["api_key"]
    screenshots_dir = config["screenshots_dir"]
    videos_dir = config["videos_dir"]
    
    staff_id = None
    name = None
    division = None
    authenticated = False
    
    try:
        # Authentication
        message = await websocket.recv()
        data = json.loads(message)
        
        if data.get("type") == "auth":
            if data.get("api_key") == api_key:
                staff_id = data.get("staff_id")
                name = data.get("name", "Unknown User")
                division = data.get("division", "Unassigned")
                authenticated = True
                await websocket.send(json.dumps({
                    "status": "authenticated",
                    "message": "Authentication successful"
                }))
                logger.info(f"Staff member {name} ({staff_id}) from {division} authenticated")
            else:
                await websocket.send(json.dumps({
                    "status": "error",
                    "message": "Invalid API key"
                }))
                logger.warning(f"Failed authentication attempt from {websocket.remote_address}")
                return
        
        if not authenticated or not staff_id:
            return
            
        # Ensure staff directories exist
        staff_screenshots_dir = ensure_directories(screenshots_dir, staff_id)
        staff_videos_dir = ensure_directories(videos_dir, staff_id)
        
        # Create metadata file
        metadata_file = os.path.join(staff_screenshots_dir, "metadata.json")
        staff_metadata = {
            "staff_id": staff_id,
            "name": name,
            "division": division,
            "last_connected": datetime.now().isoformat(),
            "activity_status": "active",
            "last_activity": datetime.now().isoformat()
        }
        
        with open(metadata_file, "w") as f:
            json.dump(staff_metadata, f, indent=4)
        
        # Main message loop
        while True:
            metadata_msg = await websocket.recv()
            metadata = json.loads(metadata_msg)
            
            if metadata.get("type") == "metadata":
                timestamp = metadata.get("timestamp")
                video_file = metadata.get("video_file")
                activity_status = metadata.get("recording_status", "active")
                
                # Update staff metadata
                with open(metadata_file, "r") as f:
                    staff_metadata = json.load(f)
                
                staff_metadata["last_activity"] = datetime.now().isoformat()
                staff_metadata["activity_status"] = activity_status
                staff_metadata["current_video"] = video_file if video_file else None
                
                with open(metadata_file, "w") as f:
                    json.dump(staff_metadata, f, indent=4)
                
                logger.debug(f"Updated metadata for {name} ({staff_id})")
                
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"Connection closed for staff {staff_id}")
    except json.JSONDecodeError:
        logger.error("Invalid JSON received")
    except Exception as e:
        logger.error(f"Error handling client: {e}")
    finally:
        if staff_id:
            # Update metadata to show inactive status
            try:
                metadata_file = os.path.join(screenshots_dir, staff_id, "metadata.json")
                if os.path.exists(metadata_file):
                    with open(metadata_file, "r") as f:
                        staff_metadata = json.load(f)
                    staff_metadata["activity_status"] = "inactive"
                    staff_metadata["last_activity"] = datetime.now().isoformat()
                    with open(metadata_file, "w") as f:
                        json.dump(staff_metadata, f, indent=4)
            except Exception as e:
                logger.error(f"Error updating metadata on disconnect: {e}")

# HTTP server thread
class HTTPServerThread(threading.Thread):
    def __init__(self, host, port):
        threading.Thread.__init__(self)
        self.host = host
        self.port = port
        self.server = None
        self.daemon = True
        
    def run(self):
        try:
            handler = HTTPHandler
            self.server = HTTPServer((self.host, self.port), handler)
            logger.info(f"HTTP server starting on http://{self.host}:{self.port}")
            self.server.serve_forever()
        except Exception as e:
            logger.error(f"HTTP server error: {e}")
        
    def stop(self):
        if self.server:
            self.server.shutdown()

# Main server
async def run_server():
    config = load_config()
    host = config["host"]
    ws_port = config["ws_port"]
    http_port = config["http_port"]
    
    # Ensure directories exist
    screenshots_dir = config["screenshots_dir"]
    videos_dir = config["videos_dir"]
    os.makedirs(screenshots_dir, exist_ok=True)
    os.makedirs(videos_dir, exist_ok=True)
    
    # Start HTTP server in a separate thread
    http_server = HTTPServerThread(host, http_port)
    http_server.start()
    
    # Start WebSocket server
    stop = asyncio.Future()
    async with websockets.serve(handle_client, host, ws_port):
        logger.info(f"WebSocket server started on ws://{host}:{ws_port}")
        await stop
        
    # Clean up
    http_server.stop()

# Handle graceful shutdown
def signal_handler(sig, frame):
    logger.info("Shutting down...")
    asyncio.get_event_loop().stop()
    sys.exit(0)

# Update the staff list API to include video information
def get_staff_list():
    config = load_config()
    videos_dir = config.get("videos_dir", "videos")
    screenshots_dir = config.get("screenshots_dir", "screenshots")
    
    # Add more detailed logging
    logger.info(f"Looking for videos in directory: {os.path.abspath(videos_dir)}")
    if os.path.exists(videos_dir):
        logger.info(f"Video directory exists, contents: {os.listdir(videos_dir)}")
        for subdir in [d for d in os.listdir(videos_dir) if os.path.isdir(os.path.join(videos_dir, d))]:
            subdir_path = os.path.join(videos_dir, subdir)
            logger.info(f"Checking subdirectory: {subdir_path}, contents: {os.listdir(subdir_path) if os.path.exists(subdir_path) else 'not found'}")
    else:
        logger.error(f"Video directory does not exist: {os.path.abspath(videos_dir)}")
    
    response = {
        "staffList": [],
        "staffData": {}
    }
    
    # Even if we don't find any videos, let's add some default entries for debugging
    response["staffList"].append("staff_pc_141")
    response["staffData"]["staff_pc_141"] = {
        "name": "Vehbi OZTOMURCUK",
        "division": "Marketing",
        "recording_status": "active",
        "timestamp": datetime.now().isoformat(),
        "video_path": None  # We'll set this to a real path if we find videos
    }
    
    try:
        # Check videos directory for both traditional staff folders and direct video files
        if os.path.exists(videos_dir):
            # First check for videos directly in the videos directory (without staff subfolders)
            direct_video_files = [f for f in os.listdir(videos_dir) 
                                if f.endswith('.mp4') and os.path.isfile(os.path.join(videos_dir, f))]
            
            logger.info(f"Found {len(direct_video_files)} MP4 files in main videos directory: {direct_video_files}")
            
            # Process direct video files
            for video_file in direct_video_files:
                # Extract staff_id from filename (staff_id-MM-DD-YYYY.mp4)
                parts = video_file.split('-')
                if len(parts) >= 2:
                    # Handle staff IDs that might contain dashes themselves
                    staff_id_parts = parts[:-3]  # All parts except the last 3 (MM-DD-YYYY.mp4)
                    if not staff_id_parts:
                        continue
                        
                    staff_id = '-'.join(staff_id_parts)
                    
                    # Only process if it looks like a valid staff ID format
                    if staff_id:
                        # Initialize video_path to null
                        video_path = None
                        
                        # Check if the video file actually exists before setting a path
                        video_file_path = os.path.join(videos_dir, video_file)
                        if os.path.exists(video_file_path) and os.path.isfile(video_file_path):
                            video_path = f"/videos/{video_file}?t={int(time.time())}"
                            logger.info(f"Found video for staff {staff_id}: {video_file}")
                        else:
                            logger.warning(f"Video file referenced but not found: {video_file_path}")
                        
                        # Get metadata from screenshots directory
                        metadata_file = os.path.join(screenshots_dir, staff_id, "metadata.json")
                        metadata = {
                            "name": "Unknown User",
                            "division": "Unassigned",
                            "activity_status": "inactive",
                            "timestamp": datetime.now().isoformat()
                        }
                        
                        if os.path.exists(metadata_file):
                            try:
                                with open(metadata_file, "r") as f:
                                    metadata.update(json.load(f))
                            except:
                                logger.error(f"Error reading metadata for {staff_id}")
                        
                        # Add to response
                        if staff_id not in response["staffList"]:
                            response["staffList"].append(staff_id)
                        
                        response["staffData"][staff_id] = {
                            "name": metadata.get("name", "Unknown User"),
                            "division": metadata.get("division", "Unassigned"),
                            "recording_status": metadata.get("activity_status", "inactive"),
                            "timestamp": metadata.get("last_activity", datetime.now().isoformat()),
                            "video_path": video_path
                        }
                        
                        # Log the video path for debugging
                        logger.info(f"Staff {staff_id} video path set to: {video_path}")
            
            # Then check for traditional staff subfolders
            for staff_id in [d for d in os.listdir(videos_dir) if os.path.isdir(os.path.join(videos_dir, d))]:
                staff_dir = os.path.join(videos_dir, staff_id)
                
                # Get latest video file
                video_files = [f for f in os.listdir(staff_dir) if f.endswith('.mp4')]
                latest_video = None
                video_path = None
                
                if video_files:
                    # Sort by modification time (newest first)
                    video_files.sort(key=lambda x: os.path.getmtime(os.path.join(staff_dir, x)), reverse=True)
                    latest_video = video_files[0]
                    video_path = f"/videos/{staff_id}/{latest_video}?t={int(time.time())}"
                    
                # Skip if already processed
                if staff_id in response["staffList"]:
                    continue
                    
                # Get metadata from screenshots directory
                metadata_file = os.path.join(screenshots_dir, staff_id, "metadata.json")
                metadata = {
                    "name": "Unknown User",
                    "division": "Unassigned",
                    "activity_status": "inactive",
                    "timestamp": datetime.now().isoformat()
                }
                
                if os.path.exists(metadata_file):
                    try:
                        with open(metadata_file, "r") as f:
                            metadata.update(json.load(f))
                    except:
                        logger.error(f"Error reading metadata for {staff_id}")
                
                response["staffList"].append(staff_id)
                response["staffData"][staff_id] = {
                    "name": metadata.get("name", "Unknown User"),
                    "division": metadata.get("division", "Unassigned"),
                    "recording_status": metadata.get("activity_status", "inactive"),
                    "timestamp": metadata.get("last_activity", datetime.now().isoformat()),
                    "video_path": video_path
                }
        
        # Also check screenshots directory for any staff without videos
        if os.path.exists(screenshots_dir):
            for staff_id in os.listdir(screenshots_dir):
                staff_dir = os.path.join(screenshots_dir, staff_id)
                if not os.path.isdir(staff_dir):
                    continue
                
                # Skip if already processed from videos dir
                if staff_id in response["staffList"]:
                    continue
                
                metadata_file = os.path.join(staff_dir, "metadata.json")
                metadata = {
                    "name": "Unknown User",
                    "division": "Unassigned",
                    "activity_status": "inactive",
                    "timestamp": datetime.now().isoformat()
                }
                
                if os.path.exists(metadata_file):
                    try:
                        with open(metadata_file, "r") as f:
                            metadata.update(json.load(f))
                    except:
                        logger.error(f"Error reading metadata for {staff_id}")
                
                # Check for videos in the main videos directory for this staff ID
                matching_files = []
                if os.path.exists(videos_dir):
                    matching_files = [f for f in os.listdir(videos_dir) 
                                    if f.endswith('.mp4') and f.startswith(f"{staff_id}-") 
                                    and os.path.isfile(os.path.join(videos_dir, f))]
                
                video_path = None
                if matching_files:
                    # Sort by modification time (newest first)
                    matching_files.sort(key=lambda x: os.path.getmtime(os.path.join(videos_dir, x)), reverse=True)
                    latest_video = matching_files[0]
                    video_path = f"/videos/{latest_video}?t={int(time.time())}"
                    logger.info(f"Found video for staff {staff_id} in main directory: {latest_video}")
                
                response["staffList"].append(staff_id)
                response["staffData"][staff_id] = {
                    "name": metadata.get("name", "Unknown User"),
                    "division": metadata.get("division", "Unassigned"),
                    "recording_status": metadata.get("activity_status", "inactive"),
                    "timestamp": metadata.get("last_activity", datetime.now().isoformat()),
                    "video_path": video_path  # Now this could be a real path or None
                }
    
    except Exception as e:
        logger.error(f"Error getting staff list: {e}")
    
    return response

if __name__ == "__main__":
    logger.info("OEKS Team Tracker - Combined Server starting...")
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Run the server
    asyncio.run(run_server()) 