async function data_api(path, options = {}) {
    const authSession = JSON.parse(localStorage.getItem("examAuthSession") || "null");
    const headers = {
        "Content-Type": "application/json",
        ...(authSession?.id_token ? { Authorization: `Bearer ${authSession.id_token}` } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(
        APP_CONFIG.DATA_API_BASE_URL + path,
        {
            ...options,
            headers
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || data.message || "Request failed");
    }

    return data;
}

async function profile_api(path, options = {}) {
    const authSession = JSON.parse(localStorage.getItem("examAuthSession") || "null");
    const headers = {
        "Content-Type": "application/json",
        ...(authSession?.id_token ? { Authorization: `Bearer ${authSession.id_token}` } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(
        APP_CONFIG.PROFILE_API_BASE_URL + path,
        {
            ...options,
            headers
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

async function talist_api(path, options = {}) {
    const authSession = JSON.parse(localStorage.getItem("examAuthSession") || "null");
    const headers = {
        "Content-Type": "application/json",
        ...(authSession?.id_token ? { Authorization: `Bearer ${authSession.id_token}` } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(
        APP_CONFIG.TALIST_API_BASE_URL + path,
        {
            ...options,
            headers
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

async function stucrs_api(path, options = {}) {
    const authSession = JSON.parse(localStorage.getItem("examAuthSession") || "null");
    const headers = {
        "Content-Type": "application/json",
        ...(authSession?.id_token ? { Authorization: `Bearer ${authSession.id_token}` } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(
        APP_CONFIG.STUCRS_API_BASE_URL + path,
        {
            ...options,
            headers
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
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
    return COURSE_NAMES[courseId] || courseId || "Unknown course";
}

function formatDate(value) {
    if (!value) {
        return "Not available";
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
