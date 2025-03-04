import asyncio
import json
import logging
import os
import time
import uuid
from datetime import datetime
from io import BytesIO
from PIL import Image
import websockets
import mss
import socket
import cv2
import numpy as np
import tempfile

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('staff_app')

# Load configuration
def load_config():
    try:
        with open('config.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error("Configuration file not found. Creating default config.")
        # Get computer hostname
        hostname = socket.gethostname()
        default_config = {
            "admin_ws_url": "ws://localhost:8765",  # Change this to admin PC IP
            "api_key": "default_key_change_me",
            "staff_id": f"{hostname}_{uuid.uuid4().hex[:8]}",
            "name": "Unknown User",
            "division": "Unassigned",
            "screenshot_interval": 3,
            "jpeg_quality": 30
        }
        with open('config.json', 'w') as f:
            json.dump(default_config, f, indent=4)
        return default_config

# Screenshot capture function - optimize for quality
def capture_screenshot(quality=30):
    try:
        with mss.mss() as sct:
            # Get all monitors except the first one (which is usually a combined view)
            monitors = sct.monitors[1:]  # Skip index 0 which is the "all in one" monitor
            
            if len(monitors) == 1:
                # If only one monitor, use existing behavior
                monitor = monitors[0]
                sct_img = sct.grab(monitor)
                img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
            else:
                # Capture each monitor
                images = []
                for monitor in monitors:
                    sct_img = sct.grab(monitor)
                    img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
                    images.append(img)
                
                # Calculate dimensions for the combined image
                total_width = sum(img.width for img in images)
                max_height = max(img.height for img in images)
                
                # Create a new image to hold all screenshots
                combined = Image.new('RGB', (total_width, max_height))
                
                # Paste all images side by side
                x_offset = 0
                for img in images:
                    combined.paste(img, (x_offset, 0))
                    x_offset += img.width
                
                img = combined
            
            # Resize to reduce size but keep reasonable quality
            width, height = img.size
            new_width = min(1920, width)  # Increased max width to accommodate multiple screens
            new_height = int(height * (new_width / width))
            img = img.resize((new_width, new_height), Image.LANCZOS)
            
            # Convert to bytes with appropriate quality
            buffer = BytesIO()
            img.save(buffer, format="JPEG", quality=quality, optimize=True)
            return buffer.getvalue()
            
    except Exception as e:
        logger.error(f"Screenshot capture failed: {e}")
        return None

def get_video_filename(staff_id):
    """Generate video filename in format: STAFFNAME-MM-DD-YYYY.mp4"""
    today = datetime.now()
    return f"{staff_id}-{today.strftime('%m-%d-%Y')}.mp4"

class VideoRecorder:
    def __init__(self, staff_id, output_dir="videos", fps=1, quality=23):
        self.staff_id = staff_id
        self.output_dir = os.path.join(os.getcwd(), output_dir)  # Use absolute path
        self.fps = fps
        self.quality = quality
        self.writer = None
        self.current_date = None
        self.target_height = 1080
        os.makedirs(output_dir, exist_ok=True)
        self.frame_buffer = []  # Store frames temporarily
        self.max_buffer_size = 5  # Number of frames to buffer before sending
    
    def ensure_writer(self):
        """Create or update video writer if needed"""
        current_date = datetime.now().date()
        
        # Create new video file if date changed or writer doesn't exist
        if self.current_date != current_date or self.writer is None:
            if self.writer:
                self.writer.release()
            
            filename = get_video_filename(self.staff_id)
            filepath = os.path.join(self.output_dir, filename)
            
            # Use mp4v codec which is more widely supported
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            
            # Create writer with lower resolution for better performance
            self.writer = cv2.VideoWriter(
                filepath,
                fourcc,
                self.fps,
                (1280, 720),  # Reduced resolution
                True  # Color
            )
            
            if not self.writer.isOpened():
                logger.error("Failed to create video writer")
                return False
                
            self.current_date = current_date
            logger.info(f"Started new video file: {filename}")
            return True
        return False

    def capture_frame(self):
        """Capture frame from screen and return success status"""
        try:
            with mss.mss() as sct:
                monitors = sct.monitors[1:]
                
                if len(monitors) == 1:
                    # Single monitor setup
                    monitor = monitors[0]
                else:
                    # Multiple monitors - use primary
                    monitor = monitors[0]
                
                screenshot = sct.grab(monitor)
                img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
                
                # Resize for video recording (maintain aspect ratio)
                width, height = img.size
                
                # Don't resize if already small enough
                if height > self.target_height:
                    new_width = int(width * (self.target_height / height))
                    img = img.resize((new_width, self.target_height), Image.Resampling.LANCZOS)
                
                # Convert PIL image to OpenCV format for video writing
                frame = np.array(img)
                frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)  # Convert RGB to BGR
                
                # Resize to 720p for consistent video size
                frame = cv2.resize(frame, (1280, 720))
                
                # Store in buffer
                self.frame_buffer.append(frame)
                
                # Also write locally
                if self.writer:
                    self.writer.write(frame)
                
                return True
        except Exception as e:
            logger.error(f"Error capturing frame: {e}")
            return False
    
    def get_video_data(self):
        """Get video frames as binary data and clear buffer"""
        if not self.frame_buffer:
            return None
            
        # Create a temporary file to hold the video
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp:
            temp_path = temp.name
        
        # Create a temporary video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        temp_writer = cv2.VideoWriter(
            temp_path,
            fourcc,
            self.fps,
            (1280, 720),
            True
        )
        
        # Write all buffered frames
        for frame in self.frame_buffer:
            temp_writer.write(frame)
        
        # Release writer and clear buffer
        temp_writer.release()
        self.frame_buffer = []
        
        # Read the temporary file
        with open(temp_path, 'rb') as f:
            video_data = f.read()
        
        # Delete the temporary file
        try:
            os.unlink(temp_path)
        except:
            pass
            
        return video_data
    
    def release(self):
        """Release video writer resources"""
        if self.writer:
            self.writer.release()
            self.writer = None

