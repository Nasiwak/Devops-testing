import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../profile.css';

const Profile = () => {
    const API_BASE_URL = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();

    const [user, setUser] = useState({
        name: '',
        email: ''
    });
    const [isEdit, setIsEdit] = useState(false);

    const fetchUserDetails = async () => {
        try {
            const userEmail = localStorage.getItem("user_email");
            if (!userEmail) return;
            const response = await axios.get(`${API_BASE_URL}/chat/auth/user/${userEmail}/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            setUser({
                name: response.data.name,
                email: response.data.email
            });
        } catch (err) {
            console.error("Error fetching current user:", err);
        }
    };

    useEffect(() => {
        fetchUserDetails();
    }, []);

    const handleEdit = (e) => {
        e.preventDefault();
        setIsEdit(true);
    };

    const handleChange = (e) => {
        setUser((prev) => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleCancel = (e) => {
        e.preventDefault();
        fetchUserDetails();
        setIsEdit(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${API_BASE_URL}/chat/auth/user/update/`, user, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            setIsEdit(false);
        } catch (err) {
            console.error("Error updating user:", err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
    };

    return (
        <>
            <nav className="navbar bg-body-tertiary">
                <div className="container-fluid me-2 d-flex">
                    <div className='d-flex flex-wrap text-center justify-content-center align-items-center'>
                        <button className="btn border-0" onClick={() => navigate('/chatpage')}><i className="fa-solid fa-ellipsis-vertical"></i></button>
                        <a className="navbar-brand fw-bold"
                            style={{
                                background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}>Messenger</a>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="btn border"
                        style={{
                            background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        <i className="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            </nav>

            <div className='container-fluid p-5 '>
                <div className='row d-flex flex-wrap gap-4 '>

                    <div className='col-12 col-md-3 border-end shadow-lg border rounded d-flex flex-column align-items-center text-center'>
                        <div className='p-5'>
                            <div className='text-center img-con'>
                                <h1 className='text-center'>{user.name.charAt(0).toUpperCase()}</h1>
                            </div>
                            <div className='mt-4'>
                                <h5 className='border-bottom d-inline '>Profile</h5>
                                <div className='mt-3'>
                                    <p className='mb-2 '><span className='text-secondary'>{user.name}</span></p>
                                    <p className=''><span className='text-secondary'>{user.email}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>



                    <div className='col-12 col-md-8 rounded shadow-lg border'>
                        <div className='p-5 mt-4'>
                            <h5 className='border-bottom d-inline text-primary'>{isEdit ? "Edit Profile":"User Details"} </h5>
                            <form className='mt-4'>
                                <div className='mb-3'>
                                    <label htmlFor="name" className='form-label'>Name</label>
                                    <input type="text" value={user.name} className='form-control' name='name'
                                        onChange={handleChange} disabled={!isEdit} />
                                </div>
                                <div className='mb-3'>
                                    <label htmlFor="email" className='form-label'>Email</label>
                                    <input type="text" value={user.email} className='form-control' name='email'
                                        onChange={handleChange} disabled={!isEdit} />
                                </div>

                                <div className='d-flex flex-wrap justify-content-between mt-4'>
                                    {!isEdit ? (
                                        <button className='btn btn-primary btn-sm' onClick={handleEdit}>
                                            <i className="fa-solid fa-pen-to-square"></i> Edit
                                        </button>
                                    ) : (
                                        <div className='d-flex flex-wrap'>

                                            <button className='btn btn-success me-2 btn-sm' onClick={handleSave}>
                                                Save
                                            </button>
                                            <button className='btn btn-secondary  btn-sm' onClick={handleCancel}>
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}

export default Profile;
