import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import '../Login.css'
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


export default function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const API_BASE_URL = import.meta.env.VITE_API_URL;


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.email || !formData.password) {
            toast.error("Fill All Required Field")
            return
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login/`, formData, {
                headers: { "Content-Type": "application/json" },
                withCredentials: true,
                validateStatus: (status) => status < 500, // ✅ Prevent automatic rejection of 4xx/5xx responses
            });

            localStorage.setItem("token", response.data.token.access);
            localStorage.setItem("user_email", formData.email);
            localStorage.setItem("is_admin", response.data.user.is_admin)

            setTimeout(() => {
                console.log("Redirecting to chat page...");
                navigate("/chatpage"); // ✅ Ensure this executes
            }, 1000);


        } catch (err) {
            if (err.response) {
                toast.error(err.response.data?.error || "Login failed.")
            } else if (err.request) {
                toast.error("No response from server.")
            } else{
                toast.error("Invalid Credentials")
            }
        }
    };

    return (
        <motion.div
            className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
            <div className="card-container">
                <h2 className="text-center auth-title">Nasiwak Messenger</h2>


                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            name="email"
                            className="form-control input-field"
                            placeholder="Enter your email"
                            onChange={handleChange}

                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            name="password"
                            className="form-control input-field"
                            placeholder="Enter your password"
                            onChange={handleChange}

                        />
                    </div>

                    <button type="submit" className="auth-button">Login</button>
                </form>

                <div className="d-flex flex-row text-center align-items-center justify-content-center gap-2 mt-4">
                    <span>Don't have an account? </span>
                    <button
                        type="button"
                        onClick={() => navigate("/signup")}
                        className="btn btn-link auth-link p-0 text-decoration-none"
                    >
                        Sign Up
                    </button>
                </div>

            </div>
            <ToastContainer />
        </motion.div>


    );
}
