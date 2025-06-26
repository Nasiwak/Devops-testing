import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";

export default function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const API_BASE_URL = import.meta.env.VITE_API_URL;


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
    
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login/`, formData, {
                headers: { "Content-Type": "application/json" },
                withCredentials: true, // ✅ Ensure cookies are sent
                validateStatus: (status) => status < 500, // ✅ Prevent automatic rejection of 4xx/5xx responses
            });
    
            console.log("Login Successful:", response.data);
            localStorage.setItem("token", response.data.token.access);
            localStorage.setItem("user_email", formData.email);
            localStorage.setItem("is_admin",response.data.user.is_admin)
            setTimeout(() => {
                console.log("Redirecting to chat page...");
                navigate("/chatpage"); // ✅ Ensure this executes
            }, 1000);
        } catch (err) {
            console.error("Login Error:", err);
            setError("Login failed.");
            console.error("Full Axios Error:", err); // ✅ Log the full error object
            console.error("Login Error Response:", err.response?.data);
    
            if (err.response) {
                setError(err.response.data?.error || "Login failed.");
            } else if (err.request) {
                setError("No response from server.");
            } else {
                setError("An unknown error occurred.");
            }
        }
    };

    return (
        <motion.div
            className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.5 }}
        >
            <div className="card-container">
                <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
                    Login to Nasiwak Messenger
                </h2><br />
                {error && <p className="text-red-500 text-center">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Email</label>
                    <input type="email" name="email" placeholder="Email" className="input-field" onChange={handleChange} required />
                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Password</label>
                    <input type="password" name="password" placeholder="Password" className="input-field" onChange={handleChange} required />
                    <button type="submit" className="auth-button">Login</button>
                </form>
                <p className="text-center mt-4">
                    Don't have an account?{" "}
                    <button onClick={() => navigate("/signup")} className="text-blue-500">Sign Up</button>
                </p>
            </div>
        </motion.div>
    );
}
