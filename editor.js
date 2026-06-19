// Global state
let mapData = {
    settings: {
        pageTitle: 'Interactive Imagemap',
        pageColor: '#ffffff',
        backgroundImage: '',
        mapWidth: 800,
        mapHeight: 600
    },
    areas: []
};

let imageFiles = [];
let currentEditingArea = null;
let selectedPointId = null;

// DOM Elements
const pageTitle = document.getElementById('pageTitle');
const pageColor = document.getElementById('pageColor');
const pageColorText = document.getElementById('pageColorText');
const backgroundImage = document.getElementById('backgroundImage');
const bgImagePreview = document.getElementById('bgImagePreview');
const mapWidth = document.getElementById('mapWidth');
const mapHeight = document.getElementById('mapHeight');
const editorSVG = document.getElementById('editorSVG');
const mapBackground = document.getElementById('mapBackground');
const pointsContainer = document.getElementById('pointsContainer');
const areasList = document.getElementById('areasList');
const addAreaBtn = document.getElementById('addAreaBtn');
const areaEditorModal = document.getElementById('areaEditorModal');
const modalTitle = document.getElementById('modalTitle');
const areaForm = document.getElementById('areaForm');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelAreaBtn = document.getElementById('cancelAreaBtn');
const deleteAreaBtn = document.getElementById('deleteAreaBtn');
const selectedPointInfo = document.getElementById('selectedPointInfo');
const areaImage = document.getElementById('areaImage');
const imagePreview = document.getElementById('imagePreview');
const areaColor = document.getElementById('areaColor');
const areaColorText = document.getElementById('areaColorText');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const resetBtn = document.getElementById('resetBtn');

/**
 * Load available images from images.json manifest
 */
async function loadImageFiles() {
    try {
        const response = await fetch('images.json');
        if (!response.ok) {
            throw new Error('Failed to load images.json');
        }
        
        const data = await response.json();
        if (data.images && Array.isArray(data.images)) {
            imageFiles = data.images;
            console.log('Loaded images from manifest:', imageFiles);
        } else {
            throw new Error('Invalid images.json format');
        }
    } catch (error) {
        console.error('Could not load images manifest:', error);
        // Fallback: provide common image options if manifest loading fails
        imageFiles = [
            'images/item-1.jpg',
            'images/item-2.jpg',
            'images/item-3.jpg',
            'images/item-4.jpg',
            'images/item-5.jpg',
            'images/item-6.jpg',
            'images/item-7.jpg',
            'images/item-8.jpg',
            'images/item-9.jpg',
            'images/item-10.jpg',
            'images/item-11.jpg'
        ];
        console.warn('Using fallback image list');
    }
    
    populateImageSelects();
}

/**
 * Populate image select dropdowns with available images
 */
function populateImageSelects() {
    // Populate area image select
    const options = imageFiles.map(file => {
        const filename = file.substring(file.lastIndexOf('/') + 1);
        return `<option value="${file}">${filename}</option>`;
    }).join('');
    
    areaImage.innerHTML = '<option value="">Select an image...</option>' + options;
    
    // Populate background image select
    backgroundImage.innerHTML = '<option value="">None</option>' + options;
}

/**
 * Fetch and parse the XML file
 */
async function loadXMLData() {
    try {
        const response = await fetch('data.xml');
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            throw new Error('XML parsing error');
        }
        
        // Load settings
        const settings = xmlDoc.querySelector('settings');
        if (settings) {
            mapData.settings.pageTitle = settings.querySelector('pageTitle')?.textContent || 'Interactive Imagemap';
            mapData.settings.pageColor = settings.querySelector('pageColor')?.textContent || '#ffffff';
            mapData.settings.backgroundImage = settings.querySelector('backgroundImage')?.textContent || '';
            mapData.settings.mapWidth = parseInt(settings.querySelector('mapWidth')?.textContent || '800');
            mapData.settings.mapHeight = parseInt(settings.querySelector('mapHeight')?.textContent || '600');
        }
        
        // Load areas
        const areaElements = xmlDoc.querySelectorAll('area');
        mapData.areas = Array.from(areaElements).map(area => ({
            id: area.querySelector('id').textContent,
            title: area.querySelector('title').textContent,
            image: area.querySelector('image').textContent,
            content: area.querySelector('content').textContent,
            x: parseInt(area.querySelector('x').textContent),
            y: parseInt(area.querySelector('y').textContent),
            radius: parseInt(area.querySelector('radius').textContent),
            color: area.querySelector('color').textContent
        }));
        
        console.log('Loaded map data:', mapData);
    } catch (error) {
        console.error('Error loading XML:', error);
        alert('Failed to load data. Please refresh the page.');
    }
}

