import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  DateStrip,
  EmptyState,
  Header,
  Screen,
  Segment,
} from "../../components/ui";
import { HabitCard } from "../../components/HabitCard";
import { RescheduleModal } from "../../components/RescheduleModal";
import { useDemo } from "../../state/DemoProvider";
import { itemsForDate } from "../../state/selectors";
import type { ScheduledItem } from "../../models/types";
import { formatTime, longDate, weekDates } from "../../utils/dates";
import { colors, ui } from "../../theme";

export default function Schedule() {
  const { state, selectedDate, setSelectedDate } = useDemo();
  const [view, setView] = useState<"day" | "week">("day");
  const [reschedule, setReschedule] = useState<ScheduledItem | null>(null);
  const dates = view === "day" ? [selectedDate] : weekDates(selectedDate);
  return (
    <Screen>
      <Header title="Schedule" subtitle="Make time for what matters" />
      <DateStrip value={selectedDate} onChange={setSelectedDate} />
      <Segment
        options={[
          { value: "day", label: "Day" },
          { value: "week", label: "Week" },
        ]}
        value={view}
        onChange={setView}
      />
      {dates.map((date) => {
        const items = itemsForDate(state, date);
        const slots = [
          ...new Set([
            ...Array.from(
              { length: 16 },
              (_, i) => `${String(i + 7).padStart(2, "0")}:00`,
            ),
            ...items.flatMap((i) => (i.time ? [i.time] : [])),
          ]),
        ].sort();
        return (
          <View key={date} style={{ gap: 14 }}>
            {view === "week" && (
              <Text style={ui.heading}>{longDate(date)}</Text>
            )}
            {!items.length ? (
              <EmptyState
                title="An open day"
                message="Your timeline is clear. Schedule a habit to give it a little structure."
              />
            ) : view === "week" ? (
              items.map((item) => (
                <HabitCard
                  key={item.id}
                  item={item}
                  schedule
                  onReschedule={() => setReschedule(item)}
                />
              ))
            ) : (
              <View>
                {slots.map((time) => {
                  const scheduled = items.filter((i) => i.time === time);
                  return (
                    <View
                      key={time}
                      style={{
                        flexDirection: "row",
                        minHeight: scheduled.length ? 120 : 45,
                      }}
                    >
                      <Text style={[ui.small, { width: 62, paddingTop: 13 }]}>
                        {formatTime(time)}
                      </Text>
                      <View
                        style={{
                          width: 14,
                          borderLeftWidth: 1,
                          borderLeftColor: "#D5DACF",
                          marginLeft: 5,
                        }}
                      >
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: "#C2CBBB",
                            position: "absolute",
                            left: -4,
                            top: 19,
                          }}
                        />
                      </View>
                      <View
                        style={[
                          ui.grow,
                          { gap: 8, paddingBottom: scheduled.length ? 10 : 0 },
                        ]}
                      >
                        {scheduled.length ? (
                          scheduled.map((item) => (
                            <HabitCard
                              key={item.id}
                              item={item}
                              schedule
                              onReschedule={() => setReschedule(item)}
                            />
                          ))
                        ) : (
                          <View
                            style={{
                              marginTop: 23,
                              borderBottomWidth: 1,
                              borderStyle: "dashed",
                              borderColor: colors.border,
                            }}
                          />
                        )}
                      </View>
                    </View>
                  );
                })}
                {items.filter((i) => !i.time).length > 0 && (
                  <View style={{ gap: 10 }}>
                    <Text style={ui.heading}>Anytime</Text>
                    {items
                      .filter((i) => !i.time)
                      .map((item) => (
                        <HabitCard
                          key={item.id}
                          item={item}
                          schedule
                          onReschedule={() => setReschedule(item)}
                        />
                      ))}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
      <Button
        label="Schedule a habit"
        icon="add"
        onPress={() =>
          router.push({ pathname: "/habit", params: { scheduled: "true" } })
        }
      />
      <Button
        label="Browse routines"
        secondary
        onPress={() => router.push("/routines")}
      />
      <RescheduleModal item={reschedule} onClose={() => setReschedule(null)} />
    </Screen>
  );
}
