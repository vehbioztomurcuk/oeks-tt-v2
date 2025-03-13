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
    // Show loading state
    const videoGrid = document.getElementById('video-history-grid');
    videoGrid.innerHTML = '<div class="empty-state"><i class="fas fa-spinner refresh-animation"></i><p>Video geçmişi yükleniyor...</p></div>';
    
    // Reset video history state
    videoHistoryItems = [];
    filteredVideoItems = [];
    hourlyVideoItems = [];
    dailyVideoItems = [];
    currentStaffId = staffId;
    currentDateFilter = dateFilter;
    
    console.log(`[DEBUG] Fetching video history for staff ${staffId} with date filter ${dateFilter}`);
    
    // If dateFilter is 'today', use 'all' for the API call to get today's videos
    const apiDateFilter = dateFilter === 'today' ? 'all' : dateFilter;
    
    const url = apiDateFilter === 'all' 
        ? `/api/staff-videos/${staffId}` 
        : `/api/staff-videos/${staffId}?date=${apiDateFilter}`;
    
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Video history request failed');
            }
            return response.json();
        })
        .then(data => {
            console.log("[DEBUG] Video history data received:", data);
            
            // Handle null response
            if (!data) {
                videoGrid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-film"></i>
                        <p>Bu personel için video bulunamadı</p>
                    </div>
                `;
                
                // Update date filter dropdown with empty options
                const dateFilter = document.getElementById('video-date-filter');
                if (dateFilter) {
                    dateFilter.innerHTML = '<option value="today">Bugün</option>';
                }
                
                // Hide timeline
                const timelineContainer = document.getElementById('video-timeline-container');
                if (timelineContainer) {
                    timelineContainer.innerHTML = `
                        <div class="timeline-empty">
                            <i class="fas fa-calendar-times"></i>
                            <p>Bu personel için video kaydı bulunamadı</p>
                        </div>
                    `;
                }
                
                return;
            }
            
            // Update video history items
            videoHistoryItems = data.videos || [];
            hourlyVideoItems = data.hourlyVideos || [];
            dailyVideoItems = data.dailyVideos || [];
            filteredVideoItems = [...videoHistoryItems];
            
            // Update date filter dropdown
            const dateFilter = document.getElementById('video-date-filter');
            if (dateFilter) {
                // Get today's date in YYYYMMDD format
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0].replace(/-/g, '');
                
                dateFilter.innerHTML = '<option value="today">Bugün</option>';
                
                // Add available dates to dropdown
                (data.availableDates || []).forEach(date => {
                    // Skip today's date if it's in the list
                    if (date === todayStr) return;
                    
                    // Format date as DD.MM.YYYY for Turkish format
                    const year = date.substring(0, 4);
                    const month = date.substring(4, 6);
                    const day = date.substring(6, 8);
                    const formattedDate = `${day}.${month}.${year}`;
                    
                    const option = document.createElement('option');
                    option.value = date;
                    option.textContent = formattedDate;
                    dateFilter.appendChild(option);
                });
                
                // Set the selected value
                if (currentDateFilter === 'today') {
                    dateFilter.value = 'today';
                } else {
                    // If the current date filter exists in the options, select it
                    const exists = Array.from(dateFilter.options).some(opt => opt.value === currentDateFilter);
                    dateFilter.value = exists ? currentDateFilter : 'today';
                }
            }
            
            // Update video grid with chronological display
            updateChronologicalVideoGrid();
            
            // Fetch timeline data for the selected date
            if (currentDateFilter !== 'all' && currentDateFilter !== 'today') {
                fetchVideoTimeline(staffId, currentDateFilter);
            } else {
                // For "today", get today's date in YYYYMMDD format
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0].replace(/-/g, '');
                fetchVideoTimeline(staffId, todayStr);
            }
            
            return data;
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
            
            // Hide timeline or show error
            const timelineContainer = document.getElementById('video-timeline-container');
            if (timelineContainer) {
                timelineContainer.innerHTML = `
                    <div class="timeline-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Zaman çizelgesi yüklenirken hata oluştu</p>
                    </div>
                `;
            }
            
            throw error;
        });
}

/**
 * Fetch video timeline data for a specific date
 * @param {string} staffId - ID of the staff member
 * @param {string} date - Date in YYYYMMDD format
 */
function fetchVideoTimeline(staffId, date) {
    const timelineContainer = document.getElementById('video-timeline-container');
    if (!timelineContainer) return;
    
    // Show loading state
    timelineContainer.innerHTML = '<div class="timeline-loading"><i class="fas fa-spinner refresh-animation"></i> Zaman çizelgesi yükleniyor...</div>';
    timelineContainer.style.display = 'block';
    
    // Check if staffId is valid
    if (!staffId || staffId === 'unknown') {
        timelineContainer.innerHTML = `
            <div class="timeline-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Geçersiz personel kimliği</p>
            </div>
        `;
        return;
    }
    
    fetch(`/api/video-timeline/${staffId}?date=${date}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Timeline data request failed');
            }
            return response.json();
        })
        .then(data => {
            console.log("Timeline data received:", data);
            
            // Handle null or empty data
            if (!data || !data.segments || data.segments.length === 0) {
                timelineContainer.innerHTML = `
                    <div class="timeline-empty">
                        <i class="fas fa-calendar-times"></i>
                        <p>Bu tarih için video kaydı bulunamadı</p>
                    </div>
                `;
                return;
            }
            
            timelineData = data.segments || [];
            renderVideoTimeline(data);
        })
        .catch(error => {
            console.error('Error fetching timeline data:', error);
            timelineContainer.innerHTML = `
                <div class="timeline-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Zaman çizelgesi yüklenirken hata oluştu</p>
                </div>
            `;
        });
}

