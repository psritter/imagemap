// Get all area elements from the imagemap
const areas = document.querySelectorAll('area');
const infoTitle = document.getElementById('infoTitle');
const infoText = document.getElementById('infoText');
const responsiveImage = document.getElementById('responsiveImage');
const imageMap = document.getElementById('imageMap');

// Scale factor for responsive imagemap
let scaleFactor = 1;

/**
 * Update the imagemap coordinates based on image size
 * This ensures the imagemap works responsively
 */
function scaleImageMap() {
    const img = document.getElementById('responsiveImage');
    
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        // Calculate scale factor based on displayed vs natural image size
        scaleFactor = img.width / img.naturalWidth;
        
        // Update all area coordinates
        areas.forEach(area => {
            const coords = area.dataset.originalCoords || area.coords;
            if (!area.dataset.originalCoords) {
                area.dataset.originalCoords = area.coords;
            }
            
            const coordsArray = coords.split(',').map(coord => {
                return Math.round(parseInt(coord) * scaleFactor);
            });
            
            area.coords = coordsArray.join(',');
        });
    }
}

/**
 * Handle area click to update info content
 */
function handleAreaClick(event) {
    event.preventDefault();
    
    const title = event.target.dataset.title;
    const content = event.target.dataset.content;
    const areaId = event.target.dataset.id;
    
    // Update the info area
    infoTitle.textContent = title;
    infoText.textContent = content;
    
    // Add a visual highlight effect
    addHighlightEffect(areaId);
}

/**
 * Add visual feedback when an area is clicked
 */
function addHighlightEffect(areaId) {
    // Remove previous highlight
    areas.forEach(area => area.classList.remove('active'));
    
    // Add highlight to clicked area
    const clickedArea = document.querySelector(`area[data-id="${areaId}"]`);
    if (clickedArea) {
        clickedArea.classList.add('active');
    }
}

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    areas.forEach(area => {
        // Click handler
        area.addEventListener('click', handleAreaClick);
        
        // Keyboard accessibility
        area.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                handleAreaClick(event);
            }
        });
        
        // Tab accessibility
        area.setAttribute('tabindex', '0');
    });
}

/**
 * Initialize the imagemap
 */
function initialize() {
    // Set up event listeners
    initializeEventListeners();
    
    // Scale imagemap on load
    responsiveImage.addEventListener('load', scaleImageMap);
    window.addEventListener('resize', scaleImageMap);
    
    // Initial scale if image is already loaded
    if (responsiveImage.complete) {
        scaleImageMap();
    }
    
    // Load first area by default
    if (areas.length > 0) {
        handleAreaClick({ 
            target: areas[0],
            preventDefault: () => {}
        });
    }
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// Additional: Handle orientation changes
window.addEventListener('orientationchange', () => {
    setTimeout(scaleImageMap, 100);
});
