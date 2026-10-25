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
  const { colors } = useTheme();
  return (
    <TrackerProvider>
      <LocalFeaturesProvider>
        <ReminderProvider>
          <View style={{ flex: 1 }}>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="achievements" />
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
