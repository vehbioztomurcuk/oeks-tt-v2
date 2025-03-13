# OEKS Team Tracker

## Overview
OEKS Team Tracker is a lightweight, low-resource monitoring solution designed to track the productivity and activity of remote teams in real-time. This application captures screenshots from staff computers at regular intervals and displays them in a centralized management dashboard, providing managers with an instant view of team activity.

## Features
- **Real-Time Screenshot Monitoring**: Automatic screenshot capture at regular intervals
- **Centralized Management Dashboard**: View all staff activity from a single panel
- **Staff Filtering**: Filter staff by name, department, or status
- **Live Viewing Mode**: Full-screen, real-time monitoring for selected staff
- **Automatic Status Indicators**: Active/inactive staff status tracking
- **Dark Theme Interface**: Modern design that reduces eye strain
- **Local Storage**: Screenshots are stored locally, no cloud required
- **Low Bandwidth Usage**: Optimized image compression
- **History Playback**: Review staff activity with interactive timeline and playback controls
- **5-Minute Video Generation**: Automatic creation of 5-minute videos from recent screenshots
- **Video History**: Browse and play videos generated from staff screenshots
- **History Search**: Search through screenshot history by time or filename
- **Multilingual Support**: Full Turkish interface with English option

## Architecture
OEKS Team Tracker consists of two simple and effective main components:

1. **Staff Application (`staff_app.py`)**: 
   - Runs on staff computers
   - Captures screenshots at specific intervals
   - Transmits screenshots securely to the main server via WebSocket
   - Retrieves department and name information from configuration file

2. **Admin Server (`admin_server.py`)**: 
   - Receives and stores data from staff applications
   - Combines WebSocket and HTTP servers
   - Provides a web-based management dashboard
   - Organizes and serves screenshots
   - Generates videos from screenshots
   - Tracks staff status

3. **Frontend (Modularized Structure)**:
   - `index.html`: Main HTML structure
   - `css/styles.css`: All styling rules
   - `js/utils.js`: Utility functions for date formatting, image loading, etc.
   - `js/dashboard.js`: Dashboard display, filter controls, and stats
   - `js/modal.js`: Modal dialog and live view functionality
   - `js/history.js`: Staff history viewing and playback
   - `js/video-history.js`: Video history viewing and playback
   - `js/script.js`: Application initialization and component integration

## Installation

### Requirements
- Python 3.8+
- The following Python packages:
  - websockets
  - pillow (PIL)
  - mss
  - opencv-python (for video processing)

### Installation Steps
1. Clone this repository to your computer:
   ```
   git clone https://github.com/your-username/oeks-team-tracker.git
   ```

2. Install the required packages:
   ```
   pip install -r requirements.txt
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
     "screenshots_dir": "screenshots",
     "retention_days": 30
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
2. View the list of all staff and their live screenshots
3. Use the filters at the top to filter staff by name, department, or status
4. Click on any staff card to enter live viewing mode with detailed information
5. In live view mode, access the history section to review past screenshots
6. Use the tabs to switch between screenshot history and video history
7. Use the search function to find specific screenshots by time or filename
8. View automatically generated 5-minute videos of staff activity
9. Use the option in the top right corner to change the refresh rate

## Troubleshooting
- **Connection Issues**: Make sure the server IP address is correctly configured and the necessary ports are open
- **Screenshots Not Visible**: Check that the folder where screenshots are saved exists and that you've done a full refresh (Ctrl+F5) in your browser
- **WebSocket Errors**: Ensure your firewall allows WebSocket connections
- **Video Playback Issues**: Make sure your browser supports HTML5 video playback and that the video codec is compatible

## Security Measures
- The API key must be the same in both configuration files
- Use a stronger API key in production environments
- Avoid monitoring screen areas containing sensitive information
- Run on a local network whenever possible

## Technical Details

### Screenshot Capture
Screenshots are captured using advanced screen capture techniques, compressed, and transmitted to the server. Image quality and capture interval are configurable.

### Video Generation
The system automatically generates 5-minute videos from recent screenshots every 5 minutes. These videos are stored in a videos subdirectory for each staff member and can be accessed through the admin interface.

### Data Transmission
Two main communication channels are used:
- **WebSocket**: For real-time transmission of screenshots
- **HTTP**: For web interface and screenshot/video service

### Data Storage
Screenshots are stored in folders organized by staff ID, named with timestamps. The latest screenshot for each staff member can be accessed via `latest.jpg`. Videos are stored in a `videos` subdirectory within each staff folder.

### Modular Frontend
The application's frontend is modularized for easier maintenance:
- **CSS**: All styles are in a separate CSS file
- **JavaScript**: Functionality is split into logical modules (utils, dashboard, modal, history, video-history, and main script)

## Future Developments
- Automatic cleanup and archiving of old screenshots and videos
- More advanced user authorization system
- Staff activity reports and statistics
- Mobile application support
- Multi-language support
- Image analysis and anomaly detection
- Full-day video generation

## License
This software is licensed under [license information].

## Contact
For any questions, suggestions, or contributions, please contact:
- Email: vehbi.oztomurcuk@gmail.com
- GitHub: vehbioztomurcuk

## Project Structure

```
oeks-tt-v2
├─ admin_config.json
├─ admin_server.py
├─ cleanup_script.py
├─ config.json
├─ css
│  └─ styles.css
├─ index.html
├─ js
│  ├─ dashboard.js
│  ├─ history.js
│  ├─ modal.js
│  ├─ script.js
│  ├─ utils.js
│  └─ video-history.js
├─ README-TR.md
├─ README.md
├─ requirements.txt
├─ save.md
├─ selam.html
└─ staff_app.py

```
```
oeks-tt-v2
├─ admin_config.json
├─ admin_server.py
├─ cleanup_script.py
├─ config.json
├─ css
│  └─ styles.css
├─ index.html
├─ js
│  ├─ dashboard.js
│  ├─ history.js
│  ├─ modal.js
│  ├─ script.js
│  ├─ utils.js
│  └─ video-history.js
├─ README-TR.md
├─ README.md
├─ requirements.txt
├─ save.md
├─ selam.html
└─ staff_app.py

```