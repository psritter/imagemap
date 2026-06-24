// ===== EXPORT UTILITY =====
// Exports a multi-room image map project as a standalone ZIP package.

class ProjectExporter {
  constructor(project) {
    this.project = this._normalizeProject(project);
  }

  _ext(dataUrl) {
    const mime = dataUrl.split(";")[0].split(":")[1];
    return ({
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/svg+xml": "svg"
    })[mime] || "jpg";
  }

  _b64(dataUrl) {
    return dataUrl.split(",")[1];
  }

  _esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;");
  }

  _normalizeProject(project) {
    if (Array.isArray(project?.maps) && project.maps.length) {
      const maps = project.maps.map((map, index) => ({
        id: typeof map?.id === "string" ? map.id : `map-${index + 1}`,
        name: typeof map?.name === "string" && map.name.trim() ? map.name : (index === 0 ? "Overview" : `Room ${index}`),
        mainImage: typeof map?.mainImage === "string" ? map.mainImage : "",
        regions: Array.isArray(map?.regions)
          ? map.regions.map((region, regionIndex) => ({
              id: typeof region?.id === "string" ? region.id : `region-${index + 1}-${regionIndex + 1}`,
              x: Number.isFinite(Number(region?.x)) ? Number(region.x) : 50,
              y: Number.isFinite(Number(region?.y)) ? Number(region.y) : 50,
              title: typeof region?.title === "string" ? region.title : "",
              desc: typeof region?.desc === "string" ? region.desc : "",
              size: Number.isFinite(Number(region?.size)) ? Number(region.size) : 4,
              color: typeof region?.color === "string" ? region.color : "#ff6600",
              icon: typeof region?.icon === "string" ? region.icon : null,
              image: typeof region?.image === "string" ? region.image : null,
              targetMapId: typeof region?.targetMapId === "string" ? region.targetMapId : null
            }))
          : []
      }));

      const overviewMapId = maps.some(map => map.id === project.overviewMapId)
        ? project.overviewMapId
        : maps[0].id;

      return {
        title: typeof project?.title === "string" ? project.title : "Image Map",
        bgColor: typeof project?.bgColor === "string" ? project.bgColor : "#ffffff",
        overviewMapId,
        maps
      };
    }

    return {
      title: typeof project?.title === "string" ? project.title : "Image Map",
      bgColor: typeof project?.bgColor === "string" ? project.bgColor : "#ffffff",
      overviewMapId: "overview",
      maps: [
        {
          id: "overview",
          name: "Overview",
          mainImage: typeof project?.mainImage === "string" ? project.mainImage : "",
          regions: Array.isArray(project?.regions)
            ? project.regions.map((region, index) => ({
                id: typeof region?.id === "string" ? region.id : `region-${index + 1}`,
                x: Number.isFinite(Number(region?.x)) ? Number(region.x) : 50,
                y: Number.isFinite(Number(region?.y)) ? Number(region.y) : 50,
                title: typeof region?.title === "string" ? region.title : "",
                desc: typeof region?.desc === "string" ? region.desc : "",
                size: Number.isFinite(Number(region?.size)) ? Number(region.size) : 4,
                color: typeof region?.color === "string" ? region.color : "#ff6600",
                icon: typeof region?.icon === "string" ? region.icon : null,
                image: typeof region?.image === "string" ? region.image : null,
                targetMapId: null
              }))
            : []
        }
      ]
    };
  }

  async generateZip(name = "image-map") {
    if (typeof JSZip === "undefined") {
      throw new Error("JSZip library not loaded. Check your internet connection.");
    }

    const zip = new JSZip();
    const imgDir = zip.folder("images");
    const exportProject = {
      title: this.project.title,
      bgColor: this.project.bgColor,
      overviewMapId: this.project.overviewMapId,
      maps: []
    };

    this.project.maps.forEach((map, mapIndex) => {
      const exportMap = {
        id: map.id,
        name: map.name,
        mainImagePath: "",
        regions: []
      };

      if (map.mainImage) {
        const ext = this._ext(map.mainImage);
        const fileName = `map-${mapIndex}.${ext}`;
        imgDir.file(fileName, this._b64(map.mainImage), { base64: true });
        exportMap.mainImagePath = `images/${fileName}`;
      }

      exportMap.regions = map.regions.map((region, regionIndex) => {
        const out = {
          id: region.id,
          x: region.x,
          y: region.y,
          title: region.title,
          desc: region.desc,
          size: region.size,
          color: region.color,
          targetMapId: region.targetMapId || null,
          iconPath: null,
          imagePath: null
        };

        if (region.icon) {
          const ext = this._ext(region.icon);
          const fileName = `icon-${mapIndex}-${regionIndex}.${ext}`;
          imgDir.file(fileName, this._b64(region.icon), { base64: true });
          out.iconPath = `images/${fileName}`;
        }

        if (region.image) {
          const ext = this._ext(region.image);
          const fileName = `info-${mapIndex}-${regionIndex}.${ext}`;
          imgDir.file(fileName, this._b64(region.image), { base64: true });
          out.imagePath = `images/${fileName}`;
        }

        return out;
      });

      exportProject.maps.push(exportMap);
    });

    zip.file("index.html", this.generateHTML(this.project.title || name));
    zip.file("styles.css", this.generateCSS(this.project.bgColor || "#ffffff"));
    zip.file("script.js", this.generateJS(exportProject));

    return zip;
  }

  async downloadZip(name = "image-map") {
    const zip = await this.generateZip(name);
    const blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + ".zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  generateHTML(title) {
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
      <div class="image-map">
        <img id="mainMapImage" alt="Current room map">
        <svg class="hotspot-layer" id="hotspotLayer" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg>
      </div>
    </section>
    <section class="info-section" id="infoPanel">
      <p class="placeholder">Select a hotspot to view details.</p>
    </section>
  </main>
  <nav class="room-nav" id="roomNav" aria-label="Room navigation">
    <div class="room-nav-inner">
      <button type="button" class="room-nav-btn" id="roomPrev" aria-label="Previous room">&larr;</button>
      <div class="room-nav-title" id="roomNavTitle"></div>
      <span class="room-nav-status" id="roomNavStatus"></span>
      <button type="button" class="room-nav-btn" id="roomNext" aria-label="Next room">&rarr;</button>
    </div>
  </nav>
  <div class="lightbox" id="lightbox" aria-hidden="true">
    <button class="lightbox-close" id="lightboxClose" aria-label="Close full image">&times;</button>
    <img class="lightbox-image" id="lightboxImage" alt="Full resolution view">
  </div>
  <script src="script.js"><\/script>
</body>
</html>`;
  }

  generateCSS(bgColor = "#ffffff") {
    return `* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  background: ${bgColor};
  color: #333;
  line-height: 1.5;
  padding-bottom: 72px;
}

