import os
import json
import logging
import time
import shutil
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('cleanup_script')

def load_config():
    try:
        with open('admin_config.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error("Configuration file not found.")
        return {"screenshots_dir": "screenshots", "retention_days": 30}

def cleanup_old_screenshots():
    config = load_config()
    screenshots_dir = config.get("screenshots_dir", "screenshots")
    retention_days = config.get("retention_days", 30)
    
    if not os.path.exists(screenshots_dir):
        logger.warning(f"Screenshots directory '{screenshots_dir}' does not exist.")
        return
    
    cutoff_date = datetime.now() - timedelta(days=retention_days)
    cutoff_timestamp = cutoff_date.timestamp()
    
    total_removed = 0
    bytes_freed = 0
    
    logger.info(f"Starting cleanup of screenshots older than {cutoff_date.strftime('%Y-%m-%d')}")
    
    # Process each staff directory
    for staff_id in os.listdir(screenshots_dir):
        staff_dir = os.path.join(screenshots_dir, staff_id)
        
        if not os.path.isdir(staff_dir):
            continue
            
        # Process all files in the staff directory
        for filename in os.listdir(staff_dir):
            file_path = os.path.join(staff_dir, filename)
            
            if not os.path.isfile(file_path):
                continue
                
            # Check file modification time
            file_time = os.path.getmtime(file_path)
            
            if file_time < cutoff_timestamp:
                file_size = os.path.getsize(file_path)
                try:
                    os.remove(file_path)
                    total_removed += 1
                    bytes_freed += file_size
                    logger.debug(f"Removed old file: {file_path}")
                except Exception as e:
                    logger.error(f"Failed to remove {file_path}: {e}")
    
    logger.info(f"Cleanup completed. Removed {total_removed} files, freed {bytes_freed/1024/1024:.2f} MB.")

if __name__ == "__main__":
    cleanup_old_screenshots() 