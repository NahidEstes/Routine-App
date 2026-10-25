import { useRef, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import type { ScheduledItem } from "../models/types";
import { useEntryActions } from "../hooks/useEntryActions";
import { entryStatus, entryTarget } from "../presentation/habits";
import { formatTime } from "../utils/dates";
import { useTheme } from "../theme";
import { useLocalFeatures } from "../state/LocalFeaturesProvider";
import { Icon, IconBubble, IconButton } from "./ui";
import { HabitActions, ProgressEditor } from "./HabitInteractions";
import { useTracker } from "../state/TrackerProvider";
import { organizationFor } from "../domain/organization";

export function HabitCard({
  item,
  schedule = false,
  focus = false,
  onReschedule,
}: {
  item: ScheduledItem;
  schedule?: boolean;
  focus?: boolean;
  onReschedule: () => void;
}) {
  const { colors, ui } = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const narrow = width < 350;
  const stackAction = fontScale > 1.25 || (schedule && width < 380);
  const actions = useEntryActions(item);
  const { state } = useTracker();
  const organization = organizationFor(state, item.habitId);
  const { startTimer, timer, timerBusy, timerReady, setTimerPanelOpen } =
    useLocalFeatures();
  const [menu, setMenu] = useState(false);
  const [progress, setProgress] = useState(false);
  const [acting, setActing] = useState(false);
  const actionLock = useRef(false);
  const done = item.status === "done",
    skipped = item.status === "skipped";
  const target = entryTarget(item, actions.busy);
  const kind = item.habit.goal.type;
  const amountGoal = kind !== "boolean";
  const activeTimer = timer?.entryId === item.id;
  const timerDisabled =
    kind === "duration" &&
    !done &&
    !skipped &&
    (item.date !== actions.today ||
      (!!timer && !activeTimer) ||
      timerBusy ||
      !timerReady);
  const disabled =
    actions.saving ||
    !actions.access.record ||
    acting ||
    item.paused ||
    timerDisabled;
  const foreground = colors.text;
  const secondary = colors.muted;
  const status = entryStatus(item, actions.today);
  const statusLabel = done
    ? "Undo"
    : skipped
      ? "Undo skip"
      : kind === "count"
        ? "+1"
        : kind === "duration"
          ? activeTimer
            ? "Manage"
            : "Start"
          : "Done";
  const actionLabel = done
    ? "Undo completion"
    : skipped
      ? "Undo skip"
      : kind === "count"
        ? "Add 1 " + item.habit.goal.unit
        : kind === "duration"
          ? activeTimer
            ? "Manage focus timer"
            : timer
              ? "Start focus, unavailable while another timer is open"
              : "Start focus"
          : "Mark as done";
  function details() {
    router.push({
      pathname: "/habit-details",
      params: { id: item.habitId, date: item.date, entryId: item.id },
    });
  }
  async function record() {
    if (disabled || actionLock.current) return;
    actionLock.current = true;
    setActing(true);
    try {
      if (done || skipped) await actions.undo();
      else if (kind === "boolean") await actions.done();
      else if (kind === "count") await actions.increment();
      else if (activeTimer) setTimerPanelOpen(true);
      else await startTimer(item, actions.busy);
    } finally {
      actionLock.current = false;
      setActing(false);
    }
  }
  const primaryAction = !item.paused && (
    <Pressable
      accessibilityRole={
        kind === "boolean" && !done && !skipped ? "checkbox" : "button"
      }
      accessibilityLabel={actionLabel + " for " + item.habit.name}
      accessibilityState={{
        disabled: !!disabled,
        busy: acting,
        ...(kind === "boolean" && !done && !skipped ? { checked: false } : {}),
      }}
      disabled={!!disabled}
      onPress={() => void record()}
      style={({ pressed }) => ({
        minWidth: 48,
        minHeight: 48,
        maxWidth: stackAction ? undefined : 92,
        paddingHorizontal: kind === "boolean" ? 8 : 10,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor:
          done || skipped || kind === "boolean" ? "transparent" : colors.sage,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      {kind === "boolean" && !done && !skipped ? (
        <Icon name="square-outline" color={colors.green} size={27} />
      ) : null}
      {(kind !== "boolean" || done || skipped) && (
        <Text
          style={{
            color: colors.green,
            fontSize: 14,
            fontWeight: "700",
            flexShrink: 1,
            textAlign: "center",
          }}
        >
          {statusLabel}
        </Text>
      )}
    </Pressable>
  );
  return (
    <View
      style={[
        ui.card,
        {
          padding: narrow ? 10 : 12,
          gap: 6,
          backgroundColor: colors.card,
          borderColor: focus ? colors.sageDark : colors.border,
          borderLeftWidth: focus ? 3 : 1,
        },
      ]}
    >
      {focus && (
        <Text style={{ color: colors.green, fontSize: 12, fontWeight: "600" }}>
          {activeTimer
            ? timer?.runningSince === null
              ? "Focus paused"
              : "Focus in progress"
            : "Up next"}
          {item.time ? " · " + formatTime(item.time) : ""}
        </Text>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: narrow ? 6 : 8,
        }}
      >
        {!schedule && (
          <IconBubble name={item.habit.icon} size={narrow ? 28 : 32} />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            "Details for " +
            item.habit.name +
            (actions.access.hasNote ? ", has note" : "")
          }
          onPress={details}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 48,
            justifyContent: "center",
            gap: 4,
          }}
        >
          <Text
            style={{
              color: foreground,
              fontSize: 16,
              fontWeight: "600",
              lineHeight: 22,
            }}
          >
            {item.habit.name}
          </Text>
          <Text style={{ color: secondary, fontSize: 12, lineHeight: 18 }}>
            {focus && amountGoal
              ? `${item.amount}/${target} ${item.habit.goal.unit}`
              : formatTime(item.time) +
                (amountGoal
                  ? " · " +
                    item.amount +
                    "/" +
                    target +
                    " " +
                    item.habit.goal.unit
                  : "")}
          </Text>
          {(organization.pinned || organization.priority !== "normal") && (
            <Text style={{ color: secondary, fontSize: 12 }}>
              {organization.pinned ? "Pinned · " : ""}
              {organization.priority} priority
            </Text>
          )}
          {(done ||
            skipped ||
            item.date > actions.today ||
            item.displayStatus === "missed" ||
            actions.access.hasNote ||
            item.rescheduled ||
            item.paused ||
            schedule) && (
            <Text
              style={{
                color:
                  item.displayStatus === "missed" ? colors.danger : secondary,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              {item.paused
                ? "Paused · History preserved"
                : item.rescheduled && status === "Pending"
                  ? "Rescheduled"
                  : status}
              {actions.access.hasNote ? " · Note" : ""}
              {item.rescheduled && status !== "Pending" ? " · Moved" : ""}
            </Text>
          )}
        </Pressable>
        {!stackAction && primaryAction}
        <IconButton
          plain
          name="ellipsis-horizontal"
          label={"Options for " + item.habit.name}
          color={colors.muted}
          onPress={() => setMenu(true)}
        />
      </View>
      {amountGoal && !done && !skipped && (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={
            item.habit.name +
            ": " +
            item.amount +
            " of " +
            target +
            " " +
            item.habit.goal.unit
          }
          accessibilityValue={{
            min: 0,
            max: target,
            now: Math.min(target, item.amount),
          }}
          style={{
            height: 3,
            borderRadius: 2,
            backgroundColor: colors.track,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 3,
              width: `${Math.min(100, (item.amount / target) * 100)}%`,
              backgroundColor: colors.green,
            }}
          />
        </View>
      )}
      {stackAction && primaryAction}
      {menu && (
        <HabitActions
          item={item}
          onClose={() => setMenu(false)}
          onReschedule={onReschedule}
          onProgress={() => setProgress(true)}
        />
      )}
      {progress && (
        <ProgressEditor
          key={item.id}
          item={item}
          onClose={() => setProgress(false)}
        />
      )}
    </View>
  );
}
