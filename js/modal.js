/**
 * OEKS Team Tracker - Modal Functions
 * Handles all modal and live view functionality
 */

// Modal state variables
let liveViewStaffId = null;
let liveViewIntervalId = null;
let liveViewRefreshInterval = null;
let liveViewRefreshRate = 3;

/**
 * Open modal with staff data
 * @param {string} staffId - ID of the staff member
 */
function openModal(staffId) {
    const staff = staffMembers[staffId];
    if (!staff) return;
    
    // Set the current staff ID for live view
    liveViewStaffId = staffId;
    
    // Define liveViewRefreshInterval if it doesn't exist
    if (typeof liveViewRefreshInterval === 'undefined') {
        window.liveViewRefreshInterval = null;
    }
    
    // Clear any existing refresh interval
    if (liveViewRefreshInterval) {
        clearInterval(liveViewRefreshInterval);
        liveViewRefreshInterval = null;
    }
    
    // Update modal content
    document.getElementById('modal-staff-name').textContent = staff.name || "Unknown User";
    document.getElementById('detail-name').textContent = staff.name || "Unknown User";
    document.getElementById('detail-division').textContent = staff.division || "Unassigned";
    document.getElementById('detail-staff-id').textContent = staffId;
    
    // Update status if element exists
    const detailStatus = document.getElementById('detail-status');
    if (detailStatus) {
        detailStatus.textContent = staff.recording_status === 'active' ? 'Aktif' : 'İnaktif';
    }
    
    // Update status indicator
    const statusIndicator = document.querySelector('.modal-header .status-indicator');
    if (statusIndicator) {
        statusIndicator.className = 'status-indicator ' + 
            (staff.recording_status === 'active' ? 'status-active' : 'status-inactive');
    }
    
    // Show modal immediately
    document.getElementById('live-view-modal').style.display = 'block';
    
    // Set up a slower refresh for the modal info
    liveViewRefreshInterval = setInterval(() => {
        updateDetailInfo(staffId);
    }, 10000);
    
    // Get the video container
    const videoContainer = document.querySelector('.modal-video-container');
    if (!videoContainer) return;
    
    // Show loading state immediately
    videoContainer.innerHTML = `
        <div class="loading-indicator" style="position:absolute; top:0; left:0; right:0; bottom:0; display:flex; justify-content:center; align-items:center; background-color:#111;">
            <i class="fas fa-spinner refresh-animation" style="font-size:2rem; color:#3498db;"></i>
        </div>
    `;
    
    // Only try to load video if there's a valid path
    if (staff.video_path && staff.video_path !== "null" && staff.video_path !== null && !staff.video_path.includes("/null")) {
        // Create the video element
        const videoElement = document.createElement('video');
        videoElement.className = 'modal-video';
        videoElement.autoplay = true;
        videoElement.controls = true;
        videoElement.muted = true;
        videoElement.loop = true;
        videoElement.playsInline = true;
        
        // Add error handling
        videoElement.addEventListener('error', (e) => {
            console.error("Video loading error:", e);
            showVideoError("Video yüklenirken hata oluştu");
        });
        
        // Add success handling
        videoElement.addEventListener('loadeddata', () => {
            console.log("Video loaded successfully");
            // Remove loading indicator if it exists
            const loadingIndicator = videoContainer.querySelector('.loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        });
        
        // Create a proper URL with a single timestamp parameter
        const timestamp = Date.now();
        let videoUrl;
        
        try {
            videoUrl = staff.video_path.includes('?') 
                ? staff.video_path.split('?')[0] + `?t=${timestamp}` 
                : `${staff.video_path}?t=${timestamp}`;
                
            console.log(`Trying to load video from: ${videoUrl}`);
            
            // Set the source
            const source = document.createElement('source');
            source.src = videoUrl;
            source.type = 'video/mp4';
            
            videoElement.appendChild(source);
            videoContainer.appendChild(videoElement);
            
            // Try to load and play
            videoElement.load();
            videoElement.play().catch(err => {
                console.warn('Autoplay error (may require user interaction):', err);
            });
        } catch (error) {
            console.error("Error setting video source:", error);
            showVideoError("Video URL işlenirken hata oluştu");
        }
    } else {
        // No valid video path
        console.warn("No valid video path for staff:", staffId, staff.video_path);
        showVideoError("Bu kullanıcı için video kaydı bulunmamaktadır");
    }
    
    // Load screenshot history for this staff member
    fetchStaffHistory(staffId);
}

/**
 * Update detail information in the modal
 * @param {string} staffId - ID of the staff member
 */
function updateDetailInfo(staffId) {
    if (!staffId) return;
    
    const staff = staffMembers[staffId];
    if (!staff) return;
    
    // Update the last time info
    const detailLastTime = document.getElementById('detail-last-time');
    if (detailLastTime) {
        const now = new Date();
        detailLastTime.textContent = `${formatTimeDiff(now, new Date(staff.timestamp))} önce`;
    }
    
    // Update status indicator
    const statusIndicator = document.querySelector('.modal-header .status-indicator');
    if (statusIndicator) {
        statusIndicator.className = 'status-indicator ' + 
            (staff.recording_status === 'active' ? 'status-active' : 'status-inactive');
    }
}

/**
 * Close modal and clean up
 */
function closeModal() {
    document.getElementById('live-view-modal').style.display = 'none';
    if (liveViewIntervalId) {
        clearInterval(liveViewIntervalId);
        liveViewIntervalId = null;
    }
    
    if (liveViewRefreshInterval) {
        clearInterval(liveViewRefreshInterval);
        liveViewRefreshInterval = null;
    }
    
    // Stop history playback
    if (typeof stopHistoryPlayback === 'function') {
        stopHistoryPlayback();
    }
    
    liveViewStaffId = null;
}

/**
 * Initialize the modal event listeners
 */
function initializeModal() {
    // Set up modal close button
    document.getElementById('close-modal').addEventListener('click', () => {
        closeModal();
    });
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('live-view-modal')) {
            closeModal();
        }
    });
    
    // Set up live view refresh interval
    const modalRefreshSelector = document.getElementById('modal-refresh-interval');
    if (modalRefreshSelector) {
        modalRefreshSelector.addEventListener('change', () => {
            liveViewRefreshRate = parseInt(modalRefreshSelector.value);
            if (liveViewStaffId) {
                setupLiveViewRefresh();
            }
        });
    }
}

/**
 * Setup live view refresh (currently a no-op)
 */
function setupLiveViewRefresh() {
    // This function intentionally does nothing now
    // We're handling refresh in openModal with a much longer interval
    // This prevents the constant reload of videos that was causing issues
}

/**
 * Update live view (currently a no-op)
 */
function updateLiveView() {
    // This function intentionally does nothing now
    // We're letting the video play without interruption
} 