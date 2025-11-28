// ==========================================
// 1. SCAN & CREATE PDF
// ==========================================
const startCamera = document.getElementById("startCamera");
if (startCamera) {
    const captureBtn = document.getElementById("captureBtn");
    const doneBtn = document.getElementById("doneBtn");
    const downloadScanBtn = document.getElementById("downloadScanBtn");
    const cameraWrap = document.getElementById("cameraWrap");
    const video = document.getElementById("video");
    const snapCanvas = document.getElementById("snapCanvas");

    let camStream;
    let scannedImages = [];
    let finalScannedPdf = null;

    startCamera.onclick = async () => {
        scannedImages = [];
        updateCounter();
        downloadScanBtn.style.display = "none";
        doneBtn.style.display = "none";
        cameraWrap.style.display = "flex";
        camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = camStream;
    };

    captureBtn.onclick = () => {
        const ctx = snapCanvas.getContext("2d");
        snapCanvas.width = video.videoWidth;
        snapCanvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        scannedImages.push(snapCanvas.toDataURL("image/jpeg"));
        updateCounter();
        doneBtn.style.display = "block";
    };

    doneBtn.onclick = async () => {
        camStream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        if (scannedImages.length === 0) return alert("Capture at least one image!");
        
        const { jsPDF } = window.jspdf; // Access jsPDF correctly
        const pdf = new jsPDF();
        
        scannedImages.forEach((img, i) => {
            if (i !== 0) pdf.addPage();
            pdf.addImage(img, "JPEG", 10, 10, 190, 260);
        });
        finalScannedPdf = pdf.output("blob");
        downloadScanBtn.style.display = "block";
    };

    downloadScanBtn.onclick = () => {
        if (!finalScannedPdf) return;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(finalScannedPdf);
        link.download = "scanned.pdf";
        link.click();
    };
}


// ==========================================
// 2. IMAGE → PDF
// ==========================================
const imgInput = document.getElementById("imgInput");
if (imgInput) {
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
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        for (let i = 0; i < selectedImages.length; i++) {
            const img = await toBase64(selectedImages[i]);
            if (i !== 0) pdf.addPage();
            pdf.addImage(img, "JPEG", 10, 10, 190, 260);
        }
        pdf.save("images.pdf");
    };
}


// ==========================================
// 3. MERGE PDF
// ==========================================
const pdfInput = document.getElementById("pdfInput");
if (pdfInput) {
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
}


// ==========================================
// 4. UTILITIES
// ==========================================
function updateCounter() {
    const counter = document.getElementById("filesProcessed");
    if(counter) {
        // Simple logic for now, you can expand this if variables are global
        counter.innerText = "Ready"; 
    }
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
// 5. DROPDOWN LOGIC (This runs on every page)
// ==========================================
const dropdownContainer = document.getElementById('dropdown-container');
const toolsTrigger = document.getElementById('tools-trigger');

if (dropdownContainer && toolsTrigger) {
    toolsTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropdownContainer.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!dropdownContainer.contains(e.target)) {
            dropdownContainer.classList.remove('active');
        }
    });
}


// ==========================================
// 6. PWA INSTALL LOGIC (Fixed)
// ==========================================
let deferredPrompt = null;
const installAppBtn = document.getElementById("installAppBtn");

if (installAppBtn) {
    window.addEventListener("beforeinstallprompt", (e) => {
        // 1. Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // 2. Stash the event so it can be triggered later.
        deferredPrompt = e;
        // 3. Update UI notify the user they can add to home screen
        installAppBtn.style.display = "flex"; // Make button visible
        console.log("Install prompt captured");
    });

    installAppBtn.addEventListener("click", async () => {
        if (!deferredPrompt) return;
        // Show the prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
            console.log("User accepted the A2HS prompt");
            installAppBtn.style.display = "none";
        } else {
            console.log("User dismissed the A2HS prompt");
        }
        deferredPrompt = null;
    });

    window.addEventListener("appinstalled", () => {
        console.log("PWA was installed");
        installAppBtn.style.display = "none";
    });
}

// ==========================================
// 7. SERVICE WORKER REGISTRATION
// ==========================================
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("./sw.js")
            .then(() => console.log("Service Worker Registered ✔"))
            .catch(err => console.error("Service Worker Error ❌", err));
    });
}


// ==========================================
// 8. AUTHOR MODAL
// ==========================================
const authorTrigger = document.getElementById("author-trigger");
if (authorTrigger) {
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
}
