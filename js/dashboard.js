/**
 * OEKS Team Tracker - Dashboard Functions
 * Handles dashboard display and updates
 */

// Store staff data
let staffMembers = {};
let divisionsList = new Set();
let namesList = new Set();
let totalScreenshots = 0;
let filters = {
    division: "all",
    name: "all",
    status: "all",
    search: ""
};

/**
 * Update filter dropdowns
 */
function updateFilterOptions() {
    const divisionDropdown = document.getElementById('division-filter');
    const nameDropdown = document.getElementById('name-filter');
    
    // Save current selections
    const currentDivision = divisionDropdown.value;
    const currentName = nameDropdown.value;
    
    // Clear current options (except "All")
    while (divisionDropdown.options.length > 1) {
        divisionDropdown.remove(1);
    }
    
    while (nameDropdown.options.length > 1) {
        nameDropdown.remove(1);
    }
    
    // Add new options
    divisionsList.forEach(division => {
        const option = document.createElement('option');
        option.value = division;
        option.textContent = division;
        divisionDropdown.appendChild(option);
    });
    
    namesList.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        nameDropdown.appendChild(option);
    });
    
    // Restore selections if they still exist
    if ([...divisionDropdown.options].some(opt => opt.value === currentDivision)) {
        divisionDropdown.value = currentDivision;
    }
    
    if ([...nameDropdown.options].some(opt => opt.value === currentName)) {
        nameDropdown.value = currentName;
    }
}

/**
 * Apply filters to staff grid
 */
