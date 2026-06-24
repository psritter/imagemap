window.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("overlay");
  const canvasImage = document.getElementById("canvasImage");
  const preview = document.getElementById("preview");
  const previewWrap = document.getElementById("previewWrap");
  const roomMapImageInput = document.getElementById("roomMapImageInput");

  const projectTitleInput = document.getElementById("projectTitle");
  const bgColorInput = document.getElementById("bgColor");
  const mapSelect = document.getElementById("mapSelect");
  const mapNameInput = document.getElementById("mapNameInput");
  const addMapBtn = document.getElementById("addMapBtn");
  const deleteMapBtn = document.getElementById("deleteMapBtn");

  const hotspotPanel = document.getElementById("hotspotPanel");
  const titleInput = document.getElementById("titleInput");
  const descInput = document.getElementById("descInput");
  const colorInput = document.getElementById("colorInput");
  const sizeInput = document.getElementById("sizeInput");
  const iconUpload = document.getElementById("iconUpload");
  const infoImage = document.getElementById("infoImage");
  const linkToMapCheckbox = document.getElementById("linkToMapCheckbox");
  const targetMapGroup = document.getElementById("targetMapGroup");
  const targetMapSelect = document.getElementById("targetMapSelect");
  const deleteBtn = document.getElementById("deleteBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const clearIconBtn = document.getElementById("clearIconBtn");
  const clearImageBtn = document.getElementById("clearImageBtn");
  const undoBtn = document.getElementById("undoBtn");
  const redoBtn = document.getElementById("redoBtn");
  const saveProjectBtn = document.getElementById("saveProjectBtn");
  const loadProjectBtn = document.getElementById("loadProjectBtn");
  const projectStorageStatus = document.getElementById("projectStorageStatus");
  const projectFileInput = document.getElementById("projectFileInput");

  const exportBtn = document.getElementById("exportBtn");
  const exportDialog = document.getElementById("exportDialog");
  const projectName = document.getElementById("projectName");
  const exportValidation = document.getElementById("exportValidation");
  const exportConfirmBtn = document.getElementById("exportConfirmBtn");
  const exportCancelBtn = document.getElementById("exportCancelBtn");

  const devBtns = document.querySelectorAll(".dev-btn");
  const collapsibleSections = document.querySelectorAll(".collapsible-section");
  const DEFAULT_START_MAP_IMAGE = "images/MapMuseo.png";

  let project = createDefaultProject();
  let selected = null;
  let history = [];
  let future = [];
  let isUpdatingForm = false;
  let currentProjectHandle = null;

  function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function createMap(name = "New Room") {
    return {
      id: createId("map"),
      name,
      mainImage: "",
      regions: []
    };
  }

  function createDefaultProject() {
    const overviewMap = createMap("Overview");
    overviewMap.mainImage = DEFAULT_START_MAP_IMAGE;
    return {
      title: projectTitleInput ? projectTitleInput.value : "Image Map",
      bgColor: bgColorInput ? bgColorInput.value : "#ffffff",
      overviewMapId: overviewMap.id,
      activeMapId: overviewMap.id,
      maps: [overviewMap]
    };
  }

  function createRegion(x, y) {
    return {
      id: createId("region"),
      x,
      y,
      title: "New hotspot",
      desc: "",
      size: 4,
      color: "#ff6600",
      icon: null,
      image: null,
      targetMapId: null
    };
  }

  function cloneProject(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function sanitizeFileName(value) {
    const base = String(value || "image-map-project").trim() || "image-map-project";
    return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "image-map-project";
  }

  function normalizeRegion(region) {
    return {
      id: typeof region?.id === "string" ? region.id : createId("region"),
      x: Number.isFinite(Number(region?.x)) ? Number(region.x) : 50,
      y: Number.isFinite(Number(region?.y)) ? Number(region.y) : 50,
      title: typeof region?.title === "string" ? region.title : "",
      desc: typeof region?.desc === "string" ? region.desc : "",
      size: Number.isFinite(Number(region?.size)) ? Number(region.size) : 4,
      color: typeof region?.color === "string" ? region.color : "#ff6600",
      icon: typeof region?.icon === "string" ? region.icon : null,
      image: typeof region?.image === "string" ? region.image : null,
      targetMapId: typeof region?.targetMapId === "string" ? region.targetMapId : null
    };
  }

  function normalizeMap(map, fallbackName) {
    return {
      id: typeof map?.id === "string" ? map.id : createId("map"),
      name: typeof map?.name === "string" && map.name.trim() ? map.name : fallbackName,
      mainImage: typeof map?.mainImage === "string" ? map.mainImage : "",
      regions: Array.isArray(map?.regions) ? map.regions.map(normalizeRegion) : []
    };
  }

  function normalizeProject(data) {
    if (Array.isArray(data?.maps) && data.maps.length) {
      const maps = data.maps.map((map, index) => normalizeMap(map, index === 0 ? "Overview" : `Room ${index}`));
      const overviewMapId = maps.some(map => map.id === data.overviewMapId) ? data.overviewMapId : maps[0].id;
      const activeMapId = maps.some(map => map.id === data.activeMapId) ? data.activeMapId : overviewMapId;
      return {
        title: typeof data?.title === "string" ? data.title : "Image Map",
        bgColor: typeof data?.bgColor === "string" ? data.bgColor : "#ffffff",
        overviewMapId,
        activeMapId,
        maps
      };
    }

    const legacyMap = normalizeMap({
      name: "Overview",
      mainImage: typeof data?.mainImage === "string" ? data.mainImage : "",
      regions: Array.isArray(data?.regions) ? data.regions : []
    }, "Overview");

    return {
      title: typeof data?.title === "string" ? data.title : "Image Map",
      bgColor: typeof data?.bgColor === "string" ? data.bgColor : "#ffffff",
      overviewMapId: legacyMap.id,
      activeMapId: legacyMap.id,
      maps: [legacyMap]
    };
  }

  function getActiveMap() {
    return project.maps.find(map => map.id === project.activeMapId) || project.maps[0];
  }

  function getMapById(mapId) {
    return project.maps.find(map => map.id === mapId) || null;
  }

  function ensureValidProject() {
    if (!Array.isArray(project.maps) || !project.maps.length) {
      project = createDefaultProject();
    }
    if (!getMapById(project.overviewMapId)) {
      project.overviewMapId = project.maps[0].id;
    }
    if (!getMapById(project.activeMapId)) {
      project.activeMapId = project.overviewMapId;
    }
    const startMap = getMapById(project.overviewMapId);
    if (startMap && !startMap.mainImage) {
      startMap.mainImage = DEFAULT_START_MAP_IMAGE;
    }
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

  function buildProjectFilePayload() {
    return JSON.stringify({
      format: "IMGeditorProject",
      version: 2,
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

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{ description: "IMGeditor Project", accept: { "application/json": [".json", ".imgmap.json"] } }]
        });
        await writeProjectWithHandle(handle, payload);
        currentProjectHandle = handle;
        setStorageStatus("Project saved to local drive.", "success");
        return;
      } catch (error) {
        if (error && error.name === "AbortError") return;
        console.warn("showSaveFilePicker failed, falling back to download:", error);
      }
    }

    try {
      const fileSize = downloadProjectFile(suggestedName, payload);
      if (fileSize <= 0) throw new Error("Generated project file was empty.");
      setStorageStatus("Project file downloading — check your browser's Downloads folder.", "success");
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

  function applyLoadedProject(snapshot) {
    project = normalizeProject(snapshot);
    ensureValidProject();
    currentProjectHandle = null;
    selected = null;
    history = [];
    future = [];
    iconUpload.value = "";
    infoImage.value = "";
    hotspotPanel.hidden = true;
    renderAll();
    updateUndoRedoButtons();
  }

  async function loadProjectFromDisk() {
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          types: [{ description: "IMGeditor Project", accept: { "application/json": [".json", ".imgmap.json"] } }]
        });
        const file = await handle.getFile();
        const text = await file.text();
        applyLoadedProject(readProjectDataFromText(text));
        currentProjectHandle = handle;
        setStorageStatus(`Loaded project file: ${file.name}`, "success");
        return;
      } catch (error) {
        if (error && error.name === "AbortError") return;
        console.warn("showOpenFilePicker failed, falling back to file input:", error);
      }
    }
    projectFileInput.value = "";
    projectFileInput.click();
  }

  async function handleProjectFileInputChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      applyLoadedProject(readProjectDataFromText(text));
      setStorageStatus(`Loaded project file: ${file.name}`, "success");
    } catch (error) {
      console.error("Failed to parse selected project file:", error);
      setStorageStatus(error.message || "Invalid project file.", "error");
    }
  }

  function saveHistory() {
    history.push(JSON.stringify(project));
    future = [];
    updateUndoRedoButtons();
  }

  function undo() {
    if (!history.length) return;
    future.push(JSON.stringify(project));
    project = normalizeProject(JSON.parse(history.pop()));
    ensureValidProject();
    selected = null;
    hotspotPanel.hidden = true;
    renderAll();
    updateUndoRedoButtons();
  }

  function redo() {
    if (!future.length) return;
    history.push(JSON.stringify(project));
    project = normalizeProject(JSON.parse(future.pop()));
    ensureValidProject();
    selected = null;
    hotspotPanel.hidden = true;
    renderAll();
    updateUndoRedoButtons();
  }

  function updateUndoRedoButtons() {
    undoBtn.disabled = history.length === 0;
    redoBtn.disabled = future.length === 0;
  }

  function syncTargetMapSelect(region = null) {
    const activeMap = getActiveMap();
    const options = project.maps
      .filter(map => map.id !== activeMap.id)
      .map(map => `<option value="${map.id}">${escapeHtml(map.name)}</option>`)
      .join("");
    targetMapSelect.innerHTML = '<option value="">Select a room map...</option>' + options;
    const canNavigate = linkToMapCheckbox.checked && project.maps.length > 1;
    targetMapSelect.disabled = !canNavigate;
    targetMapSelect.value = region?.targetMapId || "";
  }

  function toggleTargetMapUI() {
    const canNavigate = linkToMapCheckbox.checked && project.maps.length > 1;
    targetMapGroup.style.display = "flex";
    targetMapGroup.style.opacity = canNavigate ? "1" : "0.7";
    targetMapSelect.disabled = !canNavigate;
  }

  function syncProjectInputs() {
    const activeMap = getActiveMap();
    projectTitleInput.value = project.title || "";
    bgColorInput.value = project.bgColor || "#ffffff";
    mapSelect.innerHTML = project.maps.map((map, index) => {
      const label = map.id === project.overviewMapId ? `Start: ${map.name}` : `Room ${index}: ${map.name}`;
      return `<option value="${map.id}"${map.id === activeMap.id ? " selected" : ""}>${escapeHtml(label)}</option>`;
    }).join("");
    mapNameInput.value = activeMap.name || "";
    deleteMapBtn.disabled = project.maps.length <= 1;
    canvasImage.src = activeMap.mainImage || "";
    syncTargetMapSelect(selected !== null ? activeMap.regions[selected] : null);
    toggleTargetMapUI();
  }

  function setSectionsCollapsed(collapsed) {
    collapsibleSections.forEach(section => {
      section.open = !collapsed;
    });
  }

  function showHotspotPanel(index) {
    const activeMap = getActiveMap();
    const region = activeMap.regions[index];
    if (!region) return;
    selected = index;
    isUpdatingForm = true;
    titleInput.value = region.title || "";
    descInput.value = region.desc || "";
    colorInput.value = region.color || "#ff6600";
    sizeInput.value = region.size || 4;
    linkToMapCheckbox.checked = Boolean(region.targetMapId);
    syncTargetMapSelect(region);
    toggleTargetMapUI();
    isUpdatingForm = false;
    hotspotPanel.hidden = false;
    setSectionsCollapsed(true);
    titleInput.focus();
  }

  function hideHotspotPanel() {
    selected = null;
    hotspotPanel.hidden = true;
    renderAll();
  }

  function updateCurrentHotspot() {
    const activeMap = getActiveMap();
    if (selected === null || isUpdatingForm || !activeMap.regions[selected]) return;
    const region = activeMap.regions[selected];
    region.title = titleInput.value;
    region.desc = descInput.value;
    region.color = colorInput.value;
    region.size = parseFloat(sizeInput.value) || 4;
    region.targetMapId = linkToMapCheckbox.checked ? (targetMapSelect.value || null) : null;
    renderCircles();
    updatePreview();
  }

  function addMap() {
    saveHistory();
    const newMap = createMap(`Room ${project.maps.length}`);
    project.maps.push(newMap);
    project.activeMapId = newMap.id;
    hideHotspotPanel();
  }

  function deleteMap() {
    if (project.maps.length <= 1) return;
    const activeMap = getActiveMap();
    if (!confirm(`Delete map "${activeMap.name}"?`)) return;
    saveHistory();
    project.maps = project.maps.filter(map => map.id !== activeMap.id);
    project.maps.forEach(map => {
      map.regions.forEach(region => {
        if (region.targetMapId === activeMap.id) region.targetMapId = null;
      });
    });
    if (project.overviewMapId === activeMap.id) project.overviewMapId = project.maps[0].id;
    project.activeMapId = project.overviewMapId;
    hideHotspotPanel();
  }

  roomMapImageInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    saveHistory();
    const reader = new FileReader();
    reader.onload = () => {
      getActiveMap().mainImage = reader.result;
      renderAll();
    };
    reader.readAsDataURL(file);
  });

  projectTitleInput.addEventListener("input", () => {
    project.title = projectTitleInput.value;
    updatePreview();
  });

  bgColorInput.addEventListener("input", () => {
    project.bgColor = bgColorInput.value;
    updatePreview();
  });

  mapSelect.addEventListener("change", () => {
    project.activeMapId = mapSelect.value;
    selected = null;
    hotspotPanel.hidden = true;
    renderAll();
  });

  mapNameInput.addEventListener("input", () => {
    getActiveMap().name = mapNameInput.value || "Untitled Map";
    syncProjectInputs();
    updatePreview();
  });

  addMapBtn.addEventListener("click", addMap);
  deleteMapBtn.addEventListener("click", deleteMap);

  iconUpload.addEventListener("change", e => {
    const activeMap = getActiveMap();
    if (selected === null || !activeMap.regions[selected]) return;
    const file = e.target.files[0];
    if (!file) return;
    saveHistory();
    const reader = new FileReader();
    reader.onload = () => {
      activeMap.regions[selected].icon = reader.result;
      renderAll();
    };
    reader.readAsDataURL(file);
  });

  clearIconBtn.addEventListener("click", e => {
    e.preventDefault();
    const activeMap = getActiveMap();
    if (selected === null || !activeMap.regions[selected]) return;
    saveHistory();
    activeMap.regions[selected].icon = null;
    iconUpload.value = "";
    renderAll();
  });

  infoImage.addEventListener("change", e => {
    const activeMap = getActiveMap();
    if (selected === null || !activeMap.regions[selected]) return;
    const file = e.target.files[0];
    if (!file) return;
    saveHistory();
    const reader = new FileReader();
    reader.onload = () => {
      activeMap.regions[selected].image = reader.result;
      updatePreview();
    };
    reader.readAsDataURL(file);
  });

  clearImageBtn.addEventListener("click", e => {
    e.preventDefault();
    const activeMap = getActiveMap();
    if (selected === null || !activeMap.regions[selected]) return;
    saveHistory();
    activeMap.regions[selected].image = null;
    infoImage.value = "";
    updatePreview();
  });

  titleInput.addEventListener("input", () => { saveHistory(); updateCurrentHotspot(); });
  descInput.addEventListener("input", () => { saveHistory(); updateCurrentHotspot(); });
  colorInput.addEventListener("change", () => { saveHistory(); updateCurrentHotspot(); });
  sizeInput.addEventListener("change", () => { saveHistory(); updateCurrentHotspot(); });
  linkToMapCheckbox.addEventListener("change", () => { saveHistory(); toggleTargetMapUI(); updateCurrentHotspot(); });
  targetMapSelect.addEventListener("change", () => { saveHistory(); updateCurrentHotspot(); });

  deleteBtn.addEventListener("click", () => {
    const activeMap = getActiveMap();
    if (selected === null || !activeMap.regions[selected]) return;
    saveHistory();
    activeMap.regions.splice(selected, 1);
    hideHotspotPanel();
  });

  cancelBtn.addEventListener("click", () => hideHotspotPanel());
  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);
  saveProjectBtn.addEventListener("click", saveProjectToDisk);
  loadProjectBtn.addEventListener("click", loadProjectFromDisk);
  projectFileInput.addEventListener("change", handleProjectFileInputChange);

  exportBtn.addEventListener("click", () => {
    exportValidation.hidden = true;
    projectName.value = project.title || "Image Map";
    exportDialog.showModal();
  });

  exportCancelBtn.addEventListener("click", () => exportDialog.close());

  exportConfirmBtn.addEventListener("click", async () => {
    const validation = new ProjectExporter(project).validate();
    if (!validation.isValid) {
      exportValidation.className = "validation-message error";
      exportValidation.innerHTML = validation.errors.join("<br>");
      exportValidation.hidden = false;
      return;
    }
    const name = projectName.value.trim() || project.title || "image-map";
    exportConfirmBtn.disabled = true;
    exportConfirmBtn.textContent = "Exporting…";
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

  devBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      devBtns.forEach(other => other.classList.remove("active"));
      btn.classList.add("active");
      const width = btn.dataset.width;
      const height = btn.dataset.height;
      if (width === "100%") {
        preview.style.width = "100%";
        preview.style.height = "100%";
        previewWrap.style.justifyContent = "stretch";
      } else {
        preview.style.width = width;
        preview.style.height = height;
        previewWrap.style.justifyContent = "center";
      }
    });
  });

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

  overlay.addEventListener("click", e => {
    const activeMap = getActiveMap();
    if (!activeMap.mainImage) return;
    saveHistory();
    const vbHeight = getOverlayViewBoxHeight();
    const point = svgPoint(e);
    const region = createRegion(
      Math.max(0, Math.min(100, point.x)),
      Math.max(0, Math.min(100, (point.y / vbHeight) * 100))
    );

    if (activeMap.id === project.overviewMapId && project.maps.length > 1) {
      const firstRoom = project.maps.find(map => map.id !== activeMap.id);
      if (firstRoom) {
        region.targetMapId = firstRoom.id;
      }
    }

    activeMap.regions.push(region);
    showHotspotPanel(activeMap.regions.length - 1);
    renderAll();
  });

  function renderCircles() {
    const activeMap = getActiveMap();
    const vbHeight = getOverlayViewBoxHeight();
    overlay.setAttribute("viewBox", `0 0 100 ${vbHeight}`);
    while (overlay.lastChild) overlay.removeChild(overlay.lastChild);

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    overlay.appendChild(defs);

    activeMap.regions.forEach((region, index) => {
      const radius = (region.size || 4) / 2;
      const cx = region.x;
      const cy = (region.y / 100) * vbHeight;
      const isSelected = index === selected;
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.style.cursor = "pointer";

      if (region.icon) {
        const clipId = `hsc-${index}`;
        const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
        clipPath.setAttribute("id", clipId);
        const clipCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        clipCircle.setAttribute("cx", String(cx));
        clipCircle.setAttribute("cy", String(cy));
        clipCircle.setAttribute("r", String(radius));
        clipPath.appendChild(clipCircle);
        defs.appendChild(clipPath);

        const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
        img.setAttribute("href", region.icon);
        img.setAttribute("x", String(cx - radius));
        img.setAttribute("y", String(cy - radius));
        img.setAttribute("width", String(radius * 2));
        img.setAttribute("height", String(radius * 2));
        img.setAttribute("preserveAspectRatio", "xMidYMid meet");
        img.setAttribute("clip-path", `url(#${clipId})`);
        g.appendChild(img);

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
        circle.setAttribute("fill", region.color || "#ff6600");
        circle.setAttribute("stroke", isSelected ? "#8ac8ff" : "rgba(255,255,255,0.5)");
        circle.setAttribute("stroke-width", isSelected ? "0.25" : "0.12");
        circle.style.filter = "drop-shadow(0 0.3px 0.8px rgba(0,0,0,0.4))";
        g.appendChild(circle);
      }

      let dragging = false;
      let startPt = null;
      let startRX = 0;
      let startRY = 0;

      g.addEventListener("mousedown", e => {
        dragging = true;
        e.stopPropagation();
        saveHistory();
        startPt = svgPoint(e);
        startRX = region.x;
        startRY = region.y;
      });

      window.addEventListener("mouseup", () => { dragging = false; });
      window.addEventListener("mousemove", e => {
        if (!dragging) return;
        const pt = svgPoint(e);
        region.x = Math.max(0, Math.min(100, startRX + (pt.x - startPt.x)));
        const yNext = ((startRY / 100) * vbHeight) + (pt.y - startPt.y);
        region.y = Math.max(0, Math.min(100, (yNext / vbHeight) * 100));
        renderCircles();
        updatePreview();
      });

      g.addEventListener("click", e => {
        e.stopPropagation();
        showHotspotPanel(index);
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

  function svgPoint(e) {
    const pt = overlay.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(overlay.getScreenCTM().inverse());
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;");
  }

  function generateHTML() {
    const projectJson = JSON.stringify(project).replace(/<\//g, "<\\/");
    const title = project.title || "Image Map";
    const bgColor = project.bgColor || "#f5f5f5";
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
*{box-sizing:border-box;}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:${bgColor};color:#333;padding-bottom:72px;}
header{background:#fff;padding:14px;text-align:center;border-bottom:1px solid #e0e0e0;}header h1{margin:0;font-size:1.35rem;}
main{display:flex;flex-direction:column;max-width:1200px;margin:0 auto;}
.image-map-section{width:100%;background:#fff;}.image-map{position:relative;width:100%;display:block;}.image-map>img{width:100%;height:auto;display:block;}.hotspot-layer{position:absolute;inset:0;width:100%;height:100%;overflow:visible;}
.hotspot-layer circle,.hotspot-layer image{transition:filter .15s;}.hotspot-layer circle:hover,.hotspot-layer image:hover{filter:brightness(1.2);}
.info-section{padding:18px;background:#fff;border-top:1px solid #e0e0e0;min-height:80px;overflow:auto;}.info-section::after{content:"";display:block;clear:both;}
.info-image-wrap{float:left;width:clamp(96px,34%,170px);margin:0 12px 8px 0;}.info-image{width:100%;aspect-ratio:4/3;height:auto;object-fit:cover;display:block;border-radius:6px;cursor:zoom-in;box-shadow:0 4px 12px rgba(0,0,0,.16);}
.info-section h3{margin:0 0 6px;line-height:1.25;}.info-section p{margin:0;color:#555;line-height:1.45;}.placeholder{color:#999;font-style:italic;}
.info-nav{display:flex;align-items:center;gap:8px;margin-top:10px;clear:both;}.info-nav-btn,.room-nav-btn{border:1px solid #d2d8de;background:#f4f7fa;color:#2c3e50;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:.88rem;line-height:1;}.info-nav-btn:disabled,.room-nav-btn:disabled{opacity:.45;cursor:not-allowed;}.info-nav-status,.room-nav-status{font-size:.82rem;color:#667085;}
.room-nav{position:fixed;left:0;right:0;bottom:0;z-index:900;background:rgba(255,255,255,.96);border-top:1px solid #dbe2ea;backdrop-filter:blur(8px);}.room-nav-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:10px;padding:10px 14px;}.room-nav-title{flex:1;min-width:0;font-weight:600;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.room-nav-status{white-space:nowrap;}
.lightbox{position:fixed;inset:0;background:rgba(0,0,0,.88);display:none;align-items:center;justify-content:center;z-index:9999;padding:20px;}.lightbox.open{display:flex;}.lightbox-image{max-width:min(96vw,1700px);max-height:92vh;width:auto;height:auto;object-fit:contain;border-radius:8px;}.lightbox-close{position:absolute;top:12px;right:16px;border:none;background:rgba(255,255,255,.15);color:#fff;width:44px;height:44px;border-radius:999px;font-size:30px;line-height:1;cursor:pointer;}
@media(min-width:768px){header{padding:12px;}header h1{font-size:1.25rem;}.image-map>img{max-height:46vh;object-fit:contain;}.info-section{padding:14px 16px;}.info-image-wrap{width:clamp(88px,32%,150px);margin:0 10px 8px 0;}.info-section h3{font-size:1.05rem;margin:0 0 6px;}.room-nav-inner{padding:10px 18px;}}
@media(min-width:1024px){main{flex-direction:row;align-items:flex-start;}.image-map-section{flex:2;border-right:1px solid #e0e0e0;}.info-section{flex:1;border-top:none;position:sticky;top:0;max-height:calc(100vh - 130px - 72px);}.image-map>img{max-height:none;}.info-image-wrap{width:clamp(100px,42%,190px);}}
</style>
</head>
<body>
<header><h1>${escapeHtml(title)}</h1></header>
<main>
<section class="image-map-section"><div class="image-map"><img id="mainMapImage" alt="Current room map"><svg class="hotspot-layer" id="hotspotLayer" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg></div></section>
<section class="info-section" id="infoPanel"><p class="placeholder">Select a hotspot to view details.</p></section>
</main>
<nav class="room-nav" id="roomNav" aria-label="Room navigation"><div class="room-nav-inner"><button type="button" class="room-nav-btn" id="roomPrev" aria-label="Previous room">&#8592;</button><div class="room-nav-title" id="roomNavTitle"></div><span class="room-nav-status" id="roomNavStatus"></span><button type="button" class="room-nav-btn" id="roomNext" aria-label="Next room">&#8594;</button></div></nav>
<div class="lightbox" id="lightbox" aria-hidden="true"><button class="lightbox-close" id="lightboxClose" aria-label="Close full image">&times;</button><img class="lightbox-image" id="lightboxImage" alt="Full resolution view"></div>
<script>
const projectData=${projectJson};
const maps=Array.isArray(projectData.maps)?projectData.maps:[];
const preferredStartMapId=projectData.activeMapId||projectData.overviewMapId;
let currentMapIndex=maps.findIndex(map=>map.id===preferredStartMapId);
if(currentMapIndex<0)currentMapIndex=maps.findIndex(map=>map.id===projectData.overviewMapId);
if(currentMapIndex<0)currentMapIndex=0;
let currentInfoIndex=0,infoTouchStartX=0,infoTouchStartY=0,roomTouchStartX=0,roomTouchStartY=0;
const infoPanel=document.getElementById('infoPanel');
const mainMapImage=document.getElementById('mainMapImage');
const hotspotLayer=document.getElementById('hotspotLayer');
const roomPrev=document.getElementById('roomPrev');
const roomNext=document.getElementById('roomNext');
const roomNavTitle=document.getElementById('roomNavTitle');
const roomNavStatus=document.getElementById('roomNavStatus');
const roomNav=document.getElementById('roomNav');
const lightbox=document.getElementById('lightbox');
const lightboxImage=document.getElementById('lightboxImage');
const lightboxClose=document.getElementById('lightboxClose');
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}
function currentMap(){return maps[currentMapIndex]||null;}
function openLightbox(src,alt){if(!src)return;lightboxImage.src=src;lightboxImage.alt=alt||'Full resolution image';lightbox.classList.add('open');lightbox.setAttribute('aria-hidden','false');}
function closeLightbox(){lightbox.classList.remove('open');lightbox.setAttribute('aria-hidden','true');lightboxImage.removeAttribute('src');}
function changeRoom(step){const next=Math.max(0,Math.min(maps.length-1,currentMapIndex+step));if(next!==currentMapIndex)showRoom(next,true);} 
function showRoomById(mapId){const idx=maps.findIndex(map=>map.id===mapId);if(idx>=0)showRoom(idx,true);} 
function changeInfo(step){const map=currentMap();if(!map||!map.regions.length)return;const next=Math.max(0,Math.min(map.regions.length-1,currentInfoIndex+step));if(next!==currentInfoIndex)showInfo(next);} 
function renderRoomNav(){const map=currentMap();roomNavTitle.textContent=map?('Room Map: '+(map.name||'Untitled')):'';roomNavStatus.textContent=(currentMapIndex+1)+' / '+maps.length;roomPrev.disabled=currentMapIndex===0;roomNext.disabled=currentMapIndex===maps.length-1;} 
function renderHotspots(){const map=currentMap();if(!map){hotspotLayer.innerHTML='';mainMapImage.removeAttribute('src');return;}const startMap=maps.find(entry=>entry&&entry.id===projectData.overviewMapId)||maps[0]||null;mainMapImage.src=map.mainImage||(startMap?startMap.mainImage:'')||'';hotspotLayer.innerHTML=map.regions.map((region,index)=>{const size=region.size||4;const radius=size/2;const label=esc(region.title||'Hotspot');const color=region.color||'#ff6600';if(region.icon){return '<image href="'+region.icon+'" x="'+(region.x-radius)+'%" y="'+(region.y-radius)+'%" width="'+size+'%" height="'+size+'%" preserveAspectRatio="xMidYMid meet" style="cursor:pointer" onclick="handleRegionClick('+index+')" aria-label="'+label+'"/>'+'<circle cx="'+region.x+'%" cy="'+region.y+'%" r="'+radius+'%" fill="transparent" stroke="rgba(255,255,255,0.4)" stroke-width="0.25%" onclick="handleRegionClick('+index+')" style="cursor:pointer"/>'; }return '<circle cx="'+region.x+'%" cy="'+region.y+'%" r="'+radius+'%" fill="'+color+'" stroke="rgba(255,255,255,0.5)" stroke-width="0.25%" style="cursor:pointer;filter:drop-shadow(0 0.4px 1px rgba(0,0,0,0.35))" onclick="handleRegionClick('+index+')" aria-label="'+label+'"/>';}).join('');}
function renderInfo(region){if(!region){infoPanel.innerHTML='<p class="placeholder">Select a hotspot to view details.</p>';return;}let imageHtml='';if(region.image){imageHtml='<div class="info-image-wrap"><img src="'+region.image+'" class="info-image" alt="'+esc(region.title)+'" role="button" tabindex="0" aria-label="Open full image"></div>';}const map=currentMap();const prevDisabled=currentInfoIndex===0?'disabled':'';const nextDisabled=currentInfoIndex===map.regions.length-1?'disabled':'';infoPanel.innerHTML=imageHtml+'<h3>'+esc(region.title||'Untitled')+'</h3><p>'+esc(region.desc||'')+'</p><div class="info-nav"><button type="button" class="info-nav-btn" id="infoPrev" '+prevDisabled+' aria-label="Previous info">&#8592;</button><button type="button" class="info-nav-btn" id="infoNext" '+nextDisabled+' aria-label="Next info">&#8594;</button><span class="info-nav-status">'+(currentInfoIndex+1)+' / '+map.regions.length+'</span></div>';const img=infoPanel.querySelector('.info-image');if(img){img.addEventListener('click',()=>openLightbox(region.image,region.title));img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openLightbox(region.image,region.title);}});}const prevBtn=infoPanel.querySelector('#infoPrev');const nextBtn=infoPanel.querySelector('#infoNext');if(prevBtn)prevBtn.addEventListener('click',()=>changeInfo(-1));if(nextBtn)nextBtn.addEventListener('click',()=>changeInfo(1));}
function showInfo(index){const map=currentMap();if(!map||!map.regions[index])return;currentInfoIndex=index;renderInfo(map.regions[index]);if(window.innerWidth<768)infoPanel.scrollIntoView({behavior:'smooth',block:'nearest'});} 
function handleRegionClick(index){const map=currentMap();const region=map&&map.regions[index];if(!region)return;if(region.targetMapId){showRoomById(region.targetMapId);return;}showInfo(index);} window.handleRegionClick=handleRegionClick;
function showRoom(index,resetInfo){if(!maps[index])return;currentMapIndex=index;renderRoomNav();renderHotspots();const map=currentMap();if(!map||!map.regions.length){currentInfoIndex=0;renderInfo(null);return;}if(resetInfo||currentInfoIndex>=map.regions.length)currentInfoIndex=0;showInfo(currentInfoIndex);} 
roomPrev.addEventListener('click',()=>changeRoom(-1));roomNext.addEventListener('click',()=>changeRoom(1));
roomNav.ontouchstart=e=>{if(!e.touches||!e.touches.length)return;roomTouchStartX=e.touches[0].clientX;roomTouchStartY=e.touches[0].clientY;};roomNav.ontouchend=e=>{if(!e.changedTouches||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-roomTouchStartX;const dy=e.changedTouches[0].clientY-roomTouchStartY;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.2){if(dx<0)changeRoom(1);else changeRoom(-1);}};
infoPanel.ontouchstart=e=>{if(!e.touches||!e.touches.length)return;infoTouchStartX=e.touches[0].clientX;infoTouchStartY=e.touches[0].clientY;};infoPanel.ontouchend=e=>{if(!e.changedTouches||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-infoTouchStartX;const dy=e.changedTouches[0].clientY-infoTouchStartY;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.2){if(dx<0)changeInfo(1);else changeInfo(-1);}};
lightboxClose.addEventListener('click',closeLightbox);lightbox.addEventListener('click',e=>{if(e.target===lightbox)closeLightbox();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLightbox();});
if(maps.length)showRoom(currentMapIndex,true);
</script>
</body>
</html>`;
  }

  function updatePreview() {
    preview.srcdoc = generateHTML();
  }

  function renderAll() {
    ensureValidProject();
    syncProjectInputs();
    const activeMap = getActiveMap();
    const startMap = getMapById(project.overviewMapId);
    canvasImage.src = activeMap.mainImage || startMap?.mainImage || "";
    if (selected !== null && !activeMap.regions[selected]) {
      selected = null;
      hotspotPanel.hidden = true;
    }
    renderCircles();
    updatePreview();
  }

  setStorageStatus("Save Project writes a JSON project file with start and room maps.");
  targetMapGroup.style.display = "flex";
  targetMapGroup.style.opacity = "0.7";
  renderAll();
  updateUndoRedoButtons();
  window.undo = undo;
  window.redo = redo;
  window.project = project;
});
