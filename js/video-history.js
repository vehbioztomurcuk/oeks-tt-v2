/**
 * OEKS Team Tracker - Video History Functions
 * Handles staff video history viewing and timeline browsing
 */

// Video history state variables
let videoHistoryItems = [];
let filteredVideoItems = [];
let hourlyVideoItems = [];
let dailyVideoItems = [];
let timelineData = [];
let currentStaffId = null;
let currentDateFilter = 'all';

/**
 * Fetch staff video history from the server
 * @param {string} staffId - ID of the staff member
 * @param {string} dateFilter - Date filter (format: 'YYYYMMDD' or 'all')
 * @returns {Promise} Promise that resolves with video history data
 */
function fetchStaffVideoHistory(staffId, dateFilter = 'today') {
    // Store current staff and date for later use
    currentStaffId = staffId;
    currentDateFilter = dateFilter;
    
    const timelineContainer = document.getElementById('video-timeline-container');
    
    // Show loading state
    timelineContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-spinner refresh-animation"></i>
            <p>Video geçmişi yükleniyor...</p>
        </div>
    `;
    
    // Remove the video grid as we're eliminating it
    const videoGrid = document.getElementById('video-history-grid');
    if (videoGrid) {
        videoGrid.innerHTML = '';
        videoGrid.style.display = 'none'; // Hide the grid completely
    }
    
    // Format date for display
    let displayDate = 'Bugün';
    if (dateFilter !== 'today' && dateFilter !== 'all') {
        const year = dateFilter.substring(0, 4);
        const month = dateFilter.substring(4, 6);
        const day = dateFilter.substring(6, 8);
        displayDate = `${day}.${month}.${year}`;
    }
    
    // Update timeline header
    const timelineHeader = document.querySelector('.history-header h3');
    if (timelineHeader) {
        timelineHeader.innerHTML = `<i class="fas fa-history"></i> ${displayDate} Zaman Çizelgesi`;
    }
    
    // Fetch video history data
    fetch(`/api/staff/${staffId}/videos?date=${dateFilter}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Video history data:', data);
            
            if (!data || (!data.videos && !data.hourlyVideos && !data.dailyVideos)) {
                timelineContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Bu tarih için video bulunamadı.</p>
                    </div>
                `;
                return;
            }
            
            // Store video data for later use
            videoHistoryItems = data.videos || [];
            hourlyVideoItems = data.hourlyVideos || [];
            dailyVideoItems = data.dailyVideos || [];
            
            // Fetch and render the timeline
            fetchVideoTimeline(staffId, dateFilter);
            
            // Update date filter dropdown with available dates
            updateDateFilterDropdown(data.availableDates);
        })
        .catch(error => {
            console.error('Error fetching video history:', error);
            timelineContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Video geçmişi yüklenirken hata oluştu.</p>
                    <p class="error-details">${error.message}</p>
                </div>
            `;
        });
}

/**
 * Fetch video timeline data for a specific date
 * @param {string} staffId - ID of the staff member
 * @param {string} date - Date in YYYYMMDD format
 */
