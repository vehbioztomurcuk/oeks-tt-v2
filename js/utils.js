/**
 * OEKS Team Tracker - Utility Functions
 * Contains reusable utility functions for the application
 */

/**
 * Formats time difference in a user-friendly way
 * @param {Date} now - Current time
 * @param {Date} then - Past time
 * @returns {string} Formatted time difference
 */
function formatTimeDiff(now, then) {
    const diff = Math.round((now - then) / 1000);
    if (diff < 60) return `${diff} saniye`;
    if (diff < 3600) return `${Math.floor(diff / 60)} dakika`;
    return `${Math.floor(diff / 3600)} saat`;
}

/**
 * Formats a timestamp to show how long ago it occurred
 * @param {string|number|Date} timestamp - The timestamp to format
 * @returns {string} Formatted "time ago" string
 */
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Bilinmiyor';
    
    const now = new Date();
    let then;
    
    // Handle different timestamp formats
    if (timestamp instanceof Date) {
        then = timestamp;
    } else if (typeof timestamp === 'number') {
        then = new Date(timestamp);
    } else {
        // Try to parse string timestamp
        then = new Date(timestamp);
    }
    
    // Check if date is valid
    if (isNaN(then.getTime())) return 'Geçersiz Tarih';
    
    const seconds = Math.floor((now - then) / 1000);
    
    // Define time intervals
    const intervals = {
        yıl: 31536000,
        ay: 2592000,
        hafta: 604800,
        gün: 86400,
        saat: 3600,
        dakika: 60,
        saniye: 1
    };
    
    // Find the appropriate interval
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 && unit !== 'ay' ? '' : ''} önce`;
        }
    }
    
    return 'Az önce';
}

/**
 * Loads an image with retry mechanism
 * @param {HTMLImageElement} imgElement - Image element to load into
 * @param {string} src - Source URL
 * @param {number} attempts - Number of retry attempts
 */
function loadImage(imgElement, src, attempts = 3) {
    if (!imgElement) {
        console.error('Image element is null, cannot load:', src);
        return;
    }
    
    try {
        imgElement.onerror = function() {
            if (attempts > 0) {
                // Retry loading after a short delay
                setTimeout(() => {
                    console.log(`Retrying image load (${attempts} attempts left): ${src}`);
                    loadImage(imgElement, `${src}&retry=${Date.now()}`, attempts - 1);
                }, 1000);
            } else {
                // Give up and use placeholder
                console.error(`Failed to load image after multiple attempts: ${src}`);
                imgElement.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';
            }
        };
        imgElement.src = src;
    } catch (e) {
        console.error('Error setting up image load:', e);
    }
}

/**
 * Get a status indicator with appropriate color
 * @param {string} status - Status string ('active', 'idle', 'inactive')
 * @returns {string} HTML for status indicator
 */
function getStatusIndicator(status) {
    let color = '#888'; // Default gray for unknown
    let label = 'Unknown';
    
    switch(status) {
        case 'active':
            color = '#2ecc71'; // Green for active
            label = 'Active';
            break;
        case 'idle':
            color = '#f39c12'; // Yellow/orange for idle
            label = 'Idle';
            break;
        case 'inactive':
            color = '#e74c3c'; // Red for inactive
            label = 'Inactive';
            break;
    }
    
    return `<span class="status-indicator" style="background-color: ${color};" title="${label}"></span> ${label}`;
}

/**
 * Display a video error message
 * @param {string} message - Error message to display
 */
function showVideoError(message) {
    const videoContainer = document.querySelector('.modal-video-container');
    if (videoContainer) {
        videoContainer.innerHTML = `
            <div class="no-video-message" style="display:flex;height:100%;align-items:center;justify-content:center;background:#111;color:#eee;">
                <div style="text-align:center;">
                    <i class="fas fa-exclamation-triangle" style="font-size:48px;margin-bottom:10px;color:#e74c3c;"></i>
                    <p>${message}</p>
                </div>
            </div>
        `;
    }
}

/**
 * Sets up video error handling
 * @param {HTMLVideoElement} videoElement - The video element to add error handling to
 */
function setupVideoErrorHandling(videoElement) {
    videoElement.onerror = function() {
        console.error('Video loading error:', videoElement.error);
        // Show fallback content without trying to set innerHTML on null
        if (videoElement.parentElement) {
            videoElement.parentElement.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Video yüklenemedi</p>
                </div>
            `;
        }
    };
}

/**
 * Update a video source with proper caching params
 * @param {HTMLVideoElement} videoElement - The video element
 * @param {string} staffId - Staff ID for the video
 */
