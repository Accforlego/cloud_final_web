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
            `/users?requester_id=${encodeURIComponent(getRequesterId())}`
        );

        renderUsers(data.users || []);
        setStatus("usersStatus", "");
    } catch (error) {
        tbody.innerHTML = "<tr><td colspan='4'>無法載入使用者。</td></tr>";
        setStatus("usersStatus", error.message, "err");
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
                    <td>${escapeHtml(courses || "未設定")}</td>
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
        setStatus("coursesStatus", "正在載入助教列表...");
        tbody.innerHTML = "<tr><td colspan='3'>載入中...</td></tr>";
        const courseId = document.getElementById("courseSelect").value;

        const data = await talist_api(
            `?course_id=${encodeURIComponent(courseId)}`,
            {
                method: "GET"
            }
        );
        console.log(data)
        renderTAs(data || []);
        setStatus("coursesStatus", "");
    } catch (error) {
        tbody.innerHTML = "<tr><td colspan='3'>無法載入助教列表。</td></tr>";
        setStatus("coursesStatus", error.message, "err");
    }
}

function renderTAs(courses) {
    const tbody = document.getElementById("taListTableBody");

    if (!courses.length) {
        tbody.innerHTML = "<tr><td colspan='3'>目前沒有助教在此課程中。</td></tr>";
        return;
    }

    // tbody.innerHTML = courses
    //     .map((course) => {
    //         return `
    //             <tr>
    //                 <td>${escapeHtml(course.course_id || "")}</td>
    //                 <td>${escapeHtml(course.course_name || "")}</td>
    //                 <td>
    //                     <button
    //                         type="button"
    //                         class="button danger small"
    //                         data-delete-course="${escapeHtml(course.course_id || "")}"
    //                     >
    //                         刪除
    //                     </button>
    //                 </td>
    //             </tr>
    //         `;
    //     })
    //     .join("");


    // document.querySelectorAll("[data-delete-course]").forEach((button) => {
    //     button.addEventListener("click", () => {
    //         deleteCourse(button.dataset.deleteCourse);
    //     });
    // });
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

    // 打開 modal
    document.getElementById("addTABtn").addEventListener("click", () => {
        document.getElementById("taModal").classList.remove("hidden");

        // 先顯示 loading（之後會接 API）
        document.getElementById("taModalStatus").innerText = "載入學生中...";
        document.getElementById("studentList").innerHTML = "";
        // console.log("Open add TA modal")

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
    });

    document.getElementById("courseSelect").addEventListener("change", () => {
        loadTAs();
    });
}

document.addEventListener("DOMContentLoaded", initializeTeacherPage);

