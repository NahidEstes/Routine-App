import { useEffect, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { elapsedTime, timerDisplay } from "../domain/focusTimer";
import { useLocalFeatures } from "../state/LocalFeaturesProvider";
import { useTracker } from "../state/TrackerProvider";
import { useTheme } from "../theme";
import { Button, Field, Icon } from "./ui";
import { Sheet } from "./Sheet";

export function FocusTimerDock() {
  const { error: progressError } = useTracker();
  const {
    timer,
    pause,
    resume,
    discard,
    record,
    timerBusy,
    timerError,
    reload,
  } = useLocalFeatures();
  const { colors, ui, premium } = useTheme();
  const [now, setNow] = useState(Date.now);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [minutes, setMinutes] = useState("");
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!timer || timer.runningSince === null) return;
    const tick = () => setNow(Date.now());
    const interval = setInterval(tick, 1000);
    const listener = AppState.addEventListener("change", (status) => {
      if (status === "active") tick();
    });
    return () => {
      clearInterval(interval);
      listener.remove();
    };
  }, [timer]);
  if (!timer)
    return timerError ? (
      <View style={{ padding: 12, backgroundColor: colors.amberLight }}>
        <Text style={ui.error}>{timerError}</Text>
        <Button label="Retry loading timer" onPress={reload} />
      </View>
    ) : null;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Focus timer for ${timer.name}`}
        onPress={() => {
          setOpen(true);
          setConfirm(false);
          setDiscarding(false);
        }}
        style={[
          ui.between,
          {
            position: "absolute",
            bottom: 78 + insets.bottom,
            left: 12,
            right: 12,
            maxWidth: 640,
            alignSelf: "center",
            backgroundColor: colors.sage,
            padding: 14,
            borderRadius: premium ? 18 : 4,
            borderWidth: 1,
            borderColor: colors.green,
          },
        ]}
      >
        <Icon name="timer-outline" />
        <View style={ui.grow}>
          <Text style={ui.label} numberOfLines={1}>
            {timer.name}
          </Text>
          <Text style={ui.small}>
            {timer.runningSince === null ? "Paused" : "Focus in progress"} · Tap
            to manage
          </Text>
        </View>
        <Text style={ui.heading}>{timerDisplay(elapsedTime(timer, now))}</Text>
      </Pressable>
      {open && (
        <Sheet title="Focus timer" onClose={() => setOpen(false)}>
          <Text style={ui.heading}>{timer.name}</Text>
          <Text
            style={[
              ui.title,
              { textAlign: "center", fontVariant: ["tabular-nums"] },
            ]}
          >
            {timerDisplay(elapsedTime(timer, now))}
          </Text>
          <Text style={ui.small}>
            Started for {timer.date}. Time continues in the background while
            running. Progress is saved only when you confirm.
          </Text>
          {!!(timerError || progressError) && (
            <Text accessibilityRole="alert" style={ui.error}>
              {timerError || progressError}
            </Text>
          )}
          {discarding ? (
            <>
              <Text style={ui.body}>
                Discard this timer? Your existing habit progress will stay
                unchanged.
              </Text>
              <Button
                label="Discard timer"
                danger
                disabled={timerBusy}
                onPress={async () => {
                  if (await discard()) {
                    setOpen(false);
                    setConfirm(false);
                    setDiscarding(false);
                  }
                }}
              />
              <Button
                label="Keep timer"
                secondary
                onPress={() => setDiscarding(false)}
              />
            </>
          ) : confirm ? (
            <>
              <Field
                label="Minutes to record"
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="decimal-pad"
              />
              <Text style={ui.small}>
                This amount will be added once to the habit&apos;s current
                progress.
              </Text>
              <Button
                label="Confirm and save time"
                disabled={timerBusy}
                onPress={async () => {
                  if (await record(Number(minutes))) setOpen(false);
                }}
              />
              <Button
                label="Back to timer"
                secondary
                onPress={() => setConfirm(false)}
              />
            </>
          ) : (
            <>
              <Button
                label={timer.runningSince === null ? "Resume" : "Pause"}
                disabled={timerBusy}
                onPress={timer.runningSince === null ? resume : pause}
              />
              <Button
                label="Finish and review"
                disabled={timerBusy}
                onPress={async () => {
                  const value = elapsedTime(timer, Date.now());
                  if (await pause()) {
                    setMinutes(
                      String(Math.max(0.1, Math.round(value / 6000) / 10)),
                    );
                    setConfirm(true);
                  }
                }}
              />
              <Button
                label="Discard timer"
                secondary
                disabled={timerBusy}
                onPress={() => setDiscarding(true)}
              />
            </>
          )}
        </Sheet>
      )}
    </>
  );
}
