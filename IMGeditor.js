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

  // ===== UTILITY FUNCTIONS =====
  function saveHistory() {
    history.push(JSON.stringify(project));
    future = [];
    updateUndoRedoButtons();
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
    colorInput.value = region.color || "#ff0000";
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
    region.size = parseInt(sizeInput.value) || 20;

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

    const rect = overlay.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    project.regions.push({
      x,
      y,
      title: "New hotspot",
      desc: "",
      size: 20,
      color: "#ff0000",
      icon: null,
      image: null
    });

    showHotspotPanel(project.regions.length - 1);
    renderAll();
  });

  // ===== RENDER HOTSPOTS =====
  function renderCircles() {
    overlay.innerHTML = "";

    project.regions.forEach((r, i) => {
      const el = document.createElement("div");
      el.className = "circle";
      el.style.left = r.x + "%";
      el.style.top = r.y + "%";
      el.style.width = r.size + "px";
      el.style.height = r.size + "px";

      // Icon or circle
      if (r.icon) {
        el.style.background = "none";
        el.style.backgroundImage = `url(${r.icon})`;
        el.style.backgroundSize = "contain";
        el.style.backgroundRepeat = "no-repeat";
        el.style.backgroundPosition = "center";
      } else {
        el.style.background = r.color;
      }

      if (i === selected) el.classList.add("selected");

      let dragging = false;
      let offsetX = 0;
      let offsetY = 0;

      el.addEventListener("mousedown", e => {
        dragging = true;
        e.stopPropagation();
        saveHistory();

        const rect = overlay.getBoundingClientRect();
        const px = (r.x / 100) * rect.width;
        const py = (r.y / 100) * rect.height;

        offsetX = e.clientX - rect.left - px;
        offsetY = e.clientY - rect.top - py;
      });

      window.addEventListener("mouseup", () => (dragging = false));

      window.addEventListener("mousemove", e => {
        if (!dragging) return;

        const rect = overlay.getBoundingClientRect();

        r.x = ((e.clientX - rect.left - offsetX) / rect.width) * 100;
        r.y = ((e.clientY - rect.top - offsetY) / rect.height) * 100;

        renderCircles();
        updatePreview();
      });

      el.addEventListener("click", e => {
        e.stopPropagation();
        showHotspotPanel(i);
        renderCircles();
      });

      overlay.appendChild(el);
    });
  }

  // ===== GENERATE PREVIEW HTML =====
  function generateHTML() {
    const title   = project.title   || "Image Map";
    const bgColor = project.bgColor || "#f5f5f5";
    const configJson = JSON.stringify(project.regions);

    const hotspotsHtml = project.regions.map((r, i) => {
      const size  = r.size  || 20;
      const color = r.color || "#ff0000";
      if (r.icon) {
        return '<img src="' + r.icon + '" class="hotspot" onclick="show(' + i + ')" style="left:' + r.x + '%;top:' + r.y + '%;width:' + size + 'px;height:' + size + 'px;transform:translate(-50%,-50%);object-fit:contain;position:absolute;cursor:pointer;min-width:44px;min-height:44px;" alt="' + (r.title || 'Hotspot') + '" role="button" tabindex="0">';
      }
      return '<div class="hotspot circle" onclick="show(' + i + ')" style="left:' + r.x + '%;top:' + r.y + '%;width:' + size + 'px;height:' + size + 'px;background:' + color + ';" role="button" tabindex="0" aria-label="' + (r.title || 'Hotspot') + '" onkeypress="if(event.key===\'Enter\')show(' + i + ')"></div>';
    }).join("");

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
.image-map{position:relative;width:100%;}
.image-map>img{width:100%;height:auto;display:block;}
.hotspot{position:absolute;transform:translate(-50%,-50%);cursor:pointer;transition:filter 0.15s;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;}
.hotspot:hover{filter:brightness(1.15);z-index:2;}
.hotspot.circle{border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.2);}
.info-section{padding:20px;background:#fff;border-top:1px solid #e0e0e0;min-height:80px;}
.info-section img{max-width:100%;width:auto;height:auto;max-width:400px;display:block;margin:0 auto 12px;border-radius:4px;}
.info-section h3{margin:0 0 8px;}
.info-section p{margin:0;color:#555;}
@media(min-width:768px){
  main{flex-direction:row;align-items:flex-start;}
  .image-map-section{flex:2;border-right:1px solid #e0e0e0;}
  .info-section{flex:1;border-top:none;position:sticky;top:0;}
}
</style>
</head>
<body>
<header><h1>${title}</h1></header>
<main>
  <section class="image-map-section">
    <div class="image-map">
      <img src="${project.mainImage}" alt="${title}">
      ${hotspotsHtml}
    </div>
  </section>
  <section class="info-section" id="info">
    <p style="color:#999;font-style:italic;">Click a hotspot to learn more</p>
  </section>
</main>
<script>
const regions=${configJson};
function show(i){
  const r=regions[i],info=document.getElementById("info");
  let img=r.image?'<img src="'+r.image+'" alt="'+(r.title||'')+'">':'';
  info.innerHTML=img+'<h3>'+(r.title||'')+'</h3>'+'<p>'+(r.desc||'')+'</p>';
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
  updateUndoRedoButtons();

  // Expose to window for debugging
  window.undo = undo;
  window.redo = redo;
  window.project = project;
});
