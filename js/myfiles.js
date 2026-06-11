let selectedFileId = null;

async function loadMyFiles() {
    const user = await getCurrentUser();
    if (!user) {
        return;
    }

    const fileList = document.getElementById("fileList");

    try {
        setStatus("filesStatus", "正在載入考古題...");
        fileList.innerHTML = "<p class='muted'>載入中...</p>";

        const data = await data_api(
            `/files?user_id=${encodeURIComponent(user.user_id)}`
        );

        renderFiles(data.files || []);
        setStatus("filesStatus", "");
    } catch (error) {
        fileList.innerHTML = "<p class='muted'>無法載入資料。</p>";
        setStatus("filesStatus", error.message, "err");
    }
}

function renderFiles(files) {
    const fileList = document.getElementById("fileList");

    if (!files.length) {
        fileList.innerHTML = `
            <div class="empty-state">
                <h3>目前沒有考古題</h3>
                <p>你可以到「上傳考古題」新增資料。</p>
            </div>
        `;
        return;
    }

    fileList.innerHTML = files
        .map((file) => {
            const activeClass = file.file_id === selectedFileId ? " is-active" : "";

            return `
                <button type="button" class="file-card${activeClass}" data-file-id="${file.file_id}">
                    <strong>${escapeHtml(file.filename || "未命名檔案")}</strong>
                    <span>${escapeHtml(formatCourseName(file.course))}</span>
                    <span>確認時間：${escapeHtml(formatDate(file.confirmed_at))}</span>
                </button>
            `;
        })
        .join("");

    document.querySelectorAll(".file-card").forEach((button) => {
        button.addEventListener("click", () => {
            loadFileDetail(button.dataset.fileId);
        });
    });
}

async function loadFileDetail(fileId) {
    const user = await getCurrentUser();

    if (!user) {
        return;
    }

    selectedFileId = fileId;

    const detail = document.getElementById("fileDetail");
    detail.innerHTML = `
        <div class="empty-state">
            <p>正在載入內容...</p>
        </div>
    `;

    try {
        const data = await data_api(
            `/file-detail?user_id=${encodeURIComponent(user.user_id)}&file_id=${encodeURIComponent(fileId)}`
        );

        renderFileDetail(data.file, data.text || "");
        await loadMyFiles();
    } catch (error) {
        setStatus("filesStatus", error.message, "err");
    }
}

function renderFileDetail(file, text) {
    const detail = document.getElementById("fileDetail");

    detail.innerHTML = `
        <h3>${escapeHtml(file.filename || "未命名檔案")}</h3>

        <div class="detail-meta">
            <span>課程：${escapeHtml(formatCourseName(file.course))}</span>
            <span>上傳者：${escapeHtml(file.uploaded_by || "未知")}</span>
            <span>確認時間：${escapeHtml(formatDate(file.confirmed_at))}</span>
        </div>

        <div class="detail-text">${escapeHtml(text || "沒有文字內容")}</div>
    `;
}

document.addEventListener("DOMContentLoaded", async () => {
    const user = await requireLogin();

    if (!user) {
        return;
    }
    
    if (user.role === 'teacher') {
        const navpage = document.getElementsByClassName("page-nav")[0];
        navpage.innerHTML += `<a class="nav-link" href="teacher.html">教師管理</a>`;
    }

    document.getElementById("reloadFilesBtn").addEventListener("click", loadMyFiles);
    loadMyFiles();
});
