import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../profile.css';
import { useTranslation } from "react-i18next";
import i18n from "../i18n"; 

const Profile = () => {
    const { t } = useTranslation();
    // const API_BASE_URL = "https://15.206.20.30/api";
    const API_BASE_URL = import.meta.env.VITE_API_URL;
    // const API_BASE_URL = "http://127.0.0.1:8001/api";
    const navigate = useNavigate();

    const [user, setUser] = useState({
        name: '',
        email: '',
        number: ''
    });
    const [isEdit, setIsEdit] = useState(false);
    const [language, setLanguage] = useState("English");

    const fetchUserDetails = async () => {
        try {
            const userEmail = localStorage.getItem("user_email");
            if (!userEmail) return;
            const response = await axios.get(`${API_BASE_URL}/chat/auth/user/${userEmail}/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            setUser({
                name: response.data.name,
                email: response.data.email,
                number: response.data.number || '7868093357'
            });
            console.log(response.data)

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

   
    const handleLanguageChange = (event) => {
        const selectedLang = event.target.value;
        setLanguage(selectedLang);
        i18n.changeLanguage(selectedLang); 
      };

  

    return (
        <>
            <nav className="navbar bg-body-tertiary">
                <div className="container-fluid me-2 d-flex">
                    <div className='d-flex flex-wrap text-center justify-content-center align-items-center'>
                        <button className="border  rounded-circle shadow bg-white me-2" onClick={() => navigate('/chatpage')}><i class="fa-solid  fa-arrow-left profile-icon"></i></button>
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

            <div className='container-fluid px-5 mt-4 '>
                <div className='row d-flex flex-wrap gap-4  justify-content-center'>

                    <div className='col-12 col-md-3 border-end shadow-lg border rounded d-flex flex-column align-items-center '>
                        <div className='p-5'>
                            <div className='text-center img-con'>
                                <h1 className='text-center'>{user.name.charAt(0).toUpperCase()}</h1>
                            </div>
                            <div className='mt-4'>
                                <h5 className='border-bottom d-inline text-start profile-icon'>{t('My Space')}</h5>
                                <div className='mt-3 text-start'>
                                    <p className='mb-2 '><span><i class="fa-solid fa-signature me-2 profile-icon"></i></span><span className='text-secondary'>{user.name}</span></p>
                                    <p className='mb-2'><span><i class="fa-solid fa-envelope me-2 profile-icon"></i></span><span className='text-secondary'>{user.email}</span></p>
                                    <p className='mb-2'><span><i class="fa-solid fa-phone-volume me-2 profile-icon"></i></span><span className='text-secondary'>{user.number}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>



                    <div className='col-12 col-md-8 rounded shadow-lg border'>

                        <div className='p-5 '>
                            <div className='d-flex justify-content-end align-items-center gap-2'>
                                <label htmlFor="languageSelect" className='form-label profile-icon'>{t("language")}:</label>
                                <select id="languageSelect" className='form-select w-auto' name='language' value={language} onChange={handleLanguageChange}>
                                <option value="English">English</option>
                                <option value="Japanese">日本語</option>
                                </select>
                            </div>

                            <h5 className='border-bottom d-inline profile-icon'>{isEdit ? t("edit_profile") : t("user_details")} </h5>
                            <form className='mt-4'>
                                <div className='mb-3'>
                                    <label htmlFor="name" className='form-label'>{t("name")}</label>
                                    <input type="text" value={user.name} className='form-control' name='name'
                                        onChange={handleChange} disabled={!isEdit} />
                                </div>
                                <div className='mb-3'>
                                    <label htmlFor="email" className='form-label'>{t("email")}</label>
                                    <input type="text" value={user.email} className='form-control' name='email'
                                        onChange={handleChange} disabled />
                                </div>
                                <div className='mb-3'>
                                    <label htmlFor="number" className='form-label'>{t("number")}</label>
                                    <input type="text" value={user.number} className='form-control' name='number'
                                        onChange={handleChange} disabled={!isEdit} />
                                </div>

                                <div className='d-flex flex-wrap justify-content-between mt-4'>
                                    {!isEdit ? (
                                        <button className='btn profile-btn btn-sm' onClick={handleEdit}>
                                            <i className="fa-solid fa-pen-to-square"></i> {t("edit")}
                                        </button>
                                    ) : (
                                        <div className='d-flex flex-wrap'>

                                            <button className='btn profile-btn me-2 btn-sm' onClick={handleSave}>
                                                {t("save")}
                                            </button>
                                            <button className='btn btn-secondary  btn-sm' onClick={handleCancel}>
                                                {t('cancel')}
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









































