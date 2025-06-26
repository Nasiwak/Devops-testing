import React, { useState } from "react";
import { Home, Info, Phone, Menu, X , Moon,LogOut} from "lucide-react"; // Import icons

const SlidingSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Sidebar state

  return (
    <div className="relative">
      {/* Sidebar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: isExpanded ? "150px" : "50px", // Sidebar expands/collapses
          height: "100vh",
          background: "#333",
          color: "#fff",
          padding: "10px",
          transition: "width 0.3s ease-in-out",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: isExpanded ? "flex-start" : "center",
        }}
      >
        {/* Toggle Button (Remains Visible) */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            position: "absolute",
            top: "20px",
            left: isExpanded ? "5px" : "5px", // Keep it inside the screen
            width: "40px",
            height: "40px",
            background: "#555",
            border: "none",
            cursor: "pointer",
            color: "white",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "left 0.3s ease-in-out",
          }}
        >
          {isExpanded ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Sidebar List */}
        <ul style={{ listStyle: "none", padding: 5, marginTop: "80px", width: "100%" }}>
        {[
            { icon: <Home size={24} />, label: "Home" },
            { icon: <Info size={24} />, label: "About" },
            { icon: <Phone size={24} />, label: "Contact" },
          ].map((item, index) => (
            <li
              key={index}
              className="flex items-center p-2 relative group"
              style={{ cursor: "pointer", width: "100%", display: "flex", alignItems: "center" ,alignItems: "center",
                padding: "1px 1px",
                borderRadius: "50px",
                transition: "background 0.3s",
                marginBottom: "15px",}}
            >
              {/* Icon (Always Visible) */}
              <div>{item.icon}</div>

              {/* Text (Hidden When Collapsed, Shown on Hover) */}
              <span
                style={{
                  marginLeft: "10px",
                  opacity: isExpanded ? 1 : 0,
                  transition: "opacity 0.3s ease-in-out",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>

              {/* Tooltip (Only in Collapsed Mode) */}
              {!isExpanded && (
                <span
                  style={{
                    position: "absolute",
                    right: "70px", // Adjust position
                    background: "#555",
                    color: "#fff",
                    padding: "5px 10px",
                    marginLeft: "150px",
                    borderRadius: "50%",
                    opacity: 0,
                    visibility: "hidden",
                    transition: "opacity 0.2s ease-in-out",
                    fontSize: "14px",
                  }}
                  className="group-hover:opacity-100 group-hover:visible"
                >
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ul>
        {/* Bottom Section (Logout & Dark Mode) */}
        <ul style={{ listStyle: "none", width: "100%", paddingBottom: "20px" }}>
          {[
            { icon: <Moon size={24} />, label: "Dark Mode", action: () => setDarkMode(!darkMode) },
            { icon: <LogOut size={24} />, label: "Logout", action: () => alert("Logged Out!") },
          ].map((item, index) => (
            <li
              key={index}
              className="flex items-center p-2 relative group"
              style={{
                cursor: "pointer",
                width: "100%",
                display: "flex",
                alignItems: "center",
                padding: "5px 10px",
                borderRadius: "50px",
                transition: "background 0.3s",
                marginBottom: "10px",
              }}
              onClick={item.action}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#444")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {/* Icon (Hidden When Sidebar is Collapsed) */}
              <div
                style={{
                  opacity: isExpanded ? 1 : 0, // Hide when collapsed
                  transition: "opacity 0.3s ease-in-out",
                }}
              >
                {item.icon}
              </div>

              {/* Text (Hidden When Collapsed, Shown on Hover) */}
              <span
                style={{
                  marginLeft: "10px",
                  opacity: isExpanded ? 1 : 0,
                  transition: "opacity 0.3s ease-in-out",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>

              {/* Tooltip (Only in Collapsed Mode) */}
              {!isExpanded && (
                <span
                  style={{
                    position: "absolute",
                    right: "70px", // Adjust position
                    background: "#555",
                    color: "#fff",
                    padding: "5px 10px",
                    borderRadius: "5px",
                    opacity: 0,
                    visibility: "hidden",
                    transition: "opacity 0.2s ease-in-out",
                    fontSize: "14px",
                  }}
                  className="group-hover:opacity-100 group-hover:visible"
                >
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ul>
        
        
      </div>
    </div>
  );
};

export default SlidingSidebar;
