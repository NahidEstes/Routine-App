import { Text, View, useWindowDimensions } from "react-native";
import type { ScheduledItem } from "../models/types";
import { formatTime } from "../utils/dates";
import { timelineOrder } from "../presentation/dayFocus";
import { useTheme } from "../theme";
import { HabitCard } from "./EntryCard";
import { Icon } from "./ui";

export function ScheduleTimeline({ items, currentTime, onReschedule }: {
  items: ScheduledItem[];
  currentTime?: string;
  onReschedule: (item: ScheduledItem) => void;
}) {
  const { colors, ui } = useTheme();
  const { fontScale } = useWindowDimensions();
  const ordered = timelineOrder(items);
  const separateTime = fontScale <= 1.25;
  // Untimed habits have no position on the clock, so Now comes before Anytime.
  const markerAt = currentTime ? ordered.findIndex((item) => !item.time || item.time > currentTime) : -1;
  const nowMarker = (
    <View accessible accessibilityLabel={"Current time, " + formatTime(currentTime ?? null)} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 }}>
      <Text style={[ui.small, { color: colors.amber, fontWeight: "700", width: separateTime ? 54 : undefined }]}>Now</Text>
      <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: colors.amber }} />
      <View style={{ flex: 1, height: 1, backgroundColor: colors.amber }} />
      <Text style={[ui.small, { color: colors.amber }]}>{formatTime(currentTime ?? null)}</Text>
    </View>
  );
  return (
    <View style={{ gap: 0 }}>
      {ordered.map((item, index) => (
        <View key={item.id}>
          {index === markerAt && nowMarker}
          <View style={{ flexDirection: "row", alignItems: "stretch", gap: 8 }}>
            {separateTime && <Text style={[ui.small, { width: 54, paddingTop: 17, fontSize: 11 }]}>{formatTime(item.time)}</Text>}
            <View style={{ width: 16, alignItems: "center" }}>
              <View style={{ position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: colors.border }} />
              <View style={{ marginTop: 20, width: 16, height: 16, borderRadius: 8, borderWidth: item.status === "done" ? 0 : 2, borderColor: item.paused ? colors.border : colors.sageDark, backgroundColor: item.status === "done" ? colors.green : colors.background, alignItems: "center", justifyContent: "center" }}>
                {item.status === "done" && <Icon name="checkmark" color="#FFFFFF" size={12} />}
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0, paddingBottom: 12, gap: 6 }}>
              {!separateTime && <Text style={ui.small}>{formatTime(item.time)}</Text>}
              <HabitCard item={item} schedule onReschedule={() => onReschedule(item)} />
            </View>
          </View>
        </View>
      ))}
      {!!currentTime && markerAt === -1 && nowMarker}
    </View>
  );
}
