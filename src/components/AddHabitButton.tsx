import { Pressable, Text, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useTheme } from "../theme";
import { Icon } from "./ui";

export function AddHabitButton({ scheduled = false }: { scheduled?: boolean }) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={scheduled ? "Plan a habit" : "Add habit"}
      onPress={() =>
        scheduled
          ? router.push({ pathname: "/habit", params: { scheduled: "true" } })
          : router.push("/habit")
      }
      style={({ pressed }) => ({
        minHeight: 54,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: colors.green,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 28,
        elevation: 4,
        shadowColor: colors.darkGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon name="add" size={24} color="#FFFFFF" />
      {fontScale <= 1.4 && (
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: "600",
            flexShrink: 1,
          }}
        >
          Add habit
        </Text>
      )}
    </Pressable>
  );
}
