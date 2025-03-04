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
        self.output_dir = output_dir
        self.fps = fps
        self.quality = quality  # Higher number = lower quality (23 is a good balance)
        self.writer = None
        self.current_date = None
        self.target_height = 1080  # Standard height for all frames
        os.makedirs(output_dir, exist_ok=True)
    
    def ensure_writer(self):
        """Create or update video writer if needed"""
        current_date = datetime.now().date()
        
        # Create new video file if date changed or writer doesn't exist
        if self.current_date != current_date or self.writer is None:
            if self.writer:
                self.writer.release()
            
            filename = get_video_filename(self.staff_id)
            filepath = os.path.join(self.output_dir, filename)
            
            # Use MJPG codec instead of H264
            fourcc = cv2.VideoWriter_fourcc(*'MJPG')
            self.writer = cv2.VideoWriter(
                filepath,
                fourcc,
                self.fps,
                (1920, 1080),  # Standard resolution
                True  # Color
            )
            self.current_date = current_date
            logger.info(f"Started new video file: {filename}")
            return True
        return False

    def capture_frame(self):
        """Capture frame from screen and return success status"""
        try:
            with mss.mss() as sct:
                monitors = sct.monitors[1:]  # Skip index 0
                
                if len(monitors) == 1:
                    # Single monitor setup
                    monitor = monitors[0]
                    screen = np.array(sct.grab(monitor))
                    frame = cv2.cvtColor(screen, cv2.COLOR_BGRA2BGR)
                else:
                    # Multiple monitor setup - resize before combining
                    frames = []
                    for monitor in monitors:
                        screen = np.array(sct.grab(monitor))
                        frame = cv2.cvtColor(screen, cv2.COLOR_BGRA2BGR)
                        # Calculate new width while maintaining aspect ratio
                        aspect_ratio = frame.shape[1] / frame.shape[0]
                        new_width = int(self.target_height * aspect_ratio)
                        # Resize frame
                        frame = cv2.resize(frame, (new_width, self.target_height))
                        frames.append(frame)
                    
                    # Combine resized frames horizontally
                    frame = np.hstack(frames)
                
                # Ensure final frame is at target resolution
                frame = cv2.resize(frame, (1920, 1080))
                
                # Write frame
                self.ensure_writer()
                self.writer.write(frame)
                return True
                
        except Exception as e:
            logger.error(f"Frame capture failed: {e}")
            return False
    
    def release(self):
        """Clean up resources"""
        if self.writer:
            self.writer.release()

# Modified screenshot capture function to use video recorder
async def send_screenshots():
    config = load_config()
    admin_ws_url = config["admin_ws_url"]
    api_key = config["api_key"]
    staff_id = config["staff_id"]
    name = config.get("name", "Unknown User")
    division = config.get("division", "Unassigned")
    
    # Initialize video recorder
    recorder = VideoRecorder(staff_id)
    
    retry_count = 0
    max_retries = 5
    base_delay = 1
    
    while True:
        try:
            logger.info(f"Connecting to admin server at {admin_ws_url}...")
            async with websockets.connect(admin_ws_url) as websocket:
                logger.info("Connected to admin server")
                retry_count = 0
                
                # Authentication
                auth_message = json.dumps({
                    "type": "auth",
                    "api_key": api_key,
                    "staff_id": staff_id,
                    "name": name,
                    "division": division
                })
                await websocket.send(auth_message)
                response = await websocket.recv()
                auth_response = json.loads(response)
                
                if auth_response.get("status") != "authenticated":
                    logger.error(f"Authentication failed: {auth_response.get('message')}")
                    await asyncio.sleep(5)
                    continue
                
                logger.info("Authentication successful")
                
                # Main recording loop
                while True:
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    
                    # Capture frame
                    success = recorder.capture_frame()
                    new_file = recorder.ensure_writer()
                    
                    # Send metadata update
                    metadata = json.dumps({
                        "type": "metadata",
                        "staff_id": staff_id,
                        "name": name,
                        "division": division,
                        "timestamp": timestamp,
                        "recording_status": "active" if success else "error",
                        "video_file": get_video_filename(staff_id)
                    })
                    await websocket.send(metadata)
                    
                    if new_file:
                        logger.info(f"Started new video file: {get_video_filename(staff_id)}")
                    
                    # Wait for next frame (1 FPS)
                    await asyncio.sleep(1)
                    
        except Exception as e:
            logger.error(f"Connection error: {e}")
            retry_count += 1
            delay = min(60, base_delay * (2 ** retry_count))
            await asyncio.sleep(delay)
        
        finally:
            recorder.release()

if __name__ == "__main__":
    try:
        logger.info("OEKS Team Tracker - Staff Application starting...")
        asyncio.run(send_screenshots())
    except KeyboardInterrupt:
        logger.info("Application stopped by user")
    except Exception as e:
        logger.critical(f"Fatal error: {e}")