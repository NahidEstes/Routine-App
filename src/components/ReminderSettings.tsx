import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { useTracker } from "../state/TrackerProvider";
import { useLocalFeatures } from "../state/LocalFeaturesProvider";
import { useReminders } from "../state/ReminderProvider";
import { useTheme } from "../theme";
import { Button, TimeField } from "./ui";
import { Sheet } from "./Sheet";
import { formatTime } from "../utils/dates";

export function ReminderSettings() {
  const { ui } = useTheme();
  const { state } = useTracker();
  const { preferences, preferencesReady } = useLocalFeatures();
  const { supported, allowed, message, error, refresh, setReminder } =
    useReminders();
  const [editing, setEditing] = useState<string | null>(null);
  const [time, setTime] = useState("09:00");
  const [followSchedule, setFollowSchedule] = useState(true);
  const [saved, setSaved] = useState("");
  const [expanded, setExpanded] = useState(false);
  const habit = state.habits.find((h) => h.id === editing);
  return (
    <View style={ui.card}>
      <Text style={ui.heading}>Reminders</Text>
      <Text style={ui.small}>{message}</Text>
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      {!!saved && (
        <Text accessibilityLiveRegion="polite" style={ui.small}>
          {saved}
        </Text>
      )}
      {supported && (
        <>
          {!allowed && (
            <Button
              label="Open notification settings"
              secondary
              onPress={() => Linking.openSettings()}
            />
          )}
          <Button label="Refresh reminders" secondary onPress={refresh} />
        </>
      )}
      <Button
        label={expanded ? "Hide habit reminders" : "Manage habit reminders"}
        secondary
        disabled={!supported || !preferencesReady}
        onPress={() => setExpanded(!expanded)}
      />
      {expanded &&
        state.habits
          .filter((h) => !h.archivedAt)
          .map((h) => {
            const preference = preferences.reminders[h.id];
            return (
              <View key={h.id} style={{ gap: 6, paddingVertical: 8 }}>
                <Text style={ui.label}>{h.name}</Text>
                <Text style={ui.small}>
                  {preference?.enabled
                    ? `On · ${preference.time ? formatTime(preference.time) : "Follows habit schedule"}`
                    : "Off"}
                </Text>
                <Button
                  label={`Set reminder for ${h.name}`}
                  secondary
                  disabled={!supported || !preferencesReady}
                  onPress={() => {
                    setTime(preference?.time ?? h.time ?? "09:00");
                    setFollowSchedule(preference?.time == null && !!h.time);
                    setEditing(h.id);
                  }}
                />
              </View>
            );
          })}
      {!state.habits.some((h) => !h.archivedAt) && (
        <Text style={ui.body}>
          Add a habit first, then choose when to be reminded.
        </Text>
      )}
      {supported && (
        <Text style={ui.small}>
          Notification permission is requested when you enable a reminder.
          Android battery settings can delay alerts. Snooze from the
          notification for 10 minutes.
        </Text>
      )}
      {habit && (
        <Sheet title="Habit reminder" onClose={() => setEditing(null)}>
          <Text style={ui.heading}>{habit.name}</Text>
          <Text style={ui.body}>
            Choose a time, or follow this habit&apos;s scheduled time. A custom
            reminder time stays fixed when you reschedule the habit.
          </Text>
          {!!habit.time && (
            <Button
              label={
                followSchedule
                  ? "Following habit schedule"
                  : "Follow habit schedule"
              }
              secondary
              onPress={() => setFollowSchedule(!followSchedule)}
            />
          )}
          {!followSchedule && <TimeField value={time} onChange={setTime} />}
          {!!error && (
            <Text accessibilityRole="alert" style={ui.error}>
              {error}
            </Text>
          )}
          <Button
            label="Enable reminder"
            onPress={async () => {
              if (
                await setReminder(habit.id, {
                  enabled: true,
                  time: followSchedule && habit.time ? null : time,
                })
              ) {
                setSaved(`${habit.name}: reminder enabled.`);
                setEditing(null);
              }
            }}
          />
          <Button
            label="Turn off reminder"
            secondary
            onPress={async () => {
              if (await setReminder(habit.id, { enabled: false, time: null })) {
                setSaved(`${habit.name}: reminder off.`);
                setEditing(null);
              }
            }}
          />
        </Sheet>
      )}
    </View>
  );
}
