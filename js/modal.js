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
    
    // Load screenshot history for this staff member
    fetchStaffHistory(staffId);
    
    // Show modal immediately
    document.getElementById('live-view-modal').style.display = 'block';
    
    // Set up a refresh interval for both the modal info and the video (if active)
    if (staff.recording_status === 'active') {
        // Active staff - refresh more frequently (every 3-10 seconds based on selector)
        liveViewRefreshInterval = setInterval(() => {
            updateDetailInfo(staffId);
            // Also refresh the video if active
            if (liveViewStaffId === staffId) {
                updateLiveView(staffId);
            }
        }, liveViewRefreshRate * 1000);
    } else {
        // Inactive staff - slower refresh just for info
        liveViewRefreshInterval = setInterval(() => {
            updateDetailInfo(staffId);
        }, 10000);
    }
    
    // Get the video container
    const videoContainer = document.querySelector('.modal-video-container');
    if (!videoContainer) return;
    
    // Show loading state immediately
    videoContainer.innerHTML = `
        <div class="loading-indicator" style="position:absolute; top:0; left:0; right:0; bottom:0; display:flex; justify-content:center; align-items:center; background-color:#111;">
            <i class="fas fa-spinner refresh-animation" style="font-size:2rem; color:#3498db;"></i>
        </div>
    `;
    
    loadVideoForStaff(staffId, videoContainer);
}

/**
 * Load video for a staff member into the provided container
 * @param {string} staffId - ID of the staff member
 * @param {HTMLElement} container - Container element for the video
 */
