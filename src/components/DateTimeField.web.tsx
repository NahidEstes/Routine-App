import { createElement } from "react";
import { Text, View } from "react-native";
import type { PickerProps } from "./DateTimeField";
import { useTheme } from "../theme";
export function DateTimeField({
  value,
  onChange,
  mode,
  label,
  compact,
  disabled,
}: PickerProps) {
  const { colors, ui } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {!compact && <Text style={ui.label}>{label}</Text>}
      {createElement("input", {
        type: mode,
        value,
        disabled,
        "aria-label": label,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          if (e.target.value) onChange(e.target.value);
        },
        style: {
          minHeight: 48,
          boxSizing: "border-box",
          width: "100%",
          font: "inherit",
          fontSize: compact ? 16 : 17,
          color: colors.text,
          border: compact ? "none" : `1px solid ${colors.border}`,
          borderRadius: 2,
          background: compact ? "transparent" : colors.card,
          padding: compact ? "8px 0" : "12px 14px",
        },
      })}
    </View>
  );
}