header {
  background: #fff;
  padding: 16px;
  text-align: center;
  border-bottom: 1px solid #e0e0e0;
}

header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #222;
}

main {
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
}

.image-map-section {
  width: 100%;
  background: #fff;
}

.image-map {
  position: relative;
  width: 100%;
  display: block;
}

.image-map > img {
  width: 100%;
  height: auto;
  display: block;
}

.hotspot-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.hotspot-layer circle,
.hotspot-layer image {
  transition: filter 0.15s;
}

.hotspot-layer circle:hover,
.hotspot-layer image:hover {
  filter: brightness(1.2);
}

.info-section {
  padding: 18px;
  background: #fff;
  border-top: 1px solid #e0e0e0;
  min-height: 80px;
  overflow: auto;
}

.info-section::after {
  content: "";
  display: block;
  clear: both;
}

.info-image-wrap {
  float: left;
  width: clamp(96px, 34%, 170px);
  margin: 0 12px 8px 0;
}

.info-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  height: auto;
  object-fit: cover;
  display: block;
  border-radius: 6px;
  cursor: zoom-in;
  box-shadow: 0 4px 12px rgba(0,0,0,.16);
}

.info-section h2 {
  margin: 0 0 6px;
  line-height: 1.25;
}

.info-section p {
  margin: 0;
  color: #555;
  line-height: 1.45;
}

.placeholder {
  color: #999;
  font-style: italic;
}

.info-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  clear: both;
}

.info-nav-btn,
.room-nav-btn {
  border: 1px solid #d2d8de;
  background: #f4f7fa;
  color: #2c3e50;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 0.88rem;
  line-height: 1;
}

.info-nav-btn:disabled,
.room-nav-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.info-nav-status,
.room-nav-status {
  font-size: 0.82rem;
  color: #667085;
}

.room-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 900;
  background: rgba(255,255,255,.96);
  border-top: 1px solid #dbe2ea;
  backdrop-filter: blur(8px);
}

.room-nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
}

