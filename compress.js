// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const settingsArea = document.getElementById('settings-area');
const compressBtn = document.getElementById('compress-btn');
const statusText = document.getElementById('status-text');

// File Info Elements
const fileNameEl = document.getElementById('file-name');
const fileSizeEl = document.getElementById('file-size');
const removeFileBtn = document.getElementById('remove-file-btn');
const qualityRange = document.getElementById('quality-range');

let selectedFile = null;
let compressedPdfBlob = null;

// --- EVENT LISTENERS ---

// 1. Upload Interactions
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
});

// 2. Remove File
removeFileBtn.addEventListener('click', () => {
    selectedFile = null;
    compressedPdfBlob = null;
    resetUI();
});

// 3. Compress / Download Action
compressBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    // If already compressed, download it
    if (compressedPdfBlob) {
        downloadCompressedFile();
        return;
    }

    // Otherwise, start compression
    await compressPDF();
});

// --- FUNCTIONS ---

function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
        alert("Please upload a valid PDF file.");
        return;
    }

    selectedFile = file;
    compressedPdfBlob = null; // Reset previous compression

    // Update UI
    dropZone.style.display = 'none';
    settingsArea.style.display = 'block';
    
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = (file.size / 1024 / 1024).toFixed(2) + " MB";
    
    compressBtn.disabled = false;
    compressBtn.innerHTML = 'Compress PDF <i class="fa-solid fa-bolt"></i>';
    statusText.textContent = "";
}

function resetUI() {
    dropZone.style.display = 'block';
    settingsArea.style.display = 'none';
    compressBtn.disabled = true;
    compressBtn.innerHTML = 'Compress PDF <i class="fa-solid fa-bolt"></i>';
    statusText.textContent = "";
    fileInput.value = ""; // Clear input
}

async function compressPDF() {
    statusText.textContent = "Initializing compression...";
    compressBtn.disabled = true;
    compressBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

    try {
        const { jsPDF } = window.jspdf;
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const totalPages = pdf.numPages;

        const newPdf = new jsPDF();
        const quality = parseFloat(qualityRange.value); 

        for (let i = 1; i <= totalPages; i++) {
            statusText.textContent = `Processing page ${i} of ${totalPages}...`;
            
            const page = await pdf.getPage(i);
            // Scale 1.5 offers a good balance between readability and file size reduction
            const viewport = page.getViewport({ scale: 1.5 });
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            // Compress to JPEG
            const imgData = canvas.toDataURL('image/jpeg', quality);

            if (i > 1) newPdf.addPage();
            
            const pdfWidth = newPdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            newPdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }

        compressedPdfBlob = newPdf.output('blob');

        // Update UI to Download State
        statusText.textContent = "Compression Complete!";
        compressBtn.innerHTML = 'Download PDF <i class="fa-solid fa-download"></i>';
        compressBtn.disabled = false;
        
        // Auto-click logic (Optional, but user usually expects manual click)
        // downloadCompressedFile(); 

    } catch (error) {
        console.error(error);
        statusText.textContent = "Error: Compression failed.";
        compressBtn.innerHTML = 'Compress PDF <i class="fa-solid fa-bolt"></i>';
        compressBtn.disabled = false;
        alert("An error occurred. The PDF might be password protected.");
    }
}

function downloadCompressedFile() {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(compressedPdfBlob);
    link.download = `compressed_${selectedFile.name}`;
    link.click();
    
    statusText.textContent = "Downloaded successfully!";
}