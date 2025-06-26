import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaUserEdit, FaUserPlus, FaTrash, FaArrowLeft } from "react-icons/fa";

const AdminPanel = () => {
    const [selectedAction, setSelectedAction] = useState(null);
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ name: "", email: "", phone_number: "", password: "" });
    const [updateUser, setUpdateUser] = useState({ id: "", name: "", phone_number: "", password: "" });
    const [selectedUsers, setSelectedUsers] = useState([]);
    const navigate = useNavigate();
    const [userForUpdate, setUserForUpdate] = useState(null);
    const API_BASE_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/auth/users/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            setUsers(response.data.filter(user => !user.is_admin)); // Exclude Admins
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE_URL}/auth/users/create/`, newUser, {
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            fetchUsers();
            setNewUser({ name: "", email: "", phone_number: "", password: "" });
        } catch (error) {
            console.error("Error creating user:", error);
        }
    };

    const handleCancelUpdate = () => {
        setUserForUpdate(null); // Reset user selection and hide update form
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
    
        // Prepare updated user data
        const updatedData = {
            name: updateUser.name,
            phone_number: updateUser.phone_number,
        };
    
        // Only include password if admin enters a new one
        if (updateUser.password.trim() !== "") {
            updatedData.password = updateUser.password;
        }
    
        try {
            await axios.put(`${API_BASE_URL}/auth/users/update/${updateUser.id}/`, updatedData, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
    
            fetchUsers();
            setUpdateUser({ id: "", name: "", phone_number: "", password: "" }); // Reset form
            setUserForUpdate(null);
        } catch (error) {
            console.error("Error updating user:", error);
        }
    };

    const handleDeleteUsers = async () => {
        if (!window.confirm("Are you sure you want to delete selected users?")) return;
        try {
            for (let id of selectedUsers) {
                await axios.delete(`${API_BASE_URL}/auth/users/delete/${id}/`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                });
            }
            fetchUsers();
            setSelectedUsers([]);
        } catch (error) {
            console.error("Error deleting users:", error);
        }
    };

    const toggleUserSelection = (id) => {
        setSelectedUsers((prev) =>
            prev.includes(id) ? prev.filter((userId) => userId !== id) : [...prev, id]
        );
    };

    return (
        <div style={styles.container}>
            {/* Sidebar */}
            <div style={styles.sidebar}>
                <h3>Admin Panel</h3><br /><br />
                <button onClick={() => setSelectedAction("create")} style={styles.menuButton}> <FaUserPlus /> Create User</button>
                <button onClick={() => setSelectedAction("update")} style={styles.menuButton}> <FaUserEdit /> Update User</button>
                <button onClick={() => setSelectedAction("delete")} style={styles.menuButton}> <FaTrash /> Delete Users</button>
                <button onClick={() => navigate("/chatpage")} style={styles.menuButton}> <FaArrowLeft /> Back to Chat</button>
            </div>

            {/* Main Content */}
            <div style={styles.mainContent}>
                {selectedAction === "create" && (
                    <div style={styles.card}>
                        <h2>Create User</h2>
                        <form onSubmit={handleCreateUser}>
                            <input type="text" placeholder="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} style={styles.input} required />
                            <input type="email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} style={styles.input} required />
                            <input type="text" placeholder="Phone Number" value={newUser.phone_number} onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })} style={styles.input} />
                            <input type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} style={styles.input} required />
                            <button type="submit" style={styles.actionButton}>Create</button>
                        </form>
                    </div>
                )}

                {selectedAction === "update" && (
                    <div>
                        <h2>Update User</h2><br /><br />
                        {userForUpdate ? (
                            <div>
                                <form onSubmit={handleUpdateUser} style={styles.updateForm}>
                                    <input type="text" placeholder="New Name" value={updateUser.name} onChange={(e) => setUpdateUser({ ...updateUser, name: e.target.value })} style={styles.input} required />
                                    <input type="text" placeholder="New Phone Number" value={updateUser.phone_number} onChange={(e) => setUpdateUser({ ...updateUser, phone_number: e.target.value })} style={styles.input} />
                                    <input type="password" placeholder="New Password (Leave blank to keep old password)" value={updateUser.password} onChange={(e) => setUpdateUser({ ...updateUser, password: e.target.value })} />
                                    <button type="submit" style={styles.actionButton}>Update</button>
                                    <button type="button" onClick={handleCancelUpdate} style={styles.cancelButton}>Cancel</button>
                                </form>
                            </div>
                        ) : (
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.tableCell}>Name</th>
                                        <th style={styles.tableCell}>Phone</th>
                                        <th style={styles.tableCell}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id}>
                                            <td style={styles.tableCell}>{user.name}</td>
                                            <td style={styles.tableCell}>{user.phone_number}</td>
                                            <td style={styles.tableCell}>
                                                <button onClick={() => {
                                                    setUpdateUser({ id: user.id, name: user.name, phone_number: user.phone_number, password: "" });
                                                    setUserForUpdate(user);
                                                }} style={styles.editButton}>Edit</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {selectedAction === "delete" && (
                    <div>
                        <h2>Delete Users</h2><br /><br />
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.tableCell}>Select</th>
                                    <th style={styles.tableCell}>Name</th>
                                    <th style={styles.tableCell}>Phone</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td style={styles.tableCell}><input type="checkbox" onChange={() => toggleUserSelection(user.id)} style={styles.checkbox} /></td>
                                        <td style={styles.tableCell}>{user.name}</td>
                                        <td style={styles.tableCell}>{user.phone_number}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button onClick={handleDeleteUsers} style={styles.deleteButton}>Delete Selected Users</button>
                    </div>
                )}
            </div>
        </div>
    );
};

/* CSS Styles */
const styles = {
    container: {
        display: "flex",
        height: "100vh",
        fontFamily: "Arial, sans-serif",
        
    },
    sidebar: {
        width: "260px",
        background: "#333",
        color: "white",
        padding: "20px",
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
    },
    menuButton: {
        background:"rgb(51, 51, 51)",
        display: "block",
        borderBottom: "1px solid #444",
        width: "100%",
        padding: "12px",
        marginBottom: "10px",
        color: "white",
        cursor: "pointer",
        borderRadius: "5px",
        gap: "10px",
        textAlign: "left",
        fontSize: "16px",
    },
    mainContent: {
        marginLeft: "250px",
        padding: "20px",
        flex: 1,
        
    },
    card: {
        background: "#F5DEB3",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
        marginBottom: "30px",
    },
    input: {
        width: "100%",
        padding: "12px",
        margin: "10px 0",
        borderRadius: "4px",
        border: "1px solid #ddd",
        fontSize: "16px",
    },
    actionButton: {
        padding: "12px 20px",
        backgroundColor: "#3498db",
        color: "white",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        fontSize: "16px",
        width: "100%",
        marginTop: "20px",
    },
    cancelButton: {
        padding: "12px 20px",
        backgroundColor: "#e74c3c",
        color: "white",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        fontSize: "16px",
        width: "100%",
        marginTop: "10px",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        marginBottom: "20px",
        backgroundColor: "#F5DEB3",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    },
    tableCell: {
        padding: "12px",
        border: "1px solid #ddd",
        textAlign: "left",
    },
    editButton: {
        padding: "8px 15px",
        backgroundColor: "#f39c12",
        border: "none",
        color: "white",
        borderRadius: "5px",
        cursor: "pointer",
        fontSize: "16px",
    },
    deleteButton: {
        padding: "12px 20px",
        backgroundColor: "#e74c3c",
        color: "white",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        fontSize: "16px",
        width: "100%",
        marginTop: "20px",
    },
    checkbox: {
        width: "20px",
        height: "20px",
        cursor: "pointer",
    },
};

export default AdminPanel;
