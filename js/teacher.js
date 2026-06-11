let teacherUser = null;

function getRequesterId() {
    return teacherUser ? teacherUser.user_id : "";
}

function parseCoursesInput(value) {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function requireTeacher() {
    const user = getCurrentUser();

    if (!user) {
        window.location.href = "index.html";
        return null;
    }

    if (user.role !== "teacher") {
        alert("只有教師可以進入管理後台。");
        window.location.href = "myfiles.html";
        return null;
    }

    teacherUser = user;

    const currentUserText = document.getElementById("currentUserText");

    if (currentUserText) {
        currentUserText.textContent = `${user.name}（${user.role}）`;
    }

    return user;
}

async function loadDashboard() {
    try {
        const data = await data_api(
            `/dashboard?requester_id=${encodeURIComponent(getRequesterId())}`
        );

        document.getElementById("studentCount").textContent = data.student_count ?? 0;
        document.getElementById("teacherCount").textContent = data.teacher_count ?? 0;
        document.getElementById("courseCount").textContent = data.course_count ?? 0;
        document.getElementById("fileCount").textContent = data.file_count ?? 0;
    } catch (error) {
        console.error(error);
    }
}

async function loadUsers() {
    const tbody = document.getElementById("usersTableBody");

    try {
        setStatus("usersStatus", "正在載入使用者...");
        tbody.innerHTML = "<tr><td colspan='4'>載入中...</td></tr>";

        const data = await data_api(
            `/users?requester_id=${encodeURIComponent(getRequesterId())}&role=student`
        );

        renderUsers(data.users || []);
        setStatus("usersStatus", "");
    } catch (error) {
        tbody.innerHTML = "<tr><td colspan='4'>無法載入使用者。</td></tr>";
        setStatus("usersStatus", error.message, "err");
    }
}

async function loadUsersCourses(user_id) {
    const tbody = document.getElementById("stucrsContent");

    try {
        setStatus("usercrsStatus", "正在載入使用者...");
        const data = await data_api(
            `/user-courses?user_id=${encodeURIComponent(user_id)}`
        );
        console.log("使用者課程資料:", data.courses);
        document
        .querySelectorAll("#stucrsContent input[type='checkbox']")
        .forEach(cb => {

            const courseId = cb.dataset.courseId;

            cb.checked = selectedSet.has(courseId);
        });
        setStatus("usercrsStatus", "");
    } catch (error) {
        tbody.innerHTML = "<tr><td colspan='4'>無法載入使用者課程。</td></tr>";
        setStatus("usercrsStatus", error.message, "err");
    }
}

function renderUsers(users) {
    const tbody = document.getElementById("usersTableBody");

    if (!users.length) {
        tbody.innerHTML = "<tr><td colspan='4'>目前沒有使用者。</td></tr>";
        return;
    }

    tbody.innerHTML = users
    .map((user) => {
        const courses = (user.courses || []).join(", ");
        const disableDelete = user.user_id === getRequesterId();

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(user.name || user.username)}</strong>
                    <span>${escapeHtml(user.user_id || "")}</span>
                </td>

                <td>${escapeHtml(user.role || "")}</td>

                <td>
                    ${escapeHtml(courses || "未設定")}
                </td>

                <td>
                    <button
                        type="button"
                        class="button small"
                        onclick='openUserCourseModal(${JSON.stringify(user.user_id)})'
                    >
                        管理課程
                    </button>
                </td>
                <td>
                    <button
                        type="button"
                        class="button danger small"
                        data-delete-user="${escapeHtml(user.user_id || "")}"
                        ${disableDelete ? "disabled" : ""}
                    >
                        刪除
                    </button>
                </td>
            </tr>
        `;
    })
    .join("");

    document.querySelectorAll("[data-delete-user]").forEach((button) => {
        button.addEventListener("click", () => {
            deleteUser(button.dataset.deleteUser);
        });
    });

    document.querySelectorAll("[data-manage-course]").forEach((button) => {
        button.addEventListener("click", () => {
            const userId = button.dataset.manageCourse;
            manageUserCourses(userId);
        });
    });
}

function manageUserCourses(userId) {
    console.log("管理課程:", userId);

    // 之後可以在這裡：
    // 1. 開 modal
    // 2. 載入該使用者課程
    // 3. 新增 / 移除課程

    openCourseModal(userId);
}

async function createUser() {
    const userId = document.getElementById("newUserId").value.trim();
    const name = document.getElementById("newUserName").value.trim();
    const email = document.getElementById("newUserEmail").value.trim();
    const role = document.getElementById("newUserRole").value;
    const courses = parseCoursesInput(
        document.getElementById("newUserCourses").value
    );

    if (!userId || !name || !email) {
        setStatus("usersStatus", "請完整填寫使用者資料。", "err");
        return;
    }

    try {
        await data_api("/users", {
            method: "POST",
            body: JSON.stringify({
                requester_id: getRequesterId(),
                user_id: userId,
                name,
                email,
                role,
                courses
            })
        });

        document.getElementById("newUserId").value = "";
        document.getElementById("newUserName").value = "";
        document.getElementById("newUserEmail").value = "";
        document.getElementById("newUserCourses").value = "";

        setStatus("usersStatus", "使用者已新增。", "ok");

        await loadUsers();
        await loadDashboard();
    } catch (error) {
        setStatus("usersStatus", error.message, "err");
    }
}

async function deleteUser(userId) {
    if (!userId) {
        return;
    }

    if (!confirm(`確定要刪除使用者 ${userId} 嗎？`)) {
        return;
    }

    try {
        await data_api("/users", {
            method: "DELETE",
            body: JSON.stringify({
                requester_id: getRequesterId(),
                user_id: userId
            })
        });

        setStatus("usersStatus", "使用者已刪除。", "ok");

        await loadUsers();
        await loadDashboard();
    } catch (error) {
        setStatus("usersStatus", error.message, "err");
    }
}

async function loadCourses() {
    const tbody = document.getElementById("coursesTableBody");
    try {
        setStatus("coursesStatus", "正在載入課程...");
        tbody.innerHTML = "<tr><td colspan='3'>載入中...</td></tr>";

        const data = await data_api("/courses");

        renderCourses(data.courses || []);
        setStatus("coursesStatus", "");
    } catch (error) {
        tbody.innerHTML = "<tr><td colspan='3'>無法載入課程。</td></tr>";
        setStatus("coursesStatus", error.message, "err");
    }
}

function renderCourses(courses) {
    const tbody = document.getElementById("coursesTableBody");
    const select = document.getElementById("courseSelect")
    const stucrsContent = document.getElementById("stucrsContent");

    if (!courses.length) {
        tbody.innerHTML = "<tr><td colspan='3'>目前沒有課程。</td></tr>";
        return;
    }

    tbody.innerHTML = courses
        .map((course) => {
            return `
                <tr>
                    <td>${escapeHtml(course.course_id || "")}</td>
                    <td>${escapeHtml(course.course_name || "")}</td>
                    <td>
                        <button
                            type="button"
                            class="button danger small"
                            data-delete-course="${escapeHtml(course.course_id || "")}"
                        >
                            刪除
                        </button>
                    </td>
                </tr>
            `;
        })
        .join("");

    select.innerHTML = `
        <option value="">選擇課程</option>
    ` + courses
        .map((course) => {
            const courseId = escapeHtml(course.course_id || "");
            const courseName = escapeHtml(course.course_name || "");
    
            return `
                <option value="${courseId}">
                    ${courseId} - ${courseName}
                </option>
            `;
        })
        .join("");

    document.querySelectorAll("[data-delete-course]").forEach((button) => {
        button.addEventListener("click", () => {
            deleteCourse(button.dataset.deleteCourse);
        });
    });

    stucrsContent.innerHTML = courses.map(course => {
        const courseId = escapeHtml(course.course_id || "");
        const courseName = escapeHtml(course.course_name || "");

        return `
        <label>
            <input type="checkbox" value="${courseId}" data-course-id="${courseId}">
            <span>${courseId} - ${courseName}</span>
        </label>
    `;
    }).join("");
}

async function createCourse() {
    const courseId = document.getElementById("newCourseId").value.trim();
    const courseName = document.getElementById("newCourseName").value.trim();

    if (!courseId || !courseName) {
        setStatus("coursesStatus", "請完整填寫課程資料。", "err");
        return;
    }

    try {
        await data_api("/courses", {
            method: "POST",
            body: JSON.stringify({
                requester_id: getRequesterId(),
                course_id: courseId,
                course_name: courseName
            })
        });

        document.getElementById("newCourseId").value = "";
        document.getElementById("newCourseName").value = "";

        setStatus("coursesStatus", "課程已新增。", "ok");

        await loadCourses();
        await loadDashboard();
    } catch (error) {
        setStatus("coursesStatus", error.message, "err");
    }
}

async function deleteCourse(courseId) {
    if (!courseId) {
        return;
    }

    if (!confirm(`確定要刪除課程 ${courseId} 嗎？`)) {
        return;
    }

    try {
        await data_api("/courses", {
            method: "DELETE",
            body: JSON.stringify({
                requester_id: getRequesterId(),
                course_id: courseId
            })
        });

        setStatus("coursesStatus", "課程已刪除。", "ok");

        await loadCourses();
        await loadDashboard();
    } catch (error) {
        setStatus("coursesStatus", error.message, "err");
    }
}

async function loadFiles() {
    const tbody = document.getElementById("filesTableBody");

    try {
        setStatus("filesStatus", "正在載入考古題...");
        tbody.innerHTML = "<tr><td colspan='5'>載入中...</td></tr>";

        const data = await data_api(
            `/files?user_id=${encodeURIComponent(getRequesterId())}`
        );

        renderFiles(data.files || []);
        setStatus("filesStatus", "");
    } catch (error) {
        tbody.innerHTML = "<tr><td colspan='5'>無法載入考古題。</td></tr>";
        setStatus("filesStatus", error.message, "err");
    }
}

function renderFiles(files) {
    const tbody = document.getElementById("filesTableBody");

    if (!files.length) {
        tbody.innerHTML = "<tr><td colspan='5'>目前沒有考古題。</td></tr>";
        return;
    }

    tbody.innerHTML = files
        .map((file) => {
            return `
                <tr>
                    <td>
                        <strong>${escapeHtml(file.filename || "未命名檔案")}</strong>
                        <span>${escapeHtml(file.file_id || "")}</span>
                    </td>
                    <td>${escapeHtml(formatCourseName(file.course))}</td>
                    <td>${escapeHtml(file.uploaded_by || "")}</td>
                    <td>${escapeHtml(file.status || "")}</td>
                    <td>
                        <button
                            type="button"
                            class="button danger small"
                            data-delete-file="${escapeHtml(file.file_id || "")}"
                        >
                            刪除
                        </button>
                    </td>
                </tr>
            `;
        })
        .join("");

    document.querySelectorAll("[data-delete-file]").forEach((button) => {
        button.addEventListener("click", () => {
            deleteFile(button.dataset.deleteFile);
        });
    });
}

async function deleteFile(fileId) {
    if (!fileId) {
        return;
    }

    if (!confirm("確定要刪除這份考古題嗎？")) {
        return;
    }

    try {
        await data_api("/files", {
            method: "DELETE",
            body: JSON.stringify({
                requester_id: getRequesterId(),
                file_id: fileId
            })
        });

        setStatus("filesStatus", "考古題已刪除。", "ok");

        await loadFiles();
        await loadDashboard();
    } catch (error) {
        setStatus("filesStatus", error.message, "err");
    }
}

async function loadTAs() {
    const tbody = document.getElementById("taListTableBody");

    try {
        setStatus("TAsStatus", "正在載入助教列表...");
        tbody.innerHTML = "<tr><td colspan='3'>載入中...</td></tr>";
        const courseId = document.getElementById("courseSelect").value;

        const data = await talist_api(
            `?course_id=${encodeURIComponent(courseId)}`,
            {
                method: "GET"
            }
        );
        renderTAs(data.data || []);
        setStatus("TAsStatus", "");
    } catch (error) {
        tbody.innerHTML = "<tr><td colspan='3'>無法載入助教列表。</td></tr>";
        setStatus("TAsStatus", error.message, "err");
    }
}

async function deleteTA(taId) {
    if (!taId) {
        return;
    }

    if (!confirm(`確定要刪除嗎？`)) {
        return;
    }

    try {
        await talist_api(`?id=${taId}`, {
            method: "DELETE"
        });

        setStatus("TAsStatus", "課程已刪除。", "ok");

        await loadTAs();
    } catch (error) {
        setStatus("TAsStatus", error.message, "err");
    }
}

function renderTAs(data) {
    const tbody = document.getElementById("taListTableBody");

    if (!data.length) {
        tbody.innerHTML = "<tr><td colspan='3'>目前沒有助教在此課程中。</td></tr>";
        return;
    }

    tbody.innerHTML = data
        .map((TA) => {
            return `
                <tr>
                    <td>${escapeHtml(TA.username || "")}</td>
                    <td>
                        <button
                            type="button"
                            class="button danger small"
                            data-ta-id="${TA.id}"
                        >
                            刪除
                        </button>
                    </td>
                </tr>
            `;
        })
        .join("");
}

async function loadCandidateTAs(courseId) {
    try {
        if (!courseId) return;

        // 1️⃣ 取得所有學生
        const data = await data_api(
            `/users?requester_id=${encodeURIComponent(getRequesterId())}&role=student`
        );

        // 2️⃣ 取得該課程 TA
        const taRes = await talist_api(
            `?course_id=${encodeURIComponent(courseId)}`,
            {
                method: "GET"
            }
        );

        const allStudents = data.users || [];
        const tas = taRes.data || [];

        // 3️⃣ 建立 TA 的 user_id Set（用來快速查）
        const taSet = new Set(tas.map(ta => ta.user_id));

        // 4️⃣ filter 掉已經是 TA 的學生
        const candidates = allStudents.filter(
            allStudents => !taSet.has(allStudents.user_id)
        );

        // 5️⃣ render
        renderCandidateTAs(candidates);

    } catch (err) {
        console.error(err);
    }
}

function renderCandidateTAs(list) {
    const container = document.getElementById("candidateTAtable");
    container.innerHTML = list.map(student => `
        <tr>
            <td>${escapeHtml(student.username)}</td>
            <td><button btn-success class="button small candidate-ta-btn    "
                onclick='addTAFromCandidate(
                        ${JSON.stringify(student.user_id)},
                        ${JSON.stringify(student.username)}
                    )'>
                設為 TA
            </button></td>
        </tr>
    `).join("");
}

function openUserCourseModal(userId) {

    const modal = document.getElementById("stucrsModal");

    modal.classList.remove("hidden");

    loadUsersCourses(userId);
}

async function initializeTeacherPage() {
    const user = requireTeacher();

    if (!user) {
        return;
    }

    document.getElementById("reloadUsersBtn").addEventListener("click", loadUsers);
    document.getElementById("reloadCoursesBtn").addEventListener("click", loadCourses);
    document.getElementById("reloadFilesBtn").addEventListener("click", loadFiles);

    document.getElementById("createUserBtn").addEventListener("click", createUser);
    document.getElementById("createCourseBtn").addEventListener("click", createCourse);

    await Promise.all([
        loadDashboard(),
        loadUsers(),
        loadCourses(),
        loadFiles()
    ]);

    document.getElementById("courseSelect").addEventListener("change", () => {
        loadTAs();
    });

    document.getElementById("taListTableBody").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-ta-id]");
        if (!btn) return;
    
        const taId = btn.dataset.taId;
        deleteTA(taId);
    });

    // 打開 modal
    document.getElementById("addTABtn").addEventListener("click", () => {
        document.getElementById("taModal").classList.remove("hidden");

        // 先顯示 loading（之後會接 API）
        loadCandidateTAs(document.getElementById("courseSelect").value);
    });

     // 關閉 modal
     document.getElementById("closeTAModalBtn").addEventListener("click", () => {
        document.getElementById("taModal").classList.add("hidden");
    });

    // 點背景關閉（optional UX）
    document.getElementById("taModal").addEventListener("click", (e) => {
        if (e.target.id === "taModal") {
            document.getElementById("taModal").classList.add("hidden");
        }
    });

    document
    .getElementById("closestucrsModalBtn")
    .addEventListener("click",()=>{

        document
        .getElementById("stucrsModal")
        .classList.add("hidden");

    });
}

document.addEventListener("DOMContentLoaded", initializeTeacherPage);

async function addTAFromCandidate(userId, username) {

    const courseId = document.getElementById("courseSelect").value;

    if (!courseId) {
        alert("請先選擇課程");
        return;
    }

    try {

        await talist_api("", {
            method: "POST",
            body: JSON.stringify({
                course_id: courseId,
                user_id: userId,
                username: username
            })
        });


        // 新增成功後更新畫面
        await loadTAs(courseId);
        await loadCandidateTAs(courseId);

    } catch (err) {
        console.error(err);
        alert("新增 TA 失敗: " + err.message);
    }
}