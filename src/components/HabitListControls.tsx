import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Chip, Field, IconButton } from "./ui";
import { Sheet } from "./Sheet";
import { useTracker } from "../state/TrackerProvider";
import { useTheme } from "../theme";
import type { HabitFeatures } from "../models/types";

type Filters = Pick<
  HabitFeatures,
  "sort" | "search" | "priorityFilter" | "typeFilter"
>;
export function HabitListControls({ compact = false, timeline = false }: { compact?: boolean; timeline?: boolean }) {
  const { state, dispatch, saving } = useTracker();
  const { ui } = useTheme();
  const f = state.features;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(f);
  const filtered =
    !!f.search || f.priorityFilter !== "all" || f.typeFilter !== "all";
  return (
    <View style={{ gap: 8 }}>
      {compact ? (
        <IconButton name="options-outline" plain={!filtered} label={filtered ? "Search, filter and sort. Filters on" : "Search, filter and sort"} onPress={() => { setDraft(f); setOpen(true); }} />
      ) : (
        <Button label={filtered ? "Search, filter & sort · Filters on" : "Search, filter & sort"} icon="options-outline" secondary onPress={() => { setDraft(f); setOpen(true); }} />
      )}
      {filtered && !compact && (
        <Button
          label="Clear filters"
          secondary
          disabled={saving}
          onPress={() =>
            dispatch({
              type: "habitFilters",
              value: { search: "", priorityFilter: "all", typeFilter: "all" },
            })
          }
        />
      )}
      {open && (
        <Sheet title="Find and organize habits" onClose={() => setOpen(false)}>
          <Field
            label="Search habits"
            placeholder="Habit name"
            value={draft.search}
            maxLength={60}
            onChangeText={(search) => setDraft({ ...draft, search })}
          />
          {!timeline && <>
          <Text style={ui.label}>Sort order</Text>
          <View style={[ui.row, { flexWrap: "wrap" }]}>
            {(
              [
                ["time", "Scheduled time"],
                ["priority", "Priority"],
                ["custom", "Custom order"],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={draft.sort === value}
                onPress={() => setDraft({ ...draft, sort: value })}
              />
            ))}
          </View>
          <Text style={ui.small}>
            Pinned habits come first within each time-of-day group. Use Manage
            habits to pin habits and change custom order.
          </Text>
          </>}
          {timeline && <Text style={ui.small}>The timeline always follows scheduled time. Filters apply to the habits shown.</Text>}
          <Text style={ui.label}>Priority</Text>
          <View style={[ui.row, { flexWrap: "wrap" }]}>
            {(["all", "high", "normal", "low"] as const).map((value) => (
              <Chip
                key={value}
                label={
                  value === "all"
                    ? "All priorities"
                    : `${value[0].toUpperCase()}${value.slice(1)}`
                }
                selected={draft.priorityFilter === value}
                onPress={() => setDraft({ ...draft, priorityFilter: value })}
              />
            ))}
          </View>
          <Text style={ui.label}>Habit type</Text>
          <View style={[ui.row, { flexWrap: "wrap" }]}>
            {(
              [
                ["all", "All types"],
                ["boolean", "Check off"],
                ["count", "Count"],
                ["duration", "Duration"],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={draft.typeFilter === value}
                onPress={() => setDraft({ ...draft, typeFilter: value })}
              />
            ))}
          </View>
          <Button
            label="Apply preferences"
            disabled={saving}
            onPress={async () => {
              if (
                await dispatch({
                  type: "habitFilters",
                  value: {
                    sort: draft.sort,
                    search: draft.search.trim(),
                    priorityFilter: draft.priorityFilter,
                    typeFilter: draft.typeFilter,
                  },
                })
              )
                setOpen(false);
            }}
          />
          <Button label="Cancel" secondary onPress={() => setOpen(false)} />
        </Sheet>
      )}
    </View>
  );
}
