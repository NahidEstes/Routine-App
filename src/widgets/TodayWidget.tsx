"use no memo";
import {
  FlexWidget,
  TextWidget,
  type WidgetInfo,
} from "react-native-android-widget";
import { appTheme, type Palette } from "../theme";
import type { widgetModel } from "../domain/widget";
import type { ColorMode } from "../domain/colorMode";
type Hex = `#${string}`;
type Props = {
  model: ReturnType<typeof widgetModel>;
  info: WidgetInfo;
  dark: boolean;
  message?: string;
};
export function TodayWidget({ model, info, dark, message }: Props) {
  const colors = appTheme(false, dark).colors as { [K in keyof Palette]: Hex };
  const rows = model.rows.slice(
    0,
    info.height < 260 || info.screenInfo.fontScale > 1.3 ? 1 : 2,
  );
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        padding: 12,
        borderRadius: 20,
        backgroundColor: colors.background,
      }}
      accessibilityLabel={`Routine App. ${model.summary.done} of ${model.summary.total} daily habits completed. ${model.date}`}
    >
      <FlexWidget
        style={{
          flexDirection: "row",
          width: "match_parent",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TextWidget
          text="Today"
          style={{
            color: colors.text,
            fontSize: 19,
            fontWeight: "bold",
            height: 48,
            paddingTop: 10,
          }}
          clickAction="OPEN_APP"
          accessibilityLabel="Open Routine App"
        />
        <TextWidget
          text="Refresh"
          style={{ color: colors.green, padding: 12, fontSize: 12, height: 48 }}
          clickAction="REFRESH"
          accessibilityLabel="Refresh today's habits"
        />
      </FlexWidget>
      <TextWidget
        text={`${model.date} · ${model.summary.done}/${model.summary.total} daily done${model.busy ? " · Busy day" : ""}`}
        style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}
      />
      {message && (
        <TextWidget
          text={message}
          style={{ color: colors.amber, fontSize: 12, marginBottom: 6 }}
        />
      )}
      {!rows.length && (
        <TextWidget
          text={
            model.summary.total
              ? "No pending tasks here. Open Today for skipped habits and routines."
              : "Room for a small start. Add a habit or open your weekly goals."
          }
          style={{ color: colors.text, fontSize: 13, paddingVertical: 10 }}
          clickAction="OPEN_APP"
        />
      )}
      {rows.map((row) => (
        <FlexWidget
          key={row.id}
          style={{
            flexDirection: "row",
            width: "match_parent",
            alignItems: "center",
            backgroundColor: colors.card,
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 4,
            marginBottom: 6,
          }}
        >
          <FlexWidget
            style={{
              flex: 1,
              paddingVertical: 4,
              height: 48,
              justifyContent: "center",
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: row.uri }}
            accessibilityLabel={`${row.name}. ${row.detail}. Open habit details`}
          >
            <TextWidget
              text={row.name}
              maxLines={1}
              truncate="END"
              style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}
            />
            <TextWidget
              text={row.detail}
              maxLines={1}
              truncate="END"
              style={{ color: colors.muted, fontSize: 12 }}
            />
          </FlexWidget>
          <TextWidget
            text={row.label}
            style={{
              color: colors.onAccent,
              backgroundColor: colors.green,
              borderRadius: 10,
              height: 48,
              width: 64,
              textAlign: "center",
              paddingTop: 14,
              fontSize: 14,
              fontWeight: "bold",
            }}
            accessibilityLabel={`${row.label} for ${row.name}`}
            clickAction={row.action === "open" ? "OPEN_URI" : "PROGRESS"}
            clickActionData={
              row.action === "open" ? { uri: row.uri } : { ...row }
            }
          />
        </FlexWidget>
      ))}
      <TextWidget
        text="Open Today →"
        style={{
          color: colors.green,
          height: 48,
          paddingTop: 14,
          fontSize: 13,
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: "steady-routine:///" }}
        accessibilityLabel="Open Today in Routine App"
      />
    </FlexWidget>
  );
}
export function widgetRepresentation(
  model: Props["model"],
  info: WidgetInfo,
  mode: ColorMode,
  message?: string,
) {
  return {
    light: (
      <TodayWidget
        model={model}
        info={info}
        dark={mode === "dark"}
        message={message}
      />
    ),
    dark: (
      <TodayWidget
        model={model}
        info={info}
        dark={mode !== "light"}
        message={message}
      />
    ),
  };
}
