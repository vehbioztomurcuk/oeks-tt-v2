<think>I need to translate the Turkish README.md to English, keeping the same structure and content. I'll maintain all the technical details, instructions, and formatting, just changing the language from Turkish to English.</think>```markdown:README.md
# OEKS Team Tracker

## Overview
OEKS Team Tracker is a lightweight, low-resource monitoring solution designed to track the productivity and activity of remote teams in real-time. This application captures screenshots from staff computers at regular intervals and displays them in a centralized management dashboard, providing managers with an instant view of team activity.

## Features
- **Real-Time Monitoring**: Automatic screenshot capture at 3-second intervals
- **Centralized Management Dashboard**: View all staff activity from a single panel
- **Staff Filtering**: Filter staff by name or department
- **Live Viewing Mode**: Full-screen, real-time monitoring for selected staff
- **Automatic Status Indicators**: Active/inactive staff status tracking
- **Dark Theme Interface**: Modern design that reduces eye strain
- **Local Storage**: Screenshots are stored locally, no cloud required
- **Low Bandwidth Usage**: Optimized image sizes
- **Multilingual Support**: Full Turkish interface with English option

## Architecture
OEKS Team Tracker consists of two simple and effective main components:

1. **Staff Application (`staff_app.py`)**: 
   - Runs on staff computers
   - Captures screenshots at specific intervals
   - Transmits images securely to the main server via WebSocket
   - Retrieves department and name information from configuration file

2. **Admin Server (`admin_server.py`)**: 
   - Receives and stores data from staff applications
   - Combines WebSocket and HTTP servers
   - Provides a web-based management dashboard
   - Organizes and serves screenshots
   - Tracks staff status

## Installation

### Requirements
- Python 3.8+
- The following Python packages:
  - websockets
  - pillow (PIL)
  - mss

### Installation Steps
1. Clone this repository to your computer:
   ```
   git clone https://github.com/your-username/oeks-team-tracker.git
   ```

2. Install the required packages:
   ```
   pip install websockets pillow mss
   ```

3. Edit the configuration files (details provided below)

### Server Setup
1. Edit the `admin_config.json` file:
   ```json
   {
     "api_key": "oeks_secret_key_2024",
     "host": "0.0.0.0",
     "ws_port": 8765,
     "http_port": 8080,
     "screenshots_dir": "screenshots"
   }
   ```

2. Start the server:
   ```
   python admin_server.py
   ```

### Staff Application Setup
1. Edit the `config.json` file on each staff computer:
   ```json
   {
     "admin_ws_url": "ws://SERVER_IP:8765",
     "api_key": "oeks_secret_key_2024",
     "staff_id": "staff_pc_UNIQUE_ID",
     "name": "Staff Name",
     "division": "Department",
     "screenshot_interval": 3,
     "jpeg_quality": 30
   }
   ```

2. Start the staff application:
   ```
   python staff_app.py
   ```

## Usage
1. Access the management interface via browser: `http://SERVER_IP:8080`
2. View the list of all staff and their screenshots
3. Use the filters at the top to filter staff by name or department
4. Click on any staff card to enter live viewing mode
5. Use the option in the top right corner to change the refresh rate

## Troubleshooting
- **Connection Issues**: Make sure the server IP address is correctly configured and the necessary ports are open
- **Images Not Visible**: Check that the folder where screenshots are saved exists and that you've done a full refresh (Ctrl+F5) in your browser
- **WebSocket Errors**: Ensure your firewall allows WebSocket connections

## Security Measures
- The API key must be the same in both configuration files
- Use a stronger API key in production environments
- Avoid monitoring screen areas containing sensitive information
- Run on a local network whenever possible

## Technical Details

### Screenshot Capture
Screenshots are captured using the `mss` library, resized, and compressed in JPEG format. Screenshot quality and capture interval are configurable.

### Data Transmission
Two main communication channels are used:
- **WebSocket**: For real-time transmission of screenshots
- **HTTP**: For web interface and static image service

### Data Storage
Screenshots are stored in folders organized by staff ID, named with timestamps. The latest screenshot for each staff member can be accessed via `latest.jpg`.

## Future Developments
- Automatic cleanup and archiving of old screenshots
- More advanced user authorization system
- Staff activity reports and statistics
- Mobile application support
- Multi-language support
- Screenshot comparison and change detection

## License
This software is licensed under [license information].

## Contact
For any questions, suggestions, or contributions, please contact:
- Email: vehbi.oztomurcuk@gmail.com
- GitHub: vehbioztomurcuk