/**
 * OEKS Team Tracker - Modal Functions
 * Handles all modal and live view functionality
 */

// Modal state variables
let liveViewStaffId = null;
let liveViewIntervalId = null;
let liveViewRefreshInterval = null;
let liveViewRefreshRate = 3;

// Add debounce timer at the top of the file
let screenshotUpdateDebounceTimer = null;

/**
 * Open modal with staff data
 * @param {string} staffId - ID of the staff member
 */
function openModal(staffId) {
    const staff = staffMembers[staffId];
    if (!staff) return;
    
    // Set the current staff ID for live view
    liveViewStaffId = staffId;
    
    // Define liveViewRefreshInterval if it doesn't exist
    if (typeof liveViewRefreshInterval === 'undefined') {
        window.liveViewRefreshInterval = null;
    }
    
    // Clear any existing refresh interval
    if (liveViewRefreshInterval) {
        clearInterval(liveViewRefreshInterval);
        liveViewRefreshInterval = null;
    }
    
    // Update modal content
    document.getElementById('modal-staff-name').textContent = staff.name || "Unknown User";
    document.getElementById('detail-name').textContent = staff.name || "Unknown User";
    document.getElementById('detail-division').textContent = staff.division || "Unassigned";
    document.getElementById('detail-staff-id').textContent = staffId;
    
    // Update status if element exists
    const detailStatus = document.getElementById('detail-status');
    if (detailStatus) {
        detailStatus.textContent = staff.recording_status === 'active' ? 'Aktif' : 'İnaktif';
    }
    
    // Update status indicator
    const statusIndicator = document.querySelector('.modal-header .status-indicator');
    if (statusIndicator) {
        statusIndicator.className = 'status-indicator ' + 
            (staff.recording_status === 'active' ? 'status-active' : 'status-inactive');
    }
    
    // Load screenshot history for this staff member
    fetchStaffHistory(staffId);
    
    // Show modal immediately
    document.getElementById('live-view-modal').style.display = 'block';
    
    // Set up a refresh interval for both the modal info and the screenshot (if active)
    if (staff.recording_status === 'active') {
        // Active staff - refresh more frequently (every 3-10 seconds based on selector)
        liveViewRefreshInterval = setInterval(() => {
            updateDetailInfo(staffId);
            // Also refresh the screenshot if active
            if (liveViewStaffId === staffId) {
                updateLiveView(staffId);
            }
        }, liveViewRefreshRate * 1000);
    } else {
        // Inactive staff - slower refresh just for info
        liveViewRefreshInterval = setInterval(() => {
            updateDetailInfo(staffId);
        }, 10000);
    }
    
    // Get the screenshot container
    const screenshotContainer = document.querySelector('.modal-screenshot-container');
    if (!screenshotContainer) return;
    
    // Show loading state immediately
    screenshotContainer.innerHTML = `
        <div class="loading-indicator" style="position:absolute; top:0; left:0; right:0; bottom:0; display:flex; justify-content:center; align-items:center; background-color:#111;">
            <i class="fas fa-spinner refresh-animation" style="font-size:2rem; color:#3498db;"></i>
        </div>
    `;
    
    loadScreenshotForStaff(staffId, screenshotContainer);
}

/**
 * Load screenshot for a staff member into the provided container
 * @param {string} staffId - ID of the staff member
 * @param {HTMLElement} container - Container element for the screenshot
 */
function loadScreenshotForStaff(staffId, container) {
    // Additional validation to prevent errors
    if (!staffId || staffId === 'unknown') {
        console.warn(`Invalid staff ID for screenshot loading: ${staffId}`);
        showScreenshotError("Geçersiz personel ID'si");
        return;
    }
    
    const staff = staffMembers[staffId];
    if (!staff) {
        console.warn(`Staff not found in data for screenshot loading: ${staffId}`);
        showScreenshotError("Personel verisi bulunamadı");
        return;
    }
    
    // Only try to load screenshot if there's a valid path
    if (staff.screenshot_path && staff.screenshot_path !== "null" && staff.screenshot_path !== null && !staff.screenshot_path.includes("/null")) {
        // Create timestamp for cache busting
        const timestamp = Date.now();
        let screenshotUrl;
        
        try {
            // For all staff, use the screenshot path from staffInfo
            let cleanPath = staff.screenshot_path;
            if (cleanPath.includes('?')) {
                cleanPath = cleanPath.split('?')[0];
            }
            screenshotUrl = `${cleanPath}?t=${timestamp}`;
            
            console.log(`Trying to load screenshot from: ${screenshotUrl}`);
            
            // Create the image element
            const imgElement = document.createElement('img');
            imgElement.id = 'modal-screenshot';
            imgElement.className = 'modal-screenshot';
            imgElement.alt = `${staff.name} ekranı`;
            
            // Add loading handler
            imgElement.onload = () => {
                console.log("Screenshot loaded successfully");
                // Remove loading indicator if it exists
                const loadingIndicator = container.querySelector('.loading-indicator');
                if (loadingIndicator) {
                    loadingIndicator.remove();
                }
            };
            
            // Add error handler
            imgElement.onerror = () => {
                console.error("Screenshot loading error");
                showScreenshotError("Görüntü yüklenirken hata oluştu");
            };
            
            // Set the source
            imgElement.src = screenshotUrl;
            container.appendChild(imgElement);
            
        } catch (error) {
            console.error("Error setting screenshot source:", error);
            showScreenshotError("Görüntü URL işlenirken hata oluştu");
        }
    } else {
        // No valid screenshot path
        console.warn("No valid screenshot path for staff:", staffId, staff.screenshot_path);
        showScreenshotError("Bu kullanıcı için görüntü bulunmamaktadır");
    }
}

