import { createContext, useContext } from "react";
import { StyleSheet } from "react-native";
const classicColors = {
  background: "#F2F4F6",
  card: "#FFFFFF",
  // Keep the existing color keys so the default presentation also covers forms.
  green: "#007BA8",
  darkGreen: "#263842",
  sage: "#E1E5E8",
  sageDark: "#3388AA",
  amber: "#735410",
  amberLight: "#F0EDE4",
  text: "#20272C",
  muted: "#53616B",
  border: "#B9C1C7",
  danger: "#A3332B",
  toolbar: "#293C4A",
  toolbarText: "#FFFFFF",
  tabInactive: "#C8D0D5",
  tabActive: "#44C6F4",
  button: "#DCE1E5",
  buttonBorder: "#9CA8B1",
  track: "#CCD3D8",
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
      fontSize: premium ? 32 : 26,
      fontWeight: premium ? "700" : "600",
      color: colors.text,
    },
    subtitle: { fontSize: 15, color: colors.muted, lineHeight: 22 },
    heading: { fontSize: 18, fontWeight: "600", color: colors.text },
    label: { fontSize: 15, fontWeight: "600", color: colors.text },
    body: { fontSize: 15, color: colors.text, lineHeight: 22 },
    small: { fontSize: 13, color: colors.muted, lineHeight: 19 },
    card: {
      backgroundColor: colors.card,
      borderRadius: premium ? 20 : 4,
      borderWidth: 1,
      borderColor: colors.border,
      padding: premium ? 18 : 14,
      gap: 12,
    },
    sageCard: {
      backgroundColor: premium ? colors.sage : colors.card,
      borderRadius: premium ? 20 : 4,
      borderWidth: 1,
      borderColor: colors.border,
      padding: premium ? 18 : 14,
      gap: 10,
    },
    input: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: premium ? 14 : 2,
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
      backgroundColor: premium ? "transparent" : colors.sage,
      borderWidth: premium ? 0 : 1,
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
