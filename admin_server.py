import asyncio
import json
import logging
import os
import signal
import sys
from datetime import datetime, timedelta
import websockets
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import mimetypes
from io import BytesIO
from urllib.parse import urlparse, parse_qsl
import time
import shutil
import cv2
import glob
import tempfile

# Add new imports for video streaming
import re
from http import HTTPStatus

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('combined_server')

# Load configuration at the top of the file
config = None  # Initialize config variable

def load_config():
    """Load configuration from admin_config.json"""
    global config
    try:
        with open("admin_config.json", "r") as f:
            loaded_config = json.load(f)
            
        # Set default values for any missing configuration items
        default_config = {
            "api_key": "oeks_secret_key_2024",
            "host": "0.0.0.0",
            "ws_port": 8765,
            "http_port": 8080,
            "screenshots_dir": "screenshots",
            "retention_days": 30,
            "hourly_video_enabled": True,
            "daily_video_enabled": True
        }
        
        # Merge with defaults
        for key, value in default_config.items():
            if key not in loaded_config:
                loaded_config[key] = value
                
        logger.info("Configuration loaded successfully")
        config = loaded_config  # Assign to the global config variable
        return loaded_config
    except Exception as e:
        logger.error(f"Error loading configuration: {e}")
        # Use default configuration if file cannot be loaded
        default_config = {
            "api_key": "oeks_secret_key_2024",
            "host": "0.0.0.0",
            "ws_port": 8765,
            "http_port": 8080,
            "screenshots_dir": "screenshots",
            "retention_days": 30,
            "hourly_video_enabled": True,
            "daily_video_enabled": True
        }
        config = default_config  # Assign to the global config variable
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
        global config
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
            
            # Handle video streaming
            elif path.startswith("/stream/"):
                self.handle_video_streaming(path)
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
            
            # Handle screenshot files
            elif path.startswith("/screenshots/"):
                clean_path = parsed_url.path[1:]  # Remove leading slash
                file_path = os.path.join(os.getcwd(), clean_path)
                
                logger.info(f"Request for screenshot file: {path}, serving from: {file_path}")
                
                if os.path.exists(file_path) and os.path.isfile(file_path):
                    self.send_response(200)
                    self.send_header('Content-type', 'image/jpeg')
                    self.send_header('Content-Length', str(os.path.getsize(file_path)))
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                    self.end_headers()
                    
                    try:
                        with open(file_path, 'rb') as f:
                            self.wfile.write(f.read())
                        logger.info(f"Successfully served screenshot file: {file_path}")
                    except Exception as e:
                        logger.error(f"Error reading screenshot file {file_path}: {e}")
                    return
                else:
                    logger.warning(f"Screenshot file not found: {file_path}")
                    self.send_response(404)
                    self.send_header('Content-type', 'text/plain')
                    self.end_headers()
                    self.wfile.write(b'Screenshot file not found')
                    return
                
            # Handle video files
            elif path.startswith("/screenshots/") and path.endswith(".mp4"):
                clean_path = parsed_url.path[1:]  # Remove leading slash
                file_path = os.path.join(os.getcwd(), clean_path)
                
                logger.info(f"Request for video file: {path}, serving from: {file_path}")
                
                if os.path.exists(file_path) and os.path.isfile(file_path):
                    self.send_response(200)
                    self.send_header('Content-type', 'video/mp4')
                    self.send_header('Content-Length', str(os.path.getsize(file_path)))
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Accept-Ranges', 'bytes')  # Important for video seeking
                    self.end_headers()
                    
                    try:
                        with open(file_path, 'rb') as f:
                            # Read in chunks to avoid memory issues with large videos
                            chunk_size = 1024 * 64  # 64KB chunks
                            while True:
                                chunk = f.read(chunk_size)
                                if not chunk:
                                    break
                                self.wfile.write(chunk)
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
        """Handle HEAD requests for screenshot files"""
        global config
        try:
            parsed_url = urlparse(self.path)
            path = parsed_url.path
            
            # Handle screenshot files
            if path.startswith("/screenshots/"):
                clean_path = parsed_url.path[1:]  # Remove leading slash
                file_path = os.path.join(os.getcwd(), clean_path)
                
                logger.info(f"HEAD request for screenshot file: {path}, checking: {file_path}")
                
                if os.path.exists(file_path) and os.path.isfile(file_path):
                    self.send_response(200)
                    self.send_header('Content-type', 'image/jpeg')
                    self.send_header('Content-Length', str(os.path.getsize(file_path)))
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                    self.end_headers()
                    logger.info(f"HEAD request successful for screenshot file: {file_path}")
                else:
                    logger.warning(f"Screenshot file not found for HEAD request: {file_path}")
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
                    "screenshot_path": staff["screenshot_path"]
                }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(staff_response).encode())
        
        elif path == "/api/history" or path.startswith("/api/staff-history/"):
            # Parse query parameters
            query = urlparse(self.path).query
            params = dict(parse_qsl(query))
            
            # Get staff_id either from path or query parameter
            staff_id = None
            if path.startswith("/api/staff-history/"):
                # Extract staff_id from path: /api/staff-history/{staff_id}
                staff_id = path.split("/api/staff-history/")[1]
                # Remove any additional path segments if present
                if '/' in staff_id:
                    staff_id = staff_id.split('/')[0]
            else:
                # Get from query parameter
                staff_id = params.get("staff_id")
            
            if not staff_id:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing staff_id parameter"}).encode())
                return
            
            # Extract date filter and limit parameters
            date_filter = params.get("date", "all")
            limit = params.get("limit", "20")
            
            # Get history for the staff member
            logger.info(f"Fetching history for staff ID: {staff_id}, date filter: {date_filter}, limit: {limit}")
            history_data = self.get_staff_history(staff_id, date_filter, limit)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(history_data).encode())
        
        elif path.startswith("/api/staff-videos/"):
            # Extract staff_id from path: /api/staff-videos/{staff_id}
            staff_id = path.split("/api/staff-videos/")[1]
            # Remove any additional path segments if present
            if '/' in staff_id:
                staff_id = staff_id.split('/')[0]
            
            # Parse query parameters
            query = urlparse(self.path).query
            params = dict(parse_qsl(query))
            
            # Extract date filter parameter and video type
            date_filter = params.get("date", "all")
            video_type = params.get("type", "all")  # New parameter: 5min, hourly, daily
            
            # Get video history for the staff member
            logger.info(f"Fetching video history for staff ID: {staff_id}, date filter: {date_filter}, type: {video_type}")
            video_data = self.get_staff_videos(staff_id, date_filter, video_type)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(video_data).encode())
        
        # New API endpoint for video timeline data
        elif path.startswith("/api/video-timeline/"):
            # Extract staff_id and date from path: /api/video-timeline/{staff_id}/{date}
            parts = path.split("/api/video-timeline/")[1].split('/')
            staff_id = parts[0]
            
            # Parse query parameters
            query = urlparse(self.path).query
            params = dict(parse_qsl(query))
            
            # Extract date parameter
            date = params.get("date", datetime.now().strftime("%Y%m%d"))
            
            # Get timeline data
            timeline_data = self.get_video_timeline(staff_id, date)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(timeline_data).encode())
        
        else:
            # Unknown API endpoint
            logger.warning(f"Unknown API endpoint requested: {path}")
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "API endpoint not found"}).encode())

    def handle_video_streaming(self, path):
        """Handle video streaming requests with timestamp support"""
        try:
            # Extract staff_id and video path from the URL
            # Format: /stream/{staff_id}/{video_type}/{filename}?start=seconds
            parts = path.split('/stream/')[1].split('/')
            
            if len(parts) < 3:  # Changed from 4 to 3 to be more flexible
                self.send_response(400)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'Invalid streaming URL format')
                return
            
            staff_id = parts[0]
            video_type = parts[1]  # 5min, hourly, daily
            
            # Join the remaining parts as the filename (in case filename contains slashes)
            filename = '/'.join(parts[2:])
            
            # Parse query parameters
            query = urlparse(self.path).query
            params = dict(parse_qsl(query))
            start_time = params.get("start", "0")
            
            try:
                start_seconds = int(start_time)
            except ValueError:
                start_seconds = 0
            
            # Construct the video file path
            screenshots_dir = config["screenshots_dir"]
            if video_type == "5min":
                video_path = os.path.join(screenshots_dir, staff_id, "videos", filename)
            elif video_type == "hourly":
                video_path = os.path.join(screenshots_dir, staff_id, "videos", "hourly", filename)
            elif video_type == "daily":
                video_path = os.path.join(screenshots_dir, staff_id, "videos", "daily", filename)
            else:
                video_path = os.path.join(screenshots_dir, staff_id, "videos", filename)
            
            logger.info(f"Streaming video: {video_path}, start time: {start_seconds}s")
            
            if not os.path.exists(video_path):
                logger.warning(f"Video file not found: {video_path}")
                self.send_response(404)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(f'Video file not found: {video_path}'.encode())
                return
            
            # Get file size
            file_size = os.path.getsize(video_path)
            
            # Handle range requests for seeking
            range_header = self.headers.get('Range', '').strip()
            range_match = re.match(r'bytes=(\d+)-(\d*)', range_header)
            
            start_byte = 0
            end_byte = file_size - 1
            
            # If we have a range request
            if range_match:
                start_byte = int(range_match.group(1))
                if range_match.group(2):
                    end_byte = int(range_match.group(2))
                
                # If start_seconds is specified and no range header, calculate byte position
                # This is a simplified approach - for accurate seeking, we'd need to analyze the video
            elif start_seconds > 0:
                # Rough estimate: assume 500KB per second of video as a heuristic
                # This is very approximate and depends on video bitrate
                start_byte = min(start_seconds * 500 * 1024, file_size - 1)
            
            content_length = end_byte - start_byte + 1
            
            # Send appropriate headers
            if range_header:
                self.send_response(206)  # Partial Content
                self.send_header('Content-Range', f'bytes {start_byte}-{end_byte}/{file_size}')
            else:
                self.send_response(200)
            
            self.send_header('Content-Type', 'video/mp4')
            self.send_header('Content-Length', str(content_length))
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            # Stream the video file in chunks
            with open(video_path, 'rb') as f:
                f.seek(start_byte)
                bytes_to_send = content_length
                chunk_size = 64 * 1024  # 64KB chunks
                
                while bytes_to_send > 0:
                    chunk = f.read(min(chunk_size, bytes_to_send))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    bytes_to_send -= len(chunk)
            
            logger.info(f"Streamed video {video_path} from position {start_byte}")
        
        except Exception as e:
            logger.error(f"Error in video streaming handler: {e}")
            self.send_response(500)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(f'Error streaming video: {str(e)}'.encode())

    def get_staff_videos(self, staff_id, date_filter=None, video_type="all"):
        """Get video history data for a staff member
        
        Args:
            staff_id (str): ID of the staff member
            date_filter (str, optional): Date filter in YYYYMMDD format
            video_type (str, optional): Type of videos to return (5min, hourly, daily, all)
        
        Returns:
            dict: Video history data for the staff member
        """
        global config
        
        video_data = {
            "staffId": staff_id,
            "videos": [],
            "availableDates": [],
            "hourlyVideos": [],
            "dailyVideos": []
        }
        
        screenshots_dir = config["screenshots_dir"]
        staff_dir = os.path.join(screenshots_dir, staff_id)
        videos_dir = os.path.join(staff_dir, "videos")
        hourly_dir = os.path.join(videos_dir, "hourly")
        daily_dir = os.path.join(videos_dir, "daily")
        
        # Check if the videos directory exists
        if not os.path.exists(videos_dir) or not os.path.isdir(videos_dir):
            logger.warning(f"Videos directory not found: {videos_dir}")
            return video_data
        
        # Get 5-minute video files if requested
        if video_type in ["all", "5min"]:
            video_files = [f for f in os.listdir(videos_dir) if f.endswith('.mp4') and f != 'latest_5min.mp4' 
                          and os.path.isfile(os.path.join(videos_dir, f))]
            
            # Get available dates from filenames
            all_dates = set()
            date_filtered_files = []
            
            for file in video_files:
                # Extract date from filename if possible
                try:
                    # Assuming filename format is staff_id-last5min-YYYYMMDD-HHMMSS.mp4
                    date_part = file.split('-')
                    if len(date_part) >= 3:
                        # Extract date (YYYYMMDD)
                        date_str = date_part[2]
                        all_dates.add(date_str)
                        
                        # Apply date filter if provided
                        if date_filter and date_filter != 'all':
                            if date_str == date_filter:
                                date_filtered_files.append(file)
                        else:
                            date_filtered_files.append(file)
                except Exception as e:
                    logger.warning(f"Error parsing date from video filename {file}: {e}")
                    date_filtered_files.append(file)  # Include files with unparseable dates
            
            # If date filter was applied, use filtered files, otherwise use all files
            files_to_process = date_filtered_files if date_filter else video_files
            
            # Sort by modification time (newest first)
            files_to_process.sort(key=lambda x: os.path.getmtime(os.path.join(videos_dir, x)), reverse=True)
            
            # Build video items
            video_items = []
            for file in files_to_process:
                file_path = os.path.join(videos_dir, file)
                timestamp = datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                
                # Extract duration from filename if possible
                duration = "5 dakika"  # Default
                if "last5min" in file:
                    duration = "5 dakika"
                
                video_items.append({
                    "filename": file,
                    "path": f"screenshots/{staff_id}/videos/{file}",
                    "streamPath": f"stream/{staff_id}/5min/{file}",
                    "timestamp": timestamp,
                    "duration": duration,
                    "type": "5min"
                })
            
            video_data["videos"] = video_items
            video_data["availableDates"] = sorted(list(all_dates), reverse=True)
        
        # Get hourly video files if requested
        if video_type in ["all", "hourly"] and os.path.exists(hourly_dir) and os.path.isdir(hourly_dir):
            hourly_files = [f for f in os.listdir(hourly_dir) if f.endswith('.mp4') and os.path.isfile(os.path.join(hourly_dir, f))]
            
            # Apply date filter if provided
            if date_filter and date_filter != 'all':
                hourly_files = [f for f in hourly_files if date_filter in f]
            
            # Sort by modification time (newest first)
            hourly_files.sort(key=lambda x: os.path.getmtime(os.path.join(hourly_dir, x)), reverse=True)
            
            # Build hourly video items
            hourly_items = []
            for file in hourly_files:
                file_path = os.path.join(hourly_dir, file)
                timestamp = datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                
                # Extract hour from filename
                hour_match = re.search(r'hour-(\d{2})', file)
                hour_label = f"Saat {hour_match.group(1)}:00" if hour_match else "Saatlik Video"
                
                hourly_items.append({
                    "filename": file,
                    "path": f"screenshots/{staff_id}/videos/hourly/{file}",
                    "streamPath": f"stream/{staff_id}/hourly/{file}",
                    "timestamp": timestamp,
                    "duration": "1 saat",
                    "label": hour_label,
                    "type": "hourly"
                })
            
            video_data["hourlyVideos"] = hourly_items
        
        # Get daily video files if requested
        if video_type in ["all", "daily"] and os.path.exists(daily_dir) and os.path.isdir(daily_dir):
            daily_files = [f for f in os.listdir(daily_dir) if f.endswith('.mp4') and os.path.isfile(os.path.join(daily_dir, f))]
            
            # Apply date filter if provided
            if date_filter and date_filter != 'all':
                daily_files = [f for f in daily_files if date_filter in f]
            
            # Sort by modification time (newest first)
            daily_files.sort(key=lambda x: os.path.getmtime(os.path.join(daily_dir, x)), reverse=True)
            
            # Build daily video items
            daily_items = []
            for file in daily_files:
                file_path = os.path.join(daily_dir, file)
                timestamp = datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                
                # Extract date from filename for label
                date_match = re.search(r'(\d{8})', file)
                if date_match:
                    date_str = date_match.group(1)
                    try:
                        date_obj = datetime.strptime(date_str, "%Y%m%d")
                        date_label = date_obj.strftime("%d.%m.%Y")
                    except:
                        date_label = "Günlük Video"
                else:
                    date_label = "Günlük Video"
                
                daily_items.append({
                    "filename": file,
                    "path": f"screenshots/{staff_id}/videos/daily/{file}",
                    "streamPath": f"stream/{staff_id}/daily/{file}",
                    "timestamp": timestamp,
                    "duration": "Tam gün",
                    "label": date_label,
                    "type": "daily"
                })
            
            video_data["dailyVideos"] = daily_items
        
        return video_data

    def get_video_timeline(self, staff_id, date):
        """Get timeline data for a specific date
        
        Args:
            staff_id (str): ID of the staff member
            date (str): Date in YYYYMMDD format
        
        Returns:
            dict: Timeline data with available video segments
        """
        global config
        
        timeline_data = {
            "staffId": staff_id,
            "date": date,
            "segments": []
        }
        
        screenshots_dir = config["screenshots_dir"]
        staff_dir = os.path.join(screenshots_dir, staff_id)
        videos_dir = os.path.join(staff_dir, "videos")
        
        # Check if the videos directory exists
        if not os.path.exists(videos_dir) or not os.path.isdir(videos_dir):
            logger.warning(f"Videos directory not found: {videos_dir}")
            return timeline_data
        
        # Get all video files for the specified date
        video_files = [f for f in os.listdir(videos_dir) 
                      if f.endswith('.mp4') and date in f and f != 'latest_5min.mp4'
                      and os.path.isfile(os.path.join(videos_dir, f))]
        
        # Sort by timestamp in filename
        video_files.sort(key=lambda x: x.split('-')[-1].split('.')[0] if len(x.split('-')) > 3 else "000000")
        
        # Build timeline segments
        for file in video_files:
            # Extract timestamp from filename
            try:
                # Assuming filename format is staff_id-last5min-YYYYMMDD-HHMMSS.mp4
                parts = file.split('-')
                if len(parts) >= 4:
                    time_str = parts[3].split('.')[0]  # HHMMSS
                    hour = time_str[:2]
                    minute = time_str[2:4]
                    
                    # Create a segment entry
                    segment = {
                        "filename": file,
                        "path": f"screenshots/{staff_id}/videos/{file}",
                        "streamPath": f"stream/{staff_id}/5min/{file}",
                        "hour": int(hour),
                        "minute": int(minute),
                        "label": f"{hour}:{minute}",
                        "type": "5min"
                    }
                    
                    timeline_data["segments"].append(segment)
            except Exception as e:
                logger.warning(f"Error parsing timestamp from video filename {file}: {e}")
        
        # Add hourly videos if available
        hourly_dir = os.path.join(videos_dir, "hourly")
        if os.path.exists(hourly_dir) and os.path.isdir(hourly_dir):
            hourly_files = [f for f in os.listdir(hourly_dir) 
                           if f.endswith('.mp4') and date in f 
                           and os.path.isfile(os.path.join(hourly_dir, f))]
            
            for file in hourly_files:
                # Extract hour from filename
                hour_match = re.search(r'hour-(\d{2})', file)
                if hour_match:
                    hour = int(hour_match.group(1))
                    
                    # Create a segment entry
                    segment = {
                        "filename": file,
                        "path": f"screenshots/{staff_id}/videos/hourly/{file}",
                        "streamPath": f"stream/{staff_id}/hourly/{file}",
                        "hour": hour,
                        "minute": 0,
                        "label": f"{hour}:00",
                        "type": "hourly"
                    }
                    
                    timeline_data["segments"].append(segment)
        
        # Add daily video if available
        daily_dir = os.path.join(videos_dir, "daily")
        if os.path.exists(daily_dir) and os.path.isdir(daily_dir):
            daily_files = [f for f in os.listdir(daily_dir) 
                          if f.endswith('.mp4') and date in f 
                          and os.path.isfile(os.path.join(daily_dir, f))]
            
            for file in daily_files:
                # Create a segment entry for the daily video
                segment = {
                    "filename": file,
                    "path": f"screenshots/{staff_id}/videos/daily/{file}",
                    "streamPath": f"stream/{staff_id}/daily/{file}",
                    "hour": 0,
                    "minute": 0,
                    "label": "Tam Gün",
                    "type": "daily"
                }
                
                timeline_data["segments"].append(segment)
        
        return timeline_data

    def log_message(self, format, *args):
        logger.info("%s - %s" % (self.address_string(), format % args))

    def serve_file(self, file_path, content_type):
        """Helper method to serve a file with appropriate headers"""
        if os.path.exists(file_path) and os.path.isfile(file_path):
            self.send_response(200)
            self.send_header('Content-type', content_type)
            self.send_header('Access-Control-Allow-Origin', '*')
            
            # For screenshot files, add additional headers to prevent caching
            if content_type.startswith('image/'):
                self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                self.send_header('Pragma', 'no-cache')
                self.send_header('Expires', '0')
                
                # Add content length header for screenshots
                self.send_header('Content-Length', str(os.path.getsize(file_path)))
                logger.info(f"Serving screenshot file: {file_path} ({os.path.getsize(file_path)} bytes)")
            
            self.end_headers()
            
            try:
                with open(file_path, 'rb') as f:
                    # For screenshots, read in smaller chunks to avoid memory issues
                    if content_type.startswith('image/'):
                        chunk_size = 1024 * 8  # 8KB chunks
                        while True:
                            chunk = f.read(chunk_size)
                            if not chunk:
                                break
                            self.wfile.write(chunk)
                    else:
                        # For other files, read all at once
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

    def get_staff_history(self, staff_id, date_filter=None, limit=20):
        """Get history data for a staff member
        
        Args:
            staff_id (str): ID of the staff member
            date_filter (str, optional): Date filter in YYYYMMDD format
            limit (int, optional): Maximum number of history items to return
        
        Returns:
            dict: History data for the staff member
        """
        global config
        
        # Parse limit if provided as a string
        if isinstance(limit, str) and limit.isdigit():
            limit = int(limit)
        elif not isinstance(limit, int):
            limit = 20  # Default limit
        
        history_data = {
            "staffId": staff_id,
            "history": [],
            "availableDates": []
        }
        
        screenshots_dir = config["screenshots_dir"]
        staff_dir = os.path.join(screenshots_dir, staff_id)
        
        # Check if the staff directory exists
        if not os.path.exists(staff_dir) or not os.path.isdir(staff_dir):
            logger.warning(f"Staff directory not found: {staff_dir}")
            return history_data
        
        # Get screenshot files
        screenshot_files = [f for f in os.listdir(staff_dir) if f.endswith('.jpg') and f != 'latest.jpg']
        
        # Get available dates from filenames
        all_dates = set()
        date_filtered_files = []
        
        for file in screenshot_files:
            # Extract date from filename if possible (format depends on your naming convention)
            try:
                # Assuming filename format is staff_id-YYYY-MM-DD.jpg or similar
                date_part = file.split('-')[1:4]  # Extract date parts
                if len(date_part) >= 3:
                    date_str = f"{date_part[0]}{date_part[1]}{date_part[2].split('.')[0]}"
                    all_dates.add(date_str)
                    
                    # Apply date filter if provided
                    if date_filter and date_filter != 'all':
                        if date_str == date_filter:
                            date_filtered_files.append(file)
                    else:
                        date_filtered_files.append(file)
            except Exception as e:
                logger.warning(f"Error parsing date from filename {file}: {e}")
                date_filtered_files.append(file)  # Include files with unparseable dates
        
        # If date filter was applied, use filtered files, otherwise use all files
        files_to_process = date_filtered_files if date_filter else screenshot_files
        
        # Sort by modification time (newest first)
        files_to_process.sort(key=lambda x: os.path.getmtime(os.path.join(staff_dir, x)), reverse=True)
        
        # Build history items (respect the limit)
        history_items = []
        for file in files_to_process[:limit]:
            file_path = os.path.join(staff_dir, file)
            timestamp = datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
            history_items.append({
                "filename": file,
                "path": f"screenshots/{staff_id}/{file}",
                "timestamp": timestamp
            })
        
        history_data["history"] = history_items
        history_data["availableDates"] = sorted(list(all_dates), reverse=True)
        
        return history_data

