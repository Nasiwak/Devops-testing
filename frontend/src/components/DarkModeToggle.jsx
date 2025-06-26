import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react"; // Import Icons

export default function DarkModeToggle() {
    const [darkMode, setDarkMode] = useState(
        localStorage.getItem("theme") === "dark"
    );

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [darkMode]);

    return (
        <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg">
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
        </button>
    );
}
