let selectedFileId = null;
let currentComments = [];

async function loadFilter() {

    const user = getCurrentUser();
    if (!user) return;

    try {

        const data = await data_api("/courses");

        const allCourses =
            data.courses || [];
        

        // 只保留 user.courses
        const userCourses =
            user.courses || [];

        const filteredCourses =
            allCourses.filter(course =>
                userCourses.includes(
                    course.course_id
                )
            );


        renderFilter(filteredCourses);


    } catch (error) {

        console.error(
            "load filter failed:",
            error
        );

    }
}

function renderFilter(userCourses) {

    const fileSelect =
        document.getElementById("fileCourseSelect");


    if (!fileSelect) return;



    // 只留下使用者有的課程
    const availableCourses = userCourses;

    fileSelect.innerHTML =
        `
        <option value="">
            全部課程
        </option>
        `

        +

        availableCourses.map(course => {

            const id =
                escapeHtml(
                    course.course_id || ""
                );


            const name =
                escapeHtml(
                    course.course_name || ""
                );


            return `
            <option value="${id}">
                ${id} - ${name}
            </option>
            `;

        }).join("");

}

async function loadDiscussionFiles() {
    const user = getCurrentUser();
    if (!user) return;

    const fileList = document.getElementById("fileList");
    try {
        setStatus("filesStatus", "正在載入可討論的考古題...");
        const data = await data_api(`/files?user_id=${encodeURIComponent(user.user_id)}`);
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
            data_api(`/file-detail?user_id=${encodeURIComponent(user.user_id)}&file_id=${encodeURIComponent(fileId)}`),
            data_api(`/comments?file_id=${encodeURIComponent(fileId)}`)
        ]);

        currentComments = commentsData.comments || []; // 存入前端陣列
        renderDiscussionDetail(fileData.file, fileData.text);

        await loadDiscussionFiles();
    } catch (error) {
        detail.innerHTML = `<div class="empty-state"><p style="color: red;">載入失敗：${escapeHtml(error.message)}</p></div>`;
        setStatus("filesStatus", error.message, "err");
    }
}

function renderCommentsList() {
    const commentsList = document.querySelector(".comments-list");
    if (!commentsList) return;

    const user = getCurrentUser();
    const isTeacher = user && user.role === 'teacher';

    if (currentComments.length === 0) {
        commentsList.innerHTML = `<div class="empty-state"><p>目前還沒有人留言，來當第一個討論的人吧！</p></div>`;
    } else {
        commentsList.innerHTML = currentComments.map(c => {
            const pinButtonHtml = (isTeacher && !c.is_best_answer)
                ? `<button type="button" class="button ghost" style="padding: 4px 8px; min-height: auto; font-size: 12px; margin-left: auto;" onclick="pinComment('${c.file_id}', ${c.timestamp})">設為正解</button>`
                : '';

            const unpinButtonHtml = (isTeacher && c.is_best_answer)
                ? `<button type="button" class="button ghost" style="padding: 4px 8px; min-height: auto; font-size: 12px; margin-left: auto; color: var(--danger);" onclick="unpinComment('${c.file_id}', ${c.timestamp})">取消置頂</button>`
                : '';

            return `
                <div class="comment ${c.is_best_answer ? 'is-correct' : ''}">
                    <div class="comment-avatar ${c.is_best_answer ? 'correct-avatar' : ''}">${escapeHtml((c.user_name || "名").charAt(0))}</div>
                    <div class="comment-body" style="width: 100%;">
                        <div class="comment-meta" style="display: flex; align-items: baseline; flex-wrap: wrap;">
                            <strong>${escapeHtml(c.user_name || "未知使用者")}</strong> 
                            ${c.is_best_answer ? '<span class="badge badge-correct">📌 正確答案</span>' : ''}
                            <span style="margin-left: 12px;">${new Date(c.timestamp).toLocaleString()}</span>
                            ${pinButtonHtml}
                            ${unpinButtonHtml}
                        </div>
                        <p>${escapeHtml(c.comment_text)}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    const countHeader = document.querySelector(".discussion-area h3");
    if (countHeader) {
        countHeader.textContent = `討論區 (${currentComments.length})`;
    }
}

function renderDiscussionDetail(file, text) {
    const detail = document.getElementById("discussionDetail");
    const formattedText = text ? escapeHtml(text).replace(/\n/g, '<br>') : "沒有文字內容";

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
                <h3>討論區 (0)</h3>
                
                <div class="comments-list"></div> <form class="comment-form" id="submitCommentForm">
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

    // 框架畫好後，立刻呼叫渲染留言
    renderCommentsList();
}

async function submitNewComment(fileId, commentText) {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const responseData = await data_api('/comments', {
            method: 'POST',
            body: JSON.stringify({
                file_id: fileId,
                user_id: user.user_id,
                user_name: user.name || user.user_id || "使用者",
                comment_text: commentText
            })
        });
        
        document.getElementById("newCommentText").value = ""; // 清空輸入框
        
        // 把新留言塞進陣列，重新渲染列表 (不重整畫面)
        if (responseData && responseData.comment) {
            currentComments.push(responseData.comment);
            renderCommentsList();
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
    // loadDiscussionFiles();
    loadFilter();
});


async function pinComment(fileId, timestamp) {
    const user = getCurrentUser();
    if (!user || user.role !== 'teacher') return;

    try {
        await data_api('/comments/pin', {
            method: 'POST',
            body: JSON.stringify({ requester_id: user.user_id, file_id: fileId, timestamp: timestamp, pin_status: true })
        });
        
       
        const target = currentComments.find(c => c.timestamp === timestamp);
        if (target) target.is_best_answer = true;
        
        currentComments.sort((a, b) => {
            if (a.is_best_answer && !b.is_best_answer) return -1;
            if (!a.is_best_answer && b.is_best_answer) return 1;
            return a.timestamp - b.timestamp;
        });

        renderCommentsList();
    } catch (error) {
        alert("置頂失敗：" + error.message);
    }
}

async function unpinComment(fileId, timestamp) {
    const user = getCurrentUser();
    if (!user || user.role !== 'teacher') return;

    try {
        await data_api('/comments/pin', {
            method: 'POST',
            body: JSON.stringify({ requester_id: user.user_id, file_id: fileId, timestamp: timestamp, pin_status: false })
        });
        
        const target = currentComments.find(c => c.timestamp === timestamp);
        if (target) target.is_best_answer = false;
        
        currentComments.sort((a, b) => {
            if (a.is_best_answer && !b.is_best_answer) return -1;
            if (!a.is_best_answer && b.is_best_answer) return 1;
            return a.timestamp - b.timestamp;
        });

        renderCommentsList();
    } catch (error) {
        alert("取消置頂失敗：" + error.message);
    }
}