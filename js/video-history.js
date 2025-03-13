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
function fetchStaffVideoHistory(staffId, dateFilter = 'all') {
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
    
    // Add debug log for video history request
    console.log(`[DEBUG] Fetching video history for staff ${staffId} with date filter ${dateFilter}`);
    
    const url = dateFilter === 'all' 
        ? `/api/staff-videos/${staffId}` 
        : `/api/staff-videos/${staffId}?date=${dateFilter}`;
    
    return fetch(url)
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
            
            // Log counts for debugging
            console.log(`[DEBUG] Found ${videoHistoryItems.length} 5-minute videos`);
            console.log(`[DEBUG] Found ${hourlyVideoItems.length} 15-minute videos`); // Now 15-minute videos
            console.log(`[DEBUG] Found ${dailyVideoItems.length} daily videos`);
            
            // Update date filter dropdown
            const dateFilter = document.getElementById('video-date-filter');
            if (dateFilter) {
                dateFilter.innerHTML = '<option value="all">Tümü</option>';
                
                (data.availableDates || []).forEach(date => {
                    const formattedDate = new Date(`${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`).toLocaleDateString('tr-TR');
                    const option = document.createElement('option');
                    option.value = date;
                    option.textContent = formattedDate;
                    dateFilter.appendChild(option);
                });
            }
            
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
    
    fetch(`/api/video-timeline/${staffId}?date=${date}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Timeline data request failed');
            }
            return response.json();
        })
        .then(data => {
            console.log("Timeline data received:", data);
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
    
    // Format date for display
    let dateDisplay = '';
    try {
        const dateObj = new Date(`${data.date.substring(0, 4)}-${data.date.substring(4, 6)}-${data.date.substring(6, 8)}`);
        dateDisplay = dateObj.toLocaleDateString('tr-TR');
    } catch (e) {
        dateDisplay = data.date;
    }
    
    // Create timeline header
    let timelineHTML = `
        <div class="timeline-header">
            <h3><i class="fas fa-calendar-day"></i> ${dateDisplay} Zaman Çizelgesi</h3>
            <div class="timeline-controls">
                <button id="play-daily-video" class="timeline-btn" title="Günlük videoyu oynat">
                    <i class="fas fa-play"></i> Günlük Video
                </button>
            </div>
        </div>
        <div class="timeline-scroll-container">
            <div class="timeline-hours">
    `;
    
    // Create hour markers
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
        if (segment.type === 'daily') {
            // Handle daily video button
            const dailyBtn = document.getElementById('play-daily-video');
            if (dailyBtn) {
                dailyBtn.addEventListener('click', () => {
                    playStaffVideoStreaming(segment);
                });
                
                // If no daily video, hide the button
                if (!segment.streamPath) {
                    dailyBtn.style.display = 'none';
                }
            }
            return;
        }
        
        // For 5min and hourly videos, add to timeline
        const hour = segment.hour;
        const hourContainer = document.getElementById(`hour-${hour}`);
        
        if (hourContainer) {
            const segmentEl = document.createElement('div');
            segmentEl.className = `timeline-segment ${segment.type}`;
            segmentEl.title = `${segment.label} - ${segment.type === 'hourly' ? '1 saat' : '5 dakika'}`;
            segmentEl.setAttribute('data-path', segment.streamPath);
            
            // Position the segment based on minute (for 5min videos)
            if (segment.type === '5min') {
                const minute = segment.minute;
                segmentEl.style.left = `${(minute / 60) * 100}%`;
                segmentEl.style.width = '8%'; // Width for 5min segments
            } else {
                // Hourly videos span the whole hour
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
 * Update video history grid
 */
function updateVideoHistoryGrid() {
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
    
    // Add daily videos section if available
    if (dailyVideoItems.length > 0) {
        const dailySection = document.createElement('div');
        dailySection.className = 'video-section';
        dailySection.innerHTML = `
            <h3 class="video-section-title"><i class="fas fa-calendar-day"></i> Günlük Videolar</h3>
            <div class="video-section-grid" id="daily-videos-grid"></div>
        `;
        videoGrid.appendChild(dailySection);
        
        const dailyGrid = dailySection.querySelector('#daily-videos-grid');
        
        dailyVideoItems.forEach(item => {
            const videoItem = createVideoGridItem(item);
            dailyGrid.appendChild(videoItem);
        });
    }
    
    // Add 15-minute videos section if available (previously hourly)
    if (hourlyVideoItems.length > 0) {
        const hourlySection = document.createElement('div');
        hourlySection.className = 'video-section';
        hourlySection.innerHTML = `
            <h3 class="video-section-title"><i class="fas fa-clock"></i> 15 Dakikalık Videolar</h3>
            <div class="video-section-grid" id="hourly-videos-grid"></div>
        `;
        videoGrid.appendChild(hourlySection);
        
        const hourlyGrid = hourlySection.querySelector('#hourly-videos-grid');
        
        hourlyVideoItems.forEach(item => {
            const videoItem = createVideoGridItem(item);
            hourlyGrid.appendChild(videoItem);
        });
    }
    
    // Add 5-minute videos section if available
    if (filteredVideoItems.length > 0) {
        const fiveMinSection = document.createElement('div');
        fiveMinSection.className = 'video-section';
        fiveMinSection.innerHTML = `
            <h3 class="video-section-title"><i class="fas fa-film"></i> 5 Dakikalık Videolar</h3>
            <div class="video-section-grid" id="five-min-videos-grid"></div>
        `;
        videoGrid.appendChild(fiveMinSection);
        
        const fiveMinGrid = fiveMinSection.querySelector('#five-min-videos-grid');
        
        filteredVideoItems.forEach(item => {
            const videoItem = createVideoGridItem(item);
            fiveMinGrid.appendChild(videoItem);
        });
    }
    
    console.log('[DEBUG] Video history grid updated with available videos');
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