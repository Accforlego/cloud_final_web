let selectedFileId = null;

async function loadDiscussionFiles() {
    const user = getCurrentUser();
    if (!user) return;

    const fileList = document.getElementById("fileList");
    try {
        setStatus("filesStatus", "正在載入可討論的考古題...");
        const data = await api(`/files?user_id=${encodeURIComponent(user.user_id)}`);
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
        fileList.innerHTML = `<div class="empty-state"><p>目前沒有可討論的考古題</p></div>`;
        return;
    }

    fileList.innerHTML = files.map((file) => {
        const activeClass = file.file_id === selectedFileId ? " is-active" : "";
        return `
            <button type="button" class="file-card${activeClass}" data-file-id="${file.file_id}">
                <strong>${escapeHtml(file.filename || "未命名檔案")}</strong>
                <span>${escapeHtml(formatCourseName(file.course))}</span>
            </button>
        `;
    }).join("");

    document.querySelectorAll(".file-card").forEach((button) => {
        button.addEventListener("click", () => {
            loadDiscussionDetail(button.dataset.fileId);
        });
    });
}

async function loadDiscussionDetail(fileId) {
    const user = getCurrentUser();
    if (!user) return;

    selectedFileId = fileId;
    const detail = document.getElementById("discussionDetail");
    
    detail.innerHTML = `<div class="empty-state"><p>正在載入題目與討論串...</p></div>`;

    try {
        const [fileData, commentsData] = await Promise.all([
            api(`/file-detail?user_id=${encodeURIComponent(user.user_id)}&file_id=${encodeURIComponent(fileId)}`),
            api(`/comments?file_id=${encodeURIComponent(fileId)}`) 
        ]);

        renderDiscussionDetail(fileData.file, fileData.text, commentsData.comments || []);
        
        await loadDiscussionFiles(); 
    } catch (error) {
        detail.innerHTML = `<div class="empty-state"><p style="color: red;">載入失敗：${escapeHtml(error.message)}</p></div>`;
        setStatus("filesStatus", error.message, "err");
    }
}

function renderDiscussionDetail(file, text, comments) {
    const detail = document.getElementById("discussionDetail");

    const formattedText = text ? escapeHtml(text).replace(/\n/g, '<br>') : "沒有文字內容";

    let commentsHtml = '';
    if (comments.length === 0) {
        commentsHtml = `<div class="empty-state"><p>目前還沒有人留言，來當第一個討論的人吧！</p></div>`;
    } else {
        commentsHtml = comments.map(c => `
            <div class="comment ${c.is_best_answer ? 'is-correct' : ''}">
                <div class="comment-avatar ${c.is_best_answer ? 'correct-avatar' : ''}">${escapeHtml((c.user_name || "名").charAt(0))}</div>
                <div class="comment-body">
                    <div class="comment-meta">
                        <strong>${escapeHtml(c.user_name || "未知使用者")}</strong> 
                        ${c.is_best_answer ? '<span class="badge badge-correct">📌 正確答案</span>' : ''}
                        <span>${new Date(c.timestamp).toLocaleString()}</span>
                    </div>
                    <p>${escapeHtml(c.comment_text)}</p>
                </div>
            </div>
        `).join('');
    }

    detail.innerHTML = `
        <section class="panel question-panel">
            <div class="question-header">
                <h2>${escapeHtml(file.filename || "未命名檔案")}</h2>
            </div>
            
            <div class="question-content">
                <p>${formattedText}</p>
            </div>
            
            <hr class="divider">
            
            <div class="discussion-area">
                <h3>討論區 (${comments.length})</h3>
                
                <div class="comments-list">
                    ${commentsHtml}
                </div>
                
                <form class="comment-form" id="submitCommentForm">
                    <textarea id="newCommentText" placeholder="寫下你對這份考古題的想法或解答..." rows="3" required></textarea>
                    <div class="actions-row">
                        <button type="submit" class="button primary">發佈留言</button>
                    </div>
                </form>
            </div>
        </section>
    `;

    document.getElementById("submitCommentForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const textInput = document.getElementById("newCommentText").value;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.textContent = "發佈中...";
        
        await submitNewComment(file.file_id, textInput);
        
        submitBtn.disabled = false;
        submitBtn.textContent = "發佈留言";
    });
}

async function submitNewComment(fileId, commentText) {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const responseData = await api('/comments', {
            method: 'POST',
            body: JSON.stringify({
                file_id: fileId,
                user_id: user.user_id,
                user_name: user.name || user.user_id || "使用者",
                comment_text: commentText
            })
        });
        
        document.getElementById("newCommentText").value = "";

        if (responseData && responseData.comment) {
            appendCommentToUI(responseData.comment);
        }

    } catch (error) {
        alert("留言失敗：" + error.message);
    }
}

function appendCommentToUI(c) {
    const commentsList = document.querySelector(".comments-list");
    if (!commentsList) return;

    const emptyState = commentsList.querySelector(".empty-state");
    if (emptyState) {
        commentsList.innerHTML = "";
    }

    const commentHtml = `
        <div class="comment ${c.is_best_answer ? 'is-correct' : ''}">
            <div class="comment-avatar ${c.is_best_answer ? 'correct-avatar' : ''}">
                ${escapeHtml((c.user_name || "名").charAt(0))}
            </div>
            <div class="comment-body">
                <div class="comment-meta">
                    <strong>${escapeHtml(c.user_name || "未知使用者")}</strong> 
                    ${c.is_best_answer ? '<span class="badge badge-correct">📌 正確答案</span>' : ''}
                    <span>${new Date(c.timestamp).toLocaleString()}</span>
                </div>
                <p>${escapeHtml(c.comment_text)}</p>
            </div>
        </div>
    `;

    commentsList.insertAdjacentHTML('beforeend', commentHtml);

    const countHeader = document.querySelector(".discussion-area h3");
    if (countHeader) {
        const match = countHeader.textContent.match(/\d+/);
        if (match) {
            const currentCount = parseInt(match[0], 10);
            countHeader.textContent = `討論區 (${currentCount + 1})`;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const user = requireLogin();
    if (!user) return;
    loadDiscussionFiles();
});