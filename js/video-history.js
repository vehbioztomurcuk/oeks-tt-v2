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
        .then(response => response.json())
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
        .then(response => response.json())
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
            
            renderVideoTimeline(data.segments);
        })
        .catch(error => {
            console.error('Error fetching video timeline:', error);
            timelineContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Zaman çizelgesi yüklenirken hata oluştu.</p>
                </div>
            `;
        });
}

/**
 * Render the video timeline
 * @param {Object} data - Timeline data
 */
function renderVideoTimeline(segments) {
    const timelineContainer = document.getElementById('video-timeline-container');
    
    // Group segments by hour
    const hourlySegments = {};
    segments.forEach(segment => {
        const hour = segment.hour;
        if (!hourlySegments[hour]) {
            hourlySegments[hour] = [];
        }
        hourlySegments[hour].push(segment);
    });
    
    // Sort hours
    const sortedHours = Object.keys(hourlySegments).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Create timeline HTML
    let timelineHTML = `<div class="timeline-wrapper">`;
    
    // Add daily videos at the top if they exist
    const dailyVideos = segments.filter(segment => segment.type === 'daily');
    if (dailyVideos.length > 0) {
        timelineHTML += `
            <div class="timeline-section daily-section">
                <div class="timeline-header">
                    <span class="timeline-label">Günlük Video</span>
                </div>
                <div class="timeline-items">
        `;
        
        dailyVideos.forEach(video => {
            timelineHTML += `
                <div class="timeline-item daily-item" data-stream-path="${video.streamPath}">
                    <div class="timeline-item-content">
                        <i class="fas fa-film"></i>
                        <span>${video.label}</span>
                    </div>
                </div>
            `;
        });
        
        timelineHTML += `
                </div>
            </div>
        `;
    }
    
    // Add hourly timeline
    timelineHTML += `<div class="timeline-hours">`;
    
    sortedHours.forEach(hour => {
        const hourSegments = hourlySegments[hour];
        
        // Format hour for display
        const displayHour = `${hour.padStart(2, '0')}:00`;
        
        timelineHTML += `
            <div class="timeline-hour">
                <div class="hour-marker">
                    <span class="hour-label">${displayHour}</span>
                </div>
                <div class="hour-segments">
        `;
        
        // First add hourly videos for this hour
        const hourlyVideos = hourSegments.filter(segment => segment.type === 'hourly');
        if (hourlyVideos.length > 0) {
            hourlyVideos.forEach(video => {
                timelineHTML += `
                    <div class="timeline-item hourly-item" data-stream-path="${video.streamPath}">
                        <div class="timeline-item-content">
                            <i class="fas fa-film"></i>
                            <span>15 Dakika - ${video.hour.toString().padStart(2, '0')}:${video.minute.toString().padStart(2, '0')}</span>
                        </div>
                    </div>
                `;
            });
        }
        
        // Then add 5-minute videos
        const fiveMinVideos = hourSegments.filter(segment => segment.type === '5min');
        if (fiveMinVideos.length > 0) {
            fiveMinVideos.forEach(video => {
                timelineHTML += `
                    <div class="timeline-item five-min-item" data-stream-path="${video.streamPath}">
                        <div class="timeline-item-content">
                            <i class="fas fa-film"></i>
                            <span>5 Dakika - ${video.hour.toString().padStart(2, '0')}:${video.minute.toString().padStart(2, '0')}</span>
                        </div>
                    </div>
                `;
            });
        }
        
        timelineHTML += `
                </div>
            </div>
        `;
    });
    
    timelineHTML += `</div></div>`;
    
    // Set the HTML
    timelineContainer.innerHTML = timelineHTML;
    
    // Add click event listeners to all timeline items
    const timelineItems = timelineContainer.querySelectorAll('.timeline-item');
    timelineItems.forEach(item => {
        item.addEventListener('click', function() {
            const streamPath = this.getAttribute('data-stream-path');
            if (streamPath) {
                openVideoPlayer(streamPath);
            }
        });
    });
}

/**
 * Update video history grid with chronological display
 */
function updateChronologicalVideoGrid() {
    const videoGrid = document.getElementById('video-history-grid');
    videoGrid.innerHTML = '';
    
    // Check if we have any videos to display
    const hasVideos = filteredVideoItems.length > 0 || hourlyVideoItems.length > 0 || dailyVideoItems.length > 0;
    
    if (!hasVideos) {
        videoGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-film"></i>
                <p>Bu tarih için video bulunamadı</p>
            </div>
        `;
        return;
    }
    
    // Create a chronological array of all videos
    let allVideos = [];
    
    // Add daily videos if available
    if (dailyVideoItems.length > 0) {
        allVideos = [...allVideos, ...dailyVideoItems];
    }
    
    // Add hourly videos if available
    if (hourlyVideoItems.length > 0) {
        allVideos = [...allVideos, ...hourlyVideoItems];
    }
    
    // Add 5-minute videos
    allVideos = [...allVideos, ...filteredVideoItems];
    
    // Sort all videos by timestamp (newest first)
    allVideos.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
    });
    
    // Add videos to grid
    allVideos.forEach(item => {
        const videoItem = createVideoGridItem(item);
        videoGrid.appendChild(videoItem);
    });
    
    console.log('[DEBUG] Chronological video grid updated with available videos');
}

/**
 * Create a video grid item
 * @param {Object} item - Video item data
 * @returns {HTMLElement} The created video item element
 */