/**
 * Initialize the editor UI with loaded data
 */
function initializeEditor() {
    // Populate form fields
    pageTitle.value = mapData.settings.pageTitle;
    pageColor.value = mapData.settings.pageColor;
    pageColorText.value = mapData.settings.pageColor;
    backgroundImage.value = mapData.settings.backgroundImage;
    mapWidth.value = mapData.settings.mapWidth;
    mapHeight.value = mapData.settings.mapHeight;
    
    // Update SVG dimensions
    updateSVGDimensions();
    
    // Update preview
    updateBgImagePreview();
    
    // Render areas
    renderAreas();
    renderPoints();
}

/**
 * Update SVG dimensions
 */
function updateSVGDimensions() {
    const w = parseInt(mapWidth.value);
    const h = parseInt(mapHeight.value);
    
    editorSVG.setAttribute('width', w);
    editorSVG.setAttribute('height', h);
    editorSVG.setAttribute('viewBox', `0 0 ${w} ${h}`);
    
    mapBackground.setAttribute('width', w);
    mapBackground.setAttribute('height', h);
}

/**
 * Update background image preview
 */
function updateBgImagePreview() {
    if (mapData.settings.backgroundImage) {
        bgImagePreview.style.backgroundImage = `url('${mapData.settings.backgroundImage}')`;
    } else {
        bgImagePreview.style.backgroundImage = 'none';
    }
}

/**
 * Render areas list
 */
