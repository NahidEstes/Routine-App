import { createContext, useContext } from "react";
import { StyleSheet, type TextStyle } from "react-native";
const classicColors = {
  background: "#F8F9F6",
  card: "#FFFFFF",
  // Keep the existing color keys so the default presentation also covers forms.
  green: "#20594C",
  darkGreen: "#164438",
  sage: "#E8EFE8",
  sageDark: "#7FA48D",
  amber: "#925B09",
  amberLight: "#FFF0D5",
  text: "#172924",
  muted: "#64716A",
  border: "#E1E7E0",
  danger: "#A3332B",
  toolbar: "#F8F9F6",
  toolbarText: "#172924",
  tabInactive: "#64716A",
  tabActive: "#20594C",
  button: "#20594C",
  buttonBorder: "#20594C",
  track: "#E2E9E0",
  onAccent: "#FFFFFF",
  hero: "#20594C",
  onHero: "#F8FBF5",
  heroMuted: "#D9E7D7",
  heroTrack: "#547F6B",
};
export type Palette = { [K in keyof typeof classicColors]: string };
const premiumColors: Palette = {
  background: "#F8F6F0",
  card: "#FFFFFF",
  green: "#20594C",
  darkGreen: "#164438",
  sage: "#E4EBDF",
  sageDark: "#95AD91",
  amber: "#A66A0D",
  amberLight: "#FFF0D5",
  text: "#172924",
  muted: "#68736D",
  border: "#E1E5DC",
  danger: "#A3332B",
  toolbar: "#F8F6F0",
  toolbarText: "#172924",
  tabInactive: "#68736D",
  tabActive: "#20594C",
  button: "#20594C",
  buttonBorder: "#20594C",
  track: "#D6DFCF",
  onAccent: "#FFFFFF",
  hero: "#20594C",
  onHero: "#F8FBF5",
  heroMuted: "#D9E7D7",
  heroTrack: "#547F6B",
};
const darkColors: Palette = {
  background: "#101A16",
  card: "#192720",
  green: "#97D7B4",
  darkGreen: "#163E30",
  sage: "#263E31",
  sageDark: "#81AC94",
  amber: "#F3C573",
  amberLight: "#3F321D",
  text: "#EDF5EF",
  muted: "#AABCB0",
  border: "#354C3F",
  danger: "#FFABA0",
  toolbar: "#101A16",
  toolbarText: "#EDF5EF",
  tabInactive: "#AABCB0",
  tabActive: "#97D7B4",
  button: "#97D7B4",
  buttonBorder: "#97D7B4",
  track: "#354C3F",
  onAccent: "#10251A",
  hero: "#163E30",
  onHero: "#EDF5EF",
  heroMuted: "#B9D6C3",
  heroTrack: "#416553",
};
const createUi = (colors: Palette, premium: boolean) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 10 },
    between: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    grow: { flex: 1 },
    title: {
      fontSize: premium ? 32 : 30,
      fontWeight: "700" as TextStyle["fontWeight"],
      letterSpacing: -0.8,
      color: colors.text,
    },
    subtitle: { fontSize: 15, color: colors.muted, lineHeight: 22 },
    heading: {
      fontSize: 18,
      fontWeight: "600" as TextStyle["fontWeight"],
      color: colors.text,
    },
    label: { fontSize: 15, fontWeight: "600", color: colors.text },
    body: { fontSize: 15, color: colors.text, lineHeight: 22 },
    small: { fontSize: 13, color: colors.muted, lineHeight: 19 },
    card: {
      backgroundColor: colors.card,
      borderRadius: premium ? 22 : 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    sageCard: {
      backgroundColor: colors.sage,
      borderRadius: premium ? 22 : 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 10,
    },
    heroCard: {
      backgroundColor: colors.hero,
      borderRadius: 24,
      padding: 20,
      gap: 10,
    },
    input: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
    },
    error: { color: colors.danger, fontSize: 14, lineHeight: 21 },
    sectionHeader: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
      backgroundColor: "transparent",
      borderWidth: 0,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    sectionRow: {
      backgroundColor: colors.sage,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      minHeight: 48,
    },
  });

export const classicTheme = {
  colors: classicColors as Palette,
  ui: createUi(classicColors, false),
  premium: false,
  dark: false,
};
export const premiumTheme = {
  colors: premiumColors,
  ui: createUi(premiumColors, true),
  premium: true,
  dark: false,
};
export const darkTheme = {
  colors: darkColors,
  ui: createUi(darkColors, false),
  premium: false,
  dark: true,
};
export const premiumDarkTheme = {
  ...darkTheme,
  ui: createUi(darkColors, true),
  premium: true,
};
export function appTheme(premium: boolean, dark: boolean) {
  return dark
    ? premium
      ? premiumDarkTheme
      : darkTheme
    : premium
      ? premiumTheme
      : classicTheme;
}
export type AppTheme = typeof classicTheme;

// Tabs share the approved Soft Sage design in both Classic and Premium.
// Keep the appearance flags so trial status and dark-mode preferences retain
// their existing behavior outside the tab navigator.
function createTabTheme(theme: AppTheme): AppTheme {
  const colors: Palette = theme.dark
    ? theme.colors
    : {
        ...theme.colors,
        background: "#E4EBDF",
        toolbar: "#E4EBDF",
        sage: "#EDF3EA",
        border: "#DDE7D7",
        track: "#E2E9E0",
      };
  const ui = createUi(colors, theme.premium);
  return {
    ...theme,
    colors,
    ui: {
      ...ui,
      title: { ...ui.title, fontSize: 34, fontWeight: "800" },
      heading: { ...ui.heading, fontWeight: "700" },
      card: { ...ui.card, borderRadius: 24, borderWidth: 0 },
      sageCard: { ...ui.sageCard, borderRadius: 24, borderWidth: 0 },
    },
  };
}
const tabThemes = [
  createTabTheme(classicTheme),
  createTabTheme(premiumTheme),
  createTabTheme(darkTheme),
  createTabTheme(premiumDarkTheme),
];
export function tabsTheme(premium: boolean, dark: boolean) {
  return tabThemes[(dark ? 2 : 0) + (premium ? 1 : 0)];
}
export const ThemeContext = createContext<AppTheme>(classicTheme);
export function useTheme() {
  return useContext(ThemeContext);
}