/**
 * Render the video timeline
 * @param {Object} data - Timeline data
 */
function renderVideoTimeline(data) {
    const timelineContainer = document.getElementById('video-timeline-container');
    if (!timelineContainer) return;
    
    // Format date for display (Turkish format)
    let dateDisplay = '';
    try {
        const year = data.date.substring(0, 4);
        const month = data.date.substring(4, 6);
        const day = data.date.substring(6, 8);
        dateDisplay = `${day}.${month}.${year}`;
    } catch (e) {
        dateDisplay = data.date;
    }
    
    // Create timeline header
    let timelineHTML = `
        <div class="timeline-header">
            <h3><i class="fas fa-calendar-day"></i> ${dateDisplay} Zaman Çizelgesi</h3>
        </div>
        <div class="timeline-scroll-container">
            <div class="timeline-hours">
    `;
    
    // Create hour markers (using 24-hour format for Turkey)
    for (let hour = 0; hour < 24; hour++) {
        const hourStr = hour.toString().padStart(2, '0');
        timelineHTML += `<div class="timeline-hour" data-hour="${hour}">
            <div class="hour-label">${hourStr}:00</div>
            <div class="hour-segments" id="hour-${hour}"></div>
        </div>`;
    }
    
    timelineHTML += `
            </div>
        </div>
    `;
    
    timelineContainer.innerHTML = timelineHTML;
    
    // Add segments to the timeline
    data.segments.forEach(segment => {
        // For all video types, add to timeline
        const hour = segment.hour;
        const hourContainer = document.getElementById(`hour-${hour}`);
        
        if (hourContainer) {
            const segmentEl = document.createElement('div');
            segmentEl.className = `timeline-segment ${segment.type}`;
            
            // Set tooltip with more detailed information
            let tooltipText = '';
            if (segment.type === 'daily') {
                tooltipText = `Günlük Video - ${dateDisplay}`;
            } else if (segment.type === 'hourly') {
                tooltipText = `15 Dakikalık Video - ${segment.label}`;
            } else {
                tooltipText = `5 Dakikalık Video - ${segment.label}`;
            }
            
            segmentEl.title = tooltipText;
            segmentEl.setAttribute('data-path', segment.streamPath);
            
            // Position the segment based on minute (for 5min videos)
            if (segment.type === '5min') {
                const minute = segment.minute;
                segmentEl.style.left = `${(minute / 60) * 100}%`;
                segmentEl.style.width = '8%'; // Width for 5min segments
            } else if (segment.type === 'hourly') {
                // 15-minute videos span a quarter of the hour
                const minute = segment.minute;
                segmentEl.style.left = `${(minute / 60) * 100}%`;
                segmentEl.style.width = '25%'; // Width for 15min segments
            } else {
                // Daily videos span the whole day
                segmentEl.style.width = '100%';
            }
            
            // Add click handler
            segmentEl.addEventListener('click', () => {
                playStaffVideoStreaming(segment);
            });
            
            hourContainer.appendChild(segmentEl);
        }
    });
    
    // If no segments, show empty message
    if (data.segments.length === 0) {
        timelineContainer.innerHTML = `
            <div class="timeline-empty">
                <i class="fas fa-calendar-times"></i>
                <p>Bu tarih için video kaydı bulunamadı</p>
            </div>
        `;
    }
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