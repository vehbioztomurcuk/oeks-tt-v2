# OEKS Team Monitoring System - Video Display Issue

## Current Problem

The OEKS Team Monitoring System has a functional issue with video display in the admin panel. Videos are successfully recorded by the staff application and can be played directly from the file system, but they do not load or play in the admin dashboard UI. 

## System Components

- `staff_app.py`: Records video from staff computers
- `admin_server.py`: Serves content and manages WebSocket connections
- `index.html`: Web interface for the admin dashboard

## Specific Issues

1. **Video Loading Failures**: 
   - Videos don't load in the dashboard - only showing spinning indicators
   - The browser console shows 404 errors for null video paths

2. **HTTP Errors**:
   - `GET http://localhost:8080/null?t=1741086736860 404 (Not Found)`
   - `HEAD http://localhost:8080/videos/staff_pc_141-03-04-2025.mp4?t=1741086742?t=1741086742863 501 (Unsupported method ('HEAD'))`

3. **Video Path Handling**:
   - The admin server sometimes returns null video paths
   - The frontend still attempts to load these null paths
   - URL parameters are sometimes duplicated (e.g., `?t=...?t=...`)

4. **WebSocket Issues**:
   - Connections close with code 1006 (abnormal closure)
   - Frequent reconnection attempts occur

## Console Error Example

```
(index):1452 Connecting to WebSocket: ws://localhost:8765
(index):1463 WebSocket bağlantısı kuruldu
(index):1478 WebSocket mesajı alındı: {status: 'authenticated', message: 'Authentication successful'}
null:1 GET http://localhost:8080/null?t=1741086736860 404 (Not Found)
null:1 GET http://localhost:8080/null?t=1741086739655 404 (Not Found)
(index):1018 HEAD http://localhost:8080/videos/staff_pc_141-03-04-2025.mp4?t=1741086742?t=1741086742863 501 (Unsupported method ('HEAD'))
openModal @ (index):1018
(anonymous) @ (index):1395
null:1 GET http://localhost:8080/null?t=1741086742659 404 (Not Found)
(index):1490 WebSocket bağlantısı kapandı: 1006 
(index):1452 Connecting to WebSocket: ws://localhost:8765
```

## Core Issues to Address

1. **Fix Video Path Handling**: Proper checks for null video paths are needed

2. **Improve Video Loading**: The UI needs better error handling when videos can't be loaded

3. **Fix WebSocket Connections**: Address the abnormal WebSocket closures

4. **Remove Legacy UI**: The screenshot history section is obsolete and should be hidden

## Project Context

This system is designed for monitoring staff activity via video recording. The admin panel should display these videos in both a dashboard view (small thumbnails) and a detailed modal view when a staff member is selected. Currently, while the recording and file storage is working correctly, the admin UI cannot properly display these videos.
