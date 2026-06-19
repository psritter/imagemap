const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.text({ type: 'application/xml' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Data file path
const dataFilePath = path.join(__dirname, 'data.xml');

/**
 * GET /api/data.xml - Retrieve the current data.xml file
 */
app.get('/api/data.xml', (req, res) => {
    try {
        if (fs.existsSync(dataFilePath)) {
            const xmlContent = fs.readFileSync(dataFilePath, 'utf8');
            res.set('Content-Type', 'application/xml');
            res.send(xmlContent);
        } else {
            res.status(404).json({ error: 'data.xml not found' });
        }
    } catch (error) {
        console.error('Error reading data.xml:', error);
        res.status(500).json({ error: 'Failed to read data.xml' });
    }
});

/**
 * POST /api/data.xml - Save the data.xml file
 */
app.post('/api/data.xml', (req, res) => {
    try {
        const xmlContent = req.body;
        
        if (!xmlContent) {
            return res.status(400).json({ error: 'No XML content provided' });
        }
        
        // Validate basic XML structure
        if (!xmlContent.trim().startsWith('<?xml')) {
            return res.status(400).json({ error: 'Invalid XML format' });
        }
        
        // Create backup of existing file
        if (fs.existsSync(dataFilePath)) {
            const backupPath = path.join(__dirname, `data.xml.backup.${Date.now()}`);
            fs.copyFileSync(dataFilePath, backupPath);
            console.log(`Backup created: ${backupPath}`);
        }
        
        // Write new file
        fs.writeFileSync(dataFilePath, xmlContent, 'utf8');
        console.log('data.xml saved successfully');
        
        res.json({ 
            success: true, 
            message: 'Data saved successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error saving data.xml:', error);
        res.status(500).json({ error: 'Failed to save data.xml', details: error.message });
    }
});

/**
 * GET /api/images - Retrieve the images manifest
 */
app.get('/api/images', (req, res) => {
    try {
        const imagesPath = path.join(__dirname, 'images.json');
        if (fs.existsSync(imagesPath)) {
            const imagesContent = fs.readFileSync(imagesPath, 'utf8');
            res.set('Content-Type', 'application/json');
            res.send(imagesContent);
        } else {
            res.status(404).json({ error: 'images.json not found' });
        }
    } catch (error) {
        console.error('Error reading images.json:', error);
        res.status(500).json({ error: 'Failed to read images.json' });
    }
});

/**
 * GET / - Serve index.html (imagemap viewer)
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * GET /editor.html - Serve editor page
 */
app.get('/editor', (req, res) => {
    res.sendFile(path.join(__dirname, 'editor.html'));
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        dataFileExists: fs.existsSync(dataFilePath)
    });
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   Imagemap Editor Server Started       ║
╚════════════════════════════════════════╝

Server running at: http://localhost:${PORT}

🌐 Imagemap Viewer:   http://localhost:${PORT}
⚙️  Editor:            http://localhost:${PORT}/editor

Press Ctrl+C to stop the server
    `);
});
