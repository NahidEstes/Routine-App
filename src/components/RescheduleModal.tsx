import { useState } from "react";
import { Text, View } from "react-native";
import type { ScheduledItem } from "../models/types";
import { useTracker } from "../state/TrackerProvider";
import { formatTime, validDate, validTime } from "../utils/dates";
import { useTheme } from "../theme";
import { Button, IconBubble, Segment, TimeField } from "./ui";
import { DateTimeField } from "./DateTimeField";
import { Sheet } from "./Sheet";

export function RescheduleModal({
  item,
  onClose,
}: {
  item: ScheduledItem | null;
  onClose: () => void;
}) {
  return item ? (
    <RescheduleSheet key={item.id} item={item} onClose={onClose} />
  ) : null;
}
function RescheduleSheet({
  item,
  onClose,
}: {
  item: ScheduledItem;
  onClose: () => void;
}) {
  const { ui } = useTheme();
  const { dispatch, saving, error: saveError, notify } = useTracker();
  const [date, setDate] = useState(item.date);
  const [time, setTime] = useState(item.time ?? "09:00");
  const [scope, setScope] = useState<"once" | "future">("once");
  const [error, setError] = useState("");
  async function save() {
    if (!validDate(date) || !validTime(time)) {
      setError("Choose a valid date and time.");
      return;
    }
    if (
      await dispatch({
        type: "reschedule",
        id: item.id,
        habitId: item.habitId,
        sourceDate: item.date,
        date,
        time,
        scope,
      })
    ) {
      notify(
        scope === "once"
          ? "This occurrence was rescheduled."
          : "This and future schedules were updated.",
      );
      onClose();
    }
  }
  return (
    <Sheet title="Reschedule" onClose={onClose}>
      <View style={ui.row}>
        <IconBubble name={item.habit.icon} size={36} />
        <View style={ui.grow}>
          <Text style={ui.label}>{item.habit.name}</Text>
          <Text style={ui.small}>
            {item.date} · {formatTime(item.time)}
          </Text>
        </View>
      </View>
      <DateTimeField
        mode="date"
        label="New date"
        value={date}
        onChange={setDate}
      />
      <TimeField value={time} onChange={setTime} />
      <Text style={ui.label}>Apply change to</Text>
      <Segment
        options={[
          { value: "once", label: "This occurrence" },
          { value: "future", label: "All future days" },
        ]}
        value={scope}
        onChange={setScope}
      />
      <Text style={ui.small}>
        {scope === "once"
          ? "Moves this selected occurrence only."
          : "Changes this and future schedules. Chosen weekdays shift by the day difference; earlier history stays unchanged."}
      </Text>
      {!!(error || saveError) && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error || saveError}
        </Text>
      )}
      <Button
        label="Reschedule"
        icon="time-outline"
        disabled={saving}
        onPress={save}
      />
      <Button label="Cancel" onPress={onClose} secondary />
    </Sheet>
  );
}
