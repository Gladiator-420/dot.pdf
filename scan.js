document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const viewLanding = document.getElementById('view-landing');
    const viewCapture = document.getElementById('view-capture');
    const viewPreview = document.getElementById('view-preview');
    
    const video = document.getElementById('video-feed');
    const canvas = document.getElementById('capture-canvas');
    const thumbnailsList = document.getElementById('thumbnails-list');
    const pdfFrame = document.getElementById('pdf-frame');
    
    const btnStart = document.getElementById('btn-start');
    const btnCapture = document.getElementById('btn-capture');
    const btnDone = document.getElementById('btn-done');
    const btnRetake = document.getElementById('btn-retake');
    const btnDownload = document.getElementById('btn-download');
    const pageCountLabel = document.getElementById('page-count');

    // --- State ---
    let capturedImages = []; // Stores Base64 image strings
    let stream = null;

    // --- Navigation Functions ---
    const switchView = (hideView, showView) => {
        hideView.classList.remove('active');
        hideView.classList.add('hidden');
        
        // Small delay for animation smoothness
        setTimeout(() => {
            showView.classList.remove('hidden');
            // Trigger reflow
            void showView.offsetWidth; 
            showView.classList.add('active');
        }, 50);
    };

    // --- Camera Functions ---
    const startCamera = async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment', // Prefer back camera on mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }, 
                audio: false 
            });
            video.srcObject = stream;
        } catch (err) {
            console.error("Camera access denied or error:", err);
            alert("Please allow camera access to scan documents.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
    };

    // --- Event Listeners ---

    // 1. Get Started
    btnStart.addEventListener('click', () => {
        switchView(viewLanding, viewCapture);
        startCamera();
    });

    // 2. Capture Image
    btnCapture.addEventListener('click', () => {
        // Set canvas dims to match video stream
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to Base64 JPEG
        const imageData = canvas.toDataURL('image/jpeg', 0.8); // 0.8 quality
        capturedImages.push(imageData);

        // Update UI
        const img = document.createElement('img');
        img.src = imageData;
        img.classList.add('thumb');
        thumbnailsList.appendChild(img);
        
        // Auto scroll to newest
        thumbnailsList.scrollLeft = thumbnailsList.scrollWidth;
        
        pageCountLabel.textContent = `${capturedImages.length} Pages`;
        btnDone.disabled = false;
        
        // Flash animation effect
        video.style.opacity = '0.5';
        setTimeout(() => video.style.opacity = '1', 100);
    });

    // 3. Done Scanning
    btnDone.addEventListener('click', async () => {
        stopCamera();
        await generatePDFPreview();
        switchView(viewCapture, viewPreview);
    });

    // 4. Retake / New Scan
    btnRetake.addEventListener('click', () => {
        capturedImages = [];
        thumbnailsList.innerHTML = '';
        pageCountLabel.textContent = '0 Pages';
        btnDone.disabled = true;
        switchView(viewPreview, viewLanding); // Go back to start
    });

    // 5. Download PDF
    btnDownload.addEventListener('click', () => {
        const doc = generatePDFObject();
        doc.save('scanned-document.pdf');
    });

    // --- PDF Logic ---
    const generatePDFObject = () => {
        const { jsPDF } = window.jspdf;
        // Default A4 size
        const doc = new jsPDF();
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        capturedImages.forEach((imgData, index) => {
            if (index > 0) doc.addPage();
            
            // Calculate aspect ratio to fit image on page
            const imgProps = doc.getImageProperties(imgData);
            const ratio = imgProps.width / imgProps.height;
            const targetWidth = pageWidth;
            const targetHeight = pageWidth / ratio;

            // Add image
            doc.addImage(imgData, 'JPEG', 0, 0, targetWidth, targetHeight);
        });

        return doc;
    };

    const generatePDFPreview = async () => {
        const doc = generatePDFObject();
        // Create a blob URL for the iframe
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        pdfFrame.src = url;
    };
});