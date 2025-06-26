import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Admin.css';
import axios from 'axios';
import DataTable from 'react-data-table-component';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AdminPanel = () => {
    const navigate = useNavigate();
    const API_BASE_URL = import.meta.env.VITE_API_URL;
    const [activeTab, setActiveTab] = useState('Home');
    const [isCreateUser, setIsCreateUser] = useState(false);
    const [newUser, setNewUser] = useState({
        name: "",
        email: "",
        phone_number: "",
        password: ""
    });
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEdit, setIsEdit] = useState(null);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/auth/users/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            setUsers(response.data.filter(user => !user.is_admin));
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();

        try {
            if (isEdit) {
                await axios.put(`${API_BASE_URL}/auth/users/update/${updateUser.id}/`, newUser, {
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                });
            } else {
                await axios.post(`${API_BASE_URL}/auth/users/create/`, newUser, {
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                });
            }
            fetchUsers();
            setNewUser({ name: "", email: "", phone_number: "", password: "" });
            setIsCreateUser(false);
            setIsEdit(null);
            if (isEdit) {
                toast.success('User Updated Successfully')
            } else {
                toast.success('User Added Successfully')
            }
        } catch (error) {
            console.error("Error saving user:", error);
            toast.error('Something Went Wrong ')
        }
    };



    const handleDeleteUser = async (id) => {
        try {
            await axios.delete(`${API_BASE_URL}/auth/users/delete//${id}/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            fetchUsers();
            toast.success('User Deleted Successfully')
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error('Error While Delete User')
        }
    };


    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const filterUsers = users.filter((user) => (
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone_number.toLowerCase().includes(searchTerm.toLowerCase())
    ));

    const handleEdituser = (user) => {
        setIsEdit(user);
        setNewUser({
            name: user.name,
            email: user.email,
            phone_number: user.phone_number,
            password: user.password,
        });
        setIsCreateUser(true);
    };

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
    };

    const columns = [
        {
            name: 'Name',
            selector: row => row.name,
            sortable: true,
        },
        {
            name: 'Email',
            selector: row => row.email,
            sortable: true,
        },
        {
            name: 'Phone Number',
            selector: row => row.phone_number,
        },
        {
            name: 'Actions',
            cell: row => (
                <div className='d-flex gap-2'>
                    <button className='btn btn-sm user-btn text-white' onClick={() => handleEdituser(row)}><i className="fa-solid fa-pen-to-square"></i></button>
                    <button className='btn btn-sm user-btn text-white' onClick={() => handleDeleteUser(row.id)}><i className="fa-solid fa-trash"></i></button>
                </div>
            ),
        },
    ];

    const sideBar = [
        { name: 'Home', icon: <i className="fa-solid fa-house-chimney"></i> },
        { name: "Users", icon: <i className="fa-solid fa-users"></i> }
    ];

    return (
        <>
            <nav className="navbar bg-body-tertiary shadow-sm">
                <div className="container-fluid me-2 d-flex">
                    <div className='d-flex flex-wrap text-center justify-content-center align-items-center'>
                        <button
                            className="border rounded-circle shadow bg-white me-2"
                            onClick={() => navigate('/chatpage')}
                        >
                            <i className="fa-solid fa-arrow-left profile-icon"></i>
                        </button>
                        <a
                            className="navbar-brand fw-bold"
                            style={{
                                background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            Messenger
                        </a>
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

            <div className="container-fluid p-0">
                <div className="d-flex flex-wrap">
                    <div className="col-12 col-md-2 px-3 border-end vh-100 shadow-sm bg-light">
                        <ul className="list-unstyled mt-3 text-center">
                            {sideBar.map((item, id) => (
                                <li
                                    key={id}
                                    onClick={() => setActiveTab(item.name)}
                                    className={`Tab-Item p-2 mb-3 d-flex align-items-center rounded ${activeTab === item.name ? "active-Tab" : ""}`}
                                >
                                    <span className='me-2 border item-icon'>{item.icon}</span>
                                    <span>{item.name}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="col-12 col-md-10 p-4">
                        {activeTab === 'Home' && (
                            <div>
                                <h4 className='title'>Welcome, Admin!</h4>
                                <p className="text-muted">Here’s a quick summary of your dashboard.</p>

                                <div className="row mt-4 text-center">
                                    <div className="col-md-3 ">
                                        <div className="card p-3 shadow-sm">
                                            <h5>Total Users</h5>
                                            <p className='fw-bold fs-5 title'>{users.length}</p>
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="card p-3 shadow-sm">
                                            <h5>Groups</h5>
                                            <p className='fw-bold fs-5 title'>10</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Users' && (
                            <div>
                                <div className='d-flex justify-content-between'>
                                    <h4 className='title'>User Details</h4>
                                    {!isCreateUser && (
                                        <>
                                            <input type="search" className='form-control w-50 border-2'  placeholder='Search User' value={searchTerm} onChange={handleSearch} />
                                            <button className='btn btn-sm btn-primary user-btn' onClick={() => setIsCreateUser(true)}
                                                >
                                                <i className="fa-solid fa-user-plus me-1"></i> Create User
                                            </button>
                                        </>
                                    )}
                                </div>

                                {isCreateUser ? (
                                    <>
                                        <div className='d-flex flex-wrap justify-content-between mt-4'>
                                            <h5>{isEdit ? "Edit User" : "Create New User"}</h5>
                                            <button className='btn btn-sm btn-secondary' onClick={() => { setIsCreateUser(false); setIsEdit(null); setNewUser({ name: "", email: "", phone_number: "", password: "" }); }}>Back</button>
                                        </div>
                                        <form onSubmit={handleCreateUser} className='mt-3'>
                                            <div className='row'>
                                                <div className='col-md-6 mb-3'>
                                                    <input type="text" className='form-control' placeholder="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required />
                                                </div>
                                                <div className='col-md-6 mb-3'>
                                                    <input type="email" className='form-control' placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
                                                </div>
                                                <div className='col-md-6 mb-3'>
                                                    <input type="text" className='form-control' placeholder="Phone Number" value={newUser.phone_number} onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })} />
                                                </div>
                                                <div className='col-md-6 mb-3'>
                                                    <input type="password" className='form-control' placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required={!isEdit} />
                                                </div>
                                            </div>
                                            <button type="submit" className='btn btn-primary user-btn btn-sm'>{isEdit ? "Update" : "Submit"}</button>
                                        </form>
                                    </>
                                ) : (
                                    <div className='mt-4 border p-2 rounded'>
                                        <DataTable
                                            columns={columns}
                                            data={filterUsers}
                                            pagination
                                            highlightOnHover
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <ToastContainer />
            </div>
        </>
    );
};

export default AdminPanel;