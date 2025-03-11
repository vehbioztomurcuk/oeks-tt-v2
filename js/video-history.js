/**
 * OEKS Team Tracker - Video History Functions
 * Handles staff video history viewing
 */

// Video history state variables
let videoHistoryItems = [];
let filteredVideoItems = [];

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
            console.log("Video history data received:", data);
            
            // Update video history items
            videoHistoryItems = data.videos || [];
            filteredVideoItems = [...videoHistoryItems];
            
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
            
            return data;
        })
        .catch(error => {
            console.error('Error fetching video history:', error);
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
 * Update video history grid
 */
function updateVideoHistoryGrid() {
    const videoGrid = document.getElementById('video-history-grid');
    videoGrid.innerHTML = '';
    
    if (filteredVideoItems.length === 0) {
        videoGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-film"></i>
                <p>Bu tarih için video bulunamadı</p>
            </div>
        `;
        return;
    }
    
    // Add items to grid
    filteredVideoItems.forEach((item, index) => {
        const videoItem = document.createElement('div');
        videoItem.className = 'video-item';
        
        // Format timestamp
        const timestamp = new Date(item.timestamp);
        const formattedDate = timestamp.toLocaleDateString('tr-TR');
        const formattedTime = timestamp.toLocaleTimeString('tr-TR');
        
        videoItem.innerHTML = `
            <div class="video-item-thumbnail">
                <i class="fas fa-film"></i>
                <span class="video-duration">${item.duration}</span>
            </div>
            <div class="video-item-info">
                <div class="video-item-title">${formattedDate} ${formattedTime}</div>
                <button class="video-play-btn">
                    <i class="fas fa-play"></i> İzle
                </button>
            </div>
        `;
        
        // Add click handler to play this video
        const playBtn = videoItem.querySelector('.video-play-btn');
        playBtn.addEventListener('click', () => {
            playStaffVideo(item);
        });
        
        videoGrid.appendChild(videoItem);
    });
}

/**
 * Play a staff video
 * @param {Object} videoItem - Video item to play
 */
function playStaffVideo(videoItem) {
    // Create a modal for the video
    const videoModal = document.createElement('div');
    videoModal.className = 'modal';
    videoModal.style.display = 'block';
    videoModal.style.zIndex = '2000'; // Higher than the staff modal
    
    // Add video content with loading indicator
    videoModal.innerHTML = `
        <div class="modal-content" style="width: 80%; max-width: 1000px;">
            <div class="modal-header">
                <h2><i class="fas fa-film"></i> ${new Date(videoItem.timestamp).toLocaleString('tr-TR')}</h2>
                <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;" class="video-container">
                    <div class="loading-indicator" style="position:absolute; top:0; left:0; right:0; bottom:0; display:flex; justify-content:center; align-items:center; background-color:#111; z-index:1;">
                        <i class="fas fa-spinner refresh-animation" style="font-size:2rem; color:#3498db;"></i>
                    </div>
                    <video controls style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index:0;">
                        <source src="${videoItem.path}?t=${Date.now()}" type="video/mp4">
                        Video oynatılamıyor.
                    </video>
                </div>
                <div style="margin-top: 15px; text-align: center; color: #999;">
                    <p>Video süresi: ${videoItem.duration}</p>
                    <p>Oluşturma zamanı: ${new Date(videoItem.timestamp).toLocaleString('tr-TR')}</p>
                </div>
            </div>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(videoModal);
    
    // Get the video element and add event listeners
    const videoElement = videoModal.querySelector('video');
    const loadingIndicator = videoModal.querySelector('.loading-indicator');
    
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
                    <p style="font-size:0.8rem; margin-top:10px;">Dosya: ${videoItem.path}</p>
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
                fetchStaffVideoHistory(liveViewStaffId);
            }
        });
    });
} 