# Modified send_screenshots function to handle WebSocket connections better
async def send_screenshots():
    """Main function to send screenshots to admin server"""
    config = load_config()
    staff_id = config.get("staff_id", "unknown")
    interval = config.get("screenshot_interval", 3)
    video_interval = config.get("video_interval", 3)
    
    # Create a video recorder
    recorder = VideoRecorder(staff_id)
    
    while True:
        try:
            # Connect to the WebSocket server
            logger.info(f"Connecting to {config['admin_ws_url']}")
            async with websockets.connect(config["admin_ws_url"]) as websocket:
                # Authenticate with server
                auth_message = {
                    "type": "auth",
                    "staff_id": staff_id,
                    "api_key": config["api_key"],
                    "name": config.get("name", "Unknown"),
                    "division": config.get("division", "Unassigned")
                }
                
                await websocket.send(json.dumps(auth_message))
                response = await websocket.recv()
                response_data = json.loads(response)
                
                if response_data.get("status") != "authenticated":
                    logger.error(f"Authentication failed: {response_data.get('message', 'Unknown error')}")
                    await asyncio.sleep(10)  # Wait before retrying
                    continue
                
                logger.info("Authentication successful")
                
                # Send data at regular intervals
                while True:
                    # Capture a new frame
                    if recorder.capture_frame():
                        logger.info("Frame captured successfully")
                        
                        # Check if we have enough frames to send
                        if len(recorder.frame_buffer) >= recorder.max_buffer_size:
                            video_data = recorder.get_video_data()
                            if video_data:
                                # Send video data to server
                                message = {
                                    "type": "video_data",
                                    "staff_id": staff_id,
                                    "timestamp": datetime.now().isoformat(),
                                    "video_file": get_video_filename(staff_id)
                                }
                                
                                # First send the JSON message
                                await websocket.send(json.dumps(message))
                                
                                # Then send the binary video data
                                await websocket.send(video_data)
                                
                                logger.info(f"Sent video data, size: {len(video_data)} bytes")
                    
                    # Sleep for the configured interval
                    await asyncio.sleep(interval)
                    
        except websockets.exceptions.ConnectionClosed as e:
            logger.error(f"WebSocket connection closed: {e}")
        except Exception as e:
            logger.error(f"Error: {e}")
        
        recorder.release()
        await asyncio.sleep(5)  # Wait before reconnecting

if __name__ == "__main__":
    try:
        logger.info("OEKS Team Tracker - Staff Application starting...")
        asyncio.run(send_screenshots())
    except KeyboardInterrupt:
        logger.info("Application stopped by user")
    except Exception as e:
        logger.critical(f"Fatal error: {e}")