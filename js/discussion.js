let selectedFileId = null;
let currentComments = [];
let tacourse = [];
let user = null;

async function loadFilter() {

    // const user = await getCurrentUser();
    // console.log("current user:", user);
    if (!user) return;

    try {

        const data = await data_api("/courses");

        const allCourses =
            data.courses || [];
        
        const userCoursesRaw =
            user.courses || [];

        const userCourses =
            Array.isArray(userCoursesRaw?.L)
                ? userCoursesRaw.L.map(x => x.S)
                : userCoursesRaw;


        // console.log(allCourses, userCourses);

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

async function loadTAdata() {

    // const user = await getCurrentUser();

    const res = await talist_api(
        `?user_id=${encodeURIComponent(user.user_id)}`,
        {
            method: "GET"
        }
    );

    tacourse = (res.data || []).map(item => item.course_id);

    // console.log("TA courses:", tacourse);
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
            請選擇一個課程
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

    // const user = await getCurrentUser();
    if (!user) return;


    const fileList =
        document.getElementById("fileList");


    const courseId =
        document.getElementById("fileCourseSelect")?.value || "";


    try {

        setStatus(
            "filesStatus",
            "正在載入可討論的考古題..."
        );


        // ⭐ 有選課程就帶 query
        const url =
            courseId
                ? `/files?user_id=${encodeURIComponent(user.user_id)}&course=${encodeURIComponent(courseId)}`
                : `/files?user_id=${encodeURIComponent(user.user_id)}`;


        const data =
            await data_api(url);


        renderFiles(
            data.files || []
        );


        setStatus("filesStatus", "");


    } catch (error) {

        fileList.innerHTML =
            "<p class='muted'>無法載入資料。</p>";


        setStatus(
            "filesStatus",
            error.message,
            "err"
        );
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
    // const user = await getCurrentUser();
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

async function renderCommentsList() {
    const commentsList = document.querySelector(".comments-list");
    if (!commentsList) return;

    // const user = await getCurrentUser();
    const courseId =
        document.getElementById("fileCourseSelect")?.value || "";
    const isTeacherorTA = user && (user.role === 'teacher' || tacourse.includes(courseId));

    if (currentComments.length === 0) {
        commentsList.innerHTML = `<div class="empty-state"><p>目前還沒有人留言，來當第一個討論的人吧！</p></div>`;
    } else {
        commentsList.innerHTML = currentComments.map(c => {
            const pinButtonHtml = (isTeacherorTA && !c.is_best_answer)
                ? `<button type="button" class="button ghost" style="padding: 4px 8px; min-height: auto; font-size: 12px; margin-left: auto;" onclick="pinComment('${c.file_id}', ${c.timestamp})">設為正解</button>`
                : '';

            const unpinButtonHtml = (isTeacherorTA && c.is_best_answer)
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
    // const user = await getCurrentUser();
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

document.addEventListener("DOMContentLoaded", async () => {
    user = await requireLogin();
    if (!user) return;
    // loadDiscussionFiles();
    loadFilter();
    loadTAdata();

    document.getElementById("openJoinCourseModal")
    .addEventListener("click", async () => {

        document.getElementById("joinCourseModal")
            .classList.remove("hidden");

        await loadJoinCourseOptions();
    });
    if (user.role === 'teacher') {
        document.getElementById("openJoinCourseModal").hidden = true;
    }
});

async function loadJoinCourseOptions() {

    // const user = await getCurrentUser();

    const res = await data_api("/courses");

    const allCourses = res.courses || [];
    const userCourses = user.courses || [];

    const availableCourses = allCourses.filter(course =>
        !userCourses.includes(course.course_id)
    );

    const select = document.getElementById("joinCourseSelect");

    select.innerHTML = availableCourses.map(course => `
        <option value="${course.course_id}">
            ${course.course_id} - ${course.course_name}
        </option>
    `).join("");
}

document.getElementById("confirmJoinCourseBtn")
.addEventListener("click", async () => {

    const courseId = document.getElementById("joinCourseSelect").value;
    const user = await getCurrentUser();

    if (!courseId) return alert("請選擇課程");

    await data_api("/course-join-request", {
        method: "POST",
        body: JSON.stringify({
            user_id: user.user_id,
            course_id: courseId
        })
    });

    alert("已送出申請");
});

async function pinComment(fileId, timestamp) {
    // const user = await getCurrentUser();
    const courseId =
        document.getElementById("fileCourseSelect")?.value || "";
    console.log(tacourse, courseId, tacourse.includes(courseId));
    const isTeacherorTA = user && (user.role === 'teacher' || tacourse.includes(courseId));
    if (!user || !isTeacherorTA) return;

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
    // const user = await getCurrentUser();
    const courseId =
        document.getElementById("fileCourseSelect")?.value || "";
    const isTeacherorTA = user && (user.role === 'teacher' || tacourse.includes(courseId));
    if (!user || !isTeacherorTA) return;

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

document.getElementById("fileCourseSelect").addEventListener("change", () => {
    loadDiscussionFiles();
});