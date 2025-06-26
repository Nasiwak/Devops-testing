export const isAuthenticated = () => {
    const token = localStorage.getItem("token");
    return token ? true : false;
};

export const logout = () => {
    localStorage.removeItem("token");      // ✅ Remove authentication token
    localStorage.removeItem("user_email"); // ✅ Remove only session-related data
    localStorage.removeItem("chatUsers");   // ✅ Ensure chat users reset on login
    localStorage.removeItem("messages"); // ✅ Ensure messages reset on login

    // ✅ Keep chat users & messages stored (do not clear localStorage completely)
    
    window.location.href = "/login"; // Redirect to login
};