function createVideoGridItem(item) {
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item';
    
    // Format timestamp
    const timestamp = new Date(item.timestamp);
    const formattedDate = timestamp.toLocaleDateString('tr-TR');
    const formattedTime = timestamp.toLocaleTimeString('tr-TR');
    
    // Determine icon based on video type
    let icon = 'fa-film';
    if (item.type === 'hourly') icon = 'fa-clock';
    if (item.type === 'daily') icon = 'fa-calendar-day';
    
    // Use label if available, otherwise use formatted date/time
    const title = item.label || `${formattedDate} ${formattedTime}`;
    
    videoItem.innerHTML = `
        <div class="video-item-thumbnail">
            <i class="fas ${icon}"></i>
            <span class="video-duration">${item.duration}</span>
        </div>
        <div class="video-item-info">
            <div class="video-item-title">${title}</div>
            <button class="video-play-btn">
                <i class="fas fa-play"></i> İzle
            </button>
        </div>
    `;
    
    // Add click handler to play this video
    const playBtn = videoItem.querySelector('.video-play-btn');
    playBtn.addEventListener('click', () => {
        playStaffVideoStreaming(item);
    });
    
    return videoItem;
}

/**
 * Play a staff video with streaming support
 * @param {Object} videoItem - Video item to play
 * @param {number} startTime - Optional start time in seconds
 */
function playStaffVideoStreaming(videoItem, startTime = 0) {
    // Create a modal for the video
    const videoModal = document.createElement('div');
    videoModal.className = 'modal video-player-modal';
    videoModal.style.display = 'block';
    videoModal.style.zIndex = '2000'; // Higher than the staff modal
    
    // Determine the video source URL with streaming support
    let videoSrc;
    if (videoItem.streamPath) {
        // Make sure streamPath is properly formatted
        const streamPath = videoItem.streamPath.startsWith('/') 
            ? videoItem.streamPath.substring(1) 
            : videoItem.streamPath;
        videoSrc = `${streamPath}?start=${startTime}&t=${Date.now()}`;
    } else {
        videoSrc = `${videoItem.path}?t=${Date.now()}`;
    }
    
    console.log("Playing video from:", videoSrc);
    
    // Format timestamp for display
    const timestamp = new Date(videoItem.timestamp);
    const formattedDateTime = timestamp.toLocaleString('tr-TR');
    
    // Use label if available, otherwise use formatted date/time
    const title = videoItem.label || formattedDateTime;
    
    // Add video content with loading indicator
    videoModal.innerHTML = `
        <div class="modal-content" style="width: 85%; max-width: 1200px;">
            <div class="modal-header">
                <h2><i class="fas fa-film"></i> ${title}</h2>
                <div class="modal-header-controls">
                    <button class="fullscreen-btn" title="Tam ekran">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button class="close-btn" title="Kapat">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="modal-body">
                <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;" class="video-container">
                    <div class="loading-indicator" style="position:absolute; top:0; left:0; right:0; bottom:0; display:flex; justify-content:center; align-items:center; background-color:#111; z-index:1;">
                        <i class="fas fa-spinner refresh-animation" style="font-size:2rem; color:#3498db;"></i>
                    </div>
                    <video controls style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index:0;">
                        <source src="${videoSrc}" type="video/mp4">
                        Video oynatılamıyor.
                    </video>
                </div>
                <div class="video-info" style="margin-top: 15px; text-align: center; color: #999;">
                    <p>Video süresi: ${videoItem.duration}</p>
                    <p>Oluşturma zamanı: ${formattedDateTime}</p>
                </div>
            </div>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(videoModal);
    
    // Get the video element and add event listeners
    const videoElement = videoModal.querySelector('video');
    const loadingIndicator = videoModal.querySelector('.loading-indicator');
    const closeBtn = videoModal.querySelector('.close-btn');
    const fullscreenBtn = videoModal.querySelector('.fullscreen-btn');
    
    // Close button handler
    closeBtn.addEventListener('click', () => {
        videoModal.remove();
    });
    
    // Fullscreen button handler
    fullscreenBtn.addEventListener('click', () => {
        if (videoElement.requestFullscreen) {
            videoElement.requestFullscreen();
        } else if (videoElement.webkitRequestFullscreen) {
            videoElement.webkitRequestFullscreen();
        } else if (videoElement.msRequestFullscreen) {
            videoElement.msRequestFullscreen();
        }
    });
    
    // Hide loading indicator when video can play
    videoElement.addEventListener('canplay', () => {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        videoElement.style.zIndex = '2'; // Bring video to front
        videoElement.play().catch(e => console.error('Error playing video:', e));
    });
    
    // Show error if video fails to load
    videoElement.addEventListener('error', () => {
        if (loadingIndicator) {
            loadingIndicator.innerHTML = `
                <div style="text-align:center; color:#e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:10px;"></i>
                    <p>Video yüklenirken hata oluştu.</p>
                    <p style="font-size:0.8rem; margin-top:10px;">Dosya: ${videoSrc}</p>
                </div>
            `;
        }
    });
    
    // Close when clicking outside
    videoModal.addEventListener('click', (e) => {
        if (e.target === videoModal) {
            videoModal.remove();
        }
    });
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
    
    // Set up tab switching
    const tabButtons = document.querySelectorAll('.history-tab-btn');
    const tabContents = document.querySelectorAll('.history-tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Show corresponding tab content
            const tabName = button.getAttribute('data-tab');
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            // If switching to videos tab, load video history
            if (tabName === 'videos' && liveViewStaffId) {
                fetchStaffVideoHistory(liveViewStaffId, currentDateFilter);
            }
        });
    });
    
    // Create timeline container if it doesn't exist
    if (!document.getElementById('video-timeline-container')) {
        const videosTab = document.getElementById('videos-tab');
        if (videosTab) {
            const timelineContainer = document.createElement('div');
            timelineContainer.id = 'video-timeline-container';
            timelineContainer.className = 'video-timeline-container';
            videosTab.insertBefore(timelineContainer, videosTab.firstChild);
        }
    }
}

// Update the date filter dropdown
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