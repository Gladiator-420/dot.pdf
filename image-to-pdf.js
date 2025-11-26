document.addEventListener('DOMContentLoaded', () => {
    
    // --- Elements ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const thumbnailsContainer = document.getElementById('thumbnails-container');
    const convertBtn = document.getElementById('convert-btn');
    
    const selectionSection = document.getElementById('selection-section');
    const previewSection = document.getElementById('preview-section');
    const pdfFrame = document.getElementById('pdf-preview-frame');
    const downloadBtn = document.getElementById('download-btn');
    const startOverBtn = document.getElementById('start-over-btn');

    // --- State ---
    let selectedFiles = [];
    let finalPdfBlob = null;

    // --- Functions ---

    // 1. Handle incoming files (from drop or input)
    const handleFiles = (files) => {
        const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        
        Array.from(files).forEach(file => {
            if (validImageTypes.includes(file.type)) {
                selectedFiles.push(file);
                addThumbnail(file);
            } else {
                // Optional: Alert for invalid file type
                console.warn(`Skipped non-image file: ${file.name}`);
            }
        });
        updateUI();
    };

    // 2. Add Thumbnail to Grid
    const addThumbnail = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'thumb-wrapper';
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'thumb-img';
            
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
            removeBtn.className = 'thumb-remove';
            
            // Remove functionality
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevents triggering upload click
                const index = selectedFiles.indexOf(file);
                if (index > -1) {
                    selectedFiles.splice(index, 1);
                    wrapper.remove();
                    updateUI();
                }
            });

            wrapper.appendChild(img);
            wrapper.appendChild(removeBtn);
            thumbnailsContainer.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
    };

    // 3. Update UI State (Enable/Disable Button)
    const updateUI = () => {
        convertBtn.disabled = selectedFiles.length === 0;
        convertBtn.innerHTML = selectedFiles.length === 0 
            ? '<i class="fa-solid fa-gears"></i> Convert to PDF'
            : `<i class="fa-solid fa-gears"></i> Convert ${selectedFiles.length} Image(s)`;
    };

    // --- Helper: File to Base64 Image Data ---
    const fileToImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => resolve({
                    dataUrl: e.target.result,
                    width: img.width,
                    height: img.height,
                    type: file.type === 'image/png' ? 'PNG' : 'JPEG'
                });
            };
            reader.readAsDataURL(file);
        });
    };


    // --- Event Listeners ---

    // 1. Drag & Drop Interactions
    ;['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        }, false);
    });

    ;['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    // 2. Click to Upload
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));


    // 3. Convert Action
    convertBtn.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;

        // Change button state to loading
        const originalBtnText = convertBtn.innerHTML;
        convertBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        convertBtn.disabled = true;

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 10; // Margin around image

            for (let i = 0; i < selectedFiles.length; i++) {
                if (i > 0) doc.addPage();

                const imgData = await fileToImage(selectedFiles[i]);

                // Calculate dimensions to fit page maintaining aspect ratio
                const availableWidth = pageWidth - (margin * 2);
                const availableHeight = pageHeight - (margin * 2);
                const imgRatio = imgData.width / imgData.height;

                let finalWidth = availableWidth;
                let finalHeight = availableWidth / imgRatio;

                // If height is still too big, scale by height instead
                if (finalHeight > availableHeight) {
                    finalHeight = availableHeight;
                    finalWidth = availableHeight * imgRatio;
                }

                // Center the image
                const xOffset = (pageWidth - finalWidth) / 2;
                const yOffset = (pageHeight - finalHeight) / 2;

                doc.addImage(imgData.dataUrl, imgData.type, xOffset, yOffset, finalWidth, finalHeight);
            }

            // Generate Blob for preview
            finalPdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(finalPdfBlob);
            pdfFrame.src = pdfUrl;

            // Switch Views
            selectionSection.classList.add('hidden');
            previewSection.classList.add('active');

        } catch (error) {
            console.error("Conversion Error:", error);
            alert("An error occurred while creating the PDF.");
            convertBtn.innerHTML = originalBtnText;
            convertBtn.disabled = false;
        }
    });

    // 4. Download Action
    downloadBtn.addEventListener('click', () => {
        if (!finalPdfBlob) return;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(finalPdfBlob);
        link.download = `images_merged_${new Date().getTime()}.pdf`;
        link.click();
    });

    // 5. Start Over Action
    startOverBtn.addEventListener('click', () => {
        selectedFiles = [];
        thumbnailsContainer.innerHTML = '';
        finalPdfBlob = null;
        pdfFrame.src = '';
        updateUI();
        
        previewSection.classList.remove('active');
        selectionSection.classList.remove('hidden');
        
        convertBtn.innerHTML = '<i class="fa-solid fa-gears"></i> Convert to PDF';
        convertBtn.disabled = true;
    });
});