# WebSocket server handler
async def handle_client(websocket):
    """Handle a WebSocket client"""
    global config
    staff_id = None
    staff_info = {}
    staff_authenticated = False
    ip_address = websocket.remote_address[0] if hasattr(websocket, 'remote_address') else 'unknown'
    
    logger.info(f"Connection open from {ip_address}")
    
    try:
        async for message in websocket:
            # For binary messages (screenshot data)
            if isinstance(message, bytes):
                if not staff_authenticated:
                    logger.warning("Received binary data from unauthenticated client, ignoring")
                    continue
                    
                # We should have received a JSON message before this with metadata
                if not hasattr(websocket, 'current_screenshot_file'):
                    logger.error("Received binary data but no screenshot metadata")
                    continue
                
                screenshot_file = getattr(websocket, 'current_screenshot_file', None)
                if not screenshot_file:
                    logger.error("No screenshot filename specified in metadata")
                    continue
                
                # Save the screenshot data
                screenshots_dir = config["screenshots_dir"]
                staff_screenshots_dir = ensure_directories(screenshots_dir, staff_id)
                
                # Save to staff subdirectory
                file_path = os.path.join(staff_screenshots_dir, os.path.basename(screenshot_file))
                
                try:
                    # Write the screenshot data to file
                    with open(file_path, 'wb') as f:
                        f.write(message)
                    
                    logger.info(f"Saved screenshot file: {file_path} ({len(message)} bytes)")
                    
                    # Create a copy as latest.jpg
                    latest_path = os.path.join(staff_screenshots_dir, "latest.jpg")
                    try:
                        if os.path.exists(latest_path):
                            os.remove(latest_path)
                        shutil.copy2(file_path, latest_path)
                        logger.info(f"Created latest.jpg for {staff_id}")
                    except Exception as e:
                        logger.error(f"Error creating latest.jpg: {e}")
                    
                    # Update staff metadata
                    staff_info["last_activity"] = datetime.now().isoformat()
                    staff_info["activity_status"] = "active"
                    
                    # Write metadata
                    metadata_file = os.path.join(staff_screenshots_dir, "metadata.json")
                    with open(metadata_file, "w") as f:
                        json.dump(staff_info, f)
                        
                except Exception as e:
                    logger.error(f"Error saving screenshot file: {e}")
                
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
                    screenshots_dir = config["screenshots_dir"]
                    staff_screenshots_dir = ensure_directories(screenshots_dir, staff_id)
                    
                    # Write metadata file
                    metadata_file = os.path.join(staff_screenshots_dir, "metadata.json")
                    with open(metadata_file, "w") as f:
                        json.dump(staff_info, f)
                    
                    await websocket.send(json.dumps({"status": "authenticated", "message": "Authentication successful"}))
                
                # Screenshot metadata message
                elif msg_type == "screenshot_data":
                    if not staff_authenticated:
                        logger.warning(f"Unauthenticated client sent screenshot data: {ip_address}")
                        continue
                    
                    # Store the filename for the upcoming binary message
                    screenshot_file = data.get("filename")
                    timestamp = data.get("timestamp", datetime.now().isoformat())
                    
                    # Attach to websocket object so we can access it when we get the binary data
                    setattr(websocket, 'current_screenshot_file', screenshot_file)
                    
                    logger.info(f"Received screenshot metadata for {staff_id}, filename: {screenshot_file}")
                    
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
                screenshots_dir = config["screenshots_dir"]
                metadata_file = os.path.join(screenshots_dir, staff_id, "metadata.json")
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
    """Main server function"""
    global config
    # Load configuration
    config = load_config()
    host = config["host"]
    ws_port = config["ws_port"]
    http_port = config["http_port"]
    
    # Ensure directories exist
    screenshots_dir = config["screenshots_dir"]
    os.makedirs(screenshots_dir, exist_ok=True)
    
    # Start HTTP server in a separate thread
    http_server = HTTPServerThread(host, http_port)
    http_server.start()
    
    # Start video generation task
    asyncio.create_task(video_generation_task())
    
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

