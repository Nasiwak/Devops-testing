import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import '../Login.css'
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Signup() {
    const API_BASE_URL = import.meta.env.VITE_API_URL;
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
        if(!formData.email || !formData.name || !formData.phone_number || !formData.password ){
            toast.error("Fill All Required Fields ")
            return
        }
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
                    toast.error("User already exists. Please log in.")
                } else if (errorData.error === "A user with this phone number already exists.") {
                    setError("Phone number already in use. Please log in.");
                    toast.error("Phone number already in use. Please log in")
                } else {
                    setError("Signup failed. Please check your details.");
                    toast.error("Signup failed. Please check your details.")
                }
            } else {
                toast.error("Signup failed. Please try again later.")
            }
            console.error("Signup Error:", err.response?.data);
        }
    };

    return (
        <motion.div
            className="d-flex align-items-center justify-content-center vh-100 bg-light">
            <div className="p-5 shadow-lg rounded-3 bg-white">
                <h2 className="text-center auth-title"> Nasiwak Messenger </h2>

                {/* {error && <div className="alert alert-danger text-center">{error}</div>} */}

                <form onSubmit={handleSubmit}>

                    
                        <div className="d-flex flex-row text-center align-items-center justify-content-center gap-2 mb-3 ">
                            <label className="form-label">Name</label>
                            <input
                                type="text"
                                name="name"
                                className="form-control input-field w-100"
                                placeholder="Enter full name"
                                onChange={handleChange}
                                
                            />
                        </div>

                        <div className="d-flex flex-row text-center align-items-center justify-content-center gap-2 mb-3">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                name="email"
                                className="form-control input-field"
                                placeholder="Enter email"
                                onChange={handleChange}
                                
                            />
                        </div>

                        <div className=" d-flex flex-row text-center align-items-center justify-content-center gap-2 mb-3">
                            <label className="form-label">Number</label>
                            <input
                                type="text"
                                name="phone_number"
                                className="form-control input-field"
                                placeholder="Enter phone number"
                                onChange={handleChange}
                            />
                        </div>

                        <div className="d-flex flex-row text-center align-items-center justify-content-center gap-2  mb-4">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                name="password"
                                className="form-control input-field"
                                placeholder="Enter password"
                                onChange={handleChange}
                                
                            />
                        </div>
                    

                    <button type="submit" className="auth-button">Sign Up</button>
                </form>

                <div className="d-flex flex-row text-center align-items-center justify-content-center gap-2 mt-4">
                    <span>Already have an account? </span>
                    <button
                        type="button"
                        onClick={() => navigate("/login")}
                        className="btn btn-link auth-link p-0 text-decoration-none"
                    >
                        Login
                    </button>
                </div>
            </div>
            <ToastContainer/>
        </motion.div>

    );
}
