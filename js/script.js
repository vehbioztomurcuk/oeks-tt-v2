/**
 * OEKS Team Tracker - Main Application Script
 * Initializes the application and integrates all modules
 */

// Initialize application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
    // Set initial state for live view to null
    window.liveViewStaffId = null;
    
    // Initialize dashboard controls
    initializeDashboardControls();
    
    // Initialize modal
    initializeModal();
    
    // Initialize video history controls
    initializeVideoHistoryControls();
    
    // Connect to WebSocket
    const socket = connectWebSocket();
    
    // Initial fetch of staff data
    setupRefresh();
    fetchStaffData();
    
    // Add window resize handler to adjust timeline if needed
    window.addEventListener('resize', debounce(() => {
        // If we have an open timeline, refresh it to adjust for new window size
        if (document.querySelector('.interactive-timeline') && 
            document.getElementById('video-timeline-container').style.display !== 'none') {
            // Just update the time indicator, no need to reload everything
            const updateTimeIndicator = document.querySelector('.timeline-time-indicator');
            if (updateTimeIndicator && typeof updateTimeIndicator === 'function') {
                updateTimeIndicator();
            }
        }
    }, 250));
}

/**
 * Initialize video history controls
 */
function initializeVideoHistoryControls() {
    // Set up date filter
    const dateFilter = document.getElementById('video-date-filter');
    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            if (liveViewStaffId) {
                fetchStaffVideoHistory(liveViewStaffId, e.target.value);
            }
        });
    }
    
    // Create timeline container if it doesn't exist
    if (!document.getElementById('video-timeline-container')) {
        const historySection = document.querySelector('.history-section');
        if (historySection) {
            const timelineContainer = document.createElement('div');
            timelineContainer.id = 'video-timeline-container';
            timelineContainer.className = 'video-timeline-container';
            
            // Insert after the history header
            const historyHeader = historySection.querySelector('.history-header');
            if (historyHeader) {
                historyHeader.insertAdjacentElement('afterend', timelineContainer);
            } else {
                historySection.insertBefore(timelineContainer, historySection.firstChild);
            }
        }
    }
    
    // Set up timeline auto-refresh for today's videos
    setupTimelineAutoRefresh(60000); // Check for new videos every minute
    
    // Add keyboard shortcuts for video player and timeline navigation
    document.addEventListener('keydown', (e) => {
        // ESC key to close modals
        if (e.key === 'Escape') {
            const videoModals = document.querySelectorAll('.video-player-modal');
            if (videoModals.length > 0) {
                videoModals.forEach(modal => modal.remove());
                return;
            }
            
            const liveViewModal = document.getElementById('live-view-modal');
            if (liveViewModal && liveViewModal.style.display === 'block') {
                closeModal();
            }
        }
        
        // F key to toggle fullscreen on video
        if (e.key === 'f' || e.key === 'F') {
            const videoElement = document.querySelector('.video-player-modal video');
            if (videoElement) {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    videoElement.requestFullscreen();
                }
            }
        }
        
        // Left/Right arrow keys for timeline navigation (handled in setupTimelineNavigation)
    });
    
    // Add swipe gestures for mobile timeline navigation
    setupTimelineSwipeGestures();
}

/**
 * Set up swipe gestures for timeline navigation on touch devices
 */
function setupTimelineSwipeGestures() {
    let touchStartX = 0;
    let touchEndX = 0;
    
    // Get the timeline container
    const timelineContainer = document.getElementById('video-timeline-container');
    if (!timelineContainer) return;
    
    // Add touch event listeners
    timelineContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);
    
    timelineContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);
    
    // Handle swipe direction
    function handleSwipe() {
        const scrollContainer = document.querySelector('.timeline-scroll-container');
        if (!scrollContainer) return;
        
        // Calculate swipe distance
        const swipeDistance = touchEndX - touchStartX;
        const threshold = 50; // Minimum distance to register as a swipe
        
        if (Math.abs(swipeDistance) < threshold) return;
        
        // Calculate scroll amount (one hour width)
        const scrollAmount = scrollContainer.scrollWidth * 0.04166;
        
        if (swipeDistance > 0) {
            // Swipe right (go left/earlier)
            scrollContainer.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth'
            });
        } else {
            // Swipe left (go right/later)
            scrollContainer.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
        }
        
        // Update time indicator if it exists
        const updateTimeIndicator = document.querySelector('.timeline-time-indicator');
        if (updateTimeIndicator && typeof updateTimeIndicator === 'function') {
            updateTimeIndicator();
        }
    }
}

/**
 * Fetch staff videos filtered by type
 * @param {string} staffId - ID of the staff member
 * @param {string} dateFilter - Date filter (format: 'YYYYMMDD' or 'all')
 * @param {string} videoType - Type of videos to fetch (all, 5min, hourly, daily)
 */
