import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DemoProvider } from "../state/DemoProvider";
import { colors } from "../theme";
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DemoProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="habit" />
          <Stack.Screen name="routines" />
          <Stack.Screen name="routine" />
        </Stack>
      </DemoProvider>
    </SafeAreaProvider>
  );
}
