import Storage from "expo-sqlite/kv-store";
import { parseColorMode, type ColorMode } from "../domain/colorMode";
const KEY = "routine.color-mode.v1";
export async function loadColorMode() {
  return parseColorMode(await Storage.getItem(KEY));
}
export async function saveColorMode(mode: ColorMode) {
  parseColorMode(JSON.stringify(mode));
  await Storage.setItem(KEY, JSON.stringify(mode));
}
