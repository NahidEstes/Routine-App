import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ScheduledItem } from "../models/types";
import { useTracker } from "../state/TrackerProvider";
import { formatTime, validDate, validTime } from "../utils/dates";
import { colors, ui } from "../theme";
import {
  Button,
  DateStrip,
  Field,
  IconBubble,
  IconButton,
  Segment,
  TimeField,
} from "./ui";

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
  const { dispatch, saving, error: saveError } = useTracker();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(item.date);
  const [time, setTime] = useState(item.time ?? "09:00");
  const [scope, setScope] = useState<"once" | "future">("once");
  const [error, setError] = useState("");
  async function save() {
    if (!validDate(date) || !validTime(time)) {
      setError("Enter a valid date (YYYY-MM-DD) and time (HH:MM).");
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
    )
      onClose();
  }
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{
          flex: 1,
          backgroundColor: "#15251F66",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            maxHeight: "94%",
            backgroundColor: colors.background,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            paddingBottom: Math.max(insets.bottom, 16),
            width: "100%",
            maxWidth: 600,
            alignSelf: "center",
          }}
        >
          <View
            style={{
              width: 42,
              height: 5,
              backgroundColor: "#C8CEC5",
              borderRadius: 4,
              alignSelf: "center",
              marginTop: 12,
            }}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, gap: 18 }}
          >
            <View style={ui.between}>
              <Text style={ui.heading}>A little change of plan</Text>
              <IconButton
                name="close"
                label="Close reschedule"
                onPress={onClose}
              />
            </View>
            <View style={{ alignItems: "center", gap: 8 }}>
              <IconBubble name={item.habit.icon} size={68} />
              <Text style={ui.heading}>{item.habit.name}</Text>
              <Text style={ui.subtitle}>
                Scheduled for {formatTime(item.time)}
              </Text>
            </View>
            <Text style={ui.label}>Choose a new day</Text>
            <DateStrip
              value={validDate(date) ? date : item.date}
              onChange={setDate}
            />
            <Field
              label="Date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
              maxLength={10}
              placeholder="2026-10-14"
            />
            <TimeField value={time} onChange={setTime} />
            <Text style={ui.label}>Apply change to</Text>
            <Segment
              options={[
                { value: "once", label: "Today only" },
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
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
