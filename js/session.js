async function getCurrentUser() {
    const session =
        JSON.parse(localStorage.getItem("examAuthSession") || "null");

    if (!session) return null;

    let claims;

    try {
        claims = decodeJwtPayload(session.id_token);
    } catch {
        return null;
    }

    // ⭐ 1. 先從 Cognito 拿基本資料（一定有）
    const baseUser = {
        user_id: claims.sub,
        sub: claims.sub,
        name: claims.name || claims.email || claims["cognito:username"],
        email: claims.email || "",
        role: claims["custom:role"] || "",
        courses: claims["custom:courses"]
            ? claims["custom:courses"].split(",")
            : []
    };

    try {
        // const session = JSON.parse(localStorage.getItem("examAuthSession"));
        // const claims = decodeJwtPayload(session.id_token);
        
        const data = await data_api(`/users?user_id=${claims.sub}`).users[0];
        return !data ? baseUser : normalizeUser({;
    } catch (error) {
        console.error("Error getting current user:", error);
        // window.location.href = "index.html";
        return null;
    }
}

function decodeJwtPayload(token) {
    const payload = token.split(".")[1];
    const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), "=");
    const json = decodeURIComponent(
        atob(padded)
            .split("")
            .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
            .join("")
    );

    return JSON.parse(json);
}

function normalizeUser(user) {

    if (!user) return null;

    return {
        ...user,
        courses: Array.isArray(user.courses)
            ? user.courses
            : user.courses?.L
                ? user.courses.L.map(x => x.S)
                : typeof user.courses === "string"
                    ? user.courses.split(",")
                    : []
    };
}

function hasCompleteProfile(user) {
    return Boolean(user?.role && user?.courses?.length);
}

async function requireLogin() {

    const user = await getCurrentUser(); // ⭐ 改成一定從 API 拿最新
    // console.log(user);

    // ❗ profile incomplete → 強制導向
    if (page !== "profile.html" && !hasCompleteProfile(user)) {
        window.location.href = "profile.html";
        return null;
    }

    const page =
        window.location.pathname.split("/").pop() || "index.html";



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
