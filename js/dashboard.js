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
            // Log the entire API response for debugging
            console.log('Staff API Response:', data);
            console.log('Staff List Length:', data.staffList ? data.staffList.length : 0);
            console.log('Staff Data Keys:', Object.keys(data.staffData || {}));
            
            // Store staff data globally
            staffMembers = data.staffData || {};
            
            // Update the lists of divisions and names for filters
            divisionsList = new Set();
            namesList = new Set();
            
            Object.values(staffMembers).forEach(staff => {
                if (staff.division) divisionsList.add(staff.division);
                if (staff.name) namesList.add(staff.name);
            });
            
            // Update filter dropdowns
            updateFilterOptions();
            
            // Update stats
            updateStats(data);
            
            // Update the dashboard with new data
            updateDashboard(data);
            
            // Update live view if open, the function exists, and the staff ID is valid
            if (typeof liveViewStaffId !== 'undefined' && 
                liveViewStaffId && 
                typeof updateLiveView === 'function' &&
                liveViewStaffId !== 'unknown' &&
                staffMembers[liveViewStaffId]) {  // Make sure staff exists in our data
                console.log(`Refreshing live view for ${liveViewStaffId}`);
                updateLiveView(liveViewStaffId);
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
    
    console.log('Updating dashboard with staff list:', staffList);
    console.log('Staff data:', staffData);
    
    // If no staff members found, show empty state
    if (!staffList || staffList.length === 0) {
        console.warn('No staff members found in staff list');
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
        console.log(`Processing staff member: ${staffId}`);
        
        // Skip if no staff data
        if (!staffData || !staffData[staffId]) {
            console.warn(`No data found for staff ID: ${staffId}`);
            return;
        }
        
        const staffInfo = staffData[staffId];
        console.log(`Staff info:`, staffInfo);
        
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
            <div id="staff-${staffId}" class="staff-card" data-staff-id="${staffId}" data-name="${staffInfo.name}" data-division="${staffInfo.division}">
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
            // Get a clean path and timestamp for cache busting - use more aggressive timestamp
            const timestamp = Date.now();
            let cleanPath = staffInfo.video_path;
            
            // Remove any existing query parameters for clean URL generation
            if (cleanPath.includes('?')) {
                cleanPath = cleanPath.split('?')[0];
            }
            
            // Add timestamp to prevent browser caching
            const videoPath = `${cleanPath}?t=${timestamp}`;
            
            // For staff_pc_141, always try to load latest.mp4 directly
            if (staffId === 'staff_pc_141') {
                const directLatestPath = `videos/${staffId}/latest.mp4?t=${timestamp}`;
                console.log(`Trying direct latest.mp4 path for ${staffId}: ${directLatestPath}`);
                
                cardHTML += `
                    <video autoplay muted loop playsinline>
                        <source src="${directLatestPath}" type="video/mp4">
                    </video>
                    <div class="overlay">
                        <i class="fas fa-search-plus"></i>
                    </div>
                `;
            } else {
                cardHTML += `
                    <video autoplay muted loop playsinline>
                        <source src="${videoPath}" type="video/mp4">
                    </video>
                    <div class="overlay">
                        <i class="fas fa-search-plus"></i>
                    </div>
                `;
            }
        } else {
            // If this is staff_pc_141, create a more specific placeholder
            if (staffId === 'staff_pc_141') {
                console.log("Creating test video for staff_pc_141");
                cardHTML += `
                    <div class="placeholder-video" style="background-color: #333;">
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; text-align: center;">
                            <i class="fas fa-video-slash" style="font-size: 2rem;"></i>
                            <p>Video yok</p>
                            <p>Kayıt durumunda ama video bulunamadı</p>
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
        console.log(`Added staff card for ${staffId}`);
    });
    
    console.log(`Dashboard updated with ${staffList.length} staff members`);
    
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
