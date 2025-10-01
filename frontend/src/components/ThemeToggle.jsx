import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-ghost btn-circle swap swap-rotate hover:bg-base-200 transition-all duration-300"
      title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      <input type="checkbox" checked={isDarkMode} readOnly />
      
      {/* Sun icon for light mode */}
      <Sun 
        className={`swap-off w-5 h-5 transition-all duration-300 ${
          !isDarkMode ? 'text-yellow-500 rotate-0' : 'text-base-content rotate-180'
        }`}
      />
      
      {/* Moon icon for dark mode */}
      <Moon 
        className={`swap-on w-5 h-5 transition-all duration-300 ${
          isDarkMode ? 'text-blue-400 rotate-0' : 'text-base-content -rotate-180'
        }`}
      />
    </button>
  );
};

export default ThemeToggle;