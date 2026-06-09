function base64UrlEncode(bytes) {
    return btoa(String.fromCharCode(...bytes))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "");
}

async function sha256(value) {
    const data = new TextEncoder().encode(value);
    return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}

function createRandomString(length = 64) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return base64UrlEncode(bytes);
}

async function startHostedUiAuth(screen) {
    if (
        APP_CONFIG.COGNITO_DOMAIN.includes("YOUR_DOMAIN") ||
        APP_CONFIG.COGNITO_CLIENT_ID.includes("YOUR_APP_CLIENT_ID")
    ) {
        setStatus("authStatus", "Please set Cognito values in js/config.js first.", "err");
        return;
    }

    const state = createRandomString(32);
    const codeVerifier = createRandomString(64);
    const codeChallenge = base64UrlEncode(await sha256(codeVerifier));

    sessionStorage.setItem(
        "examPkce",
        JSON.stringify({
            state,
            codeVerifier
        })
    );

    const params = new URLSearchParams({
        client_id: APP_CONFIG.COGNITO_CLIENT_ID,
        response_type: "code",
        scope: APP_CONFIG.COGNITO_SCOPES,
        redirect_uri: APP_CONFIG.COGNITO_REDIRECT_URI,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256"
    });

    const authPath = screen === "signup" ? "/signup" : "/login";
    window.location.href = `${APP_CONFIG.COGNITO_DOMAIN}${authPath}?${params.toString()}`;
}

document.addEventListener("DOMContentLoaded", () => {
    const savedUser = JSON.parse(localStorage.getItem("examUser") || "null");

    if (savedUser) {
        window.location.href = "myfiles.html";
        return;
    }

    document.getElementById("loginBtn").addEventListener("click", () => startHostedUiAuth("login"));
    document.getElementById("registerBtn").addEventListener("click", () => startHostedUiAuth("signup"));
});
