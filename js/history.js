/**
 * OEKS Team Tracker - History Functions
 * Handles staff history viewing and playback
 */

// History state variables
let historyItems = [];
let currentHistoryIndex = 0;
let historyPlaybackInterval = null;
let isPlaying = false;

// Add a new variable to store filtered history items
let filteredHistoryItems = [];

/**
 * Fetch staff history from the server
 * @param {string} staffId - ID of the staff member
 * @param {string} dateFilter - Date filter (format: 'YYYYMMDD' or 'all')
 * @returns {Promise} Promise that resolves with history data
 */
function fetchStaffHistory(staffId, dateFilter = 'all') {
    // Show loading state
    const historyGrid = document.getElementById('history-grid');
    historyGrid.innerHTML = '<div class="empty-state"><i class="fas fa-spinner refresh-animation"></i><p>Geçmiş yükleniyor...</p></div>';
    
    // Reset history state
    historyItems = [];
    currentHistoryIndex = 0;
    
    // Stop any playback
    stopHistoryPlayback();
    
    // Hide playback image until loaded
    document.getElementById('history-playback-image').style.opacity = '0';
    document.getElementById('history-timestamp').textContent = '--:--:--';
    document.getElementById('history-counter').textContent = '0/0';
    
    const url = dateFilter === 'all' 
        ? `/api/staff-history/${staffId}?limit=50` 
        : `/api/staff-history/${staffId}?date=${dateFilter}&limit=50`;
    
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('History request failed');
            }
            return response.json();
        })
        .then(data => {
            console.log("History data received:", data); // Debug log
            
            // Update history items
            historyItems = data.history || [];
            filteredHistoryItems = [...historyItems]; // Initialize filtered items
            currentHistoryIndex = 0;
            
            // Update date filter dropdown
            const dateFilter = document.getElementById('history-date-filter');
            dateFilter.innerHTML = '<option value="all">Tümü</option>';
            
            (data.availableDates || []).forEach(date => {
                const formattedDate = new Date(`${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`).toLocaleDateString('tr-TR');
                const option = document.createElement('option');
                option.value = date;
                option.textContent = formattedDate;
                dateFilter.appendChild(option);
            });
            
            // Update history grid
            updateHistoryGrid();
            
            // Update playback (if we have items)
            if (historyItems.length > 0) {
                updateHistoryPlayback();
                document.getElementById('history-playback-image').style.opacity = '1';
            }
            
            return data;
        })
        .catch(error => {
            console.error('Error fetching history:', error);
            historyGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Geçmiş yüklenirken hata oluştu</p>
                    <p class="error-details">${error.message}</p>
                </div>
            `;
            throw error;
        });
}

/**
 * Filter history items based on search input
 */
function filterHistoryItems() {
    const searchInput = document.getElementById('history-search');
    const searchTerm = searchInput.value.toLowerCase();
    
    if (!searchTerm) {
        // If no search term, use all history items
        filteredHistoryItems = [...historyItems];
    } else {
        // Filter items based on search term
        filteredHistoryItems = historyItems.filter(item => {
            // Check filename
            if (item.filename.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            // Check timestamp (formatted as time)
            const time = new Date(item.timestamp).toLocaleTimeString('tr-TR');
            if (time.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            return false;
        });
    }
    
    // Update the history grid with filtered items
    updateHistoryGrid();
    
    // Reset playback index
    currentHistoryIndex = 0;
    
    // Update playback if we have items
    if (filteredHistoryItems.length > 0) {
        updateHistoryPlayback();
    }
}

/**
 * Update history grid with thumbnails
 */
function updateHistoryGrid() {
    const historyGrid = document.getElementById('history-grid');
    historyGrid.innerHTML = '';
    
    if (filteredHistoryItems.length === 0) {
        historyGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-photo-video"></i>
                <p>Bu arama için geçmiş görüntü bulunamadı</p>
            </div>
        `;
        return;
    }
    
    // Add items to grid
    filteredHistoryItems.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        if (index === currentHistoryIndex) {
            historyItem.classList.add('current');
        }
        
        // Extract time from filename or use timestamp
        let timeDisplay = new Date(item.timestamp).toLocaleTimeString('tr-TR');
        if (item.filename && item.filename.includes('-')) {
            const parts = item.filename.split('-');
            if (parts.length >= 3) {
                const timePart = parts[2];
                if (timePart.length >= 6) {
                    timeDisplay = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}:${timePart.substring(4, 6)}`;
                }
            }
        }
        
        historyItem.innerHTML = `
            <img class="history-image" src="${item.path}?t=${Date.now()}" alt="Ekran görüntüsü" loading="lazy">
            <div class="history-timestamp">${timeDisplay}</div>
        `;
        
        // Add click handler to select this item
        historyItem.addEventListener('click', () => {
            currentHistoryIndex = index;
            updateHistoryPlayback();
            stopHistoryPlayback(); // Stop playback when manually selecting
        });
        
        historyGrid.appendChild(historyItem);
    });
    
    // Update counter
    document.getElementById('history-counter').textContent = 
        filteredHistoryItems.length > 0 ? `1/${filteredHistoryItems.length}` : '0/0';
}

/**
 * Update history playback image and controls
 */
function updateHistoryPlayback() {
    if (filteredHistoryItems.length === 0) {
        document.getElementById('history-playback-image').src = '';
        document.getElementById('history-timestamp').textContent = '--:--:--';
        document.getElementById('history-counter').textContent = '0/0';
        document.getElementById('history-timeline').style.setProperty('--progress', '0%');
        return;
    }
    
    const item = filteredHistoryItems[currentHistoryIndex];
    if (!item) {
        console.error('Invalid history item index:', currentHistoryIndex);
        return;
    }
    
    // Load the playback image with cache-busting query param
    const playbackImage = document.getElementById('history-playback-image');
    playbackImage.src = `${item.path}?t=${Date.now()}`;
    
    // Extract time from filename or use timestamp
    let timeDisplay = new Date(item.timestamp).toLocaleTimeString('tr-TR');
    if (item.filename && item.filename.includes('-')) {
        const parts = item.filename.split('-');
        if (parts.length >= 3) {
            const timePart = parts[2];
            if (timePart.length >= 6) {
                timeDisplay = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}:${timePart.substring(4, 6)}`;
            }
        }
    }
    
    // Update UI elements
    document.getElementById('history-timestamp').textContent = timeDisplay;
    document.getElementById('history-counter').textContent = `${currentHistoryIndex + 1}/${filteredHistoryItems.length}`;
    
    // Update timeline progress
    const progress = ((currentHistoryIndex + 1) / filteredHistoryItems.length) * 100;
    document.getElementById('history-timeline').style.setProperty('--progress', `${progress}%`);
    
    // Update class on grid items
    const historyItemElements = document.querySelectorAll('.history-item');
    historyItemElements.forEach((item, index) => {
        if (index === currentHistoryIndex) {
            item.classList.add('current');
            // Scroll into view if needed
            const container = document.getElementById('history-grid');
            const itemRect = item.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            if (itemRect.bottom > containerRect.bottom || itemRect.top < containerRect.top) {
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } else {
            item.classList.remove('current');
        }
    });
}

