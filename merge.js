document.addEventListener('DOMContentLoaded', () => {
    
    // --- Elements ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileListEl = document.getElementById('file-list');
    const mergeBtn = document.getElementById('merge-btn');
    const statusText = document.getElementById('status-text');

    // --- State ---
    let pdfFiles = []; // Stores the actual File objects

    // --- Functions ---

    // 1. Handle New Files
    const handleFiles = (files) => {
        const newFiles = Array.from(files).filter(f => f.type === 'application/pdf');
        
        if (newFiles.length === 0) {
            alert("Please select valid PDF files.");
            return;
        }

        // Add to state
        pdfFiles = [...pdfFiles, ...newFiles];
        renderList();
    };

    // 2. Render the List UI
    const renderList = () => {
        fileListEl.innerHTML = ''; // Clear current list

        if (pdfFiles.length === 0) {
            fileListEl.innerHTML = '<div class="empty-state">No files selected</div>';
            mergeBtn.disabled = true;
            mergeBtn.innerHTML = '<i class="fa-solid fa-layer-group"></i> Merge PDFs';
            return;
        }

        pdfFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <i class="fa-solid fa-file-pdf file-icon"></i>
                <span class="file-name">${file.name}</span>
                <button class="file-remove" data-index="${index}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            fileListEl.appendChild(item);
        });

        // Add remove listeners
        document.querySelectorAll('.file-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                pdfFiles.splice(idx, 1);
                renderList();
            });
        });

        // Update Button
        mergeBtn.disabled = false;
        mergeBtn.innerHTML = `<i class="fa-solid fa-layer-group"></i> Merge ${pdfFiles.length} PDFs`;
    };

    // 3. Merge Logic (The Core)
    const mergePDFs = async () => {
        if (pdfFiles.length === 0) return;

        try {
            // UI Loading State
            mergeBtn.disabled = true;
            mergeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Merging...';
            statusText.innerText = "Processing files locally...";

            const { PDFDocument } = PDFLib;
            const mergedPdf = await PDFDocument.create();

            for (const file of pdfFiles) {
                // Read file as ArrayBuffer
                const arrayBuffer = await file.arrayBuffer();
                // Load the source PDF
                const pdf = await PDFDocument.load(arrayBuffer);
                // Copy all pages
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                // Add pages to the new document
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            // Serialize the PDFDocument to bytes (a Uint8Array)
            const pdfBytes = await mergedPdf.save();

            // Trigger Download
            download(pdfBytes, "merged_document.pdf", "application/pdf");
            
            // Reset UI
            statusText.innerText = "Success! Download started.";
            setTimeout(() => statusText.innerText = "", 3000);
            
            // Optional: Clear list after success
            // pdfFiles = [];
            // renderList();

        } catch (error) {
            console.error("Merge Error:", error);
            statusText.innerText = "Error merging files. Ensure PDFs are not password protected.";
        } finally {
            mergeBtn.disabled = false;
            mergeBtn.innerHTML = `<i class="fa-solid fa-layer-group"></i> Merge ${pdfFiles.length} PDFs`;
        }
    };


    // --- Event Listeners ---

    // Drag & Drop
    ;['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault(); 
            dropZone.classList.add('dragover');
        });
    });

    ;['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault(); 
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
    
    // Click Select
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    // Merge Button
    mergeBtn.addEventListener('click', mergePDFs);

});