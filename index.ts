import { Platform, TurboModuleRegistry, type TurboModule } from "react-native";
// A native widget is optional in web / Expo Go. Import the native-only module
// only when it exists, so adding the widget does not break those previews.
if (
  Platform.OS === "android" &&
  TurboModuleRegistry.get<TurboModule>("AndroidWidget")
) {
  require("./src/widgets/task").registerRoutineWidget();
}
// Expo Router remains responsible for all screen registration/navigation.
import "expo-router/entry";
