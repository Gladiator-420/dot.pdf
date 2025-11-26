// ---------- SCAN & CREATE PDF (UPDATED) ----------

const startCamera = document.getElementById("startCamera");
const captureBtn = document.getElementById("captureBtn");
const doneBtn = document.getElementById("doneBtn");         // NEW
const downloadScanBtn = document.getElementById("downloadScanBtn"); // NEW
const cameraWrap = document.getElementById("cameraWrap");
const video = document.getElementById("video");
const snapCanvas = document.getElementById("snapCanvas");

let camStream;
let scannedImages = [];
let finalScannedPdf = null;

// Start camera
startCamera.onclick = async () => {
  scannedImages = []; 
  updateCounter();

  downloadScanBtn.style.display = "none"; 
  doneBtn.style.display = "none";

  cameraWrap.style.display = "flex";

  camStream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = camStream;
};

// Capture image (add to list but do NOT download yet)
captureBtn.onclick = () => {
  const ctx = snapCanvas.getContext("2d");
  snapCanvas.width = video.videoWidth;
  snapCanvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  scannedImages.push(snapCanvas.toDataURL("image/jpeg"));
  updateCounter();

  doneBtn.style.display = "block"; // show Done button after capture
};

// When done → stop camera + generate final PDF but not download
doneBtn.onclick = async () => {
  camStream.getTracks().forEach(track => track.stop());
  video.srcObject = null;

  if (scannedImages.length === 0) return alert("Capture at least one image!");

  const pdf = new jspdf.jsPDF();
  scannedImages.forEach((img, i) => {
    if (i !== 0) pdf.addPage();
    pdf.addImage(img, "JPEG", 10, 10, 190, 260);
  });

  finalScannedPdf = pdf.output("blob");
  downloadScanBtn.style.display = "block"; // show download button
};

// Download only when button clicked
downloadScanBtn.onclick = () => {
  if (!finalScannedPdf) return;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(finalScannedPdf);
  link.download = "scanned.pdf";
  link.click();
};


// ---------- IMAGE → PDF ----------
const imgInput = document.getElementById("imgInput");
const imgDrop = document.getElementById("imgDrop");
const imgToPdf = document.getElementById("imgToPdf");

let selectedImages = [];

imgInput.onchange = (e) => {
  selectedImages = [...e.target.files];
  updateCounter();
};

imgDrop.ondragover = (e) => e.preventDefault();
imgDrop.ondrop = (e) => {
  e.preventDefault();
  selectedImages.push(...e.dataTransfer.files);
  updateCounter();
};

imgToPdf.onclick = async () => {
  if (selectedImages.length === 0) return alert("Select images first!");

  const pdf = new jspdf.jsPDF();
  for (let i = 0; i < selectedImages.length; i++) {
    const img = await toBase64(selectedImages[i]);
    if (i !== 0) pdf.addPage();
    pdf.addImage(img, "JPEG", 10, 10, 190, 260);
  }
  pdf.save("images.pdf");
};


// ---------- MERGE PDF ----------
const pdfInput = document.getElementById("pdfInput");
const mergeBtn = document.getElementById("mergeBtn");

let pdfFiles = [];

pdfInput.onchange = (e) => {
  pdfFiles = [...e.target.files];
  updateCounter();
};

mergeBtn.onclick = async () => {
  if (pdfFiles.length === 0) return alert("Select PDFs first!");

  const merged = await PDFLib.PDFDocument.create();
  for (const file of pdfFiles) {
    const bytes = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(bytes);
    const pages = await merged.copyPages(pdf, pdf.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }
  const finalPdf = await merged.save();
  download("merged.pdf", finalPdf);
};


// ---------- UTILITIES ----------
function updateCounter() {
  document.getElementById("filesProcessed").innerText =
    scannedImages.length + selectedImages.length + pdfFiles.length;
}

function download(name, blob) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([blob]));
  link.download = name;
  link.click();
}

function toBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}
    
    // ==========================================
    // 2. DROPDOWN LOGIC (Mobile Support)
    // ==========================================
    const dropdownContainer = document.getElementById('dropdown-container');
    const toolsTrigger = document.getElementById('tools-trigger');

    if (dropdownContainer && toolsTrigger) {
        toolsTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdownContainer.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target)) {
                dropdownContainer.classList.remove('active');
            }
        });
    }


 // ==========================================
// 3. PWA INSTALL LOGIC (Dropdown Version)
// ==========================================

let deferredPrompt = null;
const installAppBtn = document.getElementById("installAppBtn");

// Listen for browser install availability
window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();              // stop auto-popup
    deferredPrompt = e;             // save event
    installAppBtn.style.display = "flex"; // show Install option
});

// User clicks "Install App"
installAppBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();                      // open PWA prompt
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
        installAppBtn.style.display = "none";     // remove button
    }

    deferredPrompt = null;
});

// Hide install option if PWA is already installed
window.addEventListener("appinstalled", () => {
    installAppBtn.style.display = "none";
});

    // ==========================================
    // 4. INSTANT NAVIGATION (Backup)
    // ==========================================
    // If you still have class="load-trigger" in your HTML, this ensures they work instantly
    const navLinks = document.querySelectorAll('.load-trigger');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const target = link.getAttribute('data-target') || link.getAttribute('href');
            if(target && target !== "#") {
                window.location.href = target;
            }
        });
    });
// ===============================
// SERVICE WORKER REGISTRATION
// ===============================

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then(() => console.log("Service Worker Registered ✔"))
      .catch(err => console.error("Service Worker Error ❌", err));
  });
}
const authorTrigger = document.getElementById("author-trigger");
const authorModal = document.getElementById("authorModal");
const closeAuthorModal = document.getElementById("closeAuthorModal");

authorTrigger.addEventListener("click", () => {
    authorModal.style.display = "flex";
});

closeAuthorModal.addEventListener("click", () => {
    authorModal.style.display = "none";
});

authorModal.addEventListener("click", (e) => {
    if (e.target === authorModal) {
        authorModal.style.display = "none";
    }
});

