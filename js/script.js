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
    
    // Add keyboard shortcuts for video player
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
    });
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

