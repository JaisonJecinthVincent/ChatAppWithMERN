import { create } from "zustand";

export const useThemeStore = create((set, get) => ({
  theme: localStorage.getItem("chat-theme") || "light",
  isDarkMode: (localStorage.getItem("chat-theme") || "light") === "dark",
  
  setTheme: (theme) => {
    localStorage.setItem("chat-theme", theme);
    set({ 
      theme,
      isDarkMode: theme === "dark"
    });
  },
  
  toggleTheme: () => {
    const currentTheme = get().theme;
    const newTheme = currentTheme === "light" ? "dark" : "light";
    localStorage.setItem("chat-theme", newTheme);
    set({ 
      theme: newTheme,
      isDarkMode: newTheme === "dark"
    });
  },
}));
