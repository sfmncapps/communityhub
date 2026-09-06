import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const DEFAULT_MENU = [
  { id: "home", label: "Home", path: "/", is_visible: true, sort_order: 1 },
  { id: "welcome", label: "Welcome", path: "/welcome", is_visible: true, sort_order: 2 },
  { id: "events", label: "Events", path: "/events", is_visible: true, sort_order: 3 },
  { id: "directory", label: "Directory", path: "/directory", is_visible: true, sort_order: 4 },
  { id: "community", label: "Community", path: "/community", is_visible: true, sort_order: 5 },
  { id: "jobs", label: "Jobs", path: "/jobs", is_visible: true, sort_order: 6 },
  { id: "classifieds", label: "Classifieds", path: "/classifieds", is_visible: true, sort_order: 7 },
];

const DEFAULT_WIDGETS = [
  { key: "hero", title: "Hero Welcome Banner", is_enabled: true, sort_order: 1 },
  { key: "about", title: "About & Mission", is_enabled: true, sort_order: 2 },
  { key: "services", title: "Community Pillars", is_enabled: true, sort_order: 3 },
  { key: "contact", title: "Get in Touch & Join", is_enabled: true, sort_order: 4 },
];

export const THEME_PALETTES = {
  yellow_pages: {
    name: "Yellow Pages (Default)",
    description: "Classic authoritative community directory with warm amber accents & charcoal contrast",
    primary: "#d97706",
    primaryHover: "#b45309",
    primaryLight: "#fef3c7",
    headerBg: "#ffffff",
    bannerGradient: "linear-gradient(135deg, #d97706, #b45309)",
  },
  modern_emerald: {
    name: "Modern Emerald",
    description: "Lush botanical forest teal & vibrant emerald for eco and non-profit initiatives",
    primary: "#059669",
    primaryHover: "#047857",
    primaryLight: "#d1fae5",
    headerBg: "#ffffff",
    bannerGradient: "linear-gradient(135deg, #0f766e, #16a34a)",
  },
  slate_minimal: {
    name: "Slate Minimal",
    description: "Clean monochrome tech slate with subtle indigo borders & modern aesthetics",
    primary: "#334155",
    primaryHover: "#1e293b",
    primaryLight: "#f1f5f9",
    headerBg: "#ffffff",
    bannerGradient: "linear-gradient(135deg, #1e293b, #3b82f6)",
  },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("yellow_pages");
  const [headerMenu, setHeaderMenu] = useState(DEFAULT_MENU);
  const [homepageWidgets, setHomepageWidgets] = useState(DEFAULT_WIDGETS);
  const [footerText, setFooterText] = useState("© 2026 CommunityHub. Empowering non-profits and community organizations.");
  const [loading, setLoading] = useState(true);

  const applyThemeToDocument = (themeName) => {
    const palette = THEME_PALETTES[themeName] || THEME_PALETTES.yellow_pages;
    const root = document.documentElement;

    root.style.setProperty("--theme-primary", palette.primary);
    root.style.setProperty("--theme-primary-hover", palette.primaryHover);
    root.style.setProperty("--theme-primary-light", palette.primaryLight);
    root.style.setProperty("--theme-banner-gradient", palette.bannerGradient);

    document.body.classList.remove("theme-yellow_pages", "theme-modern_emerald", "theme-slate_minimal");
    document.body.classList.add(`theme-${themeName}`);
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API}/settings`);
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          const s = data.settings;
          const activeTheme = s.theme || "yellow_pages";
          setTheme(activeTheme);
          applyThemeToDocument(activeTheme);

          if (Array.isArray(s.header_menu) && s.header_menu.length > 0) {
            setHeaderMenu([...s.header_menu].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
          }

          if (Array.isArray(s.homepage_widgets) && s.homepage_widgets.length > 0) {
            setHomepageWidgets([...s.homepage_widgets].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
          }

          if (s.footer_text) {
            setFooterText(s.footer_text);
          }
        }
      }
    } catch (err) {
      console.warn("Could not load platform settings, using defaults:", err.message);
      applyThemeToDocument("yellow_pages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const changeTheme = (newTheme) => {
    if (THEME_PALETTES[newTheme]) {
      setTheme(newTheme);
      applyThemeToDocument(newTheme);
    }
  };

  const saveSettings = async (updates) => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Authentication required");

    const res = await fetch(`${API}/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update settings");

    if (updates.theme) {
      changeTheme(updates.theme);
    }
    if (updates.header_menu) {
      setHeaderMenu(updates.header_menu);
    }
    if (updates.homepage_widgets) {
      setHomepageWidgets(updates.homepage_widgets);
    }
    if (updates.footer_text) {
      setFooterText(updates.footer_text);
    }

    return data;
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: changeTheme,
        headerMenu,
        setHeaderMenu,
        homepageWidgets,
        setHomepageWidgets,
        footerText,
        setFooterText,
        loading,
        refreshSettings: fetchSettings,
        saveSettings,
        palettes: THEME_PALETTES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
