/**
 * OEKS Team Tracker - Main Application Script
 * Initializes the application and integrates all modules
 */

// Initialize application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
    // Set initial state for live view to null
    window.liveViewStaffId = null;
    
    // Initialize dashboard controls
    initializeDashboardControls();
    
    // Initialize modal
    initializeModal();
    
    // Initialize history controls
    initializeHistoryControls();
    
    // Initialize video history controls
    initializeVideoHistoryControls();
    
    // Connect to WebSocket
    const socket = connectWebSocket();
    
    // Initial fetch of staff data
    setupRefresh();
    fetchStaffData();
} 