function renderAreas() {
    areasList.innerHTML = mapData.areas.map(area => `
        <div class="area-item ${selectedPointId === area.id ? 'active' : ''}" data-id="${area.id}">
            <div class="area-item-info">
                <div class="area-item-title">${area.title}</div>
                <div class="area-item-meta">Position: (${area.x}, ${area.y}) | Radius: ${area.radius}</div>
            </div>
            <div class="area-item-color" style="background-color: ${area.color}"></div>
        </div>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.area-item').forEach(item => {
        item.addEventListener('click', () => {
            selectedPointId = item.dataset.id;
            renderAreas();
            renderPoints();
            updateSelectedPointInfo();
        });
        
        item.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            openAreaEditor(item.dataset.id);
        });
    });
}

/**
 * Render points on canvas
 */
function renderPoints() {
    pointsContainer.innerHTML = mapData.areas.map(area => `
        <circle 
            cx="${area.x}" 
            cy="${area.y}" 
            r="${area.radius}" 
            fill="${area.color}" 
            stroke="${selectedPointId === area.id ? '#000' : '#fff'}"
            stroke-width="${selectedPointId === area.id ? '3' : '2'}"
            class="${selectedPointId === area.id ? 'selected' : ''}"
            data-id="${area.id}"
            style="cursor: pointer; transition: all 0.2s ease;"
        />
    `).join('');
    
    // Add event listeners to circles
    document.querySelectorAll('#pointsContainer circle').forEach(circle => {
        circle.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedPointId = circle.dataset.id;
            renderAreas();
            renderPoints();
            updateSelectedPointInfo();
        });
        
        circle.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            openAreaEditor(circle.dataset.id);
        });
    });
}

/**
 * Update selected point info display
 */
function updateSelectedPointInfo() {
    if (selectedPointId) {
        const area = mapData.areas.find(a => a.id === selectedPointId);
        if (area) {
            selectedPointInfo.textContent = `${area.title} (${area.x}, ${area.y})`;
        }
    } else {
        selectedPointInfo.textContent = 'None';
    }
}

/**
 * Handle canvas click to add or move point
 */
function handleCanvasClick(e) {
    if (!selectedPointId) return; // Only allow placing if a point is selected for editing
    
    const rect = editorSVG.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * mapData.settings.mapWidth;
    const y = ((e.clientY - rect.top) / rect.height) * mapData.settings.mapHeight;
    
    const area = mapData.areas.find(a => a.id === selectedPointId);
    if (area) {
        area.x = Math.round(x);
        area.y = Math.round(y);
        renderAreas();
        renderPoints();
    }
}

/**
 * Open area editor modal
 */
function openAreaEditor(areaId = null) {
    currentEditingArea = null;
    
    if (areaId) {
        currentEditingArea = mapData.areas.find(a => a.id === areaId);
        modalTitle.textContent = 'Edit Info Point';
        deleteAreaBtn.style.display = 'block';
        
        if (currentEditingArea) {
            document.getElementById('areaTitle').value = currentEditingArea.title;
            document.getElementById('areaContent').value = currentEditingArea.content;
            document.getElementById('areaImage').value = currentEditingArea.image;
            document.getElementById('areaX').value = currentEditingArea.x;
            document.getElementById('areaY').value = currentEditingArea.y;
            document.getElementById('areaRadius').value = currentEditingArea.radius;
            document.getElementById('areaColor').value = currentEditingArea.color;
            areaColorText.value = currentEditingArea.color;
            updateImagePreview();
        }
    } else {
        modalTitle.textContent = 'Add New Info Point';
        deleteAreaBtn.style.display = 'none';
        
        document.getElementById('areaTitle').value = '';
        document.getElementById('areaContent').value = '';
        document.getElementById('areaImage').value = '';
        document.getElementById('areaX').value = mapData.settings.mapWidth / 2;
        document.getElementById('areaY').value = mapData.settings.mapHeight / 2;
        document.getElementById('areaRadius').value = '40';
        document.getElementById('areaColor').value = '#3498db';
        areaColorText.value = '#3498db';
        imagePreview.style.backgroundImage = 'none';
    }
    
    areaEditorModal.classList.add('active');
}

/**
 * Close area editor modal
 */
function closeAreaEditor() {
    areaEditorModal.classList.remove('active');
    currentEditingArea = null;
    areaForm.reset();
}

/**
 * Update image preview
 */
function updateImagePreview() {
    const imagePath = areaImage.value;
    if (imagePath) {
        imagePreview.style.backgroundImage = `url('${imagePath}')`;
    } else {
        imagePreview.style.backgroundImage = 'none';
    }
}

/**
 * Update color text input
 */
function updateColorText() {
    areaColorText.value = areaColor.value;
}

/**
 * Save area data
 */
function saveArea(e) {
    e.preventDefault();
    
    const title = document.getElementById('areaTitle').value.trim();
    const content = document.getElementById('areaContent').value.trim();
    const image = document.getElementById('areaImage').value;
    const x = parseInt(document.getElementById('areaX').value);
    const y = parseInt(document.getElementById('areaY').value);
    const radius = parseInt(document.getElementById('areaRadius').value);
    const color = document.getElementById('areaColor').value;
    
    if (!title || !content || !image) {
        alert('Please fill in all fields');
        return;
    }
    
    if (currentEditingArea) {
        // Update existing area
        currentEditingArea.title = title;
        currentEditingArea.content = content;
        currentEditingArea.image = image;
        currentEditingArea.x = x;
        currentEditingArea.y = y;
        currentEditingArea.radius = radius;
        currentEditingArea.color = color;
    } else {
        // Add new area
        const newId = Math.max(...mapData.areas.map(a => parseInt(a.id)), 0) + 1;
        mapData.areas.push({
            id: newId.toString(),
            title,
            content,
            image,
            x,
            y,
            radius,
            color
        });
    }
    
    closeAreaEditor();
    renderAreas();
    renderPoints();
}

/**
 * Delete area
 */
function deleteArea(e) {
    e.preventDefault();
    
    if (!currentEditingArea) return;
    
    if (confirm(`Delete "${currentEditingArea.title}"?`)) {
        mapData.areas = mapData.areas.filter(a => a.id !== currentEditingArea.id);
        if (selectedPointId === currentEditingArea.id) {
            selectedPointId = null;
        }
        closeAreaEditor();
        renderAreas();
        renderPoints();
    }
}

/**
 * Save all changes to XML
 */
async function saveAllChanges() {
    try {
        // Update settings
        mapData.settings.pageTitle = pageTitle.value;
        mapData.settings.pageColor = pageColor.value;
        mapData.settings.backgroundImage = backgroundImage.value;
        mapData.settings.mapWidth = parseInt(mapWidth.value);
        mapData.settings.mapHeight = parseInt(mapHeight.value);
        
        // Generate XML
        const xml = generateXML();
        
        // Send to server to save
        const response = await fetch('data.xml', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/xml'
            },
            body: xml
        });
        
        if (response.ok) {
            alert('Changes saved successfully!');
            // Redirect back to imagemap
            window.location.href = 'index.html';
        } else {
            // Fallback: save to localStorage if server save fails
            localStorage.setItem('mapData', JSON.stringify(mapData));
            alert('Note: Changes saved to browser. Set up a backend to save to server.');
        }
    } catch (error) {
        console.error('Error saving changes:', error);
        // Fallback to localStorage
        localStorage.setItem('mapData', JSON.stringify(mapData));
        alert('Changes saved to browser storage. To permanently save to data.xml, set up a backend.');
    }
}

/**
 * Generate XML from map data
 */
function generateXML() {
    const areaXML = mapData.areas.map(area => `
	<area>
		<id>${area.id}</id>
		<title>${escapeXML(area.title)}</title>
		<image>${escapeXML(area.image)}</image>
		<content>${escapeXML(area.content)}</content>
		<x>${area.x}</x>
		<y>${area.y}</y>
		<radius>${area.radius}</radius>
		<color>${area.color}</color>
	</area>`).join('');
    
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<imagemap xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<settings>
		<pageTitle>${escapeXML(mapData.settings.pageTitle)}</pageTitle>
		<pageColor>${mapData.settings.pageColor}</pageColor>
		<backgroundImage>${escapeXML(mapData.settings.backgroundImage)}</backgroundImage>
		<mapWidth>${mapData.settings.mapWidth}</mapWidth>
		<mapHeight>${mapData.settings.mapHeight}</mapHeight>
	</settings>
	<areas>${areaXML}
	</areas>
</imagemap>`;
}

/**
 * Escape XML special characters
 */
function escapeXML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Reset to defaults
 */
function resetToDefaults() {
    if (confirm('Reset all changes to defaults? This cannot be undone.')) {
        // Reset will be done on next load
        localStorage.removeItem('mapData');
        location.reload();
    }
}

/**
 * Event Listeners
 */
function setupEventListeners() {
    // Page settings
    pageColor.addEventListener('change', (e) => {
        pageColorText.value = e.target.value;
        mapData.settings.pageColor = e.target.value;
    });
    
    backgroundImage.addEventListener('change', (e) => {
        mapData.settings.backgroundImage = e.target.value;
        updateBgImagePreview();
    });
    
    mapWidth.addEventListener('change', updateSVGDimensions);
    mapHeight.addEventListener('change', updateSVGDimensions);
    
    // Area editor
    addAreaBtn.addEventListener('click', () => openAreaEditor());
    closeModalBtn.addEventListener('click', closeAreaEditor);
    cancelAreaBtn.addEventListener('click', closeAreaEditor);
    areaForm.addEventListener('submit', saveArea);
    deleteAreaBtn.addEventListener('click', deleteArea);
    
    areaImage.addEventListener('change', updateImagePreview);
    areaColor.addEventListener('change', updateColorText);
    
    // Canvas
    editorSVG.addEventListener('click', handleCanvasClick);
    
    // Main buttons
    saveBtn.addEventListener('click', saveAllChanges);
    cancelBtn.addEventListener('click', () => {
        if (confirm('Discard all changes?')) {
            window.location.href = 'index.html';
        }
    });
    resetBtn.addEventListener('click', resetToDefaults);
    
    // Close modal when clicking outside
    areaEditorModal.addEventListener('click', (e) => {
        if (e.target === areaEditorModal) {
            closeAreaEditor();
        }
    });
}

/**
 * Initialize the editor
 */
async function initialize() {
    try {
        // Load image files first
        await loadImageFiles();
        
        // Load XML data
        await loadXMLData();
        
        // Initialize UI
        initializeEditor();
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('Editor initialized successfully');
    } catch (error) {
        console.error('Error initializing editor:', error);
        alert('Failed to initialize editor. Please refresh the page.');
    }
}

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
