import { Platform, TurboModuleRegistry, type TurboModule } from "react-native";
export function widgetAvailable() {
  return (
    Platform.OS === "android" &&
    !!TurboModuleRegistry.get<TurboModule>("AndroidWidget")
  );
}
