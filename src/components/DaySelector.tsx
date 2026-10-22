import { View } from "react-native";
import { DateTimeField } from "./DateTimeField";
import { DateStrip, IconButton } from "./ui";
import { addDays } from "../utils/dates";
import { useTheme } from "../theme";

export function DaySelector({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (date: string) => void;
  label: string;
}) {
  const { colors, ui, premium } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <View
        style={[
          ui.between,
          {
            gap: 4,
            backgroundColor: premium ? "transparent" : colors.card,
            borderWidth: premium ? 0 : 1,
            borderColor: colors.border,
            paddingHorizontal: premium ? 0 : 8,
          },
        ]}
      >
        <View style={ui.grow}>
          <DateTimeField
            compact
            mode="date"
            label={label}
            value={value}
            onChange={onChange}
          />
        </View>
        <IconButton
          plain
          name="chevron-back"
          label="Previous week"
          onPress={() => onChange(addDays(value, -7))}
        />
        <IconButton
          plain
          name="chevron-forward"
          label="Next week"
          onPress={() => onChange(addDays(value, 7))}
        />
      </View>
      <DateStrip compact hideWeekNavigation value={value} onChange={onChange} />
    </View>
  );
}
