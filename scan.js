// --- Global OpenCV Status Hook ---
// This function is called by the HTML script tag when OpenCV loads
function onOpenCvReady() {
    console.log("OpenCV.js is ready.");
    document.body.dispatchEvent(new Event('opencv-ready'));
}

document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const viewLanding = document.getElementById('view-landing');
    const viewCapture = document.getElementById('view-capture');
    const viewPreview = document.getElementById('view-preview');
    
    const video = document.getElementById('video-feed');
    const canvas = document.getElementById('capture-canvas'); // Hidden processing canvas
    const overlayCanvas = document.getElementById('overlay-canvas'); // Visible drawing canvas
    const thumbnailsList = document.getElementById('thumbnails-list');
    const previewList = document.getElementById('preview-list');
    
    const btnStart = document.getElementById('btn-start');
    const btnCapture = document.getElementById('btn-capture');
    const btnDone = document.getElementById('btn-done');
    const btnRetake = document.getElementById('btn-retake');
    const btnDownload = document.getElementById('btn-download');
    const pageCountLabel = document.getElementById('page-count');
    const opencvStatus = document.getElementById('opencv-status');

    // --- State ---
    let capturedImages = []; 
    let stream = null;
    let isCvReady = false;
    let isStreaming = false;
    let detectionLoopId = null;
    let detectedContour = null; // Stores the points of the currently detected document

    // --- OpenCV Initialization Handler ---
    document.body.addEventListener('opencv-ready', () => {
        isCvReady = true;
        opencvStatus.innerHTML = '<i class="fa-solid fa-check-circle"></i> Core Ready';
        opencvStatus.style.color = '#4ade80'; // Green
        btnStart.disabled = false;
    });

    // Check if CV loaded before DOMContentLoaded
    if (typeof cv !== 'undefined' && cv.Mat) {
        onOpenCvReady();
    }

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

    // --- Camera & Detection Logic ---
    const startCamera = async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }, 
                audio: false 
            });
            video.srcObject = stream;
            
            // Wait for video to actually play to get dimensions
            video.onloadedmetadata = () => {
                video.play();
                isStreaming = true;
                
                // Match overlay canvas size to video display size
                overlayCanvas.width = video.videoWidth;
                overlayCanvas.height = video.videoHeight;
                
                if (isCvReady) {
                    processVideo(); // Start detection loop
                }
            };
        } catch (err) {
            console.error(err);
            alert("Camera access denied.");
        }
    };

    const stopCamera = () => {
        isStreaming = false;
        if (detectionLoopId) {
            cancelAnimationFrame(detectionLoopId);
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        // Clear overlay
        const ctx = overlayCanvas.getContext('2d');
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    };

    // --- OPENCV DETECTION LOOP ---
    const processVideo = () => {
        if (!isStreaming) return;

        try {
            // 1. Setup Mats
            let src = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
            let cap = new cv.VideoCapture(video);
            cap.read(src); // Read frame from video

            // 2. Pre-processing (Downscale for speed)
            let dst = new cv.Mat();
            let ksize = new cv.Size(5, 5);
            
            // Convert to Grayscale
            cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);
            
            // Gaussian Blur (reduce noise)
            cv.GaussianBlur(dst, dst, ksize, 0, 0, cv.BORDER_DEFAULT);
            
            // Canny Edge Detection
            cv.Canny(dst, dst, 75, 200);

            // 3. Find Contours
            let contours = new cv.MatVector();
            let hierarchy = new cv.Mat();
            cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            // 4. Find largest Quadrilateral (The Document)
            let maxArea = 0;
            let maxContour = null;
            let approx = new cv.Mat();

            for (let i = 0; i < contours.size(); ++i) {
                let cnt = contours.get(i);
                let area = cv.contourArea(cnt);
                
                // Filter small noise
                if (area < 5000) continue;

                // Approximate polygon
                let peri = cv.arcLength(cnt, true);
                cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

                // Check if it has 4 corners and is the largest found
                if (approx.rows === 4 && area > maxArea) {
                    maxArea = area;
                    maxContour = approx.clone(); // Clone it for safe keeping
                }
            }

            // 5. Draw Result on Overlay Canvas
            const ctx = overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

            if (maxContour) {
                // Save detected points for capture button
                detectedContour = dataFromMat(maxContour);
                
                // Draw green lines
                ctx.beginPath();
                ctx.lineWidth = 4;
                ctx.strokeStyle = '#00ff00';
                
                // Move to first point
                ctx.moveTo(detectedContour[0].x, detectedContour[0].y);
                for (let i = 1; i < 4; i++) {
                    ctx.lineTo(detectedContour[i].x, detectedContour[i].y);
                }
                ctx.closePath();
                ctx.stroke();

                // Draw semi-transparent fill
                ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
                ctx.fill();

                maxContour.delete();
            } else {
                detectedContour = null;
            }

            // Cleanup
            src.delete();
            dst.delete();
            contours.delete();
            hierarchy.delete();
            approx.delete();

            // Loop
            detectionLoopId = requestAnimationFrame(processVideo);

        } catch (err) {
            console.error("OpenCV Error:", err);
            // If error, try restarting loop slightly later or stop
            isStreaming = false; 
        }
    };

    // Helper: Convert OpenCV Mat to Array of objects {x, y}
    function dataFromMat(mat) {
        let points = [];
        for (let i = 0; i < mat.rows; i++) {
            points.push({
                x: mat.data32S[i * 2],
                y: mat.data32S[i * 2 + 1]
            });
        }
        return points;
    }

    // --- CAPTURE & WARP LOGIC ---
    btnCapture.addEventListener('click', () => {
        // 1. Prepare Full Res Canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        let finalImageData;

        // 2. Decide: Perspective Crop vs Simple Crop
        if (detectedContour) {
            // --- SMART CROP (OpenCV Perspective Transform) ---
            let src = cv.imread(canvas);
            let dst = new cv.Mat();
            
            // Organize corners: TL, TR, BR, BL
            const sortedPoints = sortPoints(detectedContour);
            
            // Create source coords for OpenCV
            let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
                sortedPoints[0].x, sortedPoints[0].y, // TL
                sortedPoints[1].x, sortedPoints[1].y, // TR
                sortedPoints[2].x, sortedPoints[2].y, // BR
                sortedPoints[3].x, sortedPoints[3].y  // BL
            ]);

            // Calculate width & height of the new document
            // Width = max dist between (BR-BL) and (TR-TL)
            const widthA = Math.hypot(sortedPoints[2].x - sortedPoints[3].x, sortedPoints[2].y - sortedPoints[3].y);
            const widthB = Math.hypot(sortedPoints[1].x - sortedPoints[0].x, sortedPoints[1].y - sortedPoints[0].y);
            const maxWidth = Math.max(widthA, widthB);

            // Height = max dist between (TR-BR) and (TL-BL)
            const heightA = Math.hypot(sortedPoints[1].x - sortedPoints[2].x, sortedPoints[1].y - sortedPoints[2].y);
            const heightB = Math.hypot(sortedPoints[0].x - sortedPoints[3].x, sortedPoints[0].y - sortedPoints[3].y);
            const maxHeight = Math.max(heightA, heightB);

            // Destination coords (Flat Rectangle)
            let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
                0, 0,
                maxWidth, 0,
                maxWidth, maxHeight,
                0, maxHeight
            ]);

            // Transform
            let M = cv.getPerspectiveTransform(srcTri, dstTri);
            cv.warpPerspective(src, dst, M, new cv.Size(maxWidth, maxHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

            // Render Result to Canvas
            cv.imshow('capture-canvas', dst);
            finalImageData = canvas.toDataURL('image/jpeg', 0.8);

            // Cleanup
            src.delete(); dst.delete(); srcTri.delete(); dstTri.delete(); M.delete();

        } else {
            // --- FALLBACK (Center Crop) if detection fails ---
            // Just like the previous version
            const cropWidth = canvas.width * 0.85;
            const cropHeight = canvas.height * 0.70;
            const cropX = (canvas.width - cropWidth) / 2;
            const cropY = (canvas.height - cropHeight) / 2;

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = cropWidth;
            tempCanvas.height = cropHeight;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Filter: B&W Document Look
            tempCtx.filter = 'grayscale(1) contrast(1.4) brightness(1.1)';
            tempCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            
            finalImageData = tempCanvas.toDataURL('image/jpeg', 0.8);
        }

        // Save result
        capturedImages.push(finalImageData);
        updateUI(finalImageData);
        
        // Flash effect
        overlayCanvas.style.opacity = '0';
        setTimeout(() => overlayCanvas.style.opacity = '1', 150);
    });

    // Helper: Sort 4 points into TL, TR, BR, BL
    function sortPoints(points) {
        // Sort by Y first
        points.sort((a, b) => a.y - b.y);
        
        // Top two points (TL, TR)
        const top = points.slice(0, 2).sort((a, b) => a.x - b.x);
        const tl = top[0];
        const tr = top[1];
        
        // Bottom two points (BL, BR)
        const bottom = points.slice(2, 4).sort((a, b) => a.x - b.x);
        const bl = bottom[0];
        const br = bottom[1];
        
        return [tl, tr, br, bl];
    }

    const updateUI = (imgSrc) => {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.classList.add('thumb');
        thumbnailsList.appendChild(img);
        thumbnailsList.scrollLeft = thumbnailsList.scrollWidth;
        
        pageCountLabel.textContent = `${capturedImages.length} Pages`;
        btnDone.disabled = false;
    };

    // --- Standard Event Listeners ---
    btnStart.addEventListener('click', () => {
        if (!isCvReady) {
            alert("Scanner Core is loading, please wait...");
            return;
        }
        switchView(viewLanding, viewCapture);
        startCamera();
    });

    btnDone.addEventListener('click', () => {
        stopCamera();
        renderPreviewList();
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

    // --- PDF & Preview ---
    const generatePDFObject = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        capturedImages.forEach((imgData, index) => {
            if (index > 0) doc.addPage();
            const imgProps = doc.getImageProperties(imgData);
            const ratio = imgProps.width / imgProps.height;
            const targetWidth = pageWidth - 20; 
            const targetHeight = targetWidth / ratio;
            
            // If image is too tall for page, scale by height instead
            if (targetHeight > pageHeight - 20) {
                 const scaledHeight = pageHeight - 20;
                 const scaledWidth = scaledHeight * ratio;
                 const x = (pageWidth - scaledWidth) / 2;
                 doc.addImage(imgData, 'JPEG', x, 10, scaledWidth, scaledHeight);
            } else {
                 doc.addImage(imgData, 'JPEG', 10, 10, targetWidth, targetHeight);
            }
        });
        return doc;
    };

    const renderPreviewList = () => {
        previewList.innerHTML = ''; 
        capturedImages.forEach((imgData) => {
            const img = document.createElement('img');
            img.src = imgData;
            img.classList.add('preview-page');
            previewList.appendChild(img);
        });
    };
});
