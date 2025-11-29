document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const viewLanding = document.getElementById('view-landing');
    const viewCapture = document.getElementById('view-capture');
    const viewPreview = document.getElementById('view-preview');
    
    const video = document.getElementById('video-feed');
    const canvas = document.getElementById('capture-canvas');
    const thumbnailsList = document.getElementById('thumbnails-list');
    const previewList = document.getElementById('preview-list'); // Changed from iframe
    
    const btnStart = document.getElementById('btn-start');
    const btnCapture = document.getElementById('btn-capture');
    const btnDone = document.getElementById('btn-done');
    const btnRetake = document.getElementById('btn-retake');
    const btnDownload = document.getElementById('btn-download');
    const pageCountLabel = document.getElementById('page-count');

    // --- State ---
    let capturedImages = []; 
    let stream = null;

    // --- Navigation ---
    const switchView = (hideView, showView) => {
        hideView.classList.remove('active');
        hideView.classList.add('hidden');
        setTimeout(() => {
            showView.classList.remove('hidden');
            void showView.offsetWidth; 
            showView.classList.add('active');
        }, 50);
    };

    // --- Camera ---
    const startCamera = async () => {
        try {
            // Ask for high resolution for better text clarity
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }, 
                audio: false 
            });
            video.srcObject = stream;
        } catch (err) {
            console.error(err);
            alert("Camera access denied.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
    };

    // --- Event Listeners ---
    btnStart.addEventListener('click', () => {
        switchView(viewLanding, viewCapture);
        startCamera();
    });

    // --- SMART CAPTURE LOGIC ---
    btnCapture.addEventListener('click', () => {
        // 1. Setup Canvas Size to match Video Resolution
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        // 2. Draw the full video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 3. SMART CROP: Calculate where the "Box" is relative to the video
        // The box is 85% width and 70% height centered (from CSS)
        const cropWidth = canvas.width * 0.85;
        const cropHeight = canvas.height * 0.70;
        const cropX = (canvas.width - cropWidth) / 2;
        const cropY = (canvas.height - cropHeight) / 2;

        // 4. Create a temporary canvas to hold the cropped image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cropWidth;
        tempCanvas.height = cropHeight;
        const tempCtx = tempCanvas.getContext('2d');

        // 5. Apply "Document Filter" (High Contrast B&W)
        // This simulates a scanned look
        tempCtx.filter = 'grayscale(1) contrast(1.4) brightness(1.1)';
        
        // 6. Draw only the cropped area
        tempCtx.drawImage(
            canvas, 
            cropX, cropY, cropWidth, cropHeight, // Source (Crop)
            0, 0, cropWidth, cropHeight          // Destination (Full temp canvas)
        );

        // 7. Save result
        const imageData = tempCanvas.toDataURL('image/jpeg', 0.8);
        capturedImages.push(imageData);

        // Update UI
        const img = document.createElement('img');
        img.src = imageData;
        img.classList.add('thumb');
        thumbnailsList.appendChild(img);
        thumbnailsList.scrollLeft = thumbnailsList.scrollWidth;
        
        pageCountLabel.textContent = `${capturedImages.length} Pages`;
        btnDone.disabled = false;
        
        // Flash effect
        video.style.opacity = '0.5';
        setTimeout(() => video.style.opacity = '1', 100);
    });

    btnDone.addEventListener('click', () => {
        stopCamera();
        renderPreviewList(); // New Function
        switchView(viewCapture, viewPreview);
    });

    btnRetake.addEventListener('click', () => {
        capturedImages = [];
        thumbnailsList.innerHTML = '';
        pageCountLabel.textContent = '0 Pages';
        btnDone.disabled = true;
        switchView(viewPreview, viewLanding);
    });

    btnDownload.addEventListener('click', () => {
        const doc = generatePDFObject();
        doc.save('scanned-document.pdf');
    });

    // --- PDF & PREVIEW FUNCTIONS ---

    // Generate jsPDF Object
    const generatePDFObject = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        capturedImages.forEach((imgData, index) => {
            if (index > 0) doc.addPage();
            
            // Fit image to page while keeping aspect ratio
            const imgProps = doc.getImageProperties(imgData);
            const ratio = imgProps.width / imgProps.height;
            const targetWidth = pageWidth - 20; // 10mm margin
            const targetHeight = targetWidth / ratio;

            // Centering logic
            const y = (pageHeight - targetHeight) / 2;

            doc.addImage(imgData, 'JPEG', 10, 10, targetWidth, targetHeight);
        });

        return doc;
    };

    // NEW: Render Images as Preview (Fixes Mobile Iframe Issue)
    const renderPreviewList = () => {
        previewList.innerHTML = ''; // Clear old
        capturedImages.forEach((imgData, index) => {
            const img = document.createElement('img');
            img.src = imgData;
            img.classList.add('preview-page');
            previewList.appendChild(img);
        });
    };
});
