import { Platform } from "react-native";

// Broadcast cyan - technical, precise, high contrast
const primaryCyan = "#00D9FF";
const primaryCyanDark = "#0969DA";

// Alert/accent colors
const alertOrange = "#FF5C35";
const successGreen = "#2EA043";
const warningAmber = "#D29922";
const errorRed = "#F85149";

export const Colors = {
  light: {
    text: "#11181C",
    textSecondary: "#687076",
    buttonText: "#FFFFFF",
    tabIconDefault: "#687076",
    tabIconSelected: primaryCyanDark,
    link: primaryCyanDark,
    primary: primaryCyanDark,
    accent: alertOrange,
    success: successGreen,
    warning: warningAmber,
    error: errorRed,
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F6F8FA",
    backgroundSecondary: "#E6E6E6",
    backgroundTertiary: "#D9D9D9",
    surfaceOverlay: "rgba(255, 255, 255, 0.85)",
    statsBackground: "rgba(0, 0, 0, 0.7)",
  },
  dark: {
    text: "#E6EDF3",
    textSecondary: "#8B949E",
    buttonText: "#FFFFFF",
    tabIconDefault: "#8B949E",
    tabIconSelected: primaryCyan,
    link: primaryCyan,
    primary: primaryCyan,
    accent: alertOrange,
    success: successGreen,
    warning: warningAmber,
    error: errorRed,
    backgroundRoot: "#0A0E14", // Deep charcoal
    backgroundDefault: "#1A1F29", // Elevated panels
    backgroundSecondary: "#252B36",
    backgroundTertiary: "#303844",
    surfaceOverlay: "rgba(26, 31, 41, 0.85)",
    statsBackground: "rgba(0, 0, 0, 0.7)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  mono: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Shadows = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 16,
    elevation: 8,
  },
};
