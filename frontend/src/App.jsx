import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/SignUp";
import ChatPage from "./pages/Chatone";
// import ChatPage from "./pages/ChatPage";
// import ChatPage from "./pages/ChatPageNew";
// import ChatPage from "./pages/Chat";
import AdminPanel from "./pages/AdminPanel";
import Profile from "./pages/Profile";
import GroupProfile from "./pages/GroupProfile";
import { isAuthenticated } from "./utils/auth";
// import DarkModeToggle from "./components/DarkModeToggle";


function App() {
    return (
        <Router>
                {/* <DarkModeToggle /> */}
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                {/* <Route path="/chatpage" element={<ChatPage />} /> */}
                {/* Protect ChatPage: Redirect if not logged in */}
                <Route path="/chatpage" element={isAuthenticated() ? <ChatPage /> : <Navigate to="/login" />} />
                <Route path="/admin" element={isAuthenticated() ? <AdminPanel /> : <Navigate to="/login" />} />
                <Route path="/profile" element={isAuthenticated() ? <Profile /> : <Navigate to="/login" />} />
                <Route path="/GroupProfile" element={isAuthenticated() ? <GroupProfile /> : <Navigate to="/login" />} />
                <Route path="/" element={<Navigate to="/login" />} />
            </Routes>
        </Router>
    );
}

export default App;
