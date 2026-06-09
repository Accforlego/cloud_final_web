async function api(path, options = {}) {
    const response = await fetch(
        APP_CONFIG.API_BASE_URL + path,
        {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "操作失敗");
    }

    return data;
}

function setStatus(elementId, message, type = "") {
    const element = document.getElementById(elementId);

    if (!element) {
        return;
    }

    element.textContent = message;
    element.className = "status" + (type ? ` ${type}` : "");
}

function formatCourseName(courseId) {
    return COURSE_NAMES[courseId] || courseId || "未分類課程";
}

function formatDate(value) {
    if (!value) {
        return "尚無時間";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("zh-TW");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
