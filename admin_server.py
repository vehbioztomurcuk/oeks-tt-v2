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
            return json.load(f)
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
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            staff_list = []
            staff_data = {}
            
            # Check screenshots directory
            if os.path.exists(screenshots_dir):
                for staff_id in os.listdir(screenshots_dir):
                    staff_dir = os.path.join(screenshots_dir, staff_id)
                    
                    if os.path.isdir(staff_dir):
                        staff_list.append(staff_id)
                        
                        # Get staff metadata if available
                        name = "Unknown User"
                        division = "Unassigned"
                        activity_status = "unknown"
                        last_activity = None
                        
                        metadata_file = os.path.join(staff_dir, "metadata.json")
                        if os.path.exists(metadata_file):
                            try:
                                with open(metadata_file, "r") as f:
                                    staff_metadata = json.load(f)
                                    name = staff_metadata.get("name", name)
                                    division = staff_metadata.get("division", division)
                                    
                                    # Get activity status or calculate it
                                    activity_status = staff_metadata.get("activity_status", "unknown")
                                    last_activity_str = staff_metadata.get("last_activity")
                                    
                                    if last_activity_str:
                                        try:
                                            last_activity = datetime.fromisoformat(last_activity_str)
                                            # Calculate inactive status if not seen for over 1 minute
                                            time_diff = (datetime.now() - last_activity).total_seconds()
                                            if time_diff > 60:
                                                activity_status = "inactive"
                                        except ValueError:
                                            logger.error(f"Invalid timestamp format in metadata for {staff_id}")
                            except (json.JSONDecodeError, IOError) as e:
                                logger.error(f"Error reading metadata for {staff_id}: {e}")
                        
                        # Find the latest screenshot for this staff member
                        screenshot_files = [f for f in os.listdir(staff_dir) if f.endswith('.jpg') and f != 'latest.jpg']
                        
                        if screenshot_files:
                            # Sort by modification time (newest first)
                            screenshot_files.sort(key=lambda x: os.path.getmtime(os.path.join(staff_dir, x)), reverse=True)
                            latest_file = screenshot_files[0]
                            file_path = os.path.join(staff_dir, latest_file)
                            
                            # Create link to the latest file
                            latest_link = os.path.join(staff_dir, 'latest.jpg')
                            try:
                                if os.path.exists(latest_link):
                                    os.remove(latest_link)
                                if hasattr(os, 'symlink'):
                                    os.symlink(latest_file, latest_link)
                                else:
                                    # If symlinks not supported, just copy the file
                                    with open(file_path, 'rb') as src, open(latest_link, 'wb') as dst:
                                        dst.write(src.read())
                                logger.info(f"Updated latest.jpg for {staff_id}")
                            except Exception as e:
                                logger.error(f"Failed to create latest.jpg: {e}")
                            
                            # Get modified time as ISO string
                            mod_time = datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                            
                            staff_data[staff_id] = {
                                "path": f"/screenshots/{staff_id}/latest.jpg",
                                "timestamp": mod_time,
                                "name": name,
                                "division": division,
                                "activity_status": activity_status
                            }
            
            # Check videos directory
            if os.path.exists(videos_dir):
                for staff_id in os.listdir(videos_dir):
                    staff_dir = os.path.join(videos_dir, staff_id)
                    
                    if os.path.isdir(staff_dir):
                        staff_list.append(staff_id)
                        
                        # Get latest video file
                        video_files = [f for f in os.listdir(staff_dir) if f.endswith('.mp4')]
                        if video_files:
                            latest_video = max(video_files, key=lambda x: os.path.getmtime(os.path.join(staff_dir, x)))
                            video_path = os.path.join(staff_dir, latest_video)
                            
                            # Get metadata
                            metadata_file = os.path.join(staff_dir, "metadata.json")
                            name = "Unknown User"
                            division = "Unassigned"
                            recording_status = "unknown"
                            
                            if os.path.exists(metadata_file):
                                try:
                                    with open(metadata_file, "r") as f:
                                        metadata = json.load(f)
                                        name = metadata.get("name", name)
                                        division = metadata.get("division", division)
                                        recording_status = metadata.get("recording_status", "unknown")
                                except:
                                    logger.error(f"Error reading metadata for {staff_id}")
                            
                            staff_data[staff_id] = {
                                "video_path": f"/videos/{staff_id}/{latest_video}",
                                "timestamp": datetime.fromtimestamp(os.path.getmtime(video_path)).isoformat(),
                                "name": name,
                                "division": division,
                                "recording_status": recording_status
                            }
            
            response = {
                "staffList": staff_list,
                "staffData": staff_data
            }
            
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
        
        # Add new endpoint for video streaming
        elif self.path.startswith('/videos/'):
            parsed_url = urlparse(self.path)
            clean_path = parsed_url.path[1:]
            file_path = os.path.join(os.getcwd(), clean_path)
            
            if os.path.exists(file_path) and os.path.isfile(file_path):
                try:
                    file_size = os.path.getsize(file_path)
                    self.send_response(200)
                    self.send_header('Content-Type', 'video/mp4')
                    self.send_header('Content-Length', str(file_size))
                    self.send_header('Accept-Ranges', 'bytes')
                    self.end_headers()
                    
                    with open(file_path, 'rb') as f:
                        self.wfile.write(f.read())
                except Exception as e:
                    logger.error(f"Error streaming video {file_path}: {e}")
                    self.send_error(500, "Internal Server Error")
                return
        
        # Default - return 404
        self.send_response(404)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'Not Found')
    
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
        
        if not authenticated:
            return
            
        # Ensure staff directory exists
        staff_dir = ensure_directories(screenshots_dir, staff_id)
        
        # Create metadata file if it doesn't exist
        metadata_file = os.path.join(staff_dir, "metadata.json")
        staff_metadata = {
            "staff_id": staff_id,
            "name": name,
            "division": division,
            "last_connected": datetime.now().isoformat(),
            "activity_status": "active",  # Default status
            "last_activity": datetime.now().isoformat()
        }
        
        with open(metadata_file, "w") as f:
            json.dump(staff_metadata, f, indent=4)
        
        # Main message loop
        while True:
            # Receive metadata first
            metadata_msg = await websocket.recv()
            metadata = json.loads(metadata_msg)
            
            if metadata.get("type") == "metadata":
                timestamp = metadata.get("timestamp")
                activity_status = metadata.get("activity_status", "active")
                
                # Update the staff metadata with new activity status
                with open(metadata_file, "r") as f:
                    staff_metadata = json.load(f)
                
                staff_metadata["last_activity"] = datetime.now().isoformat()
                staff_metadata["activity_status"] = activity_status
                
                with open(metadata_file, "w") as f:
                    json.dump(staff_metadata, f, indent=4)
                
                logger.debug(f"Preparing to receive image from {name} ({staff_id}) in {division}, timestamp: {timestamp}, status: {activity_status}")
                
                # Receive the actual image
                image_data = await websocket.recv()
                
                # Save the image
                filename = f"{timestamp}.jpg"
                filepath = os.path.join(staff_dir, filename)
                
                logger.debug(f"Saving image to {filepath}")
                with open(filepath, "wb") as f:
                    f.write(image_data)
                
                logger.info(f"Screenshot saved from {name} ({staff_id}) in {division} ({len(image_data)/1024:.1f} KB)")
                
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"Connection closed for staff {staff_id}")
    except json.JSONDecodeError:
        logger.error("Invalid JSON received")
    except Exception as e:
        logger.error(f"Error handling client: {e}")

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
    
    # Ensure screenshots directory exists
    screenshots_dir = config["screenshots_dir"]
    os.makedirs(screenshots_dir, exist_ok=True)
    
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

if __name__ == "__main__":
    logger.info("OEKS Team Tracker - Combined Server starting...")
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Run the server
    asyncio.run(run_server()) 