# Update the staff list API to include screenshot information
def get_staff_list():
    """Get a list of all staff members and their screenshot paths"""
    global config
    staff_list = []
    screenshots_dir = config["screenshots_dir"]
    
    if not os.path.exists(screenshots_dir):
        logger.warning(f"Screenshots directory not found: {screenshots_dir}")
        return []
    
    # First, get all subdirectories in the screenshots directory (each is a staff ID)
    staff_dirs = [d for d in os.listdir(screenshots_dir) if os.path.isdir(os.path.join(screenshots_dir, d))]
    staff_ids_found = set()
    
    # Process staff dirs
    for staff_id in staff_dirs:
        staff_ids_found.add(staff_id)
        staff_dir = os.path.join(screenshots_dir, staff_id)
        metadata_file = os.path.join(staff_dir, "metadata.json")
        
        # Default values
        staff_info = {
            "staff_id": staff_id,
            "name": "Unknown User",
            "division": "Unassigned",
            "activity_status": "inactive",
            "last_activity": None,
            "screenshot_path": None
        }
        
        # Try to read metadata
        if os.path.exists(metadata_file):
            try:
                with open(metadata_file, "r") as f:
                    metadata = json.load(f)
                staff_info.update(metadata)
            except Exception as e:
                logger.error(f"Error reading metadata for {staff_id}: {e}")
        
        # Find the latest screenshot file
        # First, check for latest.jpg
        latest_jpg = os.path.join(staff_dir, "latest.jpg")
        if os.path.exists(latest_jpg) and os.path.isfile(latest_jpg):
            staff_info["screenshot_path"] = f"screenshots/{staff_id}/latest.jpg"
        else:
            # Look for other JPG files
            jpg_files = [f for f in os.listdir(staff_dir) if f.endswith(".jpg")]
            if jpg_files:
                # Sort by creation time, newest first
                jpg_files.sort(key=lambda x: os.path.getctime(os.path.join(staff_dir, x)), reverse=True)
                latest_screenshot = jpg_files[0]
                
                # Set relative path for browser to access
                staff_info["screenshot_path"] = f"screenshots/{staff_id}/{latest_screenshot}"
                
                logger.debug(f"Latest screenshot for {staff_id}: {latest_screenshot}")
            else:
                logger.warning(f"No screenshots found for staff {staff_id}")
                staff_info["screenshot_path"] = None
        
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
        
        # Check for 5-minute video
        videos_dir = os.path.join(staff_dir, "videos")
        latest_5min_video = os.path.join(videos_dir, "latest_5min.mp4")
        if os.path.exists(latest_5min_video) and os.path.isfile(latest_5min_video):
            staff_info["last_5min_video"] = f"screenshots/{staff_id}/videos/latest_5min.mp4"
            staff_info["last_5min_video_time"] = datetime.fromtimestamp(
                os.path.getmtime(latest_5min_video)).isoformat()
        
        staff_list.append(staff_info)
    
    # Now, look for screenshot files directly in the screenshots directory
    # This handles screenshots that might have been saved without the proper directory structure
    direct_screenshot_files = [f for f in os.listdir(screenshots_dir) if f.endswith('.jpg') and os.path.isfile(os.path.join(screenshots_dir, f))]
    
    for screenshot_file in direct_screenshot_files:
        # Try to extract staff_id from filename (e.g., staff_pc_141-03-04-2025.jpg)
        parts = screenshot_file.split('-')
        if len(parts) >= 1:
            file_staff_id = parts[0]
            
            # If we already have this staff ID from a directory, skip
            if file_staff_id in staff_ids_found:
                continue
            
            staff_ids_found.add(file_staff_id)
            
            # Default values for staff member with screenshot but no directory
            staff_info = {
                "staff_id": file_staff_id,
                "name": "Unknown User",
                "division": "Unassigned",
                "activity_status": "active",  # Assume active if there's a screenshot
                "last_activity": datetime.fromtimestamp(os.path.getctime(os.path.join(screenshots_dir, screenshot_file))).isoformat(),
                "screenshot_path": f"screenshots/{screenshot_file}"
            }
            
            staff_list.append(staff_info)
    
    # Sort by status (active first) then by name
    staff_list.sort(key=lambda x: (0 if x["activity_status"] == "active" else 1, x["name"]))
    
    return staff_list

