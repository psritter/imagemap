# Imagemap Editor

An interactive imagemap with a visual editor for managing clickable areas, page settings, and image galleries. Perfect for static web hosting on university servers.

## 🚀 Quick Start

### No Installation Required!

This is a fully static website with no server dependencies. You can:
1. **Edit locally** - Use the editor in your browser (no install needed)
2. **Export files** - Download your configuration for upload
3. **Host anywhere** - Works on any web hosting (university servers, static hosting, etc.)

### To Use Locally:

1. Open `index.html` in your browser to view the imagemap
2. Click "⚙️ Edit Settings" to open the editor
3. Make your changes
4. Click "💾 Save Locally" to save to browser storage
5. Click "📥 Export Files" to download files for upload to server

### To Host on University Server:

1. Download/export all files using the "📥 Export Files" button
2. Upload via FTP/SFTP or file manager:
   - `index.html`
   - `app.js`
   - `editor.html`
   - `editor.js`
   - `editor.css`
   - `main.css`
   - `data.xml` (use exported version)
   - `images.json` (use exported version)
   - `images/` (entire folder with all images)
3. Access via: `http://yourserver.edu/path/to/index.html`

## Quick Start

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)

### NO Installation Needed!

### Features

#### 🖼️ Imagemap Viewer (`index.html`)
- Interactive clickable image map with visual areas
- Gallery display for selected items
- Info area showing details about clicked points
- Settings from `data.xml`

#### ⚙️ Editor (`editor.html`)
- **Page Settings:**
  - Edit page title
  - Change background color
  - Set background image
  - Adjust map dimensions

- **Info Points Management:**
  - Add new clickable points
  - Edit existing points
  - Delete points
  - Visual canvas for point placement

- **Point Properties:**
  - Title and description
  - Associated image (with live preview)
  - X/Y coordinates
  - Radius size
  - Color

#### 💾 Data Storage
- All settings stored in `data.xml`
- Image manifest in `images.json`
- Automatic backups created when saving

## File Structure

```
├── index.html           # Main imagemap viewer
├── editor.html          # Settings editor
├── app.js              # Imagemap viewer logic
├── editor.js           # Editor logic
├── main.css            # Main styles
├── editor.css          # Editor styles
├── data.xml            # Application data & settings
├── images.json         # Image file manifest
├── images/             # Image folder
├── server.js           # Express server
├── package.json        # Node.js dependencies
└── README.md           # This file
```

## API Endpoints

The server provides the following API endpoints:

### GET /api/data.xml
Retrieves the current `data.xml` file.

```bash
curl http://localhost:3000/api/data.xml
```

### POST /api/data.xml
Saves updated `data.xml` file.

```bash
curl -X POST -H "Content-Type: application/xml" \
  --data @data.xml http://localhost:3000/api/data.xml
```

### GET /api/images
Retrieves the `images.json` manifest.

```bash
curl http://localhost:3000/api/images
```

### GET /api/health
Health check endpoint.

```bash
curl http://localhost:3000/api/health
```

## Adding Images

1. Add image files to the `images/` folder
2. Update `images.json` to include the new images:
   ```json
   {
     "images": [
       "images/existing-image.jpg",
       "images/new-image.jpg"
     ]
   }
   ```
3. The image will be available in the editor's image selector

## data.xml Structure

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<imagemap xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <settings>
    <pageTitle>Interactive Imagemap</pageTitle>
    <pageColor>#ffffff</pageColor>
    <backgroundImage></backgroundImage>
    <mapWidth>800</mapWidth>
    <mapHeight>600</mapHeight>
  </settings>
  <areas>
    <area>
      <id>1</id>
      <title>Area Title</title>
      <image>images/item-1.jpg</image>
      <content>Description text</content>
      <x>150</x>
      <y>150</y>
      <radius>40</radius>
      <color>#3498db</color>
    </area>
  </areas>
</imagemap>
```

## Usage Guide

### Editing the Imagemap

1. Click the "⚙️ Edit Settings" button on the main page
2. In the editor:
   - **Left side:** Visual canvas for placing points
   - **Right side:** List of all info points
   - **Modal:** Detailed editor for each point

### Adding a New Point

1. Click "+ Add Point" button
2. Fill in the details:
   - Title
   - Description
   - Image file
   - Position (X, Y)
   - Radius
   - Color
3. Click "Save"
4. Click on the canvas to position the point
5. Click "Save Changes" to save to server

### Editing a Point

1. Double-click a point in the list or on the canvas
2. Edit the properties
3. Click "Save"
4. Click "Save Changes" to save to server

### Deleting a Point

1. Open the point editor (double-click)
2. Click "Delete" button
3. Confirm the deletion
4. Click "Save Changes" to save to server

## Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
# Try a different port:
PORT=3001 npm start
```

### Images not loading
- Ensure images are in the `images/` folder
- Check that `images.json` lists the correct paths
- Verify file permissions

### Changes not saving
- Ensure Node.js server is running
- Check browser console for error messages
- Try saving again
- Browser storage fallback is always available

### Port 3000 already in use
```bash
PORT=3001 npm start
```

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Any modern browser with ES6+ support

## License

MIT

## Support

For issues or questions, check the console (F12) for error messages and ensure the Node.js server is running properly.
