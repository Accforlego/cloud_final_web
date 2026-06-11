let selectedFile = null;
let currentFileId = null;
let ocrPollTimer = null;
let handwritingCanvas = null;
let handwritingCtx = null;
let isDrawing = false;
let hasHandwriting = false;
let cameraStream = null;
let capturedPhotoFile = null;

async function getCourses() {
    try {
        const data = await data_api("/courses");
        return data.courses || DEMO_COURSES;
    } catch (error) {
        return DEMO_COURSES;
    }
}

async function renderCourseOptions() {
    const courseSelect = document.getElementById("courseSelect");

    if (!courseSelect) {
        return;
    }

    const user = getCurrentUser();

    if (!user) {
        courseSelect.innerHTML = "";
        return;
    }

    if (user.role === 'teacher') {
        const navpage = document.getElementsByClassName("page-nav");
        navpage.innerHTML += `<a class="nav-link is-active" href="teacher.html">教師管理</a>`;
    }

    const courses = await getCourses();
    const allowedCourses = new Set(user.courses || []);
    const visibleCourses = courses.filter((course) => allowedCourses.has(course.course_id));

    courseSelect.innerHTML = visibleCourses
        .map((course) => {
            return `<option value="${course.course_id}">${course.course_name}</option>`;
        })
        .join("");

    if (visibleCourses.length === 0) {
        courseSelect.innerHTML = "<option value=''>沒有可用課程</option>";
    }
}

function handleFileChange(event) {
    selectedFile = event.target.files[0] || null;

    document.getElementById("fileName").textContent = selectedFile
        ? selectedFile.name
        : "尚未選擇檔案";
}

function handleCategoryChange() {
    const fileCategory = document.getElementById("fileCategory").value;
    const fileInput = document.getElementById("fileInput");
    const fileUploadArea = document.getElementById("fileUploadArea");
    const handwritingArea = document.getElementById("handwritingArea");
    const cameraArea = document.getElementById("cameraArea");

    selectedFile = null;
    capturedPhotoFile = null;
    fileInput.value = "";
    document.getElementById("fileName").textContent = "尚未選擇檔案";
    resetCameraPreview();

    if (fileCategory === "handwriting") {
        stopCamera();
        fileUploadArea.hidden = true;
        handwritingArea.hidden = false;
        cameraArea.hidden = true;
        window.requestAnimationFrame(resizeHandwritingCanvas);
        return;
    }

    if (fileCategory === "camera") {
        fileUploadArea.hidden = true;
        handwritingArea.hidden = true;
        cameraArea.hidden = false;
        startCamera();
        return;
    }

    stopCamera();
    fileUploadArea.hidden = false;
    handwritingArea.hidden = true;
    cameraArea.hidden = true;
    fileInput.accept = fileCategory === "pdf" ? ".pdf" : ".png,.jpg,.jpeg";
}

function initHandwritingCanvas() {
    handwritingCanvas = document.getElementById("handwritingCanvas");

    if (!handwritingCanvas) {
        return;
    }

    handwritingCtx = handwritingCanvas.getContext("2d");
    resizeHandwritingCanvas();

    handwritingCanvas.addEventListener("pointerdown", startDrawing);
    handwritingCanvas.addEventListener("pointermove", drawHandwriting);
    handwritingCanvas.addEventListener("pointerup", stopDrawing);
    handwritingCanvas.addEventListener("pointercancel", stopDrawing);
    handwritingCanvas.addEventListener("pointerleave", stopDrawing);
    window.addEventListener("resize", resizeHandwritingCanvas);
}

function resizeHandwritingCanvas() {
    if (!handwritingCanvas || !handwritingCtx) {
        return;
    }

    const rect = handwritingCanvas.getBoundingClientRect();

    if (!rect.width || !rect.height) {
        return;
    }

    const previousDrawing = hasHandwriting ? handwritingCanvas.toDataURL("image/png") : "";
    const ratio = window.devicePixelRatio || 1;

    handwritingCanvas.width = Math.round(rect.width * ratio);
    handwritingCanvas.height = Math.round(rect.height * ratio);
    handwritingCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    resetCanvasStyle();

    if (!previousDrawing) {
        clearHandwritingCanvas();
        return;
    }

    const image = new Image();
    image.onload = () => {
        handwritingCtx.drawImage(image, 0, 0, rect.width, rect.height);
    };
    image.src = previousDrawing;
}

function resetCanvasStyle() {
    handwritingCtx.lineWidth = 5;
    handwritingCtx.lineCap = "round";
    handwritingCtx.lineJoin = "round";
    handwritingCtx.strokeStyle = "#111827";
}

