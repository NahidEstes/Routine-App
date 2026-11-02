export type ColorMode = "system" | "light" | "dark";
export function parseColorMode(raw: string | null): ColorMode {
  if (raw === null) return "system";
  const value: unknown = JSON.parse(raw);
  if (value !== "system" && value !== "light" && value !== "dark")
    throw new Error("Could not read your color theme. Retry loading it.");
  return value;
}
export function isDarkMode(mode: ColorMode, system: string | null | undefined) {
  return mode === "dark" || (mode === "system" && system === "dark");
}
