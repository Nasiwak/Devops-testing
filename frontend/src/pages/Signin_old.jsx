import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";

export default function Signup() {
    const API_BASE_URL = import.meta.env.VITE_API_URL;
    // const API_BASE_URL = "https://192.168.0.141/api";
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone_number: "",
        password: ""
    });
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
    
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/signup/`, formData);
            console.log("Signup Successful:", response.data);
            navigate("/login"); // Redirect to login page after signup
        } catch (err) {
            if (err.response) {
                const errorData = err.response.data;
                if (errorData.error === "A user with this email already exists.") {
                    setError("User already exists. Please log in.");
                } else if (errorData.error === "A user with this phone number already exists.") {
                    setError("Phone number already in use. Please log in.");
                } else {
                    setError("Signup failed. Please check your details.");
                }
            } else {
                setError("Signup failed. Please try again later.");
            }
            console.error("Signup Error:", err.response?.data);
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
                    Create a Nasiwak Messenger Account
                </h2><br />
                {error && <p className="text-red-500 text-center">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                    <input type="text" name="name" placeholder="Full Name" className="input-field" onChange={handleChange} required />
                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Email</label>
                    <input type="email" name="email" placeholder="Email" className="input-field" onChange={handleChange} required />
                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                    <input type="text" name="phone_number" placeholder="Phone Number" className="input-field" onChange={handleChange} />
                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Password</label>
                    <input type="password" name="password" placeholder="Password" className="input-field" onChange={handleChange} required />
                    <button type="submit" className="auth-button">Sign Up</button>
                </form>
                <p className="text-center mt-4">
                    Already have an account?{" "}
                    <button onClick={() => navigate("/login")} className="text-blue-500">Login</button>
                </p>
            </div>
        </motion.div>
    );
}