function clearHandwritingCanvas() {
    if (!handwritingCanvas || !handwritingCtx) {
        return;
    }

    const rect = handwritingCanvas.getBoundingClientRect();

    handwritingCtx.save();
    handwritingCtx.setTransform(1, 0, 0, 1, 0, 0);
    handwritingCtx.clearRect(0, 0, handwritingCanvas.width, handwritingCanvas.height);
    handwritingCtx.restore();
    handwritingCtx.fillStyle = "#ffffff";
    handwritingCtx.fillRect(0, 0, rect.width, rect.height);
    resetCanvasStyle();
    hasHandwriting = false;
}

function getCanvasPoint(event) {
    const rect = handwritingCanvas.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function startDrawing(event) {
    event.preventDefault();
    handwritingCanvas.setPointerCapture(event.pointerId);
    isDrawing = true;

    const point = getCanvasPoint(event);
    handwritingCtx.beginPath();
    handwritingCtx.moveTo(point.x, point.y);
}

function drawHandwriting(event) {
    if (!isDrawing) {
        return;
    }

    event.preventDefault();

    const point = getCanvasPoint(event);
    handwritingCtx.lineTo(point.x, point.y);
    handwritingCtx.stroke();
    hasHandwriting = true;
}

function stopDrawing(event) {
    if (!isDrawing) {
        return;
    }

    isDrawing = false;
    handwritingCtx.closePath();

    if (handwritingCanvas.hasPointerCapture(event.pointerId)) {
        handwritingCanvas.releasePointerCapture(event.pointerId);
    }
}

function getHandwritingFile() {
    return new Promise((resolve, reject) => {
        if (!hasHandwriting) {
            reject(new Error("請先在手寫區寫下答案。"));
            return;
        }

        handwritingCanvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error("無法產生手寫圖片，請再試一次。"));
                return;
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            resolve(new File([blob], `handwriting-answer-${timestamp}.png`, { type: "image/png" }));
        }, "image/png");
    });
}

async function startCamera() {
    const cameraPreview = document.getElementById("cameraPreview");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus("uploadStatus", "此瀏覽器不支援直接開啟相機。", "err");
        return;
    }

    stopCamera();
    resetCameraPreview();

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "environment" }
            },
            audio: false
        });
        cameraPreview.srcObject = cameraStream;
        setStatus("uploadStatus", "");
    } catch (error) {
        setStatus("uploadStatus", "無法開啟相機，請確認瀏覽器權限。", "err");
    }
}

function stopCamera() {
    if (!cameraStream) {
        return;
    }

    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;

    const cameraPreview = document.getElementById("cameraPreview");

    if (cameraPreview) {
        cameraPreview.srcObject = null;
    }
}

function resetCameraPreview() {
    const cameraPreview = document.getElementById("cameraPreview");
    const cameraCanvas = document.getElementById("cameraCanvas");
    const retakePhotoBtn = document.getElementById("retakePhotoBtn");

    if (cameraPreview) {
        cameraPreview.hidden = false;
    }

    if (cameraCanvas) {
        cameraCanvas.hidden = true;
    }

    if (retakePhotoBtn) {
        retakePhotoBtn.disabled = true;
    }
}

