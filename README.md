# OEKS Team Tracker

## Overview
OEKS Team Tracker is a lightweight, low-resource monitoring solution designed to track the productivity and activity of remote teams in real-time. This application captures video from staff computers at regular intervals and displays them in a centralized management dashboard, providing managers with an instant view of team activity.

## Features
- **Real-Time Video Monitoring**: Automatic video capture at regular intervals
- **Centralized Management Dashboard**: View all staff activity from a single panel
- **Staff Filtering**: Filter staff by name, department, or status
- **Live Viewing Mode**: Full-screen, real-time monitoring for selected staff
- **Automatic Status Indicators**: Active/inactive staff status tracking
- **Dark Theme Interface**: Modern design that reduces eye strain
- **Local Storage**: Videos are stored locally, no cloud required
- **Low Bandwidth Usage**: Optimized video compression
- **History Playback**: Review staff activity with interactive timeline and playback controls
- **Multilingual Support**: Full Turkish interface with English option

## Architecture
OEKS Team Tracker consists of two simple and effective main components:

1. **Staff Application (`staff_app.py`)**: 
   - Runs on staff computers
   - Captures video at specific intervals
   - Transmits video securely to the main server via WebSocket
   - Retrieves department and name information from configuration file

2. **Admin Server (`admin_server.py`)**: 
   - Receives and stores data from staff applications
   - Combines WebSocket and HTTP servers
   - Provides a web-based management dashboard
   - Organizes and serves videos
   - Tracks staff status

3. **Frontend (Modularized Structure)**:
   - `index.html`: Main HTML structure
   - `css/styles.css`: All styling rules
   - `js/utils.js`: Utility functions for date formatting, image loading, etc.
   - `js/dashboard.js`: Dashboard display, filter controls, and stats
   - `js/modal.js`: Modal dialog and live view functionality
   - `js/history.js`: Staff history viewing and playback
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
     "videos_dir": "videos"
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
     "video_interval": 3,
     "video_quality": 30
   }
   ```

2. Start the staff application:
   ```
   python staff_app.py
   ```

## Usage
1. Access the management interface via browser: `http://SERVER_IP:8080`
2. View the list of all staff and their live videos
3. Use the filters at the top to filter staff by name, department, or status
4. Click on any staff card to enter live viewing mode with detailed information
5. In live view mode, access the history section to review past activity
6. Use the option in the top right corner to change the refresh rate

## Troubleshooting
- **Connection Issues**: Make sure the server IP address is correctly configured and the necessary ports are open
- **Videos Not Visible**: Check that the folder where videos are saved exists and that you've done a full refresh (Ctrl+F5) in your browser
- **WebSocket Errors**: Ensure your firewall allows WebSocket connections
- **Video Playback Issues**: Make sure your browser supports HTML5 video playback

## Security Measures
- The API key must be the same in both configuration files
- Use a stronger API key in production environments
- Avoid monitoring screen areas containing sensitive information
- Run on a local network whenever possible

## Technical Details

### Video Capture
Videos are captured using advanced screen recording techniques, compressed, and transmitted to the server. Video quality and capture interval are configurable.

### Data Transmission
Two main communication channels are used:
- **WebSocket**: For real-time transmission of videos
- **HTTP**: For web interface and video service

### Data Storage
Videos are stored in folders organized by staff ID, named with timestamps. The latest video for each staff member can be accessed via `latest.mp4`.

### Modular Frontend
The application's frontend is now modularized for easier maintenance:
- **CSS**: All styles are in a separate CSS file
- **JavaScript**: Functionality is split into logical modules (utils, dashboard, modal, history, and main script)

## Future Developments
- Automatic cleanup and archiving of old videos
- More advanced user authorization system
- Staff activity reports and statistics
- Mobile application support
- Multi-language support
- Video analysis and anomaly detection

## License
This software is licensed under [license information].

## Contact
For any questions, suggestions, or contributions, please contact:
- Email: vehbi.oztomurcuk@gmail.com
- GitHub: vehbioztomurcuk

```
oeks-tt-2
├─ admin_config.json
├─ admin_server.py
├─ archieve
│  ├─ api_server.py
│  ├─ combined_server.py
│  ├─ package.bat
│  └─ trash
│     ├─ latest-message.md
│     ├─ Prompt-2.md
│     └─ prompt.md
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
│  └─ utils.js
├─ README-TR.md
├─ README.md
├─ requirements.txt
├─ save.md
├─ staff_app.py
└─ videos

```
```
oeks-tt-2
├─ admin_config.json
├─ admin_server.py
├─ archieve
│  ├─ api_server.py
│  ├─ combined_server.py
│  ├─ package.bat
│  └─ trash
│     ├─ latest-message.md
│     ├─ Prompt-2.md
│     └─ prompt.md
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
│  └─ utils.js
├─ README-TR.md
├─ README.md
├─ requirements.txt
├─ save.md
├─ staff_app.py
└─ videos
   └─ staff_pc_141

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
│  └─ utils.js
├─ README-TR.md
├─ README.md
├─ requirements.txt
├─ save.md
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
│  └─ utils.js
├─ README-TR.md
├─ README.md
├─ requirements.txt
├─ save.md
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
└─ staff_app.py

```