function applyFilters() {
    const staffCards = document.querySelectorAll('.staff-card');
    let visibleCount = 0;
    
    staffCards.forEach(card => {
        const staffId = card.id.replace('staff-', '');
        const staff = staffMembers[staffId];
        
        if (!staff) {
            card.style.display = 'none';
            return;
        }
        
        const now = new Date();
        const timestamp = new Date(staff.timestamp);
        const timeDiff = Math.round((now - timestamp) / 1000);
        const isActive = timeDiff < 60;
        
        // Apply division filter
        const divisionMatch = filters.division === 'all' || staff.division === filters.division;
        
        // Apply name filter
        const nameMatch = filters.name === 'all' || staff.name === filters.name;
        
        // Apply status filter
        const statusMatch = filters.status === 'all' || 
                           (filters.status === 'active' && isActive) || 
                           (filters.status === 'inactive' && !isActive);
        
        // Apply search filter
        const searchMatch = filters.search === '' || 
                            staff.name.toLowerCase().includes(filters.search) || 
                            staff.division.toLowerCase().includes(filters.search) ||
                            staffId.toLowerCase().includes(filters.search);
        
        // Show/hide based on filters
        if (divisionMatch && nameMatch && statusMatch && searchMatch) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show empty state if no cards visible
    if (visibleCount === 0 && Object.keys(staffMembers).length > 0) {
        const staffGrid = document.getElementById('staff-grid');
        
        // Only add empty state if it doesn't already exist
        if (!document.querySelector('.empty-filter-state')) {
            staffGrid.innerHTML += `
                <div class="empty-state empty-filter-state">
                    <i class="fas fa-filter"></i>
                    <p>Mevcut filtrelerle eşleşen personel bulunamadı</p>
                    <button id="reset-filters-btn" style="margin-top: 15px;">
                        <i class="fas fa-times"></i> Filtreleri Temizle
                    </button>
                </div>
            `;
            
            document.getElementById('reset-filters-btn').addEventListener('click', resetFilters);
        }
    } else {
        // Remove empty filter state if it exists
        const emptyState = document.querySelector('.empty-filter-state');
        if (emptyState) {
            emptyState.remove();
        }
    }
}

/**
 * Reset all filters
 */
function resetFilters() {
    document.getElementById('division-filter').value = 'all';
    document.getElementById('name-filter').value = 'all';
    document.getElementById('status-filter').value = 'all';
    document.getElementById('search-input').value = '';
    
    filters = {
        division: 'all',
        name: 'all',
        status: 'all',
        search: ''
    };
    
    applyFilters();
}

/**
 * Update statistics
 * @param {Object} data - Staff data from API
 */
function updateStats(data) {
    const now = new Date();
    let activeCount = 0;
    
    // Count active staff
    Object.keys(data.staffData || {}).forEach(staffId => {
        const staff = data.staffData[staffId];
        if (staff && staff.recording_status === 'active') {
            activeCount++;
        }
    });
    
    document.getElementById('total-staff').textContent = data.staffList ? data.staffList.length.toString() : '0';
    document.getElementById('active-staff').textContent = activeCount.toString();
    document.getElementById('last-update').textContent = now.toLocaleTimeString();
    document.getElementById('total-screenshots').textContent = totalScreenshots.toString();
}

/**
 * Fetch staff data from server
 * @returns {Promise} Promise that resolves when fetch completes
 */
function fetchStaffData() {
    // Get list of staff directories
    return fetch('/api/staff-list')
        .then(response => {
            if (!response.ok) {
                throw new Error('İstek başarısız oldu');
            }
            return response.json();
        })
        .then(data => {
            // Update stats
            updateStats(data);
            
            // Update the dashboard with new data
            updateDashboard(data);
            
            // Update live view if open
            if (liveViewStaffId) {
                updateLiveView();
            }
            
            updateConnectionStatus('connected');
        })
        .catch(error => {
            console.error('Veri çekme hatası:', error);
            updateConnectionStatus('error');
            
            // If API isn't available yet, fallback to directory scan
            fallbackToDirectoryScan();
        });
}

/**
 * Fallback to directory scan if API isn't available
 */
function fallbackToDirectoryScan() {
    // Use empty data structure instead of demo data
    const emptyData = {
        staffList: [],
        staffData: {}
    };
    updateDashboard(emptyData);
}

/**
 * Update the dashboard with new data
 * @param {Object} data - Staff data from API
 */
function updateDashboard(data) {
    const staffGrid = document.getElementById('staff-grid');
    
    // Clear lists of divisions and names for filters
    divisionsList.clear();
    namesList.clear();
    
    // Store data in our staffMembers object and collect division/name data
    data.staffList.forEach(staffId => {
        const staffInfo = data.staffData[staffId];
        staffMembers[staffId] = staffInfo;
        
        if (staffInfo.division) divisionsList.add(staffInfo.division);
        if (staffInfo.name) namesList.add(staffInfo.name);
    });
    
    // Update filter dropdowns
    updateFilterOptions();
    
    // Clear the grid if we have staff members
    if (data.staffList && data.staffList.length > 0) {
        staffGrid.innerHTML = '';
    }
    
    // Add staff cards
    data.staffList.forEach(staffId => {
        const staffInfo = data.staffData[staffId];
        const timestamp = new Date(staffInfo.timestamp);
        const now = new Date();
        
        // Get name and division with fallbacks
        const name = staffInfo.name || "Bilinmeyen Kullanıcı";
        const division = staffInfo.division || "Tanımlanmamış";
        
        // Create or update staff card
        let staffCard = document.getElementById(`staff-${staffId}`);
        
        if (!staffCard) {
            staffCard = document.createElement('div');
            staffCard.id = `staff-${staffId}`;
            staffCard.className = 'staff-card';
            staffCard.dataset.staffId = staffId;
            staffGrid.appendChild(staffCard);
            
            staffCard.addEventListener('click', () => openModal(staffId));
        }
        
        // Determine if we have a valid video path
        const hasValidVideo = staffInfo.video_path && 
                            staffInfo.video_path !== "null" && 
                            staffInfo.video_path !== null &&
                            !staffInfo.video_path.includes("/null");
        
        // Create HTML for the video container
        let videoHTML;
        if (hasValidVideo) {
            // Ensure we don't have duplicate timestamp parameters
            const videoUrl = staffInfo.video_path.includes('?') 
                ? staffInfo.video_path.split('?')[0] + `?t=${Date.now()}` 
                : `${staffInfo.video_path}?t=${Date.now()}`;
                
            videoHTML = `
                <div class="video-container">
                    <video class="staff-video" autoplay muted loop playsinline>
                        <source src="${videoUrl}" type="video/mp4">
                    </video>
                    <div class="video-status">${staffInfo.recording_status === 'active' ? 'Kayıt' : 'Beklemede'}</div>
                    <div class="video-timestamp">${timestamp.toLocaleTimeString('tr-TR')}</div>
                </div>
            `;
        } else {
            // Show a placeholder for staff with no video
            videoHTML = `
                <div class="video-container no-video">
                    <div class="empty-state">
                        <i class="fas fa-video-slash"></i>
                        <p>Video yok</p>
                    </div>
                    <div class="video-status">${staffInfo.recording_status === 'active' ? 'Bağlı' : 'Bağlı Değil'}</div>
                    <div class="video-timestamp">${timestamp.toLocaleTimeString('tr-TR')}</div>
                </div>
            `;
        }
        
        // Update card content
        staffCard.innerHTML = `
            <div class="staff-header">
                <span>
                    <span class="status-indicator ${staffInfo.recording_status === 'active' ? 'status-active' : 'status-inactive'}"></span>
                    <strong>${name}</strong> <span class="badge">${division}</span>
                </span>
                <span>${formatTimeDiff(now, timestamp)} önce</span>
            </div>
            ${videoHTML}
            <div class="timestamp">
                <span>${staffId}</span> - ${timestamp.toLocaleString('tr-TR')}
            </div>
        `;
        
        // Set up error handling for videos that actually exist
        if (hasValidVideo) {
            const video = staffCard.querySelector('.staff-video');
            if (video) {
                video.onerror = function() {
                    const container = this.closest('.video-container');
                    if (container) {
                        container.innerHTML = `
                            <div style="display:flex;height:100%;align-items:center;justify-content:center;background:#111;color:#666;">
                                <div style="text-align:center;">
                                    <i class="fas fa-video-slash" style="font-size:24px;margin-bottom:5px;"></i>
                                    <p style="font-size:12px;">Video yüklenemedi</p>
                                </div>
                            </div>
                            <div class="video-status">${staffInfo.recording_status === 'active' ? 'Kayıt' : 'Beklemede'}</div>
                            <div class="video-timestamp">${timestamp.toLocaleTimeString('tr-TR')}</div>
                        `;
                    }
                };
            }
        }
    });
    
    // Apply filters
    applyFilters();
}

/**
 * Update staff list from API
 */
function updateStaffList() {
    fetch('/api/staff-list')
        .then(response => response.json())
        .then(data => {
            const oldStaffMembers = {...staffMembers};
            updateDashboard(data);
            
            // If we're in a modal view, update the detail page too, but NOT the video
            if (liveViewStaffId && staffMembers[liveViewStaffId]) {
                // Only update the metadata info
                updateDetailInfo(liveViewStaffId);
            }
        })
        .catch(error => {
            console.error('Veri çekme hatası:', error);
            updateConnectionStatus('error');
        });
}

/**
 * Setup auto-refresh
 */
let refreshIntervalId = null;
let refreshRate = 3; // seconds

function setupRefresh() {
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
    }
    
    if (refreshRate > 0) {
        refreshIntervalId = setInterval(fetchStaffData, refreshRate * 1000);
    }
}

/**
 * Initialize dashboard controls
 */
function initializeDashboardControls() {
    // Set up refresh interval selector
    const refreshSelector = document.getElementById('refresh-interval');
    refreshSelector.addEventListener('change', () => {
        refreshRate = parseInt(refreshSelector.value);
        setupRefresh();
    });
    
    // Set up manual refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
        const icon = document.querySelector('#refresh-btn i');
        icon.classList.add('refresh-animation');
        fetchStaffData().finally(() => {
            setTimeout(() => {
                icon.classList.remove('refresh-animation');
            }, 500);
        });
    });
    
    // Set up filters
    document.getElementById('division-filter').addEventListener('change', (e) => {
        filters.division = e.target.value;
        applyFilters();
    });
    
    document.getElementById('name-filter').addEventListener('change', (e) => {
        filters.name = e.target.value;
        applyFilters();
    });
    
    document.getElementById('status-filter').addEventListener('change', (e) => {
        filters.status = e.target.value;
        applyFilters();
    });
    
    document.getElementById('search-input').addEventListener('input', (e) => {
        filters.search = e.target.value.toLowerCase();
        applyFilters();
    });
} 