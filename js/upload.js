let selectedFile = null;
let currentFileId = null;
let ocrPollTimer = null;

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

function setReviewState(label) {
    document.getElementById("reviewBadge").textContent = label;
}

async function uploadFile() {
    const user = getCurrentUser();
    const course = document.getElementById("courseSelect").value;
    const fileCategory = document.getElementById("fileCategory").value;

    if (!user) {
        setStatus("uploadStatus", "請先登入。", "err");
        return;
    }

    if (!course) {
        setStatus("uploadStatus", "請選擇課程。", "err");
        return;
    }

    if (!selectedFile) {
        setStatus("uploadStatus", "請選擇檔案。", "err");
        return;
    }

    try {
        setStatus("uploadStatus", "正在準備上傳...");

        const uploadData = await data_api(
            "/upload-url",
            {
                method: "POST",
                body: JSON.stringify({
                    user_id: user.user_id,
                    course,
                    file_category: fileCategory,
                    filename: selectedFile.name
                })
            }
        );

        const uploadResponse = await fetch(
            uploadData.upload_url,
            {
                method: "PUT",
                headers: {
                    "Content-Type": uploadData.content_type
                },
                body: selectedFile
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

    document.getElementById("fileInput").addEventListener("change", handleFileChange);
    document.getElementById("uploadBtn").addEventListener("click", uploadFile);
    document.getElementById("refreshOcrBtn").addEventListener("click", pollOcrResult);
    document.getElementById("confirmBtn").addEventListener("click", confirmOcrText);

    renderCourseOptions();
});