# Add a function to generate videos from screenshots
def generate_staff_video(staff_id, duration_minutes=5):
    """Generate a video from recent screenshots for a staff member
    
    Args:
        staff_id (str): ID of the staff member
        duration_minutes (int): Duration in minutes to include in the video
    
    Returns:
        str: Path to the generated video file, or None if failed
    """
    global config
    
    try:
        screenshots_dir = config["screenshots_dir"]
        staff_dir = os.path.join(screenshots_dir, staff_id)
        
        # Check if the staff directory exists
        if not os.path.exists(staff_dir) or not os.path.isdir(staff_dir):
            logger.warning(f"Staff directory not found for video generation: {staff_dir}")
            return None
        
        # Create videos directory if it doesn't exist
        videos_dir = os.path.join(staff_dir, "videos")
        os.makedirs(videos_dir, exist_ok=True)
        
        # Get current time and calculate the start time for the video
        now = datetime.now()
        start_time = now - timedelta(minutes=duration_minutes)
        
        # Get all jpg files in the staff directory
        jpg_files = glob.glob(os.path.join(staff_dir, "*.jpg"))
        
        # Filter files by modification time to get only recent ones
        recent_files = []
        for file_path in jpg_files:
            # Skip latest.jpg
            if os.path.basename(file_path) == "latest.jpg":
                continue
                
            # Check if the file is recent enough
            mod_time = datetime.fromtimestamp(os.path.getmtime(file_path))
            if mod_time >= start_time:
                recent_files.append((file_path, mod_time))
        
        # Sort files by modification time
        recent_files.sort(key=lambda x: x[1])
        
        # If no recent files, return None
        if not recent_files:
            logger.warning(f"No recent screenshots found for {staff_id}")
            return None
        
        # Create a video filename with timestamp
        timestamp = now.strftime("%Y%m%d-%H%M%S")
        video_filename = f"{staff_id}-last{duration_minutes}min-{timestamp}.mp4"
        video_path = os.path.join(videos_dir, video_filename)
        
        # Get dimensions from the first image
        first_img = cv2.imread(recent_files[0][0])
        height, width, _ = first_img.shape
        
        # Create video writer with H.264 codec for better browser compatibility
        # Use avc1 codec which is more widely supported in browsers
        fourcc = cv2.VideoWriter_fourcc(*'avc1')
        
        # If avc1 is not available, fall back to mp4v
        try:
            video_writer = cv2.VideoWriter(video_path, fourcc, 1, (width, height))
            # Test if the writer is initialized properly
            if not video_writer.isOpened():
                logger.warning("avc1 codec not available, falling back to mp4v")
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                video_writer = cv2.VideoWriter(video_path, fourcc, 1, (width, height))
        except Exception as e:
            logger.warning(f"Error with avc1 codec: {e}, falling back to mp4v")
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            video_writer = cv2.VideoWriter(video_path, fourcc, 1, (width, height))
        
        # Add each image to the video
        for file_path, _ in recent_files:
            img = cv2.imread(file_path)
            if img is not None:  # Make sure the image was loaded successfully
                video_writer.write(img)
            else:
                logger.warning(f"Could not read image: {file_path}")
        
        # Release the video writer
        video_writer.release()
        
        # Create a copy as latest_5min.mp4
        latest_path = os.path.join(videos_dir, "latest_5min.mp4")
        try:
            if os.path.exists(latest_path):
                os.remove(latest_path)
            shutil.copy2(video_path, latest_path)
            logger.info(f"Created latest_5min.mp4 for {staff_id}")
        except Exception as e:
            logger.error(f"Error creating latest_5min.mp4: {e}")
        
        logger.info(f"Generated 5-minute video for {staff_id}: {video_path}")
        return f"screenshots/{staff_id}/videos/{video_filename}"
    
    except Exception as e:
        logger.error(f"Error generating video for {staff_id}: {e}")
        return None