function fetchVideoTimeline(staffId, date) {
    const timelineContainer = document.getElementById('video-timeline-container');
    
    fetch(`/api/staff/${staffId}/timeline?date=${date}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Timeline data:', data);
            
            if (!data || !data.segments || data.segments.length === 0) {
                timelineContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Bu tarih için zaman çizelgesi bulunamadı.</p>
                    </div>
                `;
                return;
            }
            
            // Store timeline data for later use
            timelineData = data.segments;
            
            // Render the enhanced interactive timeline
            renderInteractiveTimeline(data.segments);
        })
        .catch(error => {
            console.error('Error fetching video timeline:', error);
            timelineContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Zaman çizelgesi yüklenirken hata oluştu.</p>
                    <p class="error-details">${error.message}</p>
                </div>
            `;
        });
}

/**
 * Render an interactive horizontal timeline
 * @param {Array} segments - Timeline segments data
 */
function renderInteractiveTimeline(segments) {
    const timelineContainer = document.getElementById('video-timeline-container');
    
    // Clear previous content
    timelineContainer.innerHTML = '';
    
    // Create the main timeline structure
    const timelineHTML = `
        <div class="interactive-timeline">
            <div class="timeline-controls">
                <button class="timeline-nav-btn" id="timeline-prev-hour">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <div class="timeline-time-indicator">
                    <span id="timeline-current-time">00:00 - 23:59</span>
                </div>
                <button class="timeline-nav-btn" id="timeline-next-hour">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            
            <div class="timeline-scroll-container">
                <div class="timeline-hours-container">
                    <!-- Hour markers will be added here -->
                </div>
                <div class="timeline-events-container">
                    <!-- Video events will be added here -->
                    </div>
                </div>
            
            <div class="timeline-legend">
                <div class="legend-item">
                    <span class="legend-color daily-color"></span>
                    <span class="legend-label">Günlük Video</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color hourly-color"></span>
                    <span class="legend-label">15 Dakikalık Video</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color five-min-color"></span>
                    <span class="legend-label">5 Dakikalık Video</span>
                </div>
                </div>
            </div>
        `;
    
    timelineContainer.innerHTML = timelineHTML;
    
    // Get containers for hour markers and events
    const hoursContainer = timelineContainer.querySelector('.timeline-hours-container');
    const eventsContainer = timelineContainer.querySelector('.timeline-events-container');
    
    // Add hour markers (0-23)
    for (let hour = 0; hour < 24; hour++) {
        const hourMarker = document.createElement('div');
        hourMarker.className = 'timeline-hour-marker';
        hourMarker.setAttribute('data-hour', hour);
        
        // Format hour display (00, 01, ..., 23)
        const displayHour = hour.toString().padStart(2, '0');
        
        hourMarker.innerHTML = `
            <div class="hour-label">${displayHour}:00</div>
            <div class="hour-tick"></div>
        `;
        
        hoursContainer.appendChild(hourMarker);
    }
    
    // Process and add video events to timeline
    if (segments && segments.length > 0) {
        // Group segments by type for easier processing
        const dailyVideos = segments.filter(segment => segment.type === 'daily');
        const hourlyVideos = segments.filter(segment => segment.type === 'hourly');
        const fiveMinVideos = segments.filter(segment => segment.type === '5min');
        
        // Add daily videos at the top
        dailyVideos.forEach(video => {
            addVideoEventToTimeline(eventsContainer, video, 'daily');
        });
        
        // Add hourly videos in the middle
            hourlyVideos.forEach(video => {
            addVideoEventToTimeline(eventsContainer, video, 'hourly');
        });
        
        // Add 5-minute videos at the bottom
        fiveMinVideos.forEach(video => {
            addVideoEventToTimeline(eventsContainer, video, '5min');
        });
    }
    
    // Set up navigation controls
    setupTimelineNavigation();
    
    // Initialize timeline to show the first event or current time
    initializeTimelinePosition(segments);
}

/**
 * Add a video event to the timeline
 * @param {HTMLElement} container - Container element
 * @param {Object} video - Video data
 * @param {string} type - Video type (daily, hourly, 5min)
 */
function addVideoEventToTimeline(container, video, type) {
    // Create event element
    const eventElement = document.createElement('div');
    eventElement.className = `timeline-event ${type}-event`;
    
    // Calculate position based on hour and minute
    const hour = parseInt(video.hour) || 0;
    const minute = parseInt(video.minute) || 0;
    
    // Position as percentage of day (24 hours)
    const positionPercent = ((hour * 60 + minute) / (24 * 60)) * 100;
    
    // Set position
    eventElement.style.left = `${positionPercent}%`;
    
    // Set data attributes for later use
    eventElement.setAttribute('data-stream-path', video.streamPath);
    eventElement.setAttribute('data-hour', hour);
    eventElement.setAttribute('data-minute', minute);
    eventElement.setAttribute('data-type', type);
    
    // Create tooltip with time information
    let tooltipText = '';
    if (type === 'daily') {
        tooltipText = 'Günlük Video';
    } else if (type === 'hourly') {
        tooltipText = `15 Dakikalık Video - ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    } else {
        tooltipText = `5 Dakikalık Video - ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }
    
    // Add content
    eventElement.innerHTML = `
        <div class="event-marker">
            <i class="fas fa-film"></i>
                </div>
        <div class="event-tooltip">${tooltipText}</div>
    `;
    
    // Add click event to play video
    eventElement.addEventListener('click', function() {
            const streamPath = this.getAttribute('data-stream-path');
            if (streamPath) {
                openVideoPlayer(streamPath);
            }
        });
    
    // Add to container
    container.appendChild(eventElement);
}

/**
 * Set up timeline navigation controls
 */
function setupTimelineNavigation() {
    const scrollContainer = document.querySelector('.timeline-scroll-container');
    const prevHourBtn = document.getElementById('timeline-prev-hour');
    const nextHourBtn = document.getElementById('timeline-next-hour');
    const currentTimeIndicator = document.getElementById('timeline-current-time');
    
    // Previous hour button
    if (prevHourBtn) {
        prevHourBtn.addEventListener('click', () => {
            // Scroll left by 1 hour (4.166% of total width)
            const scrollAmount = scrollContainer.scrollWidth * 0.04166;
            scrollContainer.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth'
            });
            updateTimeIndicator();
        });
    }
    
    // Next hour button
    if (nextHourBtn) {
        nextHourBtn.addEventListener('click', () => {
            // Scroll right by 1 hour (4.166% of total width)
            const scrollAmount = scrollContainer.scrollWidth * 0.04166;
            scrollContainer.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
            updateTimeIndicator();
        });
    }
    
    // Update time indicator on scroll
    if (scrollContainer) {
        scrollContainer.addEventListener('scroll', () => {
            updateTimeIndicator();
        });
    }
    
    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        // Only handle keys when timeline is visible
        const timelineContainer = document.getElementById('video-timeline-container');
        if (!timelineContainer || timelineContainer.style.display === 'none') {
        return;
    }
    
        // Left arrow: scroll left
        if (e.key === 'ArrowLeft') {
            const scrollAmount = scrollContainer.scrollWidth * 0.04166;
            scrollContainer.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth'
            });
            updateTimeIndicator();
            e.preventDefault();
        }
        
        // Right arrow: scroll right
        if (e.key === 'ArrowRight') {
            const scrollAmount = scrollContainer.scrollWidth * 0.04166;
            scrollContainer.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
            updateTimeIndicator();
            e.preventDefault();
        }
    });
    
    // Function to update time indicator based on scroll position
    function updateTimeIndicator() {
        if (!scrollContainer || !currentTimeIndicator) return;
        
        // Calculate visible time range based on scroll position
        const scrollPercent = scrollContainer.scrollLeft / (scrollContainer.scrollWidth - scrollContainer.clientWidth);
        const totalMinutes = 24 * 60;
        
        // Calculate start and end minutes
        const visibleWidth = scrollContainer.clientWidth / scrollContainer.scrollWidth;
        const visibleMinutes = totalMinutes * visibleWidth;
        
        const startMinute = Math.floor(scrollPercent * (totalMinutes - visibleMinutes));
        const endMinute = Math.min(startMinute + visibleMinutes, totalMinutes);
        
        // Format as HH:MM
        const startHour = Math.floor(startMinute / 60);
        const startMin = startMinute % 60;
        const endHour = Math.floor(endMinute / 60);
        const endMin = endMinute % 60;
        
        const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
        
        // Update indicator
        currentTimeIndicator.textContent = `${startTime} - ${endTime}`;
    }
    
    // Initial update
    updateTimeIndicator();
}

/**
 * Initialize timeline position based on events or current time
 * @param {Array} segments - Timeline segments
 */
function initializeTimelinePosition(segments) {
    const scrollContainer = document.querySelector('.timeline-scroll-container');
    if (!scrollContainer) return;
    
    // Default: position at current time of day
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Calculate position as percentage (minus half the visible width to center)
    const currentTimePercent = ((currentHour * 60 + currentMinute) / (24 * 60));
    const scrollPosition = (scrollContainer.scrollWidth * currentTimePercent) - (scrollContainer.clientWidth / 2);
    
    // If we have segments, try to position at the first event
    if (segments && segments.length > 0) {
        // Find earliest event of the day
        const sortedSegments = [...segments].sort((a, b) => {
            const aTime = (parseInt(a.hour) * 60) + parseInt(a.minute);
            const bTime = (parseInt(b.hour) * 60) + parseInt(b.minute);
            return aTime - bTime;
        });
        
        // Get earliest event
        const earliestEvent = sortedSegments[0];
        if (earliestEvent) {
            const eventHour = parseInt(earliestEvent.hour) || 0;
            const eventMinute = parseInt(earliestEvent.minute) || 0;
            
            // Calculate position
            const eventTimePercent = ((eventHour * 60 + eventMinute) / (24 * 60));
            const eventScrollPosition = (scrollContainer.scrollWidth * eventTimePercent) - (scrollContainer.clientWidth / 4);
            
            // Use event position if it's earlier than current time
            if (eventTimePercent < currentTimePercent) {
                scrollContainer.scrollLeft = Math.max(0, eventScrollPosition);
                return;
            }
        }
    }
    
    // Default to current time if no events or events are later
    scrollContainer.scrollLeft = Math.max(0, scrollPosition);
}

/**
 * Open a video player for the selected video
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
 * Update date filter dropdown with available dates
 * @param {Array} availableDates - Array of available dates in YYYYMMDD format
 */
function updateDateFilterDropdown(availableDates) {
    const dateFilter = document.getElementById('video-date-filter');
    if (!dateFilter) return;
    
    // Keep the today option
    dateFilter.innerHTML = '<option value="today" selected>Bugün</option>';
    
    // Add available dates
    if (availableDates && availableDates.length > 0) {
        availableDates.forEach(date => {
            if (date && date.length === 8) {
                const year = date.substring(0, 4);
                const month = date.substring(4, 6);
                const day = date.substring(6, 8);
                const displayDate = `${day}.${month}.${year}`;
                
                dateFilter.innerHTML += `<option value="${date}">${displayDate}</option>`;
            }
        });
    }
    
    // Add event listener to reload videos when date changes
    dateFilter.addEventListener('change', function() {
        const staffId = document.getElementById('modal-staff-name').getAttribute('data-staff-id');
        if (staffId) {
            fetchStaffVideoHistory(staffId, this.value);
        }
    });
}

/**
 * Refresh the timeline with current data
 * This can be called when new videos are added
 */
function refreshTimeline() {
    if (currentStaffId && currentDateFilter) {
        fetchStaffVideoHistory(currentStaffId, currentDateFilter);
    }
}

// Add a function to check for new videos periodically
function setupTimelineAutoRefresh(interval = 60000) {
    // Check every minute by default
    setInterval(() => {
        if (currentStaffId && currentDateFilter === 'today' && 
            document.getElementById('video-timeline-container').style.display !== 'none') {
            // Only refresh if we're viewing today's timeline and it's visible
            refreshTimeline();
        }
    }, interval);
} 