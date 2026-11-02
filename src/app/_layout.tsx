import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TrackerProvider } from "../state/TrackerProvider";
import { useTheme } from "../theme";
import { AppearanceProvider } from "../state/AppearanceProvider";
import { LocalFeaturesProvider } from "../state/LocalFeaturesProvider";
import { ReminderProvider } from "../state/ReminderProvider";
import { FocusTimerDock } from "../components/FocusTimerDock";
import { View } from "react-native";
import { AchievementCelebration } from "../components/AchievementCelebration";
import { WidgetSync } from "../widgets/WidgetSync";
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppearanceProvider>
        <AppLayout />
      </AppearanceProvider>
    </SafeAreaProvider>
  );
}
function AppLayout() {
  const { colors, dark } = useTheme();
  return (
    <TrackerProvider>
      <LocalFeaturesProvider>
        <ReminderProvider>
          <View style={{ flex: 1 }}>
            <WidgetSync />
            <StatusBar style={dark ? "light" : "dark"} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="achievements" />
              <Stack.Screen name="challenges" />
              <Stack.Screen name="home-widget" />
              <Stack.Screen name="habit" />
              <Stack.Screen name="habit-details" />
              <Stack.Screen name="habits" />
              <Stack.Screen name="pause-habits" />
              <Stack.Screen name="organize-habits" />
              <Stack.Screen name="weekly-review" />
              <Stack.Screen name="routines" />
              <Stack.Screen name="routine" />
              <Stack.Screen name="routine-template" />
              <Stack.Screen name="data-backup" />
              <Stack.Screen name="note" />
              <Stack.Screen name="habit-notes" />
            </Stack>
            <FocusTimerDock />
            <AchievementCelebration />
          </View>
        </ReminderProvider>
      </LocalFeaturesProvider>
    </TrackerProvider>
  );
}
