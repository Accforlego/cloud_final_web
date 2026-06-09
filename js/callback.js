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

function saveAuthSession(tokens) {
    const claims = decodeJwtPayload(tokens.id_token);
    const user = {
        user_id: claims.sub,
        sub: claims.sub,
        name: claims.name || claims.email || claims["cognito:username"],
        email: claims.email || "",
        role: claims["custom:role"] || "student",
        courses: claims["custom:courses"] ? claims["custom:courses"].split(",") : ["compiler", "os"]
    };

    localStorage.setItem("examAuthSession", JSON.stringify(tokens));
    localStorage.setItem("examUser", JSON.stringify(user));
}

async function exchangeCodeForTokens(code, codeVerifier) {
    const response = await fetch(
        `${APP_CONFIG.COGNITO_DOMAIN}/oauth2/token`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                client_id: APP_CONFIG.COGNITO_CLIENT_ID,
                code,
                redirect_uri: APP_CONFIG.COGNITO_REDIRECT_URI,
                code_verifier: codeVerifier
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error_description || data.error || "Failed to sign in.");
    }

    return data;
}

async function handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error_description") || params.get("error");

    if (error) {
        throw new Error(error);
    }

    if (!code || !state) {
        throw new Error("Missing Cognito authorization response.");
    }

    const pkce = JSON.parse(sessionStorage.getItem("examPkce") || "null");

    if (!pkce || pkce.state !== state) {
        throw new Error("Invalid sign-in state. Please try again.");
    }

    const tokens = await exchangeCodeForTokens(code, pkce.codeVerifier);
    sessionStorage.removeItem("examPkce");
    saveAuthSession(tokens);
    window.location.href = "myfiles.html";
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await handleCallback();
    } catch (error) {
        setStatus("callbackStatus", error.message, "err");
    }
});
