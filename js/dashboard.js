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
    // Update the staff grid with the latest data
    const staffGrid = document.getElementById('staff-grid');
    const { staffList, staffData } = data;
    
    // Clear any previous content
    staffGrid.innerHTML = '';
    
    // If no staff members found, show empty state
    if (staffList.length === 0) {
        const emptyState = `
            <div class="staff-card">
                <div class="staff-header">
                    <span><span class="status-indicator status-inactive"></span> Veri Bekleniyor...</span>
                </div>
                <div class="empty-state">
                    <i class="fas fa-spinner refresh-animation"></i>
                    <p>Henüz bağlı personel yok</p>
                </div>
            </div>
        `;
        staffGrid.innerHTML = emptyState;
        return;
    }
    
    // Keep track of total staff and active staff for stats
    let totalStaff = staffList.length;
    let activeStaff = 0;
    
    // Process each staff member
    staffList.forEach(staffId => {
        const staffInfo = staffData[staffId];
        
        // Count active staff
        if (staffInfo.recording_status === 'active') {
            activeStaff++;
        }
        
        // Determine if the video path is valid
        const hasValidVideo = staffInfo.video_path && 
                             staffInfo.video_path !== "null" && 
                             staffInfo.video_path !== null && 
                             !staffInfo.video_path.includes("/null");
        
        console.log(`Staff ${staffId} video path: ${staffInfo.video_path}, valid: ${hasValidVideo}`);
        
        // Create card HTML
        let cardHTML = `
            <div class="staff-card" data-staff-id="${staffId}" data-name="${staffInfo.name}" data-division="${staffInfo.division}">
                <div class="staff-header">
                    <span>
                        <span class="status-indicator status-${staffInfo.recording_status}"></span>
                        ${staffInfo.name}
                    </span>
                    <span class="staff-division">${staffInfo.division}</span>
                </div>
                <div class="video-container" onclick="openModal('${staffId}')">
        `;
        
        // Add video or placeholder based on video path
        if (hasValidVideo) {
            // Get a clean path and timestamp for cache busting
            const timestamp = new Date().getTime();
            const videoPath = staffInfo.video_path.includes('?') 
                ? staffInfo.video_path + '&t=' + timestamp 
                : staffInfo.video_path + '?t=' + timestamp;
                
            cardHTML += `
                <video autoplay muted loop playsinline>
                    <source src="${videoPath}" type="video/mp4">
                </video>
                <div class="overlay">
                    <i class="fas fa-search-plus"></i>
                </div>
            `;
        } else {
            // If staff is staff_pc_141, create test video for debugging
            if (staffId === 'staff_pc_141') {
                console.log("Creating test video for staff_pc_141");
                cardHTML += `
                    <div class="placeholder-video" style="background-color: #333;">
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; text-align: center;">
                            <i class="fas fa-video-slash" style="font-size: 2rem;"></i>
                            <p>Video yok</p>
                            <p>İzleme Durumu: ${staffInfo.recording_status}</p>
                            <p>${new Date(staffInfo.timestamp).toLocaleTimeString('tr-TR')}</p>
                        </div>
                    </div>
                    <div class="overlay">
                        <i class="fas fa-search-plus"></i>
                    </div>
                `;
            } else {
                // For other staff members, just show the placeholder
                cardHTML += `
                    <div class="placeholder-video">
                        <div class="no-video-message">
                            <i class="fas fa-video-slash"></i>
                            <p>Video yok</p>
                            <p>İzleme Durumu: ${staffInfo.recording_status}</p>
                            <p>${new Date(staffInfo.timestamp).toLocaleTimeString('tr-TR')}</p>
                        </div>
                    </div>
                    <div class="overlay">
                        <i class="fas fa-search-plus"></i>
                    </div>
                `;
            }
        }
        
        // Close video container and card
        cardHTML += `
                </div>
                <div class="staff-footer">
                    <span class="staff-info">
                        <i class="fas fa-clock"></i> ${formatTimeAgo(staffInfo.timestamp)}
                    </span>
                    <button class="view-btn" onclick="openModal('${staffId}')">
                        <i class="fas fa-eye"></i> İzle
                    </button>
                </div>
            </div>
        `;
        
        // Add to grid
        staffGrid.innerHTML += cardHTML;
    });
    
    // Update stats
    updateStats({
        totalStaff,
        activeStaff,
        lastUpdate: new Date().toLocaleTimeString('tr-TR'),
        totalScreenshots
    });
    
    // Apply any active filters
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
    // Set up event listeners for filters
    document.getElementById('division-filter').addEventListener('change', applyFilters);
    document.getElementById('name-filter').addEventListener('change', applyFilters);
    document.getElementById('status-filter').addEventListener('change', applyFilters);
    document.getElementById('search-input').addEventListener('input', applyFilters);
    
    // Set up refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
        updateStaffList();
    });
    
    // Set up refresh interval dropdown
    document.getElementById('refresh-interval').addEventListener('change', function() {
        setupRefresh();
        applyFilters();
    });
} 