function capturePhoto() {
    const cameraPreview = document.getElementById("cameraPreview");
    const cameraCanvas = document.getElementById("cameraCanvas");
    const retakePhotoBtn = document.getElementById("retakePhotoBtn");

    if (!cameraStream || !cameraPreview.videoWidth || !cameraPreview.videoHeight) {
        setStatus("uploadStatus", "請先開啟相機。", "err");
        return;
    }

    cameraCanvas.width = cameraPreview.videoWidth;
    cameraCanvas.height = cameraPreview.videoHeight;
    cameraCanvas.getContext("2d").drawImage(cameraPreview, 0, 0);
    cameraCanvas.hidden = false;
    cameraPreview.hidden = true;
    retakePhotoBtn.disabled = false;

    cameraCanvas.toBlob((blob) => {
        if (!blob) {
            setStatus("uploadStatus", "無法產生照片，請再試一次。", "err");
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        capturedPhotoFile = new File([blob], `camera-photo-${timestamp}.png`, { type: "image/png" });
        setStatus("uploadStatus", "已拍照，可以上傳並辨識。", "ok");
    }, "image/png");
}

function retakePhoto() {
    capturedPhotoFile = null;
    resetCameraPreview();
    setStatus("uploadStatus", "");

    if (!cameraStream) {
        startCamera();
    }
}

function getCameraFile() {
    if (!capturedPhotoFile) {
        throw new Error("請先拍照。");
    }

    return capturedPhotoFile;
}

function setReviewState(label) {
    document.getElementById("reviewBadge").textContent = label;
}

async function uploadFile() {
    const user = getCurrentUser();
    const course = document.getElementById("courseSelect").value;
    const fileCategory = document.getElementById("fileCategory").value;
    const uploadCategory = fileCategory === "camera" ? "image" : fileCategory;
    let uploadTargetFile = selectedFile;

    if (!user) {
        setStatus("uploadStatus", "請先登入。", "err");
        return;
    }

    if (!course) {
        setStatus("uploadStatus", "請選擇課程。", "err");
        return;
    }

    if (!["handwriting", "camera"].includes(fileCategory) && !selectedFile) {
        setStatus("uploadStatus", "請選擇檔案。", "err");
        return;
    }

    try {
        if (fileCategory === "handwriting") {
            uploadTargetFile = await getHandwritingFile();
        }

        if (fileCategory === "camera") {
            uploadTargetFile = getCameraFile();
        }

        setStatus("uploadStatus", "正在準備上傳...");

        const uploadData = await data_api(
            "/upload-url",
            {
                method: "POST",
                body: JSON.stringify({
                    user_id: user.user_id,
                    course,
                    file_category: uploadCategory,
                    filename: uploadTargetFile.name
                })
            }
        );

        const uploadResponse = await fetch(
            uploadData.upload_url,
            {
                method: "PUT",
                headers: {
                    "Content-Type": uploadData.content_type || uploadTargetFile.type
                },
                body: uploadTargetFile
            }
        );

        if (!uploadResponse.ok) {
            throw new Error("上傳失敗，請稍後再試。");
        }

        currentFileId = uploadData.file_id;

        document.getElementById("reviewPanel").hidden = false;
        document.getElementById("correctedText").value = "";
        setReviewState("處理中");
        setStatus("uploadStatus", "上傳完成，正在處理內容。", "ok");
        setStatus("reviewStatus", "請稍候，結果會自動更新。");
        stopCamera();

        startOcrPolling();
    } catch (error) {
        setStatus("uploadStatus", error.message, "err");
    }
}

function startOcrPolling() {
    if (ocrPollTimer) {
        clearInterval(ocrPollTimer);
    }

    pollOcrResult();

    ocrPollTimer = setInterval(
        pollOcrResult,
        3000
    );
}

async function pollOcrResult() {
    const user = getCurrentUser();

    if (!user || !currentFileId) {
        return;
    }

    try {
        const data = await data_api(
            `/ocr-result?file_id=${encodeURIComponent(currentFileId)}&user_id=${encodeURIComponent(user.user_id)}`
        );

        if (data.ready) {
            clearInterval(ocrPollTimer);
            ocrPollTimer = null;

            document.getElementById("correctedText").value = data.ocr_text || "";
            setReviewState("可確認");
            setStatus("reviewStatus", "請檢查文字內容，必要時可以直接修改。", "ok");
        } else {
            setReviewState("處理中");
            setStatus("reviewStatus", "內容仍在處理中...");
        }
    } catch (error) {
        setStatus("reviewStatus", error.message, "err");
    }
}

async function confirmOcrText() {
    const user = getCurrentUser();
    const correctedText = document.getElementById("correctedText").value;

    if (!user || !currentFileId) {
        setStatus("reviewStatus", "目前沒有可確認的檔案。", "err");
        return;
    }

    try {
        await data_api(
            "/confirm-ocr",
            {
                method: "POST",
                body: JSON.stringify({
                    file_id: currentFileId,
                    user_id: user.user_id,
                    corrected_text: correctedText
                })
            }
        );

        setReviewState("已完成");
        setStatus("reviewStatus", "文字已確認並儲存。", "ok");
    } catch (error) {
        setStatus("reviewStatus", error.message, "err");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const user = requireLogin();

    if (!user) {
        return;
    }

    if (user.role === 'teacher') {
        const navpage = document.getElementsByClassName("page-nav")[0];
        navpage.innerHTML += `<a class="nav-link" href="teacher.html">教師管理</a>`;
    }

    document.getElementById("fileInput").addEventListener("change", handleFileChange);
    document.getElementById("fileCategory").addEventListener("change", handleCategoryChange);
    document.getElementById("uploadBtn").addEventListener("click", uploadFile);
    document.getElementById("refreshOcrBtn").addEventListener("click", pollOcrResult);
    document.getElementById("confirmBtn").addEventListener("click", confirmOcrText);
    document.getElementById("clearCanvasBtn").addEventListener("click", clearHandwritingCanvas);
    document.getElementById("startCameraBtn").addEventListener("click", startCamera);
    document.getElementById("capturePhotoBtn").addEventListener("click", capturePhoto);
    document.getElementById("retakePhotoBtn").addEventListener("click", retakePhoto);
    window.addEventListener("beforeunload", stopCamera);

    initHandwritingCanvas();
    handleCategoryChange();
    renderCourseOptions();
});
