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
            monitor = sct.monitors[1]  # Primary monitor
            sct_img = sct.grab(monitor)
            img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
            
            # Resize to reduce size but keep reasonable quality
            width, height = img.size
            new_width = min(1280, width)  # Max width 1280px for bandwidth saving
            new_height = int(height * (new_width / width))
            img = img.resize((new_width, new_height), Image.LANCZOS)
            
            # Enhance image quality slightly
            # from PIL import ImageEnhance
            # enhancer = ImageEnhance.Contrast(img)
            # img = enhancer.enhance(1.2)  # Slightly enhance contrast
            
            # Convert to bytes with appropriate quality
            buffer = BytesIO()
            img.save(buffer, format="JPEG", quality=quality, optimize=True)
            return buffer.getvalue()
    except Exception as e:
        logger.error(f"Screenshot capture failed: {e}")
        return None

# WebSocket client with retry mechanism
async def send_screenshots():
    config = load_config()
    admin_ws_url = config["admin_ws_url"]
    api_key = config["api_key"]
    staff_id = config["staff_id"]
    name = config.get("name", "Unknown User")  # Get name with fallback
    division = config.get("division", "Unassigned")  # Get division with fallback
    interval = config["screenshot_interval"]
    quality = config["jpeg_quality"]
    
    # Add variable to track previous screenshot for comparison
    previous_screenshot = None
    
    retry_count = 0
    max_retries = 5
    base_delay = 1
    
    while True:
        try:
            logger.info(f"Connecting to admin server at {admin_ws_url}...")
            async with websockets.connect(admin_ws_url) as websocket:
                logger.info(f"Connected to admin server at {admin_ws_url}")
                retry_count = 0  # Reset retry count on successful connection
                
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
                
                # Main screenshot loop
                while True:
                    screenshot = capture_screenshot(quality)
                    if screenshot:
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:20]  # Include milliseconds
                        
                        # Determine if screen has changed
                        activity_status = "active"
                        if previous_screenshot:
                            # If screenshot size is very similar, screen might not have changed much
                            if abs(len(screenshot) - len(previous_screenshot)) < 100:
                                activity_status = "idle"
                        
                        previous_screenshot = screenshot
                        
                        # Send metadata first with activity status
                        metadata = json.dumps({
                            "type": "metadata",
                            "staff_id": staff_id,
                            "name": name,
                            "division": division,
                            "timestamp": timestamp,
                            "size": len(screenshot),
                            "activity_status": activity_status
                        })
                        await websocket.send(metadata)
                        
                        # Then send the actual image
                        await websocket.send(screenshot)
                        logger.info(f"Screenshot sent successfully ({len(screenshot)/1024:.1f} KB) - Status: {activity_status}")
                    
                    await asyncio.sleep(interval)
                    
        except (websockets.exceptions.ConnectionClosed, 
                websockets.exceptions.WebSocketException,
                ConnectionRefusedError,
                socket.gaierror) as e:
            retry_count += 1
            delay = min(60, base_delay * (2 ** retry_count))  # Exponential backoff
            logger.error(f"Connection error: {e}. Retrying in {delay} seconds (attempt {retry_count}/{max_retries})")
            
            if retry_count >= max_retries:
                logger.critical(f"Max retries reached. Waiting 60 seconds before trying again.")
                retry_count = 0
                await asyncio.sleep(60)
            else:
                await asyncio.sleep(delay)
        
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    try:
        logger.info("OEKS Team Tracker - Staff Application starting...")
        asyncio.run(send_screenshots())
    except KeyboardInterrupt:
        logger.info("Application stopped by user")
    except Exception as e:
        logger.critical(f"Fatal error: {e}")