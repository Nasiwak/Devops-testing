import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../profile.css';
import axios from 'axios';

const GroupProfile = () => {
    const API_BASE_URL = import.meta.env.VITE_API_URL;
    // const API_BASE_URL = "https://192.168.0.121/api";
    // const API_BASE_URL = "http://127.0.0.1:8001/api";
    const navigate = useNavigate();
    const location = useLocation();
    const { selectedGroup, isAdmin } = location.state || {};
    const [option, setOption] = useState('members')
    const [groupData, setGroupData] = useState({ name: selectedGroup?.name || '' });
    const [connectedUser, setConnectedUsers] = useState([])

    console.log(selectedGroup.members)

    const fetchConnectedUsers = async () => {
        try {
            const resp = await axios.get(`${API_BASE_URL}/chat/auth/get-connected-users/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            console.log(resp.data)
            setConnectedUsers(resp.data)
        } catch (err) {
            console.error("Error fetching connected users:", err);
        }
    };

    const fetchGroupInfo = async () => {
        try {
            await axios.get(`${API_BASE_URL}/chat/auth/group/${selectedGroup.id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        if (selectedGroup) {
            fetchGroupInfo();
            fetchConnectedUsers()
        }
    }, [selectedGroup]);


    const handleDeleteUser = async (id) => {
        try {
            console.log(id)
        } catch (error) {
            console.log(error)
        }
    }


    const handleUpdateGroup = async (e) => {
        e.preventDefault();
        try {
            setOption('members')
            setGroupData({
                name: selectedGroup.name
            })

            const response = await axios.put(`${API_BASE_URL}/chat/auth/group/${selectedGroup?.id}`,
                { name: groupData.name },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );

            console.log("Group updated successfully:", response.data);
        } catch (error) {
            console.error("Error updating group:", error);
        }
    };


    const handleAddUser = async (userId) => {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/chat/api/group/${selectedGroup.id}/add-members/`,
            {groupId: selectedGroup.id,userId: userId,  },
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, }  );
      
          if (response.status === 200) {
            alert("User added successfully!");
      
            fetchGroupInfo();
          }
        } catch (error) {
          console.error("Error adding user:", error);
          alert("Failed to add user. Try again.");
        }
      };
      
      


    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
    };

    const handleChange = (e) => {
        setGroupData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }




    // const dummyMembers = [
    //     { name: "John Doe", role: "Admin" },
    //     { name: "Jane Smith", role: "Member" },
    //     { name: "Alice Johnson", role: "Member" },
    //     { name: "Bob Brown", role: "Member" },
    // ];

    return (
        <>
            <nav className="navbar bg-body-tertiary">
                <div className="container-fluid me-2 d-flex">
                    <div className="d-flex flex-wrap text-center justify-content-center align-items-center">
                        <button className="border rounded-circle shadow bg-white me-2" onClick={() => navigate('/chatpage')}>
                            <i className="fa-solid fa-arrow-left profile-icon"></i>
                        </button>
                        <span className="navbar-brand fw-bold"
                            style={{
                                background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}>
                            Messenger
                        </span>
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

            <div className='container-fluid py-5'>
                <div className='row d-flex justify-content-center align-items-stretch flex-wrap gap-3'>


                    <div className='col-12 col-md-3 mb-2 p-3 d-flex flex-column align-items-center border shadow-lg rounded text-center text-md-start'>
                        <div className='text-center img-con mb-3'>
                            <div className='text-center img-con'>
                                <h1> {selectedGroup?.name?.charAt(0).toUpperCase()}</h1>
                            </div>
                        </div>

                        <div className='text-center'>
                            <h5 className='fw-bold profile-icon mt-2 mb-3'>
                                {groupData?.name?.charAt(0).toUpperCase() + groupData?.name?.slice(1)}
                            </h5>
                            <p >
                                <span className='me-2 profile-icon'><i className="fa-solid fa-users"></i></span>
                                <span className='fw-bold'> {selectedGroup.members.length} </span> <span className='text-muted'>Members</span>
                            </p>
                            <p className='text-muted'>
                                <i className="fa-regular fa-calendar me-2 profile-icon"></i>
                                Created on: {new Date(selectedGroup?.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>


                    <div className='col-12 col-md-8 mb-2 p-3 border shadow-lg rounded text-center text-md-start'>
                        {option === 'members' && (

                            <>
                                <div className='text-end  mt-3'>
                                    <div className='d-flex gap-2 justify-content-end'>
                                        <small><button className='btn btn-sm profile-btn' onClick={() => setOption('addUser')} ><span><i className="fa-solid fa-user-plus me-2"></i></span>Add User</button></small>
                                        <small><button className='btn btn-sm profile-btn' onClick={() => setOption('edit')} ><span><i class="fa-solid fa-pen-to-square me-2"></i></span>Edit</button></small>
                                        <small><button className='btn btn-sm profile-btn' onClick={() => setOption('setting')}><i className="fa-solid fa-gear"></i></button></small>
                                    </div>
                                </div>

                                <div>
                                    <p className='profile-icon mb-3'>Group Members:</p>
                                    <ul className='list-group'>
                                        {dummyMembers.map((member, id) => (
                                            <li key={id} className='list-group-item d-flex justify-content-between align-items-center'>
                                                <div className='d-flex align-items-center'>
                                                    <div className="rounded-circle profile-btn text-white d-flex justify-content-center align-items-center me-3" style={{ width: "35px", height: "35px" }}>
                                                        {member.name.charAt(0)}
                                                    </div>
                                                    <span>{member.name}</span>
                                                </div>
                                                {isAdmin && <small><button className='btn profile-btn btn-sm' onClick={() => handleDeleteUser(id)}>
                                                    <i class="fa-solid fa-trash"></i>
                                                </button> </small>}

                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>)}


                        {option === 'addUser' && (
                            <>
                                <div className='text-end mt-3'>
                                    <div className='d-flex gap-2 justify-content-end'>
                                        <small>
                                            <button className='btn btn-sm profile-btn' onClick={() => setOption('members')}>
                                                <i className="fa-solid fa-arrow-left me-2"></i>Back
                                            </button>
                                        </small>
                                    </div>
                                </div>

                                <div>
                                    <p className='profile-icon mb-3'>Add New Members:</p>
                                    <ul className='list-group'>
                                        {connectedUser
                                            .filter(user => !selectedGroup.members.includes(user.id))
                                            .map(user => (
                                                <li key={user.id} className='list-group-item d-flex justify-content-between align-items-center'>
                                                    <div className='d-flex align-items-center'>
                                                        <div className="rounded-circle profile-btn text-white d-flex justify-content-center align-items-center me-3" style={{ width: "35px", height: "35px" }}>
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span>{user.name}</span>
                                                    </div>
                                                    <small>
                                                        <button className='btn btn-sm profile-btn' onClick={() => handleAddUser(user.id)}>
                                                            <i className="fa-solid fa-user-plus"></i>
                                                        </button>
                                                    </small>
                                                </li>
                                            ))}
                                    </ul>
                                </div>
                            </>
                        )}






                        {option === 'setting' && (<>
                            <div className='d-flex gap-2 justify-content-end'>
                                <small><button className='btn profile-btn btn-sm' onClick={(() => setOption('members'))}  ><i class="fa-solid fa-arrow-left"></i> <span>Back</span> </button></small>
                            </div>
                            <div className='mt-3'>
                                <p className='profile-icon mb-3'>Settings :</p>
                            </div>
                        </>)}



                        {option === 'edit' && (<>
                            <div className='d-flex gap-2 justify-content-end'>
                                <small><button className='btn profile-btn btn-sm' onClick={(() => setOption('members'))}  ><i class="fa-solid fa-arrow-left"></i> <span>Back</span> </button></small>

                            </div>
                            <div className='mt-3'>
                                <p className='profile-icon mb-3'>Edit Group :</p>
                            </div>
                            <div className='mt-2'>
                                <form onSubmit={handleUpdateGroup}>
                                    <div className='mb-3'>
                                        <label htmlFor="groupName" className='form-label'>Group Name</label>
                                        <input
                                            type="text"
                                            className='form-control'
                                            id="groupName"
                                            value={groupData.name}
                                            name='name'
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className='mt-4'>
                                        <small><button type="submit" className='btn profile-btn btn-sm'>Update</button></small>
                                    </div>
                                </form>

                            </div>
                        </>)}

                    </div>
                </div>
            </div>
        </>
    );
};

export default GroupProfile;
