import { useState } from "react";
import { router } from "expo-router";
import { Text, View, Platform } from "react-native";
import { widgetModel, actionFromWidget } from "../domain/widget";
import { entriesForDate } from "../domain/schedule";
import { previousProgressAction } from "../presentation/habits";
import { useTracker } from "../state/TrackerProvider";
import { useLocalClock } from "../hooks/useLocalClock";
import { useTheme } from "../theme";
import { Button, Header, Screen, Icon } from "../components/ui";
import { widgetAvailable } from "../widgets/availability";
import { ActionFeedback } from "../components/ActionFeedback";
export default function WidgetScreen() {
  const { state, today, dispatch, saving, notify } = useTracker();
  const { colors, ui } = useTheme();
  const clock = useLocalClock();
  const model = widgetModel(state, today, clock.time);
  const [message, setMessage] = useState("");
  return (
    <Screen>
      <Header back title="Home-screen widget" />
      <Text style={ui.subtitle}>
        Your next small step, right on your Android home screen.
      </Text>
      <Text style={ui.small}>
        Preview · Actions below update your saved habits, just like Today.
      </Text>
      <ActionFeedback />
      <View style={[ui.sageCard, { gap: 14 }]}>
        <View style={ui.between}>
          <Text style={ui.heading}>Today</Text>
          <Icon name="leaf-outline" />
        </View>
        <Text style={ui.small}>
          {today} · {model.summary.done}/{model.summary.total} daily done
          {model.busy ? " · Busy day" : ""}
        </Text>
        {!model.rows.length && (
          <Text style={ui.body}>
            Your habits will appear here. Open Today for skipped habits, weekly
            goals and routines.
          </Text>
        )}
        {model.rows.map((row) => (
          <View key={row.id} style={ui.card}>
            <Text style={ui.label}>{row.name}</Text>
            <Text style={ui.small}>{row.detail}</Text>
            <Button
              compact
              label={`${row.label} for ${row.name}`}
              disabled={saving}
              onPress={async () => {
                if (row.action === "open") {
                  router.push({
                    pathname: "/habit-details",
                    params: { id: row.habitId, entryId: row.id, date: today },
                  });
                  return;
                }
                const action = actionFromWidget(state, { ...row }, today);
                const entry = entriesForDate(state, today, today).find(
                  (e) => e.id === row.id,
                );
                if (action && entry && (await dispatch(action)))
                  notify(
                    row.action === "undo"
                      ? "Completion undone."
                      : "Progress saved.",
                    previousProgressAction(entry),
                  );
              }}
            />
          </View>
        ))}
        <Button
          secondary
          label="Open Today"
          onPress={() => router.navigate("/")}
        />
      </View>
      <View style={ui.card}>
        <Text style={ui.heading}>Add to your home screen</Text>
        <Text style={ui.body}>
          Touch and hold an empty area on your phone’s home screen → Widgets →
          Routine App · Today. Drag it onto the home screen and resize it to
          fit.
        </Text>
        {widgetAvailable() ? (
          <Button
            label="Add Android widget"
            icon="add"
            onPress={async () => {
              try {
                const { requestPinWidget } =
                  await import("react-native-android-widget");
                const accepted = await requestPinWidget({
                  widgetName: "RoutineToday",
                });
                setMessage(
                  accepted
                    ? "Confirm Add in your launcher's prompt. You can also use its Widgets menu."
                    : "Your launcher uses its Widgets menu. Follow the steps above to add Routine App · Today.",
                );
              } catch {
                setMessage(
                  "Could not open the Add prompt. Use your home screen’s Widgets menu instead.",
                );
              }
            }}
          />
        ) : (
          <Text style={ui.small}>
            {Platform.OS === "android"
              ? "This installed version does not include the home-screen widget yet. Your habits remain available in the app."
              : "Home-screen widgets are available on Android. This preview uses your current habits."}
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
        <Text style={ui.small}>
          Done, +1 and Undo use the same saved progress as Today. Duration
          habits open their details. Tap Refresh when needed; Android may delay
          automatic refreshes. The date on the widget tells you which day is
          shown.
        </Text>
        <Text style={ui.small}>
          A new day or a changed goal makes an old action refresh first,
          protecting your history. Skipped habits and complete progress controls
          remain in Today.
        </Text>
      </View>
    </Screen>
  );
}
