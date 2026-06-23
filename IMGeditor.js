window.addEventListener("DOMContentLoaded", () => {

  // ===== DOM ELEMENTS =====
  const overlay       = document.getElementById("overlay");
  const canvasImage   = document.getElementById("canvasImage");
  const preview       = document.getElementById("preview");
  const previewWrap   = document.getElementById("previewWrap");
  const mainInput     = document.getElementById("mainImageInput");

  // Project settings
  const projectTitleInput = document.getElementById("projectTitle");
  const bgColorInput      = document.getElementById("bgColor");

  // Hotspot form
  const hotspotPanel  = document.getElementById("hotspotPanel");
  const titleInput    = document.getElementById("titleInput");
  const descInput     = document.getElementById("descInput");
  const colorInput    = document.getElementById("colorInput");
  const sizeInput     = document.getElementById("sizeInput");
  const iconUpload    = document.getElementById("iconUpload");
  const infoImage     = document.getElementById("infoImage");
  const deleteBtn     = document.getElementById("deleteBtn");
  const cancelBtn     = document.getElementById("cancelBtn");
  const clearIconBtn  = document.getElementById("clearIconBtn");
  const clearImageBtn = document.getElementById("clearImageBtn");
  const undoBtn       = document.getElementById("undoBtn");
  const redoBtn       = document.getElementById("redoBtn");
  const saveProjectBtn = document.getElementById("saveProjectBtn");
  const loadProjectBtn = document.getElementById("loadProjectBtn");
  const projectStorageStatus = document.getElementById("projectStorageStatus");
  const projectFileInput = document.getElementById("projectFileInput");

  // Export elements
  const exportBtn        = document.getElementById("exportBtn");
  const exportDialog     = document.getElementById("exportDialog");
  const projectName      = document.getElementById("projectName");
  const exportValidation = document.getElementById("exportValidation");
  const exportConfirmBtn = document.getElementById("exportConfirmBtn");
  const exportCancelBtn  = document.getElementById("exportCancelBtn");

  // Device preview buttons
  const devBtns = document.querySelectorAll(".dev-btn");

  // ===== STATE =====
  let project = {
    mainImage: "",
    title: projectTitleInput ? projectTitleInput.value : "Image Map",
    bgColor: bgColorInput ? bgColorInput.value : "#ffffff",
    regions: []
  };

  let selected = null;
  let history = [];
  let future = [];
  let isUpdatingForm = false; // Prevent feedback loops
  let currentProjectHandle = null;

  // ===== UTILITY FUNCTIONS =====
  function saveHistory() {
    history.push(JSON.stringify(project));
    future = [];
    updateUndoRedoButtons();
  }

  function cloneProject(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function sanitizeFileName(value) {
    const base = String(value || "image-map-project").trim() || "image-map-project";
    return base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image-map-project";
  }

  function normalizeProject(data) {
    const normalized = {
      mainImage: typeof data?.mainImage === "string" ? data.mainImage : "",
      title: typeof data?.title === "string" ? data.title : "Image Map",
      bgColor: typeof data?.bgColor === "string" ? data.bgColor : "#ffffff",
      regions: Array.isArray(data?.regions) ? data.regions : []
    };

    normalized.regions = normalized.regions.map(region => ({
      x: Number.isFinite(Number(region?.x)) ? Number(region.x) : 50,
      y: Number.isFinite(Number(region?.y)) ? Number(region.y) : 50,
      title: typeof region?.title === "string" ? region.title : "",
      desc: typeof region?.desc === "string" ? region.desc : "",
      size: Number.isFinite(Number(region?.size)) ? Number(region.size) : 20,
      color: typeof region?.color === "string" ? region.color : "#ff6600",
      icon: typeof region?.icon === "string" ? region.icon : null,
      image: typeof region?.image === "string" ? region.image : null
    }));

    return normalized;
  }

  function setStorageStatus(message, kind = "info") {
    projectStorageStatus.textContent = message;
    if (kind === "error") {
      projectStorageStatus.style.color = "#f97777";
      return;
    }
    if (kind === "success") {
      projectStorageStatus.style.color = "#6dd98b";
      return;
    }
    projectStorageStatus.style.color = "#8fb9d8";
  }

  function syncProjectInputs() {
    projectTitleInput.value = project.title || "";
    bgColorInput.value = project.bgColor || "#ffffff";
  }

  function applyLoadedProject(snapshot) {
    project = normalizeProject(snapshot);
    currentProjectHandle = null;
    selected = null;
    history = [];
    future = [];
    iconUpload.value = "";
    infoImage.value = "";
    hotspotPanel.hidden = true;
    syncProjectInputs();
    renderAll();
    updateUndoRedoButtons();
  }

  function buildProjectFilePayload() {
    return JSON.stringify({
      format: "IMGeditorProject",
      version: 1,
      savedAt: new Date().toISOString(),
      project: cloneProject(project)
    }, null, 2);
  }

  function isEmbeddedPreviewContext() {
    try {
      return window.self !== window.top;
    } catch (error) {
      return true;
    }
  }

  function downloadProjectFile(filename, content) {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    return blob.size;
  }

  async function writeProjectWithHandle(handle, payload) {
    const writable = await handle.createWritable();
    await writable.write(payload);
    await writable.close();
  }

  async function saveProjectToDisk() {
    const payload = buildProjectFilePayload();
    const suggestedName = `${sanitizeFileName(project.title)}.imgmap.json`;

    // Try native Save As dialog (Chrome/Edge on HTTPS). On any failure other than
    // explicit user cancel, fall through to the reliable blob-download path.
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{
            description: "IMGeditor Project",
            accept: { "application/json": [".json", ".imgmap.json"] }
          }]
        });
        await writeProjectWithHandle(handle, payload);
        currentProjectHandle = handle;
        setStorageStatus("Project saved to local drive.", "success");
        return;
      } catch (error) {
        if (error && error.name === "AbortError") {
          // User dismissed the picker — do nothing.
          return;
        }
        // Any other error (SecurityError, NotAllowedError, etc.) — fall through
        // to the blob-download fallback below.
        console.warn("showSaveFilePicker failed, falling back to download:", error);
      }
    }

    // Fallback: trigger a browser download. Works on all static hosts including
    // GitHub Pages, VS Code Live Preview, Firefox, and Safari.
    try {
      const fileSize = downloadProjectFile(suggestedName, payload);
      if (fileSize <= 0) {
        throw new Error("Generated project file was empty.");
      }
      setStorageStatus("Project file downloading — check your browser\'s Downloads folder.", "success");
    } catch (error) {
      console.error("Failed to download project file:", error);
      setStorageStatus("Could not save project file. Try a different browser.", "error");
    }
  }

  function readProjectDataFromText(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error("File is not valid JSON.");
    }

    const projectData = parsed?.project || parsed;
    if (!projectData || typeof projectData !== "object") {
      throw new Error("Project file is missing project data.");
    }

    return normalizeProject(projectData);
  }

  async function loadProjectFromDisk() {
    // Try native Open File dialog (Chrome/Edge on HTTPS). On any failure other
    // than explicit user cancel, fall through to the hidden file-input path.
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          types: [{
            description: "IMGeditor Project",
            accept: { "application/json": [".json", ".imgmap.json"] }
          }]
        });
        const file = await handle.getFile();
        const text = await file.text();
        const loadedProject = readProjectDataFromText(text);
        applyLoadedProject(loadedProject);
        currentProjectHandle = handle;
        setStorageStatus(`Loaded project file: ${file.name}`, "success");
        return;
      } catch (error) {
        if (error && error.name === "AbortError") {
          // User dismissed the picker — do nothing.
          return;
        }
        // Any other error — fall through to the file-input fallback below.
        console.warn("showOpenFilePicker failed, falling back to file input:", error);
      }
    }

    // Fallback: trigger the hidden <input type="file">. Works on all static
    // hosts including GitHub Pages, VS Code Live Preview, Firefox, and Safari.
    projectFileInput.value = "";
    projectFileInput.click();
  }

  async function handleProjectFileInputChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const loadedProject = readProjectDataFromText(text);
      applyLoadedProject(loadedProject);
      setStorageStatus(`Loaded project file: ${file.name}`, "success");
    } catch (error) {
      console.error("Failed to parse selected project file:", error);
      setStorageStatus(error.message || "Invalid project file.", "error");
    }
  }

  function undo() {
    if (!history.length) return;
    future.push(JSON.stringify(project));
    project = JSON.parse(history.pop());
    selected = null;
    hotspotPanel.hidden = true;
    renderAll();
    updateUndoRedoButtons();
  }

  function redo() {
    if (!future.length) return;
    history.push(JSON.stringify(project));
    project = JSON.parse(future.pop());
    selected = null;
    hotspotPanel.hidden = true;
    renderAll();
    updateUndoRedoButtons();
  }

  function updateUndoRedoButtons() {
    undoBtn.disabled = history.length === 0;
    redoBtn.disabled = future.length === 0;
  }

  function showHotspotPanel(index) {
    selected = index;
    const region = project.regions[index];

    isUpdatingForm = true;
    titleInput.value = region.title || "";
    descInput.value = region.desc || "";
    colorInput.value = region.color || "#ff6600";
    sizeInput.value = region.size || 20;
    isUpdatingForm = false;

    hotspotPanel.hidden = false;
    titleInput.focus();
  }

  function hideHotspotPanel() {
    selected = null;
    hotspotPanel.hidden = true;
    renderAll();
  }

  function updateCurrentHotspot() {
    if (selected === null || isUpdatingForm) return;

    const region = project.regions[selected];
    region.title = titleInput.value;
    region.desc = descInput.value;
    region.color = colorInput.value;
    region.size = parseFloat(sizeInput.value) || 4;

    renderCircles();
    updatePreview();
  }

  // ===== IMAGE UPLOAD =====
  mainInput.addEventListener("change", e => {
    saveHistory();

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      project.mainImage = reader.result;
      renderAll();
    };
    reader.readAsDataURL(file);
  });

  // ===== PROJECT SETTINGS =====
  projectTitleInput.addEventListener("input", () => {
    project.title = projectTitleInput.value;
    updatePreview();
  });

  bgColorInput.addEventListener("input", () => {
    project.bgColor = bgColorInput.value;
    updatePreview();
  });

  // ===== HOTSPOT ICON UPLOAD =====
  iconUpload.addEventListener("change", e => {
    if (selected === null) return;

    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (100KB max)
    if (file.size > 100 * 1024) {
      alert("Icon file too large. Max 100KB.");
      return;
    }

    saveHistory();

    const reader = new FileReader();
    reader.onload = () => {
      project.regions[selected].icon = reader.result;
      renderAll();
    };
    reader.readAsDataURL(file);
  });

  // ===== CLEAR ICON =====
  clearIconBtn.addEventListener("click", e => {
    e.preventDefault();
    if (selected === null) return;

    saveHistory();
    project.regions[selected].icon = null;
    iconUpload.value = "";
    renderAll();
  });

  // ===== INFO IMAGE UPLOAD =====
  infoImage.addEventListener("change", e => {
    if (selected === null) return;

    const file = e.target.files[0];
    if (!file) return;

    saveHistory();

    const reader = new FileReader();
    reader.onload = () => {
      project.regions[selected].image = reader.result;
      updatePreview();
    };
    reader.readAsDataURL(file);
  });

  // ===== CLEAR INFO IMAGE =====
  clearImageBtn.addEventListener("click", e => {
    e.preventDefault();
    if (selected === null) return;

    saveHistory();
    project.regions[selected].image = null;
    infoImage.value = "";
    updatePreview();
  });

  // ===== FORM FIELD LISTENERS =====
  titleInput.addEventListener("input", () => {
    saveHistory();
    updateCurrentHotspot();
  });

  descInput.addEventListener("input", () => {
    saveHistory();
    updateCurrentHotspot();
  });

  colorInput.addEventListener("change", () => {
    saveHistory();
    updateCurrentHotspot();
  });

  sizeInput.addEventListener("change", () => {
    saveHistory();
    updateCurrentHotspot();
  });

  // ===== DELETE HOTSPOT =====
  deleteBtn.addEventListener("click", () => {
    if (selected === null) return;

    saveHistory();
    project.regions.splice(selected, 1);
    hideHotspotPanel();
  });

  // ===== CANCEL / CLOSE PANEL =====
  cancelBtn.addEventListener("click", () => {
    hideHotspotPanel();
  });

  // ===== UNDO / REDO BUTTONS =====
  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);
  saveProjectBtn.addEventListener("click", saveProjectToDisk);
  loadProjectBtn.addEventListener("click", loadProjectFromDisk);
  projectFileInput.addEventListener("change", handleProjectFileInputChange);

  // ===== EXPORT =====
  exportBtn.addEventListener("click", () => {
    exportValidation.hidden = true;
    projectName.value = project.title || "Image Map";
    exportDialog.showModal();
  });

  exportCancelBtn.addEventListener("click", () => {
    exportDialog.close();
  });

  exportConfirmBtn.addEventListener("click", async () => {
    const validation = new ProjectExporter(project).validate();

    if (!validation.isValid) {
      exportValidation.className = "validation-message error";
      exportValidation.innerHTML = validation.errors.join("<br>");
      exportValidation.hidden = false;
      return;
    }

    const name = (projectName.value.trim() || project.title || "image-map");
    exportConfirmBtn.disabled = true;
    exportConfirmBtn.textContent = "Exporting\u2026";

    try {
      await new ProjectExporter(project).downloadZip(name);
      exportDialog.close();
    } catch (err) {
      exportValidation.className = "validation-message error";
      exportValidation.innerHTML = "Export failed: " + err.message;
      exportValidation.hidden = false;
    } finally {
      exportConfirmBtn.disabled = false;
      exportConfirmBtn.textContent = "Export as ZIP";
    }
  });

  // ===== DEVICE PREVIEW BUTTONS =====
  devBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      devBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const width  = btn.dataset.width;
      const height = btn.dataset.height;
      if (width === "100%") {
        preview.style.width  = "100%";
        preview.style.height = "100%";
        previewWrap.style.justifyContent = "stretch";
      } else {
        preview.style.width  = width;
        preview.style.height = height;
        previewWrap.style.justifyContent = "center";
      }
    });
  });

  // ===== KEYBOARD SHORTCUTS =====
  document.addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "z") {
        e.preventDefault();
        undo();
      } else if (e.key === "y") {
        e.preventDefault();
        redo();
      }
    }
  });

  // ===== CLICK TO ADD HOTSPOT =====
  overlay.addEventListener("click", e => {
    if (!project.mainImage) return;

    saveHistory();
    const vbHeight = getOverlayViewBoxHeight();
    const point = svgPoint(e);

    project.regions.push({
      x: Math.max(0, Math.min(100, point.x)),
      y: Math.max(0, Math.min(100, (point.y / vbHeight) * 100)),
      title: "New hotspot",
      desc: "",
      size: 4,
      color: "#ff6600",
      icon: null,
      image: null
    });

    showHotspotPanel(project.regions.length - 1);
    renderAll();
  });

  // ===== RENDER HOTSPOTS =====
  function renderCircles() {
    const vbHeight = getOverlayViewBoxHeight();
    overlay.setAttribute("viewBox", `0 0 100 ${vbHeight}`);

    // Remove all children except persistent defs
    while (overlay.lastChild) overlay.removeChild(overlay.lastChild);

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    overlay.appendChild(defs);

    project.regions.forEach((r, i) => {
      // r.size is a percentage of image width (e.g. 4 = 4% radius)
      const radius = (r.size || 4) / 2;
      const cx = r.x;
      const cy = (r.y / 100) * vbHeight;
      const isSelected = i === selected;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("data-index", String(i));
      g.style.cursor = "pointer";

      if (r.icon) {
        const clipId = `hsc-${i}`;
        const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
        clipPath.setAttribute("id", clipId);
        const clipCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        clipCircle.setAttribute("cx", String(cx));
        clipCircle.setAttribute("cy", String(cy));
        clipCircle.setAttribute("r", String(radius));
        clipPath.appendChild(clipCircle);
        defs.appendChild(clipPath);

        const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
        img.setAttribute("href", r.icon);
        img.setAttribute("x", String(cx - radius));
        img.setAttribute("y", String(cy - radius));
        img.setAttribute("width", String(radius * 2));
        img.setAttribute("height", String(radius * 2));
        img.setAttribute("preserveAspectRatio", "xMidYMid meet");
        img.setAttribute("clip-path", `url(#${clipId})`);
        g.appendChild(img);

        // Transparent hit circle for interaction
        const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        hit.setAttribute("cx", String(cx));
        hit.setAttribute("cy", String(cy));
        hit.setAttribute("r", String(radius));
        hit.setAttribute("fill", "transparent");
        hit.setAttribute("stroke", isSelected ? "#8ac8ff" : "rgba(255,255,255,0.45)");
        hit.setAttribute("stroke-width", isSelected ? "0.25" : "0.12");
        g.appendChild(hit);
      } else {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", String(cx));
        circle.setAttribute("cy", String(cy));
        circle.setAttribute("r", String(radius));
        circle.setAttribute("fill", r.color || "#ff6600");
        circle.setAttribute("stroke", isSelected ? "#8ac8ff" : "rgba(255,255,255,0.5)");
        circle.setAttribute("stroke-width", isSelected ? "0.25" : "0.12");
        circle.style.filter = "drop-shadow(0 0.3px 0.8px rgba(0,0,0,0.4))";
        g.appendChild(circle);
      }

      let dragging = false;
      let startPt = null, startRX = 0, startRY = 0;

      g.addEventListener("mousedown", e => {
        dragging = true;
        e.stopPropagation();
        saveHistory();
        startPt = svgPoint(e);
        startRX = r.x;
        startRY = r.y;
      });

      window.addEventListener("mouseup", () => { dragging = false; });

      window.addEventListener("mousemove", e => {
        if (!dragging) return;
        const pt = svgPoint(e);
        r.x = Math.max(0, Math.min(100, startRX + (pt.x - startPt.x)));
        const yNext = ((startRY / 100) * vbHeight) + (pt.y - startPt.y);
        r.y = Math.max(0, Math.min(100, (yNext / vbHeight) * 100));
        renderCircles();
        updatePreview();
      });

      g.addEventListener("click", e => {
        e.stopPropagation();
        showHotspotPanel(i);
        renderCircles();
      });

      overlay.appendChild(g);
    });
  }

  function getOverlayViewBoxHeight() {
    const width = overlay.clientWidth || 1;
    const height = overlay.clientHeight || 1;
    return (height / width) * 100;
  }

  // Convert a MouseEvent to SVG viewBox coordinates (0–100 range)
  function svgPoint(e) {
    const pt = overlay.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(overlay.getScreenCTM().inverse());
  }

  // ===== GENERATE PREVIEW HTML =====
  function generateHTML() {
    const title   = project.title   || "Image Map";
    const bgColor = project.bgColor || "#f5f5f5";
    const configJson = JSON.stringify(project.regions);

    // Build an inline SVG overlay using percentage units (no fixed square viewBox),
    // which keeps circles circular on non-square image containers.
    const svgHotspots = project.regions.map((r, i) => {
      const size = (r.size || 4);
      const radius = size / 2;
      const cx = r.x;
      const cy = r.y;
      const color = r.color || "#ff6600";
      const label = (r.title || "Hotspot").replace(/"/g, "&quot;");

      if (r.icon) {
        return (
          `<image href="${r.icon}" x="${cx - radius}%" y="${cy - radius}%" ` +
          `width="${size}%" height="${size}%" ` +
          `preserveAspectRatio="xMidYMid meet" ` +
          `style="cursor:pointer" ` +
          `onclick="show(${i})" ` +
          `role="button" tabindex="0" aria-label="${label}" ` +
          `onkeypress="if(event.key==='Enter'||event.key===' ')show(${i})"/>` +
          `<circle cx="${cx}%" cy="${cy}%" r="${radius}%" fill="transparent" ` +
          `stroke="rgba(255,255,255,0.4)" stroke-width="0.25%" onclick="show(${i})" style="cursor:pointer"/>`
        );
      }
      return (
        `<circle cx="${cx}%" cy="${cy}%" r="${radius}%" fill="${color}" ` +
        `stroke="rgba(255,255,255,0.5)" stroke-width="0.25%" ` +
        `style="cursor:pointer;filter:drop-shadow(0 0.4px 1px rgba(0,0,0,0.35))" ` +
        `onclick="show(${i})" ` +
        `role="button" tabindex="0" aria-label="${label}" ` +
        `onkeypress="if(event.key==='Enter'||event.key===' ')show(${i})"/>`
      );
    }).join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
*{box-sizing:border-box;}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:${bgColor};color:#333;}
header{background:#fff;padding:14px;text-align:center;border-bottom:1px solid #e0e0e0;}
header h1{margin:0;font-size:1.4rem;}
main{display:flex;flex-direction:column;max-width:1200px;margin:0 auto;}
.image-map-section{width:100%;background:#fff;}
.image-map{position:relative;width:100%;display:block;}
.image-map>img{width:100%;height:auto;display:block;}
.image-map>.hotspot-layer{position:absolute;inset:0;width:100%;height:100%;overflow:visible;}
.image-map>.hotspot-layer circle,.image-map>.hotspot-layer image{transition:filter 0.15s;}
.image-map>.hotspot-layer circle:hover,.image-map>.hotspot-layer image:hover{filter:brightness(1.2);}
.info-section{padding:18px;background:#fff;border-top:1px solid #e0e0e0;min-height:80px;}
.info-section::after{content:"";display:block;clear:both;}
.info-image-wrap{float:left;width:clamp(96px,34%,170px);margin:0 12px 8px 0;}
.info-image{width:100%;aspect-ratio:4/3;height:auto;object-fit:cover;display:block;border-radius:6px;cursor:zoom-in;box-shadow:0 4px 12px rgba(0,0,0,.16);}
.info-section h3{margin:0 0 6px;line-height:1.25;}
.info-section p{margin:0;color:#555;line-height:1.45;}
.lightbox{position:fixed;inset:0;background:rgba(0,0,0,.88);display:none;align-items:center;justify-content:center;z-index:9999;padding:20px;}
.lightbox.open{display:flex;}
.lightbox-image{max-width:min(96vw,1700px);max-height:92vh;width:auto;height:auto;object-fit:contain;border-radius:8px;}
.lightbox-close{position:absolute;top:12px;right:16px;border:none;background:rgba(255,255,255,.15);color:#fff;width:44px;height:44px;border-radius:999px;font-size:30px;line-height:1;cursor:pointer;}
@media(min-width:768px){
  header{padding:12px;}
  header h1{font-size:1.25rem;}
  .image-map>img{max-height:46vh;object-fit:contain;}
  .info-section{padding:14px 16px;}
  .info-image-wrap{width:clamp(88px,32%,150px);margin:0 10px 8px 0;}
  .info-section h3{font-size:1.05rem;margin:0 0 6px;}
}
@media(min-width:1024px){
  main{flex-direction:row;align-items:flex-start;}
  .image-map-section{flex:2;border-right:1px solid #e0e0e0;}
  .info-section{flex:1;border-top:none;position:sticky;top:0;}
  .image-map>img{max-height:none;}
  .info-image-wrap{width:clamp(100px,42%,190px);}
}
</style>
</head>
<body>
<header><h1>${title}</h1></header>
<main>
  <section class="image-map-section">
    <div class="image-map">
      <img src="${project.mainImage}" alt="${title}">
      <svg class="hotspot-layer" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        ${svgHotspots}
      </svg>
    </div>
  </section>
  <section class="info-section" id="info">
    <p style="color:#999;font-style:italic;">Click a hotspot to learn more</p>
  </section>
</main>
<div class="lightbox" id="lightbox" aria-hidden="true">
  <button class="lightbox-close" id="lightboxClose" aria-label="Close full image">&times;</button>
  <img class="lightbox-image" id="lightboxImage" alt="Full resolution view">
</div>
<script>
const regions=${configJson};
const lightbox=document.getElementById("lightbox");
const lightboxImage=document.getElementById("lightboxImage");
const lightboxClose=document.getElementById("lightboxClose");

function openLightbox(src,alt){
  if(!src||!lightbox||!lightboxImage)return;
  lightboxImage.src=src;
  lightboxImage.alt=alt||"Full resolution image";
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden","false");
}

function closeLightbox(){
  if(!lightbox||!lightboxImage)return;
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden","true");
  lightboxImage.removeAttribute("src");
}

if(lightbox&&lightboxClose){
  lightboxClose.addEventListener("click",closeLightbox);
  lightbox.addEventListener("click",e=>{if(e.target===lightbox)closeLightbox();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeLightbox();});
}

function show(i){
  const r=regions[i],info=document.getElementById("info");
  let img='';
  if(r.image){
    img='<div class="info-image-wrap"><img src="'+r.image+'" class="info-image" alt="'+(r.title||'')+'" role="button" tabindex="0" aria-label="Open full image"></div>';
  }
  info.innerHTML=img+'<h3>'+(r.title||'')+'</h3>'+'<p>'+(r.desc||'')+'</p>';
  const infoImage=info.querySelector(".info-image");
  if(infoImage){
    infoImage.addEventListener("click",()=>openLightbox(r.image,r.title));
    infoImage.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openLightbox(r.image,r.title);}});
  }
  if(window.innerWidth<768)info.scrollIntoView({behavior:'smooth',block:'nearest'});
}
<\/script>
</body>
</html>`;
  }

  // ===== UPDATE PREVIEW =====
  function updatePreview() {
    preview.srcdoc = generateHTML();
  }

  // ===== RENDER ALL =====
  function renderAll() {
    canvasImage.src = project.mainImage;
    renderCircles();
    updatePreview();
  }

  // ===== INITIALIZE =====
  setStorageStatus("Save Project writes a JSON project file to your local drive. In VS Code Live Preview, use an external browser if Save As is blocked.");
  updateUndoRedoButtons();

  // Expose to window for debugging
  window.undo = undo;
  window.redo = redo;
  window.project = project;
});
