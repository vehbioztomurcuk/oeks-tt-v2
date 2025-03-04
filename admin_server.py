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
from urllib.parse import urlparse, parse_qsl
import time
import shutil

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
        """Handle GET requests"""
        try:
            # Parse URL
            parsed_url = urlparse(self.path)
            path = parsed_url.path
            
            # Serve index.html
            if path == "/" or path == "":
                self.serve_file("index.html", "text/html")
                return
            
            # API endpoints
            elif path.startswith("/api/"):
                self.handle_api_request(path)
                return
            
            # Handle CSS files
            elif path.startswith("/css/"):
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
            elif path.startswith("/js/"):
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
            
            # Handle video files
            elif path.startswith("/videos/"):
                clean_path = parsed_url.path[1:]  # Remove leading slash
                file_path = os.path.join(os.getcwd(), clean_path)
                
                logger.info(f"Request for video file: {path}, serving from: {file_path}")
                
                if os.path.exists(file_path) and os.path.isfile(file_path):
                    self.send_response(200)
                    self.send_header('Content-type', 'video/mp4')
                    self.send_header('Content-Length', str(os.path.getsize(file_path)))
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                    self.end_headers()
                    
                    try:
                        with open(file_path, 'rb') as f:
                            self.wfile.write(f.read())
                        logger.info(f"Successfully served video file: {file_path}")
                    except Exception as e:
                        logger.error(f"Error reading video file {file_path}: {e}")
                    return
                else:
                    logger.warning(f"Video file not found: {file_path}")
                    self.send_response(404)
                    self.send_header('Content-type', 'text/plain')
                    self.end_headers()
                    self.wfile.write(b'Video file not found')
                    return
                
            # Serve other static files
            else:
                # Assume it's a static file (strip leading /)
                file_path = path[1:] if path.startswith('/') else path
                
                # Default to index.html if no file is specified
                if not file_path:
                    file_path = "index.html"
                
                if os.path.exists(file_path) and os.path.isfile(file_path):
                    # Determine content type based on file extension
                    content_type = 'application/octet-stream'  # Default
                    if file_path.endswith('.html'):
                        content_type = 'text/html'
                    elif file_path.endswith('.jpg') or file_path.endswith('.jpeg'):
                        content_type = 'image/jpeg'
                    elif file_path.endswith('.png'):
                        content_type = 'image/png'
                    elif file_path.endswith('.css'):
                        content_type = 'text/css'
                    elif file_path.endswith('.js'):
                        content_type = 'application/javascript'
                    
                    self.send_response(200)
                    self.send_header('Content-type', content_type)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    
                    with open(file_path, 'rb') as f:
                        self.wfile.write(f.read())
                else:
                    # File not found
                    self.send_response(404)
                    self.send_header('Content-type', 'text/html')
                    self.end_headers()
                    self.wfile.write(b'404 - File Not Found')
        
        except Exception as e:
            logger.error(f"Error handling GET request: {e}")
            self.send_response(500)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(f"500 - Internal Server Error: {str(e)}".encode())

    def do_HEAD(self):
        """Handle HEAD requests for video files"""
        try:
            parsed_url = urlparse(self.path)
            path = parsed_url.path
            
            # Handle video files
            if path.startswith("/videos/"):
                clean_path = parsed_url.path[1:]  # Remove leading slash
                file_path = os.path.join(os.getcwd(), clean_path)
                
                logger.info(f"HEAD request for video file: {path}, checking: {file_path}")
                
                if os.path.exists(file_path) and os.path.isfile(file_path):
                    self.send_response(200)
                    self.send_header('Content-type', 'video/mp4')
                    self.send_header('Content-Length', str(os.path.getsize(file_path)))
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                    self.end_headers()
                    logger.info(f"HEAD request successful for video file: {file_path}")
                else:
                    logger.warning(f"Video file not found for HEAD request: {file_path}")
                    self.send_response(404)
                    self.send_header('Content-type', 'text/plain')
                    self.end_headers()
            else:
                # For all other HEAD requests
                self.send_response(200)
                self.end_headers()
        
        except Exception as e:
            logger.error(f"Error handling HEAD request: {e}")
            self.send_response(500)
            self.end_headers()

    def handle_api_request(self, path):
        """Handle API endpoints"""
        if path == "/api/staff-list":
            # Get staff list
            staff_list = get_staff_list()
            
            # Format for the frontend
            staff_response = {
                "staffList": [],
                "staffData": {}
            }
            
            for staff in staff_list:
                staff_id = staff["staff_id"]
                staff_response["staffList"].append(staff_id)
                staff_response["staffData"][staff_id] = {
                    "name": staff["name"],
                    "division": staff["division"],
                    "recording_status": staff["activity_status"],
                    "timestamp": staff.get("last_activity", datetime.now().isoformat()),
                    "video_path": staff["video_path"]
                }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(staff_response).encode())
        
        elif path == "/api/history":
            # Parse query parameters
            query = urlparse(self.path).query
            params = dict(parse_qsl(query))
            staff_id = params.get("staff_id")
            
            if not staff_id:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing staff_id parameter"}).encode())
                return
            
            # Get history for the staff member
            history_data = self.get_staff_history(staff_id)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(history_data).encode())
        
        else:
            # Unknown API endpoint
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "API endpoint not found"}).encode())

    def log_message(self, format, *args):
        logger.info("%s - %s" % (self.address_string(), format % args))

    def serve_file(self, file_path, content_type):
        """Helper method to serve a file with appropriate headers"""
        if os.path.exists(file_path) and os.path.isfile(file_path):
            self.send_response(200)
            self.send_header('Content-type', content_type)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            try:
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
                logger.info(f"Successfully served file: {file_path}")
            except Exception as e:
                logger.error(f"Error reading file {file_path}: {e}")
                self.wfile.write(b"Error reading file")
            return True
        else:
            logger.warning(f"File not found: {file_path}")
            self.send_response(404)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(f"404 - File Not Found: {file_path}".encode())
            return False

    def get_staff_history(self, staff_id):
        """Get history data for a staff member"""
        history_data = {
            "staffId": staff_id,
            "history": [],
            "availableDates": []
        }
        
        videos_dir = config["videos_dir"]
        staff_dir = os.path.join(videos_dir, staff_id)
        
        # Check if the staff directory exists
        if not os.path.exists(staff_dir) or not os.path.isdir(staff_dir):
            logger.warning(f"Staff directory not found: {staff_dir}")
            return history_data
        
        # Get video files
        video_files = [f for f in os.listdir(staff_dir) if f.endswith('.mp4') and f != 'latest.mp4']
        
        # Get available dates from filenames
        all_dates = set()
        for file in video_files:
            # Extract date from filename if possible (format depends on your naming convention)
            try:
                # Assuming filename format is staff_id-YYYY-MM-DD.mp4 or similar
                date_part = file.split('-')[1:4]  # Extract date parts
                if len(date_part) >= 3:
                    date_str = f"{date_part[0]}{date_part[1]}{date_part[2].split('.')[0]}"
                    all_dates.add(date_str)
            except:
                pass
        
        # Sort by modification time (newest first)
        video_files.sort(key=lambda x: os.path.getmtime(os.path.join(staff_dir, x)), reverse=True)
        
        # Build history items (limit to 20)
        history_items = []
        for file in video_files[:20]:
            file_path = os.path.join(staff_dir, file)
            timestamp = datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
            history_items.append({
                "filename": file,
                "path": f"videos/{staff_id}/{file}",
                "timestamp": timestamp
            })
        
        history_data["history"] = history_items
        history_data["availableDates"] = sorted(list(all_dates), reverse=True)
        
        return history_data