function updateVideoSource(videoElement, staffId) {
    if (!videoElement) {
        console.error("Cannot update video source: videoElement is null");
        return;
    }
    
    if (!staffId) {
        console.error("Cannot update video source: staffId is null");
        // Show error in the video element's parent if possible
        if (videoElement.parentElement) {
            videoElement.parentElement.innerHTML = `
                <div class="no-video-message" style="display:flex;height:100%;align-items:center;justify-content:center;background:#111;color:#eee;">
                    <div style="text-align:center;">
                        <i class="fas fa-exclamation-triangle" style="font-size:24px;color:#e74c3c;margin-bottom:10px;"></i>
                        <p>Hatalı personel kimliği</p>
                    </div>
                </div>
            `;
        }
        return;
    }
    
    try {
        const timestamp = Date.now();
        // Get the hostname from window.location instead of hardcoding
        const videoHost = window.location.hostname;
        const videoPort = '8080';  // Matches admin_config.json http_port
        const videoUrl = `http://${videoHost}:${videoPort}/videos/${staffId}/latest.mp4?t=${timestamp}`;
        console.log(`Loading video from: ${videoUrl}`);
        
        // Setup error handling before setting src
        setupVideoErrorHandling(videoElement);
        
        // Set the source
        videoElement.src = videoUrl;
    } catch (error) {
        console.error("Error updating video source:", error);
    }
}

/**
 * Connect to WebSocket server
 * @returns {WebSocket} The WebSocket connection
 */
function connectWebSocket() {
    try {
        // Get the proper WebSocket protocol based on whether we're using HTTPS or HTTP
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        
        // Use the same hostname as the page, defaulting to localhost if needed
        const wsHost = window.location.hostname || 'localhost';
        
        // WebSocket port is 8765 (from admin_config.json)
        const wsPort = 8765;
        
        // Construct WebSocket URL
        const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}`;
        
        console.log(`Connecting to WebSocket: ${wsUrl}`);
        
        // Create WebSocket connection
        const socket = new WebSocket(wsUrl);
        
        // Connection opened
        socket.addEventListener('open', (event) => {
            console.log('WebSocket bağlantısı kuruldu');
            
            // Send authentication message
            const authMessage = {
                type: 'auth',
                api_key: 'oeks_secret_key_2024',
                client_type: 'admin'
            };
            
            socket.send(JSON.stringify(authMessage));
            
            // Update connection status
            const statusElement = document.getElementById('connection-status');
            if (statusElement) {
                statusElement.textContent = 'Bağlı';
                statusElement.className = 'status-online';
            }
        });
        
        // Listen for messages
        socket.addEventListener('message', (event) => {
            try {
                console.log('WebSocket mesajı alındı:', event.data);
                const data = JSON.parse(event.data);
                
                // Handle different message types
                if (data.status === 'authenticated') {
                    console.log('WebSocket authentication successful');
                }
                
                // More message handlers can be added here
            } catch (e) {
                console.error('WebSocket message parsing error:', e);
            }
        });
        
        // Connection closed
        socket.addEventListener('close', (event) => {
            console.log(`WebSocket bağlantısı kapandı: ${event.code} ${event.reason || ''}`);
            
            // Update connection status
            const statusElement = document.getElementById('connection-status');
            if (statusElement) {
                statusElement.textContent = 'Bağlantı Kesildi';
                statusElement.className = 'status-offline';
            }
            
            // Reconnect only on abnormal closures or server errors
            if (event.code !== 1000 && event.code !== 1001) {
                console.log('Abnormal closure, attempting to reconnect in 5 seconds...');
                setTimeout(connectWebSocket, 5000);
            }
        });
        
        // Connection error
        socket.addEventListener('error', (error) => {
            console.error('WebSocket error:', error);
        });
        
        return socket;
    } catch (e) {
        console.error('Error creating WebSocket connection:', e);
        // Try to reconnect after a delay
        setTimeout(connectWebSocket, 5000);
        return null;
    }
}

/**
 * Update connection status in UI
 * @param {string} status - Connection status ('connected', 'error', etc.)
 */
function updateConnectionStatus(status) {
    const connectionStatus = document.getElementById('connection-status');
    if (status === 'connected') {
        connectionStatus.innerHTML = '🟢 Bağlı';
    } else if (status === 'error') {
        connectionStatus.innerHTML = '🔴 Bağlantı Hatası';
    } else {
        connectionStatus.innerHTML = '🟢 Bağlı';
    }
} 