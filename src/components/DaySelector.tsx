import { useState } from "react";
import { Text, View } from "react-native";
import { DateTimeField } from "./DateTimeField";
import { Button, DateStrip, IconButton } from "./ui";
import { Sheet } from "./Sheet";
import { addDays, dateKey, shortDate, weekDates } from "../utils/dates";
import { useTheme } from "../theme";

export function DatePickerButton({
  value,
  onChange,
  label = "Choose day",
}: {
  value: string;
  onChange: (date: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const { ui } = useTheme();
  const days = weekDates(value);
  return (
    <>
      <IconButton
        plain
        name="calendar-outline"
        label={label}
        onPress={() => setOpen(true)}
      />
      {open && (
        <Sheet title={label} onClose={() => setOpen(false)}>
          <View style={[ui.between, { gap: 4 }]}>
            <IconButton
              plain
              name="chevron-back"
              label="Previous week"
              onPress={() => onChange(addDays(value, -7))}
            />
            <Text style={[ui.label, ui.grow, { textAlign: "center" }]}>
              {shortDate(days[0])} – {shortDate(days[6])}
            </Text>
            <IconButton
              plain
              name="chevron-forward"
              label="Next week"
              onPress={() => onChange(addDays(value, 7))}
            />
          </View>
          <DateStrip
            compact
            hideWeekNavigation
            value={value}
            onChange={(date) => {
              onChange(date);
              setOpen(false);
            }}
          />
          <DateTimeField
            mode="date"
            label={label}
            value={value}
            onChange={(date) => {
              onChange(date);
              setOpen(false);
            }}
          />
          <Button
            compact
            label="Jump to today"
            secondary
            onPress={() => {
              onChange(dateKey(new Date()));
              setOpen(false);
            }}
          />
        </Sheet>
      )}
    </>
  );
}

export function DaySelector({
  value,
  onChange,
  label,
  stripOnly = false,
}: {
  value: string;
  onChange: (date: string) => void;
  label: string;
  stripOnly?: boolean;
}) {
  const { ui } = useTheme();
  const days = weekDates(value);
  return (
    <View style={{ gap: 8 }}>
      {!stripOnly && (
        <View style={[ui.between, { gap: 2 }]}>
          <IconButton
            plain
            name="chevron-back"
            label="Previous week"
            onPress={() => onChange(addDays(value, -7))}
          />
          <Text style={[ui.label, { flex: 1, textAlign: "center" }]}>
            {shortDate(days[0])} – {shortDate(days[6])}
          </Text>
          <DatePickerButton value={value} onChange={onChange} label={label} />
          <IconButton
            plain
            name="chevron-forward"
            label="Next week"
            onPress={() => onChange(addDays(value, 7))}
          />
        </View>
      )}
      <DateStrip compact hideWeekNavigation value={value} onChange={onChange} />
    </View>
  );
}