# WebSocket server handler
async def handle_client(websocket):
    """Handle a WebSocket client"""
    staff_id = None
    staff_info = {}
    staff_authenticated = False
    ip_address = websocket.remote_address[0] if hasattr(websocket, 'remote_address') else 'unknown'
    
    logger.info(f"Connection open from {ip_address}")
    
    try:
        async for message in websocket:
            # For binary messages (video data)
            if isinstance(message, bytes):
                if not staff_authenticated:
                    logger.warning("Received binary data from unauthenticated client, ignoring")
                    continue
                    
                # We should have received a JSON message before this with metadata
                if not hasattr(websocket, 'current_video_file'):
                    logger.error("Received binary data but no video metadata")
                    continue
                
                video_file = getattr(websocket, 'current_video_file', None)
                if not video_file:
                    logger.error("No video filename specified in metadata")
                    continue
                
                # Save the video data
                videos_dir = config["videos_dir"]
                staff_videos_dir = ensure_directories(videos_dir, staff_id)
                file_path = os.path.join(videos_dir, video_file)
                
                try:
                    # Write the video data to file
                    with open(file_path, 'wb') as f:
                        f.write(message)
                    
                    logger.info(f"Saved video file: {file_path} ({len(message)} bytes)")
                    
                    # Update staff metadata
                    staff_info["last_activity"] = datetime.now().isoformat()
                    staff_info["activity_status"] = "active"
                    
                    # Write metadata
                    metadata_file = os.path.join(videos_dir, staff_id, "metadata.json")
                    with open(metadata_file, "w") as f:
                        json.dump(staff_info, f)
                        
                except Exception as e:
                    logger.error(f"Error saving video file: {e}")
                
                continue  # Skip the rest of the loop for binary data
            
            # Handle JSON messages
            try:
                data = json.loads(message)
                msg_type = data.get("type")
                
                # Authentication message
                if msg_type == "auth":
                    config_api_key = config["api_key"]
                    client_api_key = data.get("api_key")
                    
                    if client_api_key != config_api_key:
                        logger.warning(f"Authentication failed for client: {ip_address}")
                        await websocket.send(json.dumps({"status": "error", "message": "Authentication failed"}))
                        break
                    
                    staff_id = data.get("staff_id", "unknown")
                    staff_info = {
                        "name": data.get("name", "Unknown User"),
                        "division": data.get("division", "Unassigned"),
                        "last_activity": datetime.now().isoformat(),
                        "activity_status": "active"
                    }
                    
                    staff_authenticated = True
                    logger.info(f"Staff member {staff_info['name']} ({staff_id}) from {staff_info['division']} authenticated")
                    
                    # Create directories for this staff member
                    videos_dir = config["videos_dir"]
                    staff_videos_dir = ensure_directories(videos_dir, staff_id)
                    
                    # Write metadata file
                    metadata_file = os.path.join(staff_videos_dir, "metadata.json")
                    with open(metadata_file, "w") as f:
                        json.dump(staff_info, f)
                    
                    await websocket.send(json.dumps({"status": "authenticated", "message": "Authentication successful"}))
                
                # Video metadata message
                elif msg_type == "video_data":
                    if not staff_authenticated:
                        logger.warning(f"Unauthenticated client sent video data: {ip_address}")
                        continue
                    
                    # Store the filename for the upcoming binary message
                    video_file = data.get("video_file")
                    timestamp = data.get("timestamp", datetime.now().isoformat())
                    
                    # Attach to websocket object so we can access it when we get the binary data
                    setattr(websocket, 'current_video_file', video_file)
                    
                    logger.info(f"Received video metadata for {staff_id}, filename: {video_file}")
                    
                    # Update staff metadata
                    staff_info["last_activity"] = timestamp
                    staff_info["activity_status"] = "active"
                    
                # Other message types
                else:
                    logger.warning(f"Unknown message type: {msg_type}")
            
            except json.JSONDecodeError:
                logger.error(f"Received invalid JSON: {message[:100]}...")
            except Exception as e:
                logger.error(f"Error processing message: {e}")
    
    except websockets.exceptions.ConnectionClosed as e:
        logger.info(f"Connection closed: {e.code}")
    except Exception as e:
        logger.error(f"Error in WebSocket handler: {e}")
    finally:
        # Log the disconnection
        if staff_id:
            logger.info(f"Staff member {staff_id} disconnected")
            # Mark staff as inactive
            if staff_authenticated:
                videos_dir = config["videos_dir"]
                metadata_file = os.path.join(videos_dir, staff_id, "metadata.json")
                try:
                    with open(metadata_file, "r") as f:
                        metadata = json.load(f)
                    
                    metadata["activity_status"] = "inactive"
                    metadata["last_activity"] = datetime.now().isoformat()
                    
                    with open(metadata_file, "w") as f:
                        json.dump(metadata, f)
                except Exception as e:
                    logger.error(f"Error updating metadata: {e}")
        else:
            logger.info(f"Unknown client disconnected: {ip_address}")

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
    """Get a list of all staff members and their video paths"""
    staff_list = []
    videos_dir = config["videos_dir"]
    
    if not os.path.exists(videos_dir):
        logger.warning(f"Videos directory not found: {videos_dir}")
        return []
    
    # Get all subdirectories in the videos directory (each is a staff ID)
    staff_dirs = [d for d in os.listdir(videos_dir) if os.path.isdir(os.path.join(videos_dir, d))]
    
    for staff_id in staff_dirs:
        staff_dir = os.path.join(videos_dir, staff_id)
        metadata_file = os.path.join(staff_dir, "metadata.json")
        
        # Default values
        staff_info = {
            "staff_id": staff_id,
            "name": "Unknown User",
            "division": "Unassigned",
            "activity_status": "inactive",
            "last_activity": None,
            "video_path": None
        }
        
        # Try to read metadata
        if os.path.exists(metadata_file):
            try:
                with open(metadata_file, "r") as f:
                    metadata = json.load(f)
                staff_info.update(metadata)
            except Exception as e:
                logger.error(f"Error reading metadata for {staff_id}: {e}")
        
        # Find the latest video file
        mp4_files = [f for f in os.listdir(staff_dir) if f.endswith(".mp4")]
        if mp4_files:
            # Sort by creation time, newest first
            mp4_files.sort(key=lambda x: os.path.getctime(os.path.join(staff_dir, x)), reverse=True)
            latest_video = mp4_files[0]
            
            # Create a symlink or copy for "latest.mp4"
            latest_path = os.path.join(staff_dir, "latest.mp4")
            video_path = os.path.join(staff_dir, latest_video)
            
            try:
                # If a symlink/file already exists, remove it
                if os.path.exists(latest_path):
                    os.remove(latest_path)
                
                # Create a copy of the latest video as "latest.mp4"
                shutil.copy2(video_path, latest_path)
                
                # Set relative path for browser to access
                staff_info["video_path"] = f"videos/{staff_id}/latest.mp4"
                
                logger.debug(f"Latest video for {staff_id}: {latest_video}")
            except Exception as e:
                logger.error(f"Error creating latest.mp4 for {staff_id}: {e}")
                # Still set a path even if we couldn't create the link
                staff_info["video_path"] = f"videos/{staff_id}/{latest_video}"
        else:
            logger.warning(f"No videos found for staff {staff_id}")
            staff_info["video_path"] = None
        
        # Calculate inactivity
        if staff_info.get("last_activity"):
            try:
                last_activity = datetime.fromisoformat(staff_info["last_activity"])
                now = datetime.now()
                inactive_mins = (now - last_activity).total_seconds() / 60
                
                # Update status based on inactivity
                if inactive_mins > 5:  # Consider inactive after 5 minutes
                    staff_info["activity_status"] = "inactive"
            except Exception as e:
                logger.error(f"Error calculating inactivity: {e}")
        
        staff_list.append(staff_info)
    
    # Sort by status (active first) then by name
    staff_list.sort(key=lambda x: (0 if x["activity_status"] == "active" else 1, x["name"]))
    
    return staff_list

if __name__ == "__main__":
    logger.info("OEKS Team Tracker - Combined Server starting...")
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Run the server
    asyncio.run(run_server()) 