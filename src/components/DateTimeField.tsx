import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Keyboard, Pressable, Text, View } from "react-native";
import {
  dateKey,
  formatTime,
  parseDate,
  validDate,
  validTime,
} from "../utils/dates";
import { useTheme } from "../theme";
import { Ionicons as Icon } from "@expo/vector-icons";
export type PickerProps = {
  value: string;
  onChange: (value: string) => void;
  mode: "date" | "time";
  label: string;
  compact?: boolean;
  disabled?: boolean;
};
export function DateTimeField({
  value,
  onChange,
  mode,
  label,
  compact,
  disabled,
}: PickerProps) {
  const { colors, ui } = useTheme();
  const display =
    mode === "time"
      ? formatTime(validTime(value) ? value : "09:00")
      : validDate(value)
        ? parseDate(value).toLocaleDateString("en-US", {
            weekday: compact ? "long" : undefined,
            year:
              !compact ||
              parseDate(value).getFullYear() !== new Date().getFullYear()
                ? "numeric"
                : undefined,
            month: "long",
            day: "numeric",
          })
        : "Choose a date";
  return (
    <View style={{ gap: 8 }}>
      {!compact && <Text style={ui.label}>{label}</Text>}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display}`}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={() => {
          Keyboard.dismiss();
          const date =
            mode === "date" && validDate(value) ? parseDate(value) : new Date();
          if (mode === "time") {
            const [hour, minute] = (validTime(value) ? value : "09:00")
              .split(":")
              .map(Number);
            date.setHours(hour, minute, 0, 0);
          }
          DateTimePickerAndroid.open({
            mode,
            value: date,
            onValueChange: (_event, selected) =>
              onChange(
                mode === "date"
                  ? dateKey(selected)
                  : `${String(selected.getHours()).padStart(2, "0")}:${String(selected.getMinutes()).padStart(2, "0")}`,
              ),
          });
        }}
        style={[
          compact
            ? {
                minHeight: 48,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }
            : [ui.input, ui.row],
          { opacity: disabled ? 0.6 : 1 },
        ]}
      >
        {!compact && (
          <Icon
            name={mode === "date" ? "calendar-outline" : "time-outline"}
            size={22}
          />
        )}
        <Text style={[compact ? ui.subtitle : ui.body, ui.grow]}>
          {display}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}
