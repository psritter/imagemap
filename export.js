// ===== EXPORT UTILITY =====
// This module handles exporting the current project as a standalone HTML file or ZIP package

class ProjectExporter {
  constructor(project) {
    this.project = project;
  }

  // ===== HELPERS =====

  /** File extension from a data-URL mime type */
  _ext(dataUrl) {
    const mime = dataUrl.split(";")[0].split(":")[1];
    return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" })[mime] || "jpg";
  }

  /** Raw base64 payload from a data-URL */
  _b64(dataUrl) { return dataUrl.split(",")[1]; }

  /** Minimal HTML escaping */
  _esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /**
   * Build a JSZip containing index.html, styles.css, script.js and an images/ folder.
   */
  async generateZip(name = "image-map") {
    if (typeof JSZip === "undefined") {
      throw new Error("JSZip library not loaded. Check your internet connection.");
    }

    const zip    = new JSZip();
    const imgDir = zip.folder("images");

    // Main image
    let mainPath = "";
    if (this.project.mainImage) {
      const ext = this._ext(this.project.mainImage);
      mainPath  = `images/main.${ext}`;
      imgDir.file(`main.${ext}`, this._b64(this.project.mainImage), { base64: true });
    }

    // Regions — swap data-URLs for relative file paths
    const exportRegions = this.project.regions.map((r, i) => {
      const out = {
        x: r.x, y: r.y,
        title: r.title, desc: r.desc,
        size: r.size, color: r.color,
        iconPath: null, imagePath: null
      };
      if (r.icon) {
        const ext  = this._ext(r.icon);
        const fname = `icon-${i}.${ext}`;
        imgDir.file(fname, this._b64(r.icon), { base64: true });
        out.iconPath = `images/${fname}`;
      }
      if (r.image) {
        const ext  = this._ext(r.image);
        const fname = `info-${i}.${ext}`;
        imgDir.file(fname, this._b64(r.image), { base64: true });
        out.imagePath = `images/${fname}`;
      }
      return out;
    });

    const title   = this.project.title   || name;
    const bgColor = this.project.bgColor || "#ffffff";

    zip.file("index.html", this.generateHTML(mainPath, exportRegions, title));
    zip.file("styles.css",  this.generateCSS(bgColor));
    zip.file("script.js",   this.generateJS());

    return zip;
  }

