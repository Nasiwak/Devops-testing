import React, { useState } from "react";
import { Home, Info, Phone, Moon, LogOut, Menu, X } from "lucide-react";
import DarkModeToggle from "./DarkModeToggle";

const TopNavbar = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "83%",
        background: "#333",
        color: "#fff",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.2)",
        zIndex: 1000,
        // flexDirection: "column"
      }}
    >
       {/* Left Side - Logo or App Name */}
      {/* <div style={{ fontSize: "20px", fontWeight: "bold" }}>Nasiwak Messenger</div>  */}

      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          top: 0,
          right: 0,
          background: "none",
          border: "none",
          color: "white",
          cursor: "pointer",
          position: "relative", // Ensures button stays above the menu
          zIndex: 1100, // Higher than menu's z-index
        }}
      >
        {isExpanded ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Navigation Links - Sliding Menu */}
      <ul
        style={{
          listStyle: "none",
          display: "flex",
          gap: "10px",
          padding: 0,
          margin: 0,
          top: 0,
          position: "absolute",
        //   top: "100%",
          right: isExpanded ? "0" : "-100%",
          background: "#333",
          width: "75%",
          transition: "right 0.3s ease-in-out",
          flexDirection: "row",
          justifyContent: "center",
        }}
      >
        {[{ icon: <Home size={24} />, label: "Home" },
          { icon: <Info size={24} />, label: "About" },
          { icon: <Phone size={24} />, label: "Contact" },
          { icon: <Moon size={24} />, label: "Dark Mode", action: () => console.log("Toggle Dark Mode") },
          // { icon: <DarkModeToggle />, label: "Dark Mode" },
          // { icon: <LogOut size={24} />, label: "Logout", action: () => alert("Logged Out!") }
          { icon: <LogOut size={24} />, label: "Logout", action: () => {
            localStorage.removeItem("accessToken");  // Remove JWT token
            localStorage.removeItem("refreshToken");
            window.location.href = "/login";  // Redirect to login page
        }}
        ].map((item, index) => (
          <li
            key={index}
            style={{ display: "flex", alignItems: "center", cursor: "pointer", padding: "10px" }}
            onClick={item.action}
          >
            {item.icon}
            <span style={{ marginLeft: "8px" }}>{item.label}</span>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default TopNavbar;
