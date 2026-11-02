import {
  registerWidgetTaskHandler,
  getWidgetInfo,
  requestWidgetUpdateById,
  type WidgetTaskHandlerProps,
} from "react-native-android-widget";
import { widgetRepresentation } from "./TodayWidget";
import { trackerChannel } from "../storage/trackerChannel";
import { openRepository } from "../storage/open";
import { materialize } from "../domain/schedule";
import { applyAction } from "../domain/actions";
import {
  baselineAchievements,
  completedChallengeIds,
} from "../domain/achievements";
import { actionFromWidget, widgetModel } from "../domain/widget";
import { localToday } from "../utils/dates";
import { loadColorMode } from "../storage/colorMode";
import { createId } from "../utils/id";
export const WIDGET_NAME = "RoutineToday";
async function snapshot(data?: Record<string, unknown>) {
  let result: ReturnType<typeof widgetModel> | undefined;
  let feedback = "";
  let failure: unknown;
  await trackerChannel.queue.enqueue(
    createId("widget"),
    async () => {
      try {
        const repository = await openRepository();
        const stored = await repository.load();
        const today = localToday();
        let next = materialize(stored, today);
        if (data) {
          const action = actionFromWidget(next, data, today);
          if (action) {
            next = applyAction(next, action, today);
            feedback =
              data.action === "undo" ? "Completion undone" : "Progress saved";
          } else
            feedback = "This task changed. Refreshed to the latest progress.";
        }
        const wins = completedChallengeIds(next, today).filter(
          (id) => !(stored.features.seenChallengeWins ?? []).includes(id),
        );
        if (wins.length)
          feedback = `Challenge completed: ${next.features.challenges?.find((c) => c.id === wins[0])?.name ?? "A promise kept"}`;
        next = baselineAchievements(next, today);
        if (JSON.stringify(next) !== JSON.stringify(stored)) {
          await repository.save(next);
          trackerChannel.publish(next);
        }
        const now = new Date();
        result = widgetModel(
          next,
          today,
          `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
        );
        return true;
      } catch (e) {
        failure = e;
        return false;
      }
    },
    () => {},
  );
  if (failure || !result)
    throw failure ?? new Error("Widget data is unavailable.");
  return { model: result, feedback };
}
export async function refreshWidgets() {
  const infos = await getWidgetInfo(WIDGET_NAME);
  if (!infos.length) return;
  const { model } = await snapshot();
  const mode = await loadColorMode();
  await Promise.all(
    infos.map((info) =>
      requestWidgetUpdateById({
        widgetName: WIDGET_NAME,
        widgetId: info.widgetId,
        renderWidget: () => widgetRepresentation(model, info, mode),
      }),
    ),
  );
}
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (
    props.widgetAction === "WIDGET_DELETED" ||
    props.widgetInfo.widgetName !== WIDGET_NAME
  )
    return;
  try {
    const { model, feedback } = await snapshot(
      props.widgetAction === "WIDGET_CLICK" && props.clickAction === "PROGRESS"
        ? props.clickActionData
        : undefined,
    );
    const mode = await loadColorMode();
    props.renderWidget(
      widgetRepresentation(model, props.widgetInfo, mode, feedback),
    );
    // Keep other copies of this widget consistent after an action.
    if (props.widgetAction === "WIDGET_CLICK") {
      const infos = await getWidgetInfo(WIDGET_NAME);
      await Promise.all(
        infos
          .filter((i) => i.widgetId !== props.widgetInfo.widgetId)
          .map((info) =>
            requestWidgetUpdateById({
              widgetName: WIDGET_NAME,
              widgetId: info.widgetId,
              renderWidget: () => widgetRepresentation(model, info, mode),
            }),
          ),
      );
    }
  } catch {
    // Retry is reachable without clearing or replacing any saved user data.
    const { FlexWidget, TextWidget } =
      await import("react-native-android-widget");
    props.renderWidget(
      <FlexWidget
        style={{
          width: "match_parent",
          height: "match_parent",
          backgroundColor: "#192720",
          borderRadius: 20,
          padding: 16,
        }}
      >
        <TextWidget
          text="Could not refresh your habits. Saved data is kept."
          style={{ color: "#EDF5EF", fontSize: 14 }}
        />
        <TextWidget
          text="Retry"
          style={{ color: "#97D7B4", height: 48, paddingTop: 14 }}
          clickAction="REFRESH"
        />
        <TextWidget
          text="Open Routine App"
          style={{ color: "#97D7B4", height: 48, paddingTop: 14 }}
          clickAction="OPEN_APP"
        />
      </FlexWidget>,
    );
  }
}
export function registerRoutineWidget() {
  registerWidgetTaskHandler(widgetTaskHandler);
}