# Add a background task to generate videos periodically
async def video_generation_task():
    """Background task to generate videos from screenshots"""
    while True:
        try:
            logging.info("Starting video generation cycle...")
            staff_list = get_staff_list()
            
            for staff_info in staff_list:
                staff_id = staff_info["staff_id"]
                
                # Generate 5-minute videos
                await generate_staff_video(staff_id)
                
                # TESTING: Generate videos every 15 minutes instead of hourly for faster testing
                # TODO: Change back to 60 minutes after testing is complete
                await generate_hourly_video(staff_id, minutes=15)
                
                # Generate daily videos by combining hourly videos
                await generate_daily_video(staff_id)
            
            logging.info("Completed video generation cycle.")
            
            # Wait before next cycle (5 minutes)
            await asyncio.sleep(300)
        except Exception as e:
            logging.error(f"Error in video generation task: {e}")
            await asyncio.sleep(60)  # Wait a bit before retrying

async def generate_hourly_video(staff_id, minutes=60):
    """
    Generate hourly video by combining 5-minute segments
    
    Args:
        staff_id: Staff ID
        minutes: Minutes to combine (default 60, set to 15 for testing)
    """
    try:
        # Get the staff screenshots directory
        staff_dir = os.path.join(config["screenshots_dir"], staff_id)
        videos_dir = os.path.join(staff_dir, "videos")
        
        # Ensure directories exist
        os.makedirs(videos_dir, exist_ok=True)
        
        # Get current hour
        now = datetime.now()
        # For testing, we're using 15-minute intervals instead of full hours
        current_interval = now.replace(minute=now.minute - now.minute % minutes, second=0, microsecond=0)
        previous_interval = current_interval - timedelta(minutes=minutes)
        
        # Format timestamp for filename
        timestamp = previous_interval.strftime("%Y%m%d-%H%M%S")
        
        # Debug log for interval information
        logging.info(f"[HOURLY VIDEO DEBUG] Staff: {staff_id}, Generating {minutes}-minute video for interval: {previous_interval} to {current_interval}")
        
        # Create output filename
        output_filename = f"{staff_id}-{minutes}min-{timestamp}.mp4"
        output_path = os.path.join(videos_dir, output_filename)
        
        # Check if this hourly video already exists
        if os.path.exists(output_path):
            logging.info(f"[HOURLY VIDEO DEBUG] {minutes}-minute video already exists: {output_path}")
            return output_path
        
        # Get list of 5-minute videos in this hour
        video_files = []
        expected_segments = minutes // 5  # Number of 5-minute segments we expect
        
        logging.info(f"[HOURLY VIDEO DEBUG] Looking for {expected_segments} video segments in time range")
        
        # Loop through the expected time range to find 5-minute videos
        for i in range(expected_segments):
            segment_time = previous_interval + timedelta(minutes=i*5)
            segment_timestamp = segment_time.strftime("%Y%m%d-%H%M%S")
            segment_filename = f"{staff_id}-5min-{segment_timestamp}.mp4"
            segment_path = os.path.join(videos_dir, segment_filename)
            
            if os.path.exists(segment_path):
                video_files.append(segment_path)
                logging.info(f"[HOURLY VIDEO DEBUG] Found segment: {segment_filename}")
            else:
                logging.warning(f"[HOURLY VIDEO DEBUG] Missing segment: {segment_filename}")
        
        # If no videos found, skip
        if not video_files:
            logging.warning(f"[HOURLY VIDEO DEBUG] No 5-minute videos found for {staff_id} in the {minutes}-minute interval {timestamp}")
            return None
        
        # If we don't have enough segments, log a warning but continue
        if len(video_files) < expected_segments:
            logging.warning(f"[HOURLY VIDEO DEBUG] Only found {len(video_files)}/{expected_segments} segments for {minutes}-minute video")
        
        # Create a temporary file to list video files
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            for video_file in video_files:
                f.write(f"file '{video_file}'\n")
            temp_list_path = f.name
        
        try:
            # Use ffmpeg to concatenate videos
            logging.info(f"[HOURLY VIDEO DEBUG] Combining {len(video_files)} videos into {minutes}-minute video")
            
            # Construct ffmpeg command
            ffmpeg_cmd = [
                'ffmpeg',
                '-f', 'concat',
                '-safe', '0',
                '-i', temp_list_path,
                '-c', 'copy',
                output_path
            ]
            
            # Log the command
            logging.info(f"[HOURLY VIDEO DEBUG] Running command: {' '.join(ffmpeg_cmd)}")
            
            # Run the command
            process = await asyncio.create_subprocess_exec(
                *ffmpeg_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logging.error(f"[HOURLY VIDEO DEBUG] Error combining videos: {stderr.decode()}")
                return None
            
            logging.info(f"[HOURLY VIDEO DEBUG] Successfully created {minutes}-minute video: {output_path}")
            return output_path
            
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_list_path)
            except:
                pass
    
    except Exception as e:
        logging.error(f"[HOURLY VIDEO DEBUG] Error generating {minutes}-minute video for {staff_id}: {str(e)}")
        return None