.room-nav-title {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-nav-status {
  white-space: nowrap;
}

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

@media (min-width: 768px) {
  header { padding: 12px; }
  header h1 { font-size: 1.25rem; }
  .image-map > img { max-height: 46vh; object-fit: contain; }
  .info-section { padding: 14px 16px; }
  .info-image-wrap { width: clamp(88px, 32%, 150px); margin: 0 10px 8px 0; }
  .room-nav-inner { padding: 10px 18px; }
}

@media (min-width: 1024px) {
  main { flex-direction: row; align-items: flex-start; }
  .image-map-section { flex: 2; border-right: 1px solid #e0e0e0; }
  .info-section { flex: 1; border-top: none; position: sticky; top: 0; max-height: calc(100vh - 130px - 72px); }
  .image-map > img { max-height: none; }
  .info-image-wrap { width: clamp(100px, 42%, 190px); }
}
`;
  }

  generateJS(exportProject) {
    const serialized = JSON.stringify(exportProject).replace(/<\//g, "<\\/");
    return `/* Multi-room Image Map Viewer */
(function () {
  'use strict';

  var PROJECT = ${serialized};
  var maps = Array.isArray(PROJECT.maps) ? PROJECT.maps : [];
  var currentMapIndex = Math.max(0, maps.findIndex(function (map) { return map.id === PROJECT.overviewMapId; }));
  if (currentMapIndex < 0) currentMapIndex = 0;
  var currentInfoIndex = 0;
  var infoTouchStartX = 0;
  var infoTouchStartY = 0;
  var roomTouchStartX = 0;
  var roomTouchStartY = 0;

  var infoPanel;
  var mainMapImage;
  var hotspotLayer;
  var roomPrev;
  var roomNext;
  var roomNavTitle;
  var roomNavStatus;
  var roomNav;
  var lightbox;
  var lightboxImage;
  var lightboxClose;

  document.addEventListener('DOMContentLoaded', function () {
    infoPanel = document.getElementById('infoPanel');
    mainMapImage = document.getElementById('mainMapImage');
    hotspotLayer = document.getElementById('hotspotLayer');
    roomPrev = document.getElementById('roomPrev');
    roomNext = document.getElementById('roomNext');
    roomNavTitle = document.getElementById('roomNavTitle');
    roomNavStatus = document.getElementById('roomNavStatus');
    roomNav = document.getElementById('roomNav');
    lightbox = document.getElementById('lightbox');
    lightboxImage = document.getElementById('lightboxImage');
    lightboxClose = document.getElementById('lightboxClose');

    roomPrev.addEventListener('click', function () { changeRoom(-1); });
    roomNext.addEventListener('click', function () { changeRoom(1); });

    roomNav.ontouchstart = function (e) {
      if (!e.touches || !e.touches.length) return;
      roomTouchStartX = e.touches[0].clientX;
      roomTouchStartY = e.touches[0].clientY;
    };
    roomNav.ontouchend = function (e) {
      if (!e.changedTouches || !e.changedTouches.length) return;
      var dx = e.changedTouches[0].clientX - roomTouchStartX;
      var dy = e.changedTouches[0].clientY - roomTouchStartY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        if (dx < 0) changeRoom(1);
        else changeRoom(-1);
      }
    };

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLightbox();
    });

    if (maps.length) showRoom(currentMapIndex, true);
  });

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;');
  }

  function currentMap() {
    return maps[currentMapIndex] || null;
  }

  function openLightbox(src, altText) {
    if (!src) return;
    lightboxImage.src = src;
    lightboxImage.alt = altText || 'Full resolution image';
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxImage.removeAttribute('src');
  }

  function changeRoom(step) {
    var next = Math.max(0, Math.min(maps.length - 1, currentMapIndex + step));
    if (next !== currentMapIndex) showRoom(next, true);
  }

  function showRoomById(mapId) {
    var idx = maps.findIndex(function (map) { return map.id === mapId; });
    if (idx >= 0) showRoom(idx, true);
  }

  function changeInfo(step) {
    var map = currentMap();
    if (!map || !map.regions.length) return;
    var next = Math.max(0, Math.min(map.regions.length - 1, currentInfoIndex + step));
    if (next !== currentInfoIndex) showInfo(next);
  }

  function renderRoomNav() {
    var map = currentMap();
    roomNavTitle.textContent = map ? ('Room Map: ' + (map.name || 'Untitled')) : '';
    roomNavStatus.textContent = (currentMapIndex + 1) + ' / ' + maps.length;
    roomPrev.disabled = currentMapIndex === 0;
    roomNext.disabled = currentMapIndex === maps.length - 1;
  }

  function renderHotspots() {
    var map = currentMap();
    if (!map) {
      hotspotLayer.innerHTML = '';
      mainMapImage.removeAttribute('src');
      return;
    }

    mainMapImage.src = map.mainImagePath || '';
    hotspotLayer.innerHTML = map.regions.map(function (region, index) {
      var size = region.size || 4;
      var radius = size / 2;
      var label = esc(region.title || 'Hotspot');
      var color = region.color || '#ff6600';
      if (region.iconPath) {
        return '<image href="' + region.iconPath + '" x="' + (region.x - radius) + '%" y="' + (region.y - radius) + '%" width="' + size + '%" height="' + size + '%" preserveAspectRatio="xMidYMid meet" style="cursor:pointer" onclick="handleRegionClick(' + index + ')" aria-label="' + label + '"></image>' +
          '<circle cx="' + region.x + '%" cy="' + region.y + '%" r="' + radius + '%" fill="transparent" stroke="rgba(255,255,255,0.4)" stroke-width="0.25%" onclick="handleRegionClick(' + index + ')" style="cursor:pointer"></circle>';
      }
      return '<circle cx="' + region.x + '%" cy="' + region.y + '%" r="' + radius + '%" fill="' + color + '" stroke="rgba(255,255,255,0.5)" stroke-width="0.25%" style="cursor:pointer;filter:drop-shadow(0 0.4px 1px rgba(0,0,0,0.35))" onclick="handleRegionClick(' + index + ')" aria-label="' + label + '"></circle>';
    }).join('');
  }

  function renderInfo(region) {
    if (!region) {
      infoPanel.innerHTML = '<p class="placeholder">Select a hotspot to view details.</p>';
      return;
    }

    var imageHtml = '';
    if (region.imagePath) {
      imageHtml = '<div class="info-image-wrap"><img src="' + region.imagePath + '" class="info-image" alt="' + esc(region.title) + '" role="button" tabindex="0" aria-label="Open full image"></div>';
    }

    var map = currentMap();
    var prevDisabled = currentInfoIndex === 0 ? 'disabled' : '';
    var nextDisabled = currentInfoIndex === map.regions.length - 1 ? 'disabled' : '';
    infoPanel.innerHTML = imageHtml + '<h2>' + esc(region.title || 'Untitled') + '</h2>' + '<p>' + esc(region.desc || '') + '</p>' +
      '<div class="info-nav">' +
      '<button type="button" class="info-nav-btn" id="infoPrev" ' + prevDisabled + ' aria-label="Previous info">&larr;</button>' +
      '<button type="button" class="info-nav-btn" id="infoNext" ' + nextDisabled + ' aria-label="Next info">&rarr;</button>' +
      '<span class="info-nav-status">' + (currentInfoIndex + 1) + ' / ' + map.regions.length + '</span>' +
      '</div>';

    var img = infoPanel.querySelector('.info-image');
    if (img) {
      img.addEventListener('click', function () { openLightbox(region.imagePath, region.title); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(region.imagePath, region.title);
        }
      });
    }

    var prevBtn = infoPanel.querySelector('#infoPrev');
    var nextBtn = infoPanel.querySelector('#infoNext');
    if (prevBtn) prevBtn.addEventListener('click', function () { changeInfo(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { changeInfo(1); });
  }

  function showInfo(index) {
    var map = currentMap();
    if (!map || !map.regions[index]) return;
    currentInfoIndex = index;
    renderInfo(map.regions[index]);

    infoPanel.ontouchstart = function (e) {
      if (!e.touches || !e.touches.length) return;
      infoTouchStartX = e.touches[0].clientX;
      infoTouchStartY = e.touches[0].clientY;
    };
    infoPanel.ontouchend = function (e) {
      if (!e.changedTouches || !e.changedTouches.length) return;
      var dx = e.changedTouches[0].clientX - infoTouchStartX;
      var dy = e.changedTouches[0].clientY - infoTouchStartY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        if (dx < 0) changeInfo(1);
        else changeInfo(-1);
      }
    };

    if (window.innerWidth < 768) {
      infoPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function handleRegionClick(index) {
    var map = currentMap();
    var region = map && map.regions[index];
    if (!region) return;
    if (region.targetMapId) {
      showRoomById(region.targetMapId);
      return;
    }
    showInfo(index);
  }

  window.handleRegionClick = handleRegionClick;

  function showRoom(index, resetInfo) {
    if (!maps[index]) return;
    currentMapIndex = index;
    renderRoomNav();
    renderHotspots();
    var map = currentMap();
    if (!map || !map.regions.length) {
      currentInfoIndex = 0;
      renderInfo(null);
      return;
    }
    if (resetInfo || currentInfoIndex >= map.regions.length) currentInfoIndex = 0;
    showInfo(currentInfoIndex);
  }
}());`;
  }

  validate() {
    const errors = [];

    if (!this.project.maps || this.project.maps.length === 0) {
      errors.push("At least one map is required.");
    }

    this.project.maps.forEach((map, index) => {
      if (!map.mainImage) {
        errors.push(`Map ${index + 1} (${map.name || "Untitled"}) is missing a main image.`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
