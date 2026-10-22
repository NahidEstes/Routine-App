import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { habitTemplates } from "../domain/habitTemplates";
import { useLocalFeatures } from "../state/LocalFeaturesProvider";
import { useTheme } from "../theme";
import { Button, Chip, IconBubble } from "./ui";

export function GettingStarted({ onClose }: { onClose?: () => void }) {
  const { ui } = useTheme();
  const { updatePreferences, preferenceError } = useLocalFeatures();
  const [selected, setSelected] = useState<string[]>([]);
  const finish = () =>
    updatePreferences((previous) => ({ ...previous, onboardingSeen: true }));
  return (
    <View style={ui.sageCard}>
      <IconBubble name="leaf-outline" />
      <Text style={ui.title}>Make room for small steps</Text>
      <Text style={ui.body}>
        Choose up to three habits to get started. You will review each draft
        before saving it.
      </Text>
      <View style={[ui.row, { flexWrap: "wrap" }]}>
        {habitTemplates.map((template) => (
          <Chip
            key={template.id}
            label={template.name}
            selected={selected.includes(template.id)}
            onPress={() =>
              setSelected((previous) =>
                previous.includes(template.id)
                  ? previous.filter((id) => id !== template.id)
                  : previous.length < 3
                    ? [...previous, template.id]
                    : previous,
              )
            }
          />
        ))}
      </View>
      <Text style={ui.small}>
        A habit is one action, like reading. A routine combines actions, like
        water, stretching and breakfast.
      </Text>
      {!!preferenceError && (
        <Text accessibilityRole="alert" style={ui.error}>
          {preferenceError}
        </Text>
      )}
      <Button
        label={
          selected.length
            ? `Review ${selected.length === 1 ? "habit" : `${selected.length} habits`}`
            : "Create my own habit"
        }
        onPress={async () => {
          if (await finish()) {
            const target = {
              pathname: "/habit" as const,
              params: {
                template: selected[0],
                nextTemplates: selected.slice(1).join(","),
                setup: "1",
              },
            };
            if (onClose) router.replace(target);
            else router.push(target);
          }
        }}
      />
      <Button
        label="Skip for now"
        secondary
        onPress={async () => {
          if (await finish()) onClose?.();
        }}
      />
    </View>
  );
}
