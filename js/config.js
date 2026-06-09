const APP_CONFIG = {
    API_BASE_URL: "https://xl9llcfw6d.execute-api.ap-southeast-2.amazonaws.com/prod",

    // Replace these values after creating the Cognito User Pool app client.
    COGNITO_DOMAIN: "https://ap-southeast-2mcs3uji9u.auth.ap-southeast-2.amazoncognito.com",
    COGNITO_CLIENT_ID: "3nlc24731u3hc49smsov40l5e6",
    COGNITO_REDIRECT_URI: `${window.location.origin}/callback.html`,
    COGNITO_LOGOUT_URI: `${window.location.origin}/index.html`,
    COGNITO_SCOPES: "openid email profile",

    // Optional: set this to your backend route if you want to persist role/courses.
    // The backend should verify the Cognito token and update Cognito custom attributes
    // or your user profile table.
    PROFILE_API_PATH: "/profile"
};

const COURSE_NAMES = {
    compiler: "Compiler Design",
    os: "Operating System"
};

const ROLE_NAMES = {
    teacher: "老師",
    ta: "助教",
    student: "學生"
};

const DEMO_COURSES = [
    {
        course_id: "compiler",
        course_name: "Compiler Design"
    },
    {
        course_id: "os",
        course_name: "Operating System"
    }
];
