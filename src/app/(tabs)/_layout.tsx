import { Tabs } from "expo-router";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/ui";
import { tabsTheme, ThemeContext, useTheme } from "../../theme";
import { tabBarMetrics } from "../../presentation/tabBar";
export default function TabLayout() {
  const appearance = useTheme();
  const theme = tabsTheme(appearance.premium, appearance.dark);
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const bar = tabBarMetrics(fontScale, insets.bottom);
  return (
    <ThemeContext.Provider value={theme}>
      <Tabs
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabActive,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle: {
            position: "absolute",
            left: 12,
            right: 12,
            bottom: bar.bottom,
            backgroundColor: colors.card,
            borderTopWidth: 0,
            borderRadius: 28,
            height: bar.height,
            paddingTop: 8,
            paddingBottom: 8,
            elevation: 0,
          },
          tabBarHideOnKeyboard: true,
          tabBarItemStyle: { borderRadius: 24 },
          tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
          tabBarActiveBackgroundColor: "transparent",
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Today",
            tabBarAccessibilityLabel: "Today tab",
            tabBarIcon: ({ color, focused }) => (
              <Icon name={focused ? "home" : "home-outline"} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: "Schedule",
            tabBarAccessibilityLabel: "Schedule tab",
            tabBarIcon: ({ color }) => (
              <Icon name="calendar-outline" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: "Progress",
            tabBarAccessibilityLabel: "Progress tab",
            tabBarIcon: ({ color }) => (
              <Icon name="stats-chart-outline" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarAccessibilityLabel: "Profile tab",
            tabBarIcon: ({ color }) => (
              <Icon name="person-outline" color={color} />
            ),
          }}
        />
      </Tabs>
    </ThemeContext.Provider>
  );
}
