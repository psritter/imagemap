// Global state
let areasData = [];
const infoTitle = document.getElementById('infoTitle');
const infoText = document.getElementById('infoText');
const galleryImage = document.getElementById('galleryImage');
const svg = document.getElementById('imagemapSVG');
const circlesContainer = document.getElementById('circlesContainer');
const imageMap = document.getElementById('imageMap');

/**
 * Fetch and parse the XML file
 */
async function loadXMLData() {
    try {
        const response = await fetch('data.xml');
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // Check for parsing errors
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            throw new Error('XML parsing error');
        }
        
        // Extract area data from XML
        const areaElements = xmlDoc.querySelectorAll('area');
        areasData = Array.from(areaElements).map(area => ({
            id: area.querySelector('id').textContent,
            title: area.querySelector('title').textContent,
            image: area.querySelector('image').textContent,
            content: area.querySelector('content').textContent,
            x: parseInt(area.querySelector('x').textContent),
            y: parseInt(area.querySelector('y').textContent),
            radius: parseInt(area.querySelector('radius').textContent),
            color: area.querySelector('color').textContent
        }));
        
        console.log('Loaded areas from XML:', areasData);
        return areasData;
    } catch (error) {
        console.error('Error loading XML:', error);
        showError('Failed to load data. Please refresh the page.');
        return [];
    }
}

/**
 * Create SVG circles from the areas data
 */
function renderCircles() {
    // Clear existing circles
    circlesContainer.innerHTML = '';
    
    // Create circles for each area
    areasData.forEach(area => {
        // Create group for circle and text
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'circle-icon');
        g.setAttribute('data-id', area.id);
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', area.title);
        
        // Create circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', area.x);
        circle.setAttribute('cy', area.y);
        circle.setAttribute('r', area.radius);
        circle.setAttribute('fill', area.color);
        circle.setAttribute('stroke', '#fff');
        circle.setAttribute('stroke-width', '2');
        
        // Create text label (show first char or number)
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', area.x);
        text.setAttribute('y', area.y);
        text.setAttribute('class', 'circle-label');
        text.textContent = area.id;
        
        g.appendChild(circle);
        g.appendChild(text);
        circlesContainer.appendChild(g);
        
        // Add event listeners
        g.addEventListener('click', () => handleAreaClick(area));
        g.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleAreaClick(area);
            }
        });
    });
}

/**
 * Handle area click to update info content
 */
function handleAreaClick(area) {
    infoTitle.textContent = area.title;
    infoText.textContent = area.content;
    galleryImage.src = area.image;
    galleryImage.alt = area.title;
    
    // Update active state
    document.querySelectorAll('.circle-icon').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelector(`[data-id="${area.id}"]`).classList.add('active');
}

/**
 * Show error message if data fails to load
 */
function showError(message) {
    infoTitle.textContent = 'Error';
    infoText.textContent = message;
}

/**
 * Responsive SVG scaling
 */
function makeResponsive() {
    // SVG automatically scales with viewBox, but we can add resize handlers if needed
    window.addEventListener('resize', () => {
        // Trigger re-render if needed
    });
}

/**
 * Initialize the application
 */
async function initialize() {
    try {
        // Load data from XML
        await loadXMLData();
        
        if (areasData.length === 0) {
            showError('No areas found in data.xml');
            return;
        }
        
        // Render circles
        renderCircles();
        
        // Set up responsive behavior
        makeResponsive();
        
        // Load first area by default
        handleAreaClick(areasData[0]);
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize. Check console for details.');
    }
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
