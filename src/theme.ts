import { createContext, useContext } from "react";
import { StyleSheet } from "react-native";
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
      fontWeight: "700",
      letterSpacing: -0.8,
      color: colors.text,
    },
    subtitle: { fontSize: 15, color: colors.muted, lineHeight: 22 },
    heading: { fontSize: 18, fontWeight: "600", color: colors.text },
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
};
export const premiumTheme = {
  colors: premiumColors,
  ui: createUi(premiumColors, true),
  premium: true,
};
export type AppTheme = typeof classicTheme;
export const ThemeContext = createContext<AppTheme>(classicTheme);
export function useTheme() {
  return useContext(ThemeContext);
}
