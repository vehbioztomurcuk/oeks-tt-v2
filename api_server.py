import os
import json
import logging
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import mimetypes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('api_server')

def load_config():
    try:
        with open('admin_config.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error("Configuration file not found.")
        return {"screenshots_dir": "screenshots", "api_port": 8081}

class APIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        config = load_config()
        screenshots_dir = config.get("screenshots_dir", "screenshots")
        
        if self.path == '/api/staff-list':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            # Get list of staff directories
            staff_list = []
            latest_screenshots = {}
            
            if os.path.exists(screenshots_dir):
                for staff_id in os.listdir(screenshots_dir):
                    staff_dir = os.path.join(screenshots_dir, staff_id)
                    
                    if os.path.isdir(staff_dir):
                        staff_list.append(staff_id)
                        
                        # Find the latest screenshot for this staff member
                        screenshot_files = [f for f in os.listdir(staff_dir) if f.endswith('.jpg')]
                        
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
                                os.symlink(latest_file, latest_link)
                            except (OSError, AttributeError):
                                # If symlinks not supported, just copy the file
                                try:
                                    with open(file_path, 'rb') as src, open(latest_link, 'wb') as dst:
                                        dst.write(src.read())
                                except Exception as e:
                                    logger.error(f"Failed to copy latest screenshot: {e}")
                            
                            # Get modified time as ISO string
                            mod_time = datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                            
                            latest_screenshots[staff_id] = {
                                "path": f"screenshots/{staff_id}/latest.jpg",
                                "timestamp": mod_time
                            }
            
            response = {
                "staffList": staff_list,
                "latestScreenshots": latest_screenshots
            }
            
            self.wfile.write(json.dumps(response).encode())
            return
        
        # Serve static files (screenshots)
        if self.path.startswith('/screenshots/'):
            file_path = self.path[1:]  # Remove leading slash
            
            if os.path.isfile(file_path):
                self.send_response(200)
                
                # Determine content type
                content_type, _ = mimetypes.guess_type(file_path)
                if content_type:
                    self.send_header('Content-type', content_type)
                else:
                    self.send_header('Content-type', 'application/octet-stream')
                    
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
                return
        
        # Default - return 404
        self.send_response(404)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'Not Found')
    
    def log_message(self, format, *args):
        logger.info("%s - %s" % (self.address_string(), format % args))

def run_api_server():
    config = load_config()
    host = config.get("host", "0.0.0.0")
    port = config.get("api_port", 8081)
    
    server = HTTPServer((host, port), APIHandler)
    logger.info(f"API server starting on http://{host}:{port}")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down API server...")
        server.server_close()

if __name__ == "__main__":
    run_api_server() 