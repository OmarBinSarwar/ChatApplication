const THEMES = {
  dark: {
    "--bg-color": "#101c22",
    "--panel-bg": "rgba(21, 34, 40, 0.8)",
    "--panel-border": "#1e343d",
    "--text-main": "#fcf6eb",
    "--text-muted": "#8e9fa0",
    "--message-received": "rgba(30, 52, 61, 0.9)",
  },
  light: {
    "--bg-color": "hsl(210, 40%, 96%)",
    "--panel-bg": "hsla(0, 0%, 100%, 0.75)",
    "--panel-border": "hsla(220, 13%, 80%, 0.6)",
    "--text-main": "hsl(222, 47%, 11%)",
    "--text-muted": "hsl(215, 16%, 47%)",
    "--message-received": "hsla(220, 14%, 90%, 0.9)",
  },
  midnight: {
    "--bg-color": "hsl(240, 30%, 6%)",
    "--panel-bg": "hsla(240, 25%, 10%, 0.7)",
    "--panel-border": "hsla(240, 20%, 20%, 0.5)",
    "--text-main": "hsl(210, 40%, 96%)",
    "--text-muted": "hsl(220, 15%, 55%)",
    "--message-received": "hsla(240, 20%, 15%, 0.9)",
  },
  ocean: {
    "--bg-color": "hsl(210, 50%, 10%)",
    "--panel-bg": "hsla(210, 45%, 14%, 0.65)",
    "--panel-border": "hsla(200, 40%, 28%, 0.5)",
    "--text-main": "hsl(200, 40%, 96%)",
    "--text-muted": "hsl(200, 20%, 60%)",
    "--message-received": "hsla(210, 35%, 20%, 0.85)",
  },
};

const ACCENTS = {
  coral: {
    "--accent-color": "#db5846",
    "--accent-hover": "#f07d54",
    "--message-sent": "#b34234",
  },
  teal: {
    "--accent-color": "hsl(175, 80%, 45%)",
    "--accent-hover": "hsl(175, 80%, 55%)",
    "--message-sent": "hsl(175, 70%, 35%)",
  },
  purple: {
    "--accent-color": "hsl(267, 100%, 61%)",
    "--accent-hover": "hsl(267, 100%, 71%)",
    "--message-sent": "hsl(267, 70%, 50%)",
  },
  blue: {
    "--accent-color": "hsl(210, 100%, 56%)",
    "--accent-hover": "hsl(210, 100%, 66%)",
    "--message-sent": "hsl(210, 80%, 45%)",
  },
  green: {
    "--accent-color": "hsl(152, 69%, 45%)",
    "--accent-hover": "hsl(152, 69%, 55%)",
    "--message-sent": "hsl(152, 60%, 38%)",
  },
  rose: {
    "--accent-color": "hsl(340, 82%, 58%)",
    "--accent-hover": "hsl(340, 82%, 68%)",
    "--message-sent": "hsl(340, 70%, 48%)",
  },
};

export const THEME_OPTIONS = [
  { id: "dark", label: "Dark", preview: "hsl(222, 47%, 7%)" },
  { id: "light", label: "Light", preview: "hsl(210, 40%, 96%)" },
  { id: "midnight", label: "Midnight", preview: "hsl(240, 30%, 6%)" },
  { id: "ocean", label: "Ocean", preview: "hsl(210, 50%, 10%)" },
];

export const ACCENT_OPTIONS = [
  { id: "coral", label: "Coral", color: "#db5846" },
  { id: "teal", label: "Teal", color: "hsl(175, 80%, 45%)" },
  { id: "purple", label: "Purple", color: "hsl(267, 100%, 61%)" },
  { id: "blue", label: "Blue", color: "hsl(210, 100%, 56%)" },
  { id: "green", label: "Green", color: "hsl(152, 69%, 45%)" },
  { id: "rose", label: "Rose", color: "hsl(340, 82%, 58%)" },
];

export function applyTheme(theme = "dark", accentColor = "coral") {
  const root = document.documentElement;
  const themeVars = THEMES[theme] || THEMES.dark;
  const accentVars = ACCENTS[accentColor] || ACCENTS.coral;

  Object.entries({ ...themeVars, ...accentVars }).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  root.dataset.theme = theme;
  root.dataset.accent = accentColor;
}

export function getUserPreferences(user) {
  // Check if they had a preference, if they had purple, maybe leave it, but default is coral
  return {
    theme: user?.preferences?.theme || "dark",
    accentColor: user?.preferences?.accentColor || "coral",
  };
}
