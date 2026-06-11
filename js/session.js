function getCurrentUser() {
    return JSON.parse(localStorage.getItem("examUser") || "null");
}

function hasCompleteProfile(user) {
    return Boolean(user?.role && user?.courses?.length);
}

async function requireLogin() {

    const user = await getCurrentUser(); // ⭐ 改成一定從 API 拿最新

    if (!user) {
        window.location.href = "index.html";
        return null;
    }

    const page =
        window.location.pathname.split("/").pop() || "index.html";


    // ❗ profile incomplete → 強制導向
    if (page !== "profile.html" && !hasCompleteProfile(user)) {
        window.location.href = "profile.html";
        return null;
    }


    // ⭐ 更新 local cache（可選）
    localStorage.setItem(
        `examProfile:${user.user_id}`,
        JSON.stringify({
            role: user.role,
            courses: user.courses
        })
    );


    // ⭐ 更新 UI
    const currentUserText =
        document.getElementById("currentUserText");


    if (currentUserText) {

        const roleLabel =
            ROLE_NAMES[user.role] || user.role;

        currentUserText.textContent = roleLabel
            ? `${user.name || user.email || user.user_id} (${roleLabel})`
            : user.name || user.email || user.user_id;
    }


    return user;
}

function logout() {

    localStorage.clear();
    sessionStorage.clear();

    // 🔥 強制清 memory state
    window.name = "";

    // 🔥 直接 reload 清 SPA state
    window.location.replace(
        `${APP_CONFIG.COGNITO_DOMAIN}/logout?` +
        new URLSearchParams({
            client_id: APP_CONFIG.COGNITO_CLIENT_ID,
            logout_uri: APP_CONFIG.COGNITO_LOGOUT_URI
        })
    );

    if (!localStorage.getItem("examAuthSession")) {
        window.location.href = "index.html";
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", logout);
    }

    await requireLogin();
});
