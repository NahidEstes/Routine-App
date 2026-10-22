import { useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Button,
  EmptyState,
  Field,
  Header,
  IconBubble,
  Screen,
} from "../components/ui";
import { useTracker } from "../state/TrackerProvider";
import { entriesForDate } from "../domain/schedule";
import { NOTE_LIMIT } from "../domain/backup";
import { validDate } from "../utils/dates";
import { useTheme } from "../theme";

export default function DailyNoteScreen() {
  const { colors, ui } = useTheme();
  const params = useLocalSearchParams<{
    entryId?: string;
    habitId?: string;
    date?: string;
  }>();
  const { state, dispatch, today, saving } = useTracker();
  const entry =
    state.occurrences.find(
      (e) => e.id === params.entryId && e.habitId === params.habitId,
    ) ??
    (params.date && validDate(params.date)
      ? entriesForDate(state, params.date, today).find(
          (e) => e.id === params.entryId && e.habitId === params.habitId,
        )
      : undefined);
  const saved = state.notes.find((note) => note.entryId === entry?.id);
  const [text, setText] = useState(saved?.text ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const close = () =>
    router.canGoBack() ? router.back() : router.replace("/");
  async function save(value: string) {
    if (!entry) return;
    setMessage("");
    setError("");
    if (!value.trim() && !saved) {
      setError("Write a note before saving.");
      return;
    }
    const ok = await dispatch({
      type: "saveNote",
      id: entry.id,
      habitId: entry.habitId,
      date: entry.date,
      text: value,
      updatedAt: new Date().toISOString(),
    });
    if (!ok) {
      setError(
        "Your note could not be saved. Your previous note is unchanged.",
      );
      return;
    }
    setText(value);
    setDeleting(false);
    setMessage(
      value.trim()
        ? "Note saved on this device."
        : "Note deleted. Progress is unchanged.",
    );
  }
  return (
    <Screen form>
      <Header back title={saved ? "Edit daily note" : "Add daily note"} />
      {!entry || (!saved && (entry.date > today || entry.excluded)) ? (
        <EmptyState
          title="Record unavailable"
          message="Choose an existing habit record on today or an earlier day."
          action="Back to Today"
          onPress={() => router.replace("/")}
        />
      ) : (
        <>
          <View style={ui.sageCard}>
            <View style={ui.row}>
              <IconBubble name={entry.snapshot.icon} />
              <View style={ui.grow}>
                <Text style={ui.heading}>{entry.snapshot.name}</Text>
                <Text style={ui.small}>
                  {entry.date}
                  {entry.rescheduled ? ` · Moved from ${entry.sourceDate}` : ""}
                </Text>
              </View>
            </View>
            <Text style={ui.small}>
              A personal note for this record. Saving or deleting it does not
              change completion, streaks or progress.
            </Text>
          </View>
          {!saved && !text && (
            <Text style={ui.subtitle}>
              No note yet. Leave yourself a few words about this day.
            </Text>
          )}
          <Field
            label="Daily note"
            value={text}
            onChangeText={(value) => {
              setText(value);
              setMessage("");
            }}
            multiline
            maxLength={NOTE_LIMIT}
            placeholder="What would you like to remember?"
            style={{ minHeight: 180, textAlignVertical: "top" }}
          />
          <Text style={[ui.small, { textAlign: "right" }]}>
            {text.length.toLocaleString()} / {NOTE_LIMIT.toLocaleString()}{" "}
            characters
          </Text>
          {!!saved && (
            <Text style={ui.small}>
              Last saved {new Date(saved.updatedAt).toLocaleString()}
            </Text>
          )}
          {!!message && (
            <Text
              accessibilityLiveRegion="polite"
              style={[ui.body, { color: colors.green }]}
            >
              {message}
            </Text>
          )}
          {!!error && (
            <Text accessibilityRole="alert" style={ui.error}>
              {error}
            </Text>
          )}
          <Button
            label={saved ? "Save note changes" : "Save note"}
            disabled={saving || !text.trim()}
            onPress={() => save(text)}
          />
          <Button
            label="Cancel / close note"
            secondary
            disabled={saving}
            onPress={close}
          />
          {!!saved &&
            (deleting ? (
              <View style={ui.card}>
                <Text style={ui.body}>
                  Delete this daily note? Your habit history and progress will
                  stay as they are.
                </Text>
                <Button
                  label="Confirm delete note"
                  danger
                  disabled={saving}
                  onPress={() => save("")}
                />
                <Button
                  label="Keep note"
                  secondary
                  disabled={saving}
                  onPress={() => setDeleting(false)}
                />
              </View>
            ) : (
              <Button
                label="Delete note"
                danger
                secondary
                disabled={saving}
                onPress={() => setDeleting(true)}
              />
            ))}
        </>
      )}
    </Screen>
  );
}