/**
 * Start playback of history items
 */
function startHistoryPlayback() {
    if (filteredHistoryItems.length <= 1) return;
    
    isPlaying = true;
    document.getElementById('history-play-btn').innerHTML = '<i class="fas fa-pause"></i>';
    
    // Clear any existing interval
    if (historyPlaybackInterval) {
        clearInterval(historyPlaybackInterval);
    }
    
    // Set new interval (3fps = every 333ms)
    historyPlaybackInterval = setInterval(() => {
        currentHistoryIndex = (currentHistoryIndex + 1) % filteredHistoryItems.length;
        updateHistoryPlayback();
    }, 333); // 3fps
}

/**
 * Stop playback
 */
function stopHistoryPlayback() {
    isPlaying = false;
    document.getElementById('history-play-btn').innerHTML = '<i class="fas fa-play"></i>';
    
    if (historyPlaybackInterval) {
        clearInterval(historyPlaybackInterval);
        historyPlaybackInterval = null;
    }
}

/**
 * Toggle playback
 */
function toggleHistoryPlayback() {
    if (isPlaying) {
        stopHistoryPlayback();
    } else {
        startHistoryPlayback();
    }
}

/**
 * Previous history item
 */
function previousHistoryItem() {
    if (filteredHistoryItems.length === 0) return;
    
    stopHistoryPlayback();
    currentHistoryIndex = (currentHistoryIndex - 1 + filteredHistoryItems.length) % filteredHistoryItems.length;
    updateHistoryPlayback();
}

/**
 * Next history item
 */
function nextHistoryItem() {
    if (filteredHistoryItems.length === 0) return;
    
    stopHistoryPlayback();
    currentHistoryIndex = (currentHistoryIndex + 1) % filteredHistoryItems.length;
    updateHistoryPlayback();
}

/**
 * Initialize history controls
 */
function initializeHistoryControls() {
    // Set up history controls
    const playBtn = document.getElementById('history-play-btn');
    const prevBtn = document.getElementById('history-prev-btn');
    const nextBtn = document.getElementById('history-next-btn');
    const dateFilter = document.getElementById('history-date-filter');
    
    if (playBtn) playBtn.addEventListener('click', toggleHistoryPlayback);
    if (prevBtn) prevBtn.addEventListener('click', previousHistoryItem);
    if (nextBtn) nextBtn.addEventListener('click', nextHistoryItem);
    
    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            if (liveViewStaffId) {
                fetchStaffHistory(liveViewStaffId, e.target.value);
            }
        });
    }
} 