async def generate_daily_video(staff_id):
    """Generate daily video by combining hourly segments"""
    try:
        # Get the staff screenshots directory
        staff_dir = os.path.join(config["screenshots_dir"], staff_id)
        videos_dir = os.path.join(staff_dir, "videos")
        
        # Ensure directories exist
        os.makedirs(videos_dir, exist_ok=True)
        
        # Get yesterday's date
        yesterday = datetime.now() - timedelta(days=1)
        date_str = yesterday.strftime("%Y%m%d")
        
        # Create output filename
        output_filename = f"{staff_id}-daily-{date_str}.mp4"
        output_path = os.path.join(videos_dir, output_filename)
        
        # Check if this daily video already exists
        if os.path.exists(output_path):
            logging.info(f"Daily video already exists: {output_path}")
            return output_path
        
        # Debug log for daily video generation
        logging.info(f"[DAILY VIDEO DEBUG] Staff: {staff_id}, Generating daily video for date: {date_str}")
        
        # Get list of hourly videos for this day
        # TESTING: Look for 15-minute videos instead of hourly videos
        # TODO: Change back to hourly pattern after testing
        video_pattern = f"{staff_id}-15min-{date_str}-*.mp4"
        video_files = glob.glob(os.path.join(videos_dir, video_pattern))
        
        # Sort videos by timestamp
        video_files.sort()
        
        logging.info(f"[DAILY VIDEO DEBUG] Found {len(video_files)} 15-minute videos for {date_str}")
        
        # If no videos found, skip
        if not video_files:
            logging.warning(f"[DAILY VIDEO DEBUG] No 15-minute videos found for {staff_id} on {date_str}")
            return None
        
        # Create a temporary file to list video files
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            for video_file in video_files:
                f.write(f"file '{video_file}'\n")
            temp_list_path = f.name
        
        try:
            # Use ffmpeg to concatenate videos
            logging.info(f"[DAILY VIDEO DEBUG] Combining {len(video_files)} videos into daily video")
            
            # Construct ffmpeg command
            ffmpeg_cmd = [
                'ffmpeg',
                '-f', 'concat',
                '-safe', '0',
                '-i', temp_list_path,
                '-c', 'copy',
                output_path
            ]
            
            # Log the command
            logging.info(f"[DAILY VIDEO DEBUG] Running command: {' '.join(ffmpeg_cmd)}")
            
            # Run the command
            process = await asyncio.create_subprocess_exec(
                *ffmpeg_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logging.error(f"[DAILY VIDEO DEBUG] Error combining videos: {stderr.decode()}")
                return None
            
            logging.info(f"[DAILY VIDEO DEBUG] Successfully created daily video: {output_path}")
            return output_path
            
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_list_path)
            except:
                pass
    
    except Exception as e:
        logging.error(f"[DAILY VIDEO DEBUG] Error generating daily video for {staff_id}: {str(e)}")
        return None

if __name__ == "__main__":
    # Load configuration at startup
    config = load_config()
    logger.info("OEKS Team Tracker - Combined Server starting...")
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Run the server
    asyncio.run(run_server()) 