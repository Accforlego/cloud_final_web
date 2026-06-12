let user = null;

function getSelectedCourses() {
    return Array.from(document.querySelectorAll("input[name='course']:checked"))
        .map((input) => input.value);
}

function setSelectedCourses(courses) {
    document.querySelectorAll("input[name='course']").forEach((input) => {
        input.checked = courses.includes(input.value);
    });
}

async function saveProfile() {
    // const user = await getCurrentUser();
    const role = document.getElementById("roleSelect").value;
    const courses = getSelectedCourses();

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    if (!role) {
        setStatus("profileStatus", "請選擇身分。", "err");
        return;
    }

    if (!courses.length) {
        setStatus("profileStatus", "請至少選擇一門課程。", "err");
        return;
    }

    const nextUser = {
        ...user,
        role,
        courses
    };

    try {
        setStatus("profileStatus", "Saving profile...");

        if (APP_CONFIG.PROFILE_API_PATH) {
            await profile_api(
                APP_CONFIG.PROFILE_API_PATH,
                {
                    method: "POST",
                    body: JSON.stringify({
                        role,
                        courses
                    })
                }
            );
        }

        localStorage.setItem(`examProfile:${user.sub || user.user_id}`, JSON.stringify({ role, courses }));
        localStorage.setItem("examUser", JSON.stringify(nextUser));
        window.location.href = "myfiles.html";
    } catch (error) {
        setStatus("profileStatus", error.message, "err");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    user = await getCurrentUser();

    // if (!user) {
    //     return;
    // }

    document.getElementById("roleSelect").value = user.role || "student";
    setSelectedCourses(user.courses || []);
    document.getElementById("saveProfileBtn").addEventListener("click", saveProfile);
});
