import { useRef, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { HabitChallenge } from "../models/types";
import {
  availableChallengeDays,
  challengeProgress,
  validateChallenge,
  nextChallengeDraft,
} from "../domain/challenges";
import { addDays, shortDate } from "../utils/dates";
import { createId } from "../utils/id";
import { useTracker } from "../state/TrackerProvider";
import { useTheme } from "../theme";
import {
  Button,
  Chip,
  EmptyState,
  Field,
  Header,
  Screen,
  Segment,
} from "../components/ui";
import { DateTimeField } from "../components/DateTimeField";
import { Sheet } from "../components/Sheet";
import { ChallengeCard } from "../components/ChallengeCard";
import { ActionFeedback } from "../components/ActionFeedback";

export default function ChallengesScreen() {
  const { challenge: initial } = useLocalSearchParams<{ challenge?: string }>();
  const { state, today, dispatch, saving, notify } = useTracker();
  const { ui } = useTheme();
  const [selected, setSelected] = useState<string | undefined>(initial);
  const [editor, setEditor] = useState<HabitChallenge | "new" | null>(null);
  const [filter, setFilter] = useState<"active" | "past" | "archived">(
    "active",
  );
  const list = state.features.challenges ?? [];
  const detail = list.find((c) => c.id === selected);
  const shown = list
    .filter((c) =>
      filter === "archived"
        ? c.archived
        : !c.archived &&
          (filter === "active"
            ? ["active", "upcoming"].includes(
                challengeProgress(state, c, today).status,
              )
            : ["completed", "ended"].includes(
                challengeProgress(state, c, today).status,
              )),
    )
    .sort((a, b) => b.start.localeCompare(a.start));
  const progress = detail ? challengeProgress(state, detail, today) : undefined;
  return (
    <Screen>
      <Header back title="Your challenges" />
      <Text style={ui.subtitle}>
        A small promise, at your own pace. Your normal habit completions count
        automatically.
      </Text>
      <ActionFeedback />
      <Button
        label="New challenge"
        icon="add"
        disabled={saving}
        onPress={() => setEditor("new")}
      />
      <Segment
        value={filter}
        onChange={setFilter}
        options={[
          { value: "active", label: "Current" },
          { value: "past", label: "Finished" },
          { value: "archived", label: "Archived" },
        ]}
      />
      {!shown.length && (
        <EmptyState
          title={
            filter === "active"
              ? "Choose a small goal"
              : "No challenges here yet"
          }
          message={
            filter === "active"
              ? "Choose one habit and a realistic number of completed days. You can start with a single day."
              : "Your challenges and their saved activity will appear here."
          }
        />
      )}
      {shown.map((c) => (
        <ChallengeCard
          key={c.id}
          challenge={c}
          state={state}
          today={today}
          onPress={() => setSelected(c.id)}
        />
      ))}
      {detail && progress && !editor && (
        <Sheet title={detail.name} onClose={() => setSelected(undefined)}>
          <ChallengeCard
            challenge={detail}
            state={state}
            today={today}
            onPress={() => setEditor(detail)}
          />
          <Text style={ui.body}>
            Complete {detail.habitName} on {detail.target} different days
            between {detail.start} and {detail.end}. Full and Busy day
            completions count once per day. Partial progress and skips do not
            count.
          </Text>
          <Text style={ui.small}>
            A moved task counts on its new day. Pauses and schedule changes do
            not extend the challenge. Correcting a habit record updates this
            progress.
          </Text>
          {progress.completedOn && (
            <Text style={ui.heading}>
              A promise kept · {shortDate(progress.completedOn)}
            </Text>
          )}
          {progress.entries
            .slice(-7)
            .reverse()
            .map((e) => (
              <Button
                key={e.id}
                secondary
                label={`${shortDate(e.date)} · ${e.snapshot.name}${e.busy ? " · Busy day" : ""}`}
                onPress={() => {
                  setSelected(undefined);
                  router.push({
                    pathname: "/habit-details",
                    params: { id: e.habitId, entryId: e.id, date: e.date },
                  });
                }}
              />
            ))}
          {progress.entries.length > 7 && (
            <Text style={ui.small}>Showing the latest 7 completed days.</Text>
          )}
          <Button
            secondary
            label="Open habit"
            onPress={() => {
              setSelected(undefined);
              router.push({
                pathname: "/habit-details",
                params: { id: detail.habitId, date: today },
              });
            }}
          />
          {!detail.archived && (
            <Button
              secondary
              label="Edit challenge"
              onPress={() => setEditor(detail)}
            />
          )}
          {progress.status !== "active" && progress.status !== "upcoming" && (
            <Button
              label="Try this challenge again"
              onPress={() => {
                setSelected(undefined);
                setEditor(
                  nextChallengeDraft(detail, createId("challenge"), today),
                );
              }}
            />
          )}
          <Button
            secondary
            disabled={saving}
            label={detail.archived ? "Restore challenge" : "Archive challenge"}
            onPress={async () => {
              const archived = !detail.archived;
              if (
                await dispatch({
                  type: "archiveChallenge",
                  id: detail.id,
                  archived,
                })
              ) {
                setSelected(undefined);
                notify(
                  archived
                    ? "Challenge archived. Your activity is kept."
                    : "Challenge restored.",
                  {
                    type: "archiveChallenge",
                    id: detail.id,
                    archived: !archived,
                  },
                );
              }
            }}
          />
        </Sheet>
      )}
      {editor && (
        <ChallengeEditor
          initial={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={(challenge) => {
            const status = challengeProgress(state, challenge, today).status;
            setFilter(
              challenge.archived
                ? "archived"
                : status === "completed" || status === "ended"
                  ? "past"
                  : "active",
            );
            setSelected(undefined);
            setEditor(null);
          }}
        />
      )}
    </Screen>
  );
}

function ChallengeEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial?: HabitChallenge;
  onClose: () => void;
  onSaved: (challenge: HabitChallenge) => void;
}) {
  const { state, today, dispatch, saving, notify } = useTracker();
  const { ui, colors } = useTheme();
  const exists =
    !!initial &&
    (state.features.challenges ?? []).some((c) => c.id === initial.id);
  const locked = exists && initial!.start <= today;
  const [id] = useState(() => initial?.id ?? createId("challenge"));
  const [name, setName] = useState(initial?.name ?? "");
  const [habitId, setHabitId] = useState(
    initial?.habitId ?? state.habits.find((h) => !h.archivedAt)?.id ?? "",
  );
  const [start, setStart] = useState(initial?.start ?? today);
  const [end, setEnd] = useState(initial?.end ?? addDays(today, 6));
  const [target, setTarget] = useState(String(initial?.target ?? 4));
  const [error, setError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const input = useRef<TextInput>(null);
  const dirty =
    name !== (initial?.name ?? "") ||
    habitId !==
      (initial?.habitId ?? state.habits.find((h) => !h.archivedAt)?.id ?? "") ||
    start !== (initial?.start ?? today) ||
    end !== (initial?.end ?? addDays(today, 6)) ||
    target !== String(initial?.target ?? 4);
  const close = () => (dirty ? setConfirmCancel(true) : onClose());
  if (confirmCancel)
    return (
      <Sheet
        title="Discard challenge changes?"
        onClose={() => setConfirmCancel(false)}
      >
        <Text style={ui.body}>Your unsaved changes will be discarded.</Text>
        <Button
          secondary
          label="Keep editing"
          onPress={() => setConfirmCancel(false)}
        />
        <Button danger label="Discard changes" onPress={onClose} />
      </Sheet>
    );
  return (
    <Sheet
      title={exists ? "Edit challenge" : "New challenge"}
      onClose={close}
      scrollRef={scroll}
    >
      <View style={{ gap: 16 }}>
        <View>
          <Text style={ui.label}>Challenge name</Text>
          <TextInput
            ref={input}
            accessibilityLabel="Challenge name"
            style={ui.input}
            value={name}
            maxLength={60}
            onChangeText={(value) => {
              setName(value);
              setError("");
            }}
            placeholder="A little reading this week"
            placeholderTextColor={colors.muted}
          />
          {!!error && !name.trim() && (
            <Text accessibilityRole="alert" style={ui.error}>
              {error}
            </Text>
          )}
        </View>
        <Text style={ui.label}>{locked ? "Habit" : "Choose one habit"}</Text>
        {!state.habits.some((h) => !h.archivedAt) && (
          <>
            <Text style={ui.small}>
              Create a habit before starting a challenge.
            </Text>
            <Button
              secondary
              label="Create a habit"
              onPress={() => {
                onClose();
                router.push("/habit");
              }}
            />
          </>
        )}
        {locked ? (
          <Text style={ui.body}>{initial?.habitName}</Text>
        ) : (
          <View style={[ui.row, { flexWrap: "wrap" }]}>
            {state.habits
              .filter((h) => !h.archivedAt || h.id === habitId)
              .map((h) => (
                <Chip
                  key={h.id}
                  label={h.name}
                  selected={habitId === h.id}
                  onPress={() => {
                    setHabitId(h.id);
                  }}
                />
              ))}
          </View>
        )}
        {!locked && (
          <Text style={ui.small}>
            Up to{" "}
            {availableChallengeDays(state, { habitId, start, end }, today)}{" "}
            completion days fit this habit’s current schedule and weekly
            credits.
          </Text>
        )}
        <DateTimeField
          label="Start date"
          mode="date"
          value={start}
          onChange={setStart}
          disabled={locked}
        />
        <DateTimeField
          label="End date"
          mode="date"
          value={end}
          onChange={setEnd}
          disabled={locked}
        />
        <Field
          label="Target completed days"
          value={target}
          onChangeText={setTarget}
          keyboardType="number-pad"
          editable={!locked}
          maxLength={2}
        />
        <Text style={ui.small}>
          {locked
            ? "This challenge has started. Its habit, dates and target stay fixed; you can rename it."
            : "Choose 1–90 days. Each completed local day counts once. Choose a target that fits this habit’s schedule."}
        </Text>
        {!!error && !!name.trim() && (
          <Text accessibilityRole="alert" style={ui.error}>
            {error}
          </Text>
        )}
        <Button
          label="Save challenge"
          disabled={saving || !habitId}
          onPress={async () => {
            const habit = state.habits.find((h) => h.id === habitId);
            const challenge: HabitChallenge = {
              id,
              name,
              habitId,
              habitName: habit?.name ?? initial?.habitName ?? "",
              start,
              end,
              target: Number(target),
              archived: initial?.archived ?? false,
            };
            try {
              validateChallenge(challenge);
              if (!locked && start < today)
                throw new Error("Start today or choose a future date.");
              if (
                !locked &&
                challenge.target >
                  availableChallengeDays(state, challenge, today)
              )
                throw new Error(
                  "Choose fewer target days or a longer period to fit this habit's schedule and weekly credits.",
                );
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Check the challenge fields.",
              );
              if (!name.trim()) {
                scroll.current?.scrollTo({ y: 0, animated: true });
                input.current?.focus();
              }
              return;
            }
            if (await dispatch({ type: "saveChallenge", challenge })) {
              notify(
                exists
                  ? "Challenge updated."
                  : "Your challenge is ready. Small steps count.",
              );
              onSaved(challenge);
            } else
              setError(
                "Could not save this challenge. Check its dates and habit, then retry.",
              );
          }}
        />
        <Button secondary label="Cancel" onPress={close} />
      </View>
    </Sheet>
  );
}
