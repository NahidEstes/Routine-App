import { useState } from "react";
import { Switch, Text, View } from "react-native";
import { Button, Chip, Header, IconButton, Screen } from "../components/ui";
import { Sheet } from "../components/Sheet";
import { useTracker } from "../state/TrackerProvider";
import { organizationFor } from "../domain/organization";
import { useTheme } from "../theme";
import type { Priority } from "../models/types";

export default function OrganizeHabits() {
  const { state, dispatch, saving } = useTracker();
  const { ui } = useTheme();
  const [editing, setEditing] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>("normal");
  const [pinned, setPinned] = useState(false);
  const order = [
    ...state.features.order,
    ...state.habits
      .map((h) => h.id)
      .filter((id) => !state.features.order.includes(id)),
  ];
  return (
    <Screen>
      <Header back title="Organize habits" />
      <Text style={ui.body}>
        Set priorities and pin favorites. Move habits with the arrows to set
        your custom order.
      </Text>
      <Text style={ui.small}>
        Custom order is selected when you move a habit. Today keeps its
        time-of-day groups and puts pinned habits first. Archived habits retain
        their place for later restoration.
      </Text>
      {!order.length && (
        <Text style={ui.body}>Create a habit to start organizing.</Text>
      )}
      {order.map((id, index) => {
        const h = state.habits.find((h) => h.id === id)!;
        const o = organizationFor(state, id);
        return (
          <View key={id} style={ui.card}>
            <Text style={ui.heading}>{h.name}</Text>
            <Text style={ui.small}>
              {o.pinned ? "Pinned · " : ""}
              {o.priority[0].toUpperCase() + o.priority.slice(1)} priority
              {h.archivedAt ? " · Archived" : ""}
            </Text>
            <View style={ui.row}>
              <IconButton
                name="arrow-up"
                label={`Move ${h.name} up`}
                disabled={saving || index === 0}
                onPress={() => {
                  void dispatch({
                    type: "moveHabit",
                    habitId: id,
                    direction: -1,
                  });
                }}
              />
              <IconButton
                name="arrow-down"
                label={`Move ${h.name} down`}
                disabled={saving || index === order.length - 1}
                onPress={() => {
                  void dispatch({
                    type: "moveHabit",
                    habitId: id,
                    direction: 1,
                  });
                }}
              />
            </View>
            <Button
              label={`Priority and pin · ${h.name}`}
              secondary
              onPress={() => {
                setPriority(o.priority);
                setPinned(o.pinned);
                setEditing(id);
              }}
            />
          </View>
        );
      })}
      {editing && (
        <Sheet title="Priority and pin" onClose={() => setEditing(null)}>
          <Text style={ui.heading}>
            {state.habits.find((h) => h.id === editing)?.name}
          </Text>
          <View style={[ui.row, { flexWrap: "wrap" }]}>
            {(["high", "normal", "low"] as const).map((p) => (
              <Chip
                key={p}
                label={`${p[0].toUpperCase()}${p.slice(1)} priority`}
                selected={priority === p}
                onPress={() => setPriority(p)}
              />
            ))}
          </View>
          <View style={ui.between}>
            <Text style={[ui.label, ui.grow]}>Pin this habit</Text>
            <Switch
              accessibilityLabel="Pin this habit"
              value={pinned}
              onValueChange={setPinned}
            />
          </View>
          <Button
            label="Save organization"
            disabled={saving}
            onPress={async () => {
              if (
                await dispatch({
                  type: "organizeHabit",
                  habitId: editing,
                  priority,
                  pinned,
                })
              )
                setEditing(null);
            }}
          />
          <Button label="Cancel" secondary onPress={() => setEditing(null)} />
        </Sheet>
      )}
    </Screen>
  );
}