function fetchStaffVideosByType(staffId, dateFilter, videoType) {
    // Show loading state
    const videoGrid = document.getElementById('video-history-grid');
    videoGrid.innerHTML = '<div class="empty-state"><i class="fas fa-spinner refresh-animation"></i><p>Video geçmişi yükleniyor...</p></div>';
    
    // Construct URL with query parameters
    let url = `/api/staff-videos/${staffId}`;
    const params = new URLSearchParams();
    
    if (dateFilter && dateFilter !== 'all') {
        params.append('date', dateFilter);
    }
    
    if (videoType && videoType !== 'all') {
        params.append('type', videoType);
    }
    
    // Add query string if we have parameters
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
    
    console.log(`[DEBUG] Fetching videos with type filter: ${url}`);
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Video history request failed');
            }
            return response.json();
        })
        .then(data => {
            console.log("[DEBUG] Video history data received:", data);
            
            // Update video history items
            videoHistoryItems = data.videos || [];
            hourlyVideoItems = data.hourlyVideos || [];
            dailyVideoItems = data.dailyVideos || [];
            filteredVideoItems = [...videoHistoryItems];
            
            // Update video grid
            updateVideoHistoryGrid();
            
            // If a specific date is selected, fetch timeline data
            if (dateFilter !== 'all') {
                fetchVideoTimeline(staffId, dateFilter);
            } else {
                // Hide timeline if no specific date is selected
                const timelineContainer = document.getElementById('video-timeline-container');
                if (timelineContainer) {
                    timelineContainer.style.display = 'none';
                }
            }
        })
        .catch(error => {
            console.error('[DEBUG] Error fetching video history:', error);
            videoGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Video geçmişi yüklenirken hata oluştu</p>
                    <p class="error-details">${error.message}</p>
                </div>
            `;
        });
}

/**
 * Open a video player for a specific video
 * @param {string} streamPath - Path to the video stream
 */
function openVideoPlayer(streamPath) {
    if (!streamPath) {
        console.error('No stream path provided for video player');
        return;
    }
    
    // Create video player from template
    const videoPlayerTemplate = document.getElementById('video-player-template');
    if (!videoPlayerTemplate) {
        console.error('Video player template not found');
        return;
    }
    
    // Clone the template
    const videoPlayerModal = videoPlayerTemplate.content.cloneNode(true);
    
    // Get video element and set source
    const videoElement = videoPlayerModal.querySelector('video');
    const sourceElement = videoPlayerModal.querySelector('source');
    
    if (videoElement && sourceElement) {
        // Add cache-busting parameter
        const videoSrc = `${streamPath}?t=${Date.now()}`;
        sourceElement.src = videoSrc;
        
        // Set video title based on path
        const videoTitle = videoPlayerModal.querySelector('.video-title');
        if (videoTitle) {
            // Extract time information from path if possible
            let titleText = 'Video Oynatıcı';
            
            if (streamPath.includes('daily')) {
                titleText = 'Günlük Video';
            } else if (streamPath.includes('hourly')) {
                titleText = '15 Dakikalık Video';
            } else if (streamPath.includes('5min')) {
                titleText = '5 Dakikalık Video';
            }
            
            // Try to extract timestamp from path
            const timeMatch = streamPath.match(/(\d{2})(\d{2})(\d{2})/);
            if (timeMatch) {
                const hour = timeMatch[1];
                const minute = timeMatch[2];
                titleText += ` - ${hour}:${minute}`;
            }
            
            // Add time range to video title for better context
            if (streamPath.includes('5min')) {
                // For 5-minute videos, show the time range
                const startTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '';
                if (startTime) {
                    // Calculate end time (5 minutes later)
                    const startHour = parseInt(timeMatch[1]);
                    const startMinute = parseInt(timeMatch[2]);
                    
                    let endHour = startHour;
                    let endMinute = startMinute + 5;
                    
                    if (endMinute >= 60) {
                        endHour = (endHour + 1) % 24;
                        endMinute = endMinute % 60;
                    }
                    
                    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
                    titleText += ` (${startTime}-${endTime})`;
                }
            }
            
            videoTitle.textContent = titleText;
        }
        
        // Set up loading indicator
        const loadingIndicator = videoPlayerModal.querySelector('.loading-indicator');
        
        // Hide loading indicator when video can play
        videoElement.addEventListener('canplay', () => {
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            videoElement.play().catch(e => console.error('Error playing video:', e));
        });
        
        // Show error if video fails to load
        videoElement.addEventListener('error', () => {
            if (loadingIndicator) {
                loadingIndicator.innerHTML = `
                    <div style="text-align:center; color:#e74c3c;">
                        <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:10px;"></i>
                        <p>Video yüklenirken hata oluştu.</p>
                        <p style="font-size:0.8rem; margin-top:10px;">Dosya: ${streamPath}</p>
                    </div>
                `;
            }
        });
        
        // Set up close button
        const closeBtn = videoPlayerModal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.querySelector('.video-player-modal').remove();
            });
        }
        
        // Set up fullscreen button
        const fullscreenBtn = videoPlayerModal.querySelector('.fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                if (videoElement.requestFullscreen) {
                    videoElement.requestFullscreen();
                } else if (videoElement.webkitRequestFullscreen) {
                    videoElement.webkitRequestFullscreen();
                } else if (videoElement.msRequestFullscreen) {
                    videoElement.msRequestFullscreen();
                }
            });
        }
        
        // Add to document
        document.body.appendChild(videoPlayerModal);
        
        // Set up click outside to close
        const modal = document.querySelector('.video-player-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }
    }
}

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