function loadVideoForStaff(staffId, container) {
    const staff = staffMembers[staffId];
    if (!staff) return;
    
    // Only try to load video if there's a valid path
    if (staff.video_path && staff.video_path !== "null" && staff.video_path !== null && !staff.video_path.includes("/null")) {
        // Create the video element
        const videoElement = document.createElement('video');
        videoElement.id = 'modal-video-player';
        videoElement.className = 'modal-video';
        videoElement.autoplay = true;
        videoElement.controls = true;
        videoElement.muted = true;
        videoElement.loop = true;
        videoElement.playsInline = true;
        
        // Keep track of attempt count
        let attemptCount = 0;
        const maxAttempts = 3;
        
        // Add error handling with retry
        videoElement.addEventListener('error', (e) => {
            console.error("Video loading error:", e);
            
            if (attemptCount < maxAttempts) {
                attemptCount++;
                console.log(`Retry attempt ${attemptCount} of ${maxAttempts}...`);
                
                // Wait a short time before retry
                setTimeout(() => {
                    // Try direct latest.mp4 as a fallback for any staff
                    const timestamp = Date.now();
                    const retryUrl = `videos/${staffId}/latest.mp4?t=${timestamp}`;
                    console.log(`Retrying with direct latest.mp4: ${retryUrl}`);
                    
                    const source = videoElement.querySelector('source');
                    if (source) {
                        source.src = retryUrl;
                        videoElement.load();
                        videoElement.play().catch(err => {
                            console.warn('Retry autoplay error:', err);
                        });
                    }
                }, 1000 * attemptCount); // Wait longer with each retry
            } else {
                showVideoError("Video yüklenirken hata oluştu - Kayıt durumunda olabilir");
            }
        });
        
        // Add success handling
        videoElement.addEventListener('loadeddata', () => {
            console.log("Video loaded successfully");
            // Remove loading indicator if it exists
            const loadingIndicator = container.querySelector('.loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        });
        
        // Create a proper URL with a single timestamp parameter to prevent caching
        const timestamp = Date.now();
        let videoUrl;
        
        try {
            // For staff_pc_141, always try to use latest.mp4 directly
            if (staffId === 'staff_pc_141') {
                videoUrl = `videos/${staffId}/latest.mp4?t=${timestamp}`;
                console.log(`Staff PC 141 special handling - using direct latest.mp4 path: ${videoUrl}`);
            } else {
                // For other staff, use the video path from staffInfo
                let cleanPath = staff.video_path;
                if (cleanPath.includes('?')) {
                    cleanPath = cleanPath.split('?')[0];
                }
                videoUrl = `${cleanPath}?t=${timestamp}`;
            }
            
            console.log(`Trying to load video from: ${videoUrl}`);
            
            // Set the source
            const source = document.createElement('source');
            source.src = videoUrl;
            source.type = 'video/mp4';
            
            videoElement.appendChild(source);
            container.appendChild(videoElement);
            
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
        
        // For staff_pc_141, give a more specific message
        if (staffId === 'staff_pc_141') {
            showVideoError("Bu kullanıcı için video kaydı işleniyor, lütfen bekleyin...");
            
            // Try to load latest.mp4 directly as a fallback
            const timestamp = Date.now();
            const fallbackUrl = `videos/${staffId}/latest.mp4?t=${timestamp}`;
            
            // Create video element for fallback attempt
            const videoElement = document.createElement('video');
            videoElement.id = 'modal-video-player';
            videoElement.className = 'modal-video';
            videoElement.autoplay = true;
            videoElement.controls = true;
            videoElement.muted = true;
            videoElement.loop = true;
            videoElement.playsInline = true;
            
            // Add error handling
            videoElement.addEventListener('error', () => {
                console.warn("Fallback video loading also failed");
                showVideoError("Bu kullanıcı için video kaydı bulunmamaktadır");
            });
            
            // Add success handling
            videoElement.addEventListener('loadeddata', () => {
                console.log("Fallback video loaded successfully");
                // Remove error message
                container.querySelector('.video-error').remove();
                // Remove loading indicator if it exists
                const loadingIndicator = container.querySelector('.loading-indicator');
                if (loadingIndicator) {
                    loadingIndicator.remove();
                }
            });
            
            try {
                // Set the source
                const source = document.createElement('source');
                source.src = fallbackUrl;
                source.type = 'video/mp4';
                
                videoElement.appendChild(source);
                container.appendChild(videoElement);
                
                // Try to load and play
                videoElement.load();
                videoElement.play().catch(() => {});
            } catch (error) {
                console.error("Error setting fallback video source:", error);
            }
        } else {
            showVideoError("Bu kullanıcı için video kaydı bulunmamaktadır");
        }
    }
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
 * Setup live view refresh
 */
function setupLiveViewRefresh() {
    if (!liveViewStaffId) return;
    
    if (liveViewRefreshInterval) {
        clearInterval(liveViewRefreshInterval);
    }
    
    // Set up interval to refresh the video based on the selected refresh rate
    liveViewRefreshInterval = setInterval(() => {
        if (liveViewStaffId) {
            updateLiveView(liveViewStaffId);
        }
    }, liveViewRefreshRate * 1000);
    
    console.log(`Set up live view refresh for ${liveViewStaffId} every ${liveViewRefreshRate} seconds`);
}

/**
 * Update live view with new video
 */
function updateLiveView(staffId) {
    if (!staffId) return;
    
    // Check if the staff exists and is active
    const staff = staffMembers[staffId];
    if (!staff || staff.recording_status !== 'active') return;
    
    console.log(`Updating live view for ${staffId}`);
    
    // Get the video container
    const videoContainer = document.querySelector('.modal-video-container');
    if (!videoContainer) return;
    
    // Check if there's a video element already
    const existingVideo = document.getElementById('modal-video-player');
    if (existingVideo) {
        // Create a new timestamp for cache busting
        const timestamp = Date.now();
        let videoUrl;
        
        // For staff_pc_141, always try to use latest.mp4 directly
        if (staffId === 'staff_pc_141') {
            videoUrl = `videos/${staffId}/latest.mp4?t=${timestamp}`;
        } else {
            // For other staff, use the video path from staffInfo
            let cleanPath = staff.video_path;
            if (cleanPath.includes('?')) {
                cleanPath = cleanPath.split('?')[0];
            }
            videoUrl = `${cleanPath}?t=${timestamp}`;
        }
        
        // Update the source
        const source = existingVideo.querySelector('source');
        if (source) {
            source.src = videoUrl;
            existingVideo.load();
            existingVideo.play().catch(err => {
                console.warn('Autoplay error on refresh:', err);
            });
            console.log(`Updated video source to: ${videoUrl}`);
        }
    } else {
        // No existing video, need to reload it
        loadVideoForStaff(staffId, videoContainer);
    }
} 