/**
 * Show error message in screenshot container
 * @param {string} message - Error message to display
 */
function showScreenshotError(message) {
    const container = document.querySelector('.modal-screenshot-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="screenshot-error" style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; color:#e74c3c;">
            <i class="fas fa-exclamation-triangle" style="font-size:3rem; margin-bottom:15px;"></i>
            <p>${message}</p>
        </div>
    `;
}

/**
 * Update detail information in the modal
 * @param {string} staffId - ID of the staff member
 */
function updateDetailInfo(staffId) {
    if (!staffId) return;
    
    const staff = staffMembers[staffId];
    if (!staff) return;
    
    // Update the last time info
    const detailLastTime = document.getElementById('detail-last-time');
    if (detailLastTime) {
        const now = new Date();
        detailLastTime.textContent = `${formatTimeDiff(now, new Date(staff.timestamp))} önce`;
    }
    
    // Update status indicator
    const statusIndicator = document.querySelector('.modal-header .status-indicator');
    if (statusIndicator) {
        statusIndicator.className = 'status-indicator ' + 
            (staff.recording_status === 'active' ? 'status-active' : 'status-inactive');
    }
}

/**
 * Close modal and clean up
 */
function closeModal() {
    document.getElementById('live-view-modal').style.display = 'none';
    if (liveViewIntervalId) {
        clearInterval(liveViewIntervalId);
        liveViewIntervalId = null;
    }
    
    if (liveViewRefreshInterval) {
        clearInterval(liveViewRefreshInterval);
        liveViewRefreshInterval = null;
    }
    
    // Stop history playback
    if (typeof stopHistoryPlayback === 'function') {
        stopHistoryPlayback();
    }
    
    liveViewStaffId = null;
}

/**
 * Update live view with new screenshot
 * Uses debouncing to prevent rapid consecutive updates
 */
function updateLiveView(staffId) {
    // Clear any existing debounce timer
    if (screenshotUpdateDebounceTimer) {
        clearTimeout(screenshotUpdateDebounceTimer);
    }
    
    // Set a new debounce timer (300ms delay)
    screenshotUpdateDebounceTimer = setTimeout(() => {
        _performScreenshotUpdate(staffId);
    }, 300);
}

/**
 * Actual implementation of screenshot update (after debouncing)
 * @private
 */
function _performScreenshotUpdate(staffId) {
    // Additional validation to prevent errors
    if (!staffId || staffId === 'unknown') {
        console.warn(`Invalid staff ID for live view update: ${staffId}`);
        return;
    }
    
    // Check if the staff exists and is active
    const staff = staffMembers[staffId];
    if (!staff) {
        console.warn(`Staff not found in data: ${staffId}`);
        return;
    }
    
    if (staff.recording_status !== 'active') {
        console.log(`Not updating screenshot for inactive staff: ${staffId}`);
        return;
    }
    
    console.log(`Updating live view for ${staffId}`);
    
    // Get the screenshot container
    const screenshotContainer = document.querySelector('.modal-screenshot-container');
    if (!screenshotContainer) {
        console.warn('Screenshot container not found in DOM');
        return;
    }
    
    // Check if there's an image element already
    const existingImg = document.getElementById('modal-screenshot');
    if (existingImg) {
        // Create a new timestamp for cache busting
        const timestamp = Date.now();
        let screenshotUrl;
        
        // Use the screenshot path from staffInfo
        let cleanPath = staff.screenshot_path;
        if (cleanPath.includes('?')) {
            cleanPath = cleanPath.split('?')[0];
        }
        screenshotUrl = `${cleanPath}?t=${timestamp}`;
        
        // Update the source
        existingImg.src = screenshotUrl;
        console.log(`Updated screenshot source to: ${screenshotUrl}`);
    } else {
        // No existing image, need to reload it
        loadScreenshotForStaff(staffId, screenshotContainer);
    }
}

/**
 * Initialize modal elements and events
 */
function initializeModal() {
    console.log("Initializing modal...");
    
    // Ensure global variables are initialized properly
    if (typeof liveViewStaffId === 'undefined') {
        window.liveViewStaffId = null;
    }
    
    if (typeof liveViewRefreshRate === 'undefined') {
        window.liveViewRefreshRate = 3;
    }
    
    // Setup close button
    const closeButton = document.getElementById('close-modal');
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }
    
    // Setup click outside to close
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('live-view-modal');
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Set up live view refresh interval
    const modalRefreshSelector = document.getElementById('modal-refresh-interval');
    if (modalRefreshSelector) {
        modalRefreshSelector.addEventListener('change', () => {
            liveViewRefreshRate = parseInt(modalRefreshSelector.value);
            if (liveViewStaffId) {
                setupLiveViewRefresh();
            }
        });
    }
}

/**
 * Setup live view refresh
 */
function setupLiveViewRefresh() {
    if (!liveViewStaffId) return;
    
    if (liveViewRefreshInterval) {
        clearInterval(liveViewRefreshInterval);
    }
    
    // Set up interval to refresh the screenshot based on the selected refresh rate
    liveViewRefreshInterval = setInterval(() => {
        if (liveViewStaffId) {
            updateLiveView(liveViewStaffId);
        }
    }, liveViewRefreshRate * 1000);
    
    console.log(`Set up live view refresh for ${liveViewStaffId} every ${liveViewRefreshRate} seconds`);
} 