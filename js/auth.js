let currentUser = JSON.parse(localStorage.getItem("examUser") || "null");

function getCurrentUser() {
    return currentUser;
}

function saveCurrentUser(user) {
    currentUser = user;
    localStorage.setItem("examUser", JSON.stringify(user));
    updateUserUI();
}

function logout() {
    currentUser = null;
    localStorage.removeItem("examUser");
    updateUserUI();
}

function updateUserUI() {
    const currentUserText = document.getElementById("currentUserText");
    const logoutBtn = document.getElementById("logoutBtn");
    const authPanel = document.getElementById("authPanel");
    const uploadPanel = document.getElementById("uploadPanel");

    if (!currentUserText || !logoutBtn || !authPanel || !uploadPanel) {
        return;
    }

    if (currentUser) {
        currentUserText.textContent = `${currentUser.name}（${currentUser.role}）`;
        logoutBtn.hidden = false;
        authPanel.hidden = true;
        uploadPanel.hidden = false;
    } else {
        currentUserText.textContent = "尚未登入";
        logoutBtn.hidden = true;
        authPanel.hidden = false;
        uploadPanel.hidden = true;
    }

    renderCourseOptions();
}

function switchAuthTab(mode) {
    const isLogin = mode === "login";

    document.getElementById("loginTab").classList.toggle("is-active", isLogin);
    document.getElementById("registerTab").classList.toggle("is-active", !isLogin);
    document.getElementById("loginForm").hidden = !isLogin;
    document.getElementById("registerForm").hidden = isLogin;
    setStatus("authStatus", "");
}

async function login() {
    const userId = document.getElementById("loginUserId").value.trim();

    if (!userId) {
        setStatus("authStatus", "請輸入使用者 ID。", "err");
        return;
    }

    try {
        const data = await api(
            "/login",
            {
                method: "POST",
                body: JSON.stringify({
                    user_id: userId
                })
            }
        );

        saveCurrentUser(data.user);
        setStatus("authStatus", "登入成功。", "ok");
    } catch (error) {
        setStatus("authStatus", error.message, "err");
    }
}

async function register() {
    const userId = document.getElementById("regUserId").value.trim();
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const role = document.getElementById("regRole").value;
    const course = document.getElementById("regCourse").value;

    if (!userId || !name || !email) {
        setStatus("authStatus", "請完整填寫註冊資料。", "err");
        return;
    }

    try {
        const data = await api(
            "/register",
            {
                method: "POST",
                body: JSON.stringify({
                    user_id: userId,
                    name,
                    email,
                    role,
                    courses: [course]
                })
            }
        );

        saveCurrentUser(data.user);
        setStatus("authStatus", "帳號建立成功。", "ok");
    } catch (error) {
        setStatus("authStatus", error.message, "err");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("loginTab").addEventListener("click", () => switchAuthTab("login"));
    document.getElementById("registerTab").addEventListener("click", () => switchAuthTab("register"));
    document.getElementById("loginBtn").addEventListener("click", login);
    document.getElementById("registerBtn").addEventListener("click", register);
    document.getElementById("logoutBtn").addEventListener("click", logout);

    updateUserUI();
});
