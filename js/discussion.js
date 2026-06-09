let selectedFileId = null;

// 1. 載入左側的考古題列表
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

// 2. 渲染左側列表
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

// 3. 載入特定考古題的「題目內容」與「討論留言」
async function loadDiscussionDetail(fileId) {
    const user = getCurrentUser();
    if (!user) return;

    selectedFileId = fileId;
    const detail = document.getElementById("discussionDetail");
    
    detail.innerHTML = `<div class="empty-state"><p>正在載入題目與討論串...</p></div>`;

    try {
        // 同時呼叫兩個 API：一個拿題目內容，一個拿留言
        const [fileData, commentsData] = await Promise.all([
            api(`/file-detail?user_id=${encodeURIComponent(user.user_id)}&file_id=${encodeURIComponent(fileId)}`),
            api(`/comments?file_id=${encodeURIComponent(fileId)}`) 
        ]);

        renderDiscussionDetail(fileData.file, fileData.text, commentsData.comments || []);
        
        // 重新渲染左側列表以更新 Active 狀態
        await loadDiscussionFiles(); 
    } catch (error) {
        // 如果找不到留言或發生錯誤，會顯示在這裡
        detail.innerHTML = `<div class="empty-state"><p style="color: red;">載入失敗：${escapeHtml(error.message)}</p></div>`;
        setStatus("filesStatus", error.message, "err");
    }
}

// 4. 將題目內容與討論區渲染到畫面上
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
        
        // 防呆機制：發送時按鈕反灰，避免重複連點
        submitBtn.disabled = true;
        submitBtn.textContent = "發佈中...";
        
        await submitNewComment(file.file_id, textInput);
        
        submitBtn.disabled = false;
        submitBtn.textContent = "發佈留言";
    });
}

// 5. 處理發布留言的動作
async function submitNewComment(fileId, commentText) {
    const user = getCurrentUser();
    if (!user) return;

    try {
        // 呼叫 POST API 寫入 DynamoDB
        // 記得：我們 Python 後端成功時會回傳 { "message": "...", "comment": item }
        const responseData = await api('/comments', {
            method: 'POST',
            body: JSON.stringify({
                file_id: fileId,
                user_id: user.user_id,
                user_name: user.name || user.user_id || "使用者",
                comment_text: commentText
            })
        });
        
        // 1. 清空輸入框
        document.getElementById("newCommentText").value = "";

        // 2. 直接將後端建立好的新留言物件，塞進網頁畫面上
        if (responseData && responseData.comment) {
            appendCommentToUI(responseData.comment);
        }

    } catch (error) {
        alert("留言失敗：" + error.message);
    }
}

// 6. 全新動態插入留言功能 (不重整網頁)
function appendCommentToUI(c) {
    const commentsList = document.querySelector(".comments-list");
    if (!commentsList) return;

    // A. 防呆：如果是該題的第一則留言，先移除「目前還沒有人留言」的提示字
    const emptyState = commentsList.querySelector(".empty-state");
    if (emptyState) {
        commentsList.innerHTML = "";
    }

    // B. 產生新留言的 HTML 結構 (與原本渲染格式完全相同)
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

    // C. 使用 insertAdjacentHTML 將新留言精準「黏」在列表的最末端
    commentsList.insertAdjacentHTML('beforeend', commentHtml);

    // D. 自動更新上方標題的計數數字，例如：討論區 (2) -> 討論區 (3)
    const countHeader = document.querySelector(".discussion-area h3");
    if (countHeader) {
        const match = countHeader.textContent.match(/\d+/);
        if (match) {
            const currentCount = parseInt(match[0], 10);
            countHeader.textContent = `討論區 (${currentCount + 1})`;
        }
    }
}

// 初始化
document.addEventListener("DOMContentLoaded", () => {
    const user = requireLogin();
    if (!user) return;
    loadDiscussionFiles();
});