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