  /**
   * Generate and download the project as a .zip file.
   */
  async downloadZip(name = "image-map") {
    const zip  = await this.generateZip(name);
    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + ".zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate index.html for the zip.
   */
  generateHTML(mainPath, regions, title) {
    const hotspotsHtml = regions.map((r, i) => {
      const size = r.size || 20;
      if (r.iconPath) {
        return `    <img src="${r.iconPath}" class="hotspot icon"
      style="left:${r.x}%;top:${r.y}%;width:${size}px;height:${size}px;"
      alt="${this._esc(r.title)}" role="button" tabindex="0"
      onclick="showInfo(${i})" onkeypress="if(event.key==='Enter')showInfo(${i})">`.trim();
      }
      return `    <div class="hotspot circle"
      style="left:${r.x}%;top:${r.y}%;width:${size}px;height:${size}px;background:${r.color || "#ff0000"};"
      role="button" tabindex="0" aria-label="${this._esc(r.title || "Hotspot")}"
      onclick="showInfo(${i})" onkeypress="if(event.key==='Enter')showInfo(${i})"></div>`.trim();
    }).join("\n    ");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${this._esc(title)}">
  <title>${this._esc(title)}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>${this._esc(title)}</h1>
  </header>
  <main>
    <section class="image-map-section">
      <div class="image-map" id="imageMap">
        <img src="${mainPath}" alt="${this._esc(title)}" id="mainImg">
    ${hotspotsHtml}
      </div>
    </section>
    <section class="info-section">
      <div class="info-panel" id="infoPanel">
        <p class="placeholder">Click a hotspot to learn more</p>
      </div>
    </section>
  </main>
  <div class="lightbox" id="lightbox" aria-hidden="true">
    <button class="lightbox-close" id="lightboxClose" aria-label="Close full image">&times;</button>
    <img class="lightbox-image" id="lightboxImage" alt="Full resolution view">
  </div>
  <footer>
    <p>Created with IMGeditor</p>
  </footer>
  <script>var MAP_REGIONS = ${JSON.stringify(regions)};<\/script>
  <script src="script.js"><\/script>
</body>
</html>`;
  }

  /**
   * Generate styles.css for the zip.
   */
  generateCSS(bgColor = "#ffffff") {
    return `/* Image Map Viewer — Mobile-First Responsive */
* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  background: ${bgColor};
  color: #333;
  line-height: 1.5;
}

header {
  background: #fff;
  padding: 16px;
  text-align: center;
  border-bottom: 1px solid #e0e0e0;
}

header h1 { margin: 0; font-size: 1.5rem; color: #222; }

/* Mobile-first: stack vertically */
main {
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
}

.image-map-section { width: 100%; background: #fff; }

.image-map {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.image-map > img { width: 100%; height: auto; display: block; }

/* Hotspots */
.hotspot {
  position: absolute;
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition: filter 0.15s, transform 0.15s;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hotspot:hover { filter: brightness(1.15); z-index: 2; }
.hotspot:active { transform: translate(-50%, -50%) scale(0.93); }
.hotspot:focus { outline: 3px solid #007bff; outline-offset: 3px; }

.hotspot.circle {
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
}

.hotspot.icon {
  background-color: transparent;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,.2));
}

/* Info panel */
.info-section {
  width: 100%;
  padding: 20px;
  background: #fff;
  border-top: 1px solid #e0e0e0;
}

.info-panel { min-height: 80px; }

.info-image-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
  margin: 0 0 12px;
}

.info-image {
  width: min(100%, 520px);
  height: auto;
  display: block;
  max-height: min(52vh, 520px);
  object-fit: contain;
  border-radius: 6px;
  cursor: zoom-in;
  box-shadow: 0 8px 24px rgba(0,0,0,.18);
}

.info-panel h2 { margin: 0 0 8px; font-size: 1.2rem; }
.info-panel p { margin: 0; color: #555; }
.placeholder { color: #999; font-style: italic; }

.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.88);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.lightbox.open {
  display: flex;
}

.lightbox-image {
  max-width: min(96vw, 1700px);
  max-height: 92vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
}

.lightbox-close {
  position: absolute;
  top: 12px;
  right: 16px;
  border: none;
  background: rgba(255,255,255,.15);
  color: #fff;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  font-size: 30px;
  line-height: 1;
  cursor: pointer;
}

footer {
  padding: 12px;
  text-align: center;
  color: #999;
  font-size: 0.8rem;
  border-top: 1px solid #e0e0e0;
}

/* Tablet (768px+): keep stacked, improve spacing */
@media (min-width: 768px) {
  header { padding: 12px; }
  header h1 { font-size: 1.75rem; }
  .image-map > img { max-height: 46vh; object-fit: contain; }
  .info-section { padding: 22px; }
  .info-image { max-height: 26vh; }
  .info-panel h2 { margin-bottom: 6px; }
}

/* Desktop (1024px+): side-by-side */
@media (min-width: 1024px) {
  main {
    flex-direction: row;
    align-items: flex-start;
    min-height: calc(100vh - 120px);
  }
  .image-map-section {
    flex: 2;
    border-right: 1px solid #e0e0e0;
  }
  .info-section {
    flex: 1;
    border-top: none;
    position: sticky;
    top: 0;
  }
  .image-map > img { max-height: none; }
  .info-image { max-height: min(52vh, 520px); }
}

/* Desktop (1200px+) */
@media (min-width: 1200px) {
  .image-map-section { flex: 3; }
  header h1 { font-size: 2rem; }
  .info-section { padding: 24px; }
}

/* Touch devices */
@media (hover: none) and (pointer: coarse) {
  .hotspot:hover { filter: none; }
  .hotspot:active { filter: brightness(0.9); }
}
`;
  }

  /**
   * Generate script.js for the zip.
   */
  generateJS() {
    return `/* Image Map Viewer — Interaction Script */
(function () {
  'use strict';
  var regions = typeof MAP_REGIONS !== 'undefined' ? MAP_REGIONS : [];
  var lightbox = null;
  var lightboxImage = null;
  var lightboxClose = null;

  document.addEventListener('DOMContentLoaded', function () {
    lightbox = document.getElementById('lightbox');
    lightboxImage = document.getElementById('lightboxImage');
    lightboxClose = document.getElementById('lightboxClose');

    if (lightbox && lightboxClose) {
      lightboxClose.addEventListener('click', closeLightbox);
      lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) closeLightbox();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeLightbox();
      });
    }

    // Bind backgroundImage for icon hotspots
    document.querySelectorAll('.hotspot.icon').forEach(function (el, i) {
      if (regions[i] && regions[i].iconPath) {
        el.style.backgroundImage = 'url(' + regions[i].iconPath + ')';
      }
    });
    if (regions.length > 0) showInfo(0);
  });

  window.showInfo = function (i) {
    var r     = regions[i];
    var panel = document.getElementById('infoPanel');
    if (!r || !panel) return;

    var html = '';
    if (r.imagePath) {
      html += '<div class="info-image-wrap">';
      html += '<img src="' + r.imagePath + '" class="info-image" alt="' + esc(r.title) + '"';
      html += ' role="button" tabindex="0" aria-label="Open full image for ' + esc(r.title) + '">';
      html += '</div>';
    }
    html += '<h2>' + esc(r.title || 'Untitled') + '</h2>';
    html += '<p>'  + esc(r.desc  || '')          + '</p>';
    panel.innerHTML = html;

    var infoImage = panel.querySelector('.info-image');
    if (infoImage) {
      infoImage.addEventListener('click', function () {
        openLightbox(r.imagePath, r.title);
      });
      infoImage.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(r.imagePath, r.title);
        }
      });
    }

    if (window.innerWidth < 768) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.openLightbox = function (src, altText) {
    if (!lightbox || !lightboxImage || !src) return;
    lightboxImage.src = src;
    lightboxImage.alt = altText || 'Full resolution image';
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
  };

  function closeLightbox() {
    if (!lightbox || !lightboxImage) return;
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxImage.removeAttribute('src');
  }
}());
`;
  }

  /**
   * Get the viewer template with placeholder replacements
   */
  getViewerTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Interactive image map">
  <title>{{TITLE}}</title>
  <style>
    /* Mobile-first responsive design */
    * {
      box-sizing: border-box;
    }

    html {
      font-size: 16px;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: #f8f9fa;
      color: #333;
      line-height: 1.5;
    }

    /* Header */
    header {
      background: #fff;
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
      text-align: center;
    }

    header h1 {
      margin: 0;
      font-size: 1.5rem;
      color: #222;
    }

    /* Main container - stack mobile first */
    main {
      display: flex;
      flex-direction: column;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0;
      gap: 0;
    }

    /* Image map section - top on mobile */
    .image-map-section {
      width: 100%;
      background: #fff;
      flex: 0 0 auto;
    }

    .image-map {
      position: relative;
      width: 100%;
      overflow: hidden;
      background: #f0f0f0;
    }

    .image-map img {
      width: 100%;
      height: auto;
      display: block;
    }

    /* Hotspot base styles */
    .hotspot {
      position: absolute;
      cursor: pointer;
      transition: all 0.2s ease;
      /* Minimum 44px touch target (WCAG AA) */
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .hotspot:hover {
      filter: brightness(0.9);
      z-index: 2;
    }

    .hotspot:focus {
      outline: 2px solid #007bff;
      outline-offset: 2px;
    }

    .hotspot:active {
      transform: scale(0.95);
    }

    /* Hotspot circle style */
    .hotspot.circle {
      border-radius: 50%;
      border: 2px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }

    .hotspot.circle:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }

    /* Hotspot icon style */
    .hotspot.icon {
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
    }

    .hotspot.icon:hover {
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) brightness(1.1);
    }

    /* Info panel section - bottom on mobile */
    .info-section {
      width: 100%;
      background: #fff;
      padding: 16px;
      flex: 1;
      border-top: 1px solid #e0e0e0;
    }

    .info-panel {
      min-height: 100px;
    }

    .info-panel img {
      width: 100%;
      height: auto;
      max-width: 360px;
      display: block;
      margin: 0 auto 12px;
      border-radius: 4px;
    }

    .info-panel h2 {
      margin: 0 0 8px 0;
      font-size: 1.25rem;
      color: #222;
    }

    .info-panel p {
      margin: 0;
      color: #555;
      line-height: 1.6;
    }

    .info-panel .placeholder {
      color: #999;
      font-style: italic;
    }

    /* Footer */
    footer {
      background: #f0f0f0;
      padding: 12px 16px;
      text-align: center;
      color: #666;
      font-size: 0.85rem;
      border-top: 1px solid #e0e0e0;
    }

    /* Tablet (768px+): Keep info below image with more spacing */
    @media (min-width: 768px) {
      header {
        padding: 12px;
      }

      header h1 {
        font-size: 1.75rem;
      }

      .image-map img {
        max-height: 46vh;
        object-fit: contain;
      }

      .info-section {
        padding: 20px;
      }

      .info-panel img {
        max-height: 26vh;
        object-fit: contain;
      }

      .info-panel h2 {
        margin-bottom: 6px;
      }
    }

    /* Desktop (1024px+): Show info panel beside image */
    @media (min-width: 1024px) {
      main {
        flex-direction: row;
        gap: 0;
      }

      .image-map-section {
        flex: 2;
        border-right: 1px solid #e0e0e0;
      }

      .info-section {
        flex: 1;
        border-top: none;
      }

      .image-map img {
        max-height: none;
      }

      .info-panel img {
        max-height: none;
      }
    }

    /* Desktop (1200px+): Optimize spacing */
    @media (min-width: 1200px) {
      main {
        min-height: 100vh;
      }

      .image-map-section {
        flex: 3;
      }

      .info-section {
        flex: 1;
        overflow-y: auto;
      }

      header {
        padding: 20px;
      }

      header h1 {
        font-size: 2rem;
      }

      .info-section {
        padding: 24px;
      }
    }

    /* Accessibility: Ensure touch targets are large enough */
    @media (hover: none) and (pointer: coarse) {
      .hotspot {
        min-width: 48px;
        min-height: 48px;
      }

      /* Reduce hover effects on touch devices */
      .hotspot:hover {
        filter: none;
      }

      .hotspot:active {
        filter: brightness(0.9);
        transform: scale(0.98);
      }
    }

    /* Print styles */
    @media print {
      body {
        background: white;
      }

      .hotspot {
        display: none;
      }

      .info-section {
        display: none;
      }
    }
  </style>
</head>
<body>

  <header>
    <h1>{{TITLE}}</h1>
  </header>

  <main>
    <!-- Image Map Section (Top on mobile, Left on tablet+) -->
    <section class="image-map-section">
      <div class="image-map" id="imageMap">
        <img id="mainImage" src="" alt="Image map">
        <!-- Hotspots will be inserted here -->
      </div>
    </section>

    <!-- Info Panel Section (Bottom on mobile, Right on tablet+) -->
    <section class="info-section">
      <div class="info-panel" id="infoPanel">
        <p class="placeholder">👆 Click a hotspot to learn more</p>
      </div>
    </section>
  </main>

  <footer>
    <p>Created with Image Map Editor</p>
  </footer>

  <script>
    // ===== CONFIGURATION (injected during export) =====
    // Template placeholder: {{INJECTED_CONFIG}}
    const CONFIG = {};

    // ===== INITIALIZATION =====
    document.addEventListener('DOMContentLoaded', () => {
      const mainImage = document.getElementById('mainImage');
      const imageMap = document.getElementById('imageMap');
      const infoPanel = document.getElementById('infoPanel');

      // Set main image
      if (CONFIG.mainImage) {
        mainImage.src = CONFIG.mainImage;
      }

      // Create hotspots
      if (CONFIG.regions && CONFIG.regions.length > 0) {
        CONFIG.regions.forEach((region, index) => {
          const hotspot = document.createElement('div');
          hotspot.className = region.icon ? 'hotspot icon' : 'hotspot circle';
          hotspot.style.left = region.x + '%';
          hotspot.style.top = region.y + '%';
          hotspot.style.width = (region.size || 20) + 'px';
          hotspot.style.height = (region.size || 20) + 'px';
          hotspot.style.transform = 'translate(-50%, -50%)';

          if (region.icon) {
            hotspot.style.backgroundImage = \`url(\${region.icon})\`;
            hotspot.alt = region.title || 'Hotspot';
          } else {
            hotspot.style.background = region.color || '#ff0000';
          }

          hotspot.setAttribute('role', 'button');
          hotspot.setAttribute('tabindex', '0');
          hotspot.setAttribute('aria-label', region.title || 'Interactive hotspot');

          hotspot.addEventListener('click', () => showInfo(index));
          hotspot.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              showInfo(index);
            }
          });

          // Touch support
          hotspot.addEventListener('touchstart', (e) => {
            e.preventDefault();
            showInfo(index);
          });

          imageMap.appendChild(hotspot);
        });
      }

      // Initial state
      if (CONFIG.regions && CONFIG.regions.length > 0) {
        showInfo(0);
      }
    });

    // ===== SHOW INFO FUNCTION =====
    function showInfo(index) {
      const region = CONFIG.regions[index];
      const infoPanel = document.getElementById('infoPanel');

      if (!region) return;

      let html = '';

      if (region.image) {
        html += \`<img src="\${region.image}" alt="\${region.title || 'Info image'}">\`;
      }

      html += \`<h2>\${region.title || 'Untitled'}</h2>\`;
      html += \`<p>\${region.desc || ''}</p>\`;

      infoPanel.innerHTML = html;

      // Scroll to info panel on mobile
      if (window.innerWidth < 768) {
        infoPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  </script>

</body>
</html>`;
  }

  /**
   * Validate project before export.
   */
  validate() {
    const errors = [];

    if (!this.project.mainImage) {
      errors.push("Main image is required");
    }

    if (!this.project.regions || this.project.regions.length === 0) {
      errors.push("At least one hotspot is required");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
