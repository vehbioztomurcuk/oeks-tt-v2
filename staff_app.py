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

async def send_screenshots():
    """Main function to send screenshots to admin server"""
    config = load_config()
    staff_id = config.get("staff_id", "unknown")
    
    # TESTING: Use a shorter interval for testing (1 minute instead of 3)
    # TODO: Change back to config.get("screenshot_interval", 3) after testing
    interval = 1  # 1 second interval for faster testing
    
    quality = config.get("jpeg_quality", 30)
    
    logging.info(f"[DEBUG] Starting screenshot capture with {interval} second interval")
    
    while True:
        try:
            # Connect to the WebSocket server
            logging.info(f"Connecting to {config['admin_ws_url']}")
            async with websockets.connect(config['admin_ws_url']) as websocket:
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
                    logging.error(f"Authentication failed: {response_data.get('message', 'Unknown error')}")
                    await asyncio.sleep(10)  # Wait before retrying
                    continue
                
                logging.info("Authentication successful")
                
                # Send screenshots at regular intervals
                screenshot_count = 0
                while True:
                    # Capture screenshot
                    screenshot_data = capture_screenshot(quality)
                    
                    if screenshot_data:
                        # Create filename with timestamp
                        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
                        filename = f"{staff_id}-{timestamp}.jpg"
                        
                        # Send screenshot metadata
                        message = {
                            "type": "screenshot_data",
                            "staff_id": staff_id,
                            "timestamp": datetime.now().isoformat(),
                            "filename": filename
                        }
                        
                        # First send the JSON message
                        await websocket.send(json.dumps(message))
                        
                        # Then send the binary screenshot data
                        await websocket.send(screenshot_data)
                        
                        screenshot_count += 1
                        logging.info(f"[DEBUG] Sent screenshot #{screenshot_count}, size: {len(screenshot_data)} bytes")
                    else:
                        logging.warning("Failed to capture screenshot")
                    
                    # Sleep for the configured interval
                    await asyncio.sleep(interval)
                    
        except websockets.exceptions.ConnectionClosed as e:
            logging.error(f"WebSocket connection closed: {e}")
        except Exception as e:
            logging.error(f"Error: {e}")
        
        await asyncio.sleep(5)  # Wait before reconnecting

if __name__ == "__main__":
    try:
        logger.info("OEKS Team Tracker - Staff Application starting...")
        asyncio.run(send_screenshots())
    except KeyboardInterrupt:
        logger.info("Application stopped by user")
    except Exception as e:
        logger.critical(f"Fatal error: {e}")