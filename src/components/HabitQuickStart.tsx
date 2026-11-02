import { useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";
import { habitTemplates } from "../domain/habitTemplates";
import { useTheme } from "../theme";
import { Sheet } from "./Sheet";
import { Icon } from "./ui";

type Template = (typeof habitTemplates)[number];

function goalLabel(template: Template) {
  return template.goal.type === "boolean"
    ? "Check off"
    : `${template.goal.value} ${template.goal.unit}`;
}

function TemplateCard({
  template,
  selected,
  onPress,
  disabled,
  style,
}: {
  template: Template;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
  style?: ViewStyle;
}) {
  const { colors, ui } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Use ${template.name} template, ${goalLabel(template)}${selected ? ", selected" : ""}`}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 136,
          padding: 10,
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: selected ? colors.green : colors.border,
          backgroundColor: selected ? colors.sage : colors.card,
          alignItems: "center",
          gap: 6,
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: 44,
          height: 44,
          borderRadius: 15,
          backgroundColor: selected ? colors.card : colors.sage,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 4,
        }}
      >
        <Icon name={template.icon} size={28} />
      </View>
      {selected && (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: "absolute",
            top: 7,
            right: 7,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: colors.green,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="checkmark" color={colors.onAccent} size={14} />
        </View>
      )}
      <Text
        style={[
          ui.label,
          {
            fontSize: 14,
            lineHeight: 20,
            minHeight: 40,
            textAlign: "center",
            width: "100%",
          },
        ]}
      >
        {template.name}
      </Text>
      <Text style={[ui.small, { textAlign: "center" }]}>
        {goalLabel(template)}
      </Text>
    </Pressable>
  );
}

export function HabitQuickStart({
  selectedId,
  onSelect,
  disabled = false,
}: {
  selectedId?: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  const { colors, ui } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const scrollCards = width < 320 || fontScale > 1.3;
  const singleColumn = width < 350 || fontScale > 1.3;
  const select = (id: string) => {
    if (disabled) return;
    Keyboard.dismiss();
    onSelect(id);
    setOpen(false);
  };
  const featured = habitTemplates.slice(0, 3);
  const selectedTemplate = habitTemplates.find(
    (template) => template.id === selectedId,
  );
  // Keep a choice from See all visible when the picker closes.
  if (
    selectedTemplate &&
    !featured.some((template) => template.id === selectedId)
  )
    featured[2] = selectedTemplate;
  const cards = featured.map((template) => (
    <TemplateCard
      key={template.id}
      template={template}
      selected={selectedId === template.id}
      disabled={disabled}
      onPress={() => select(template.id)}
      style={
        scrollCards ? { width: 112 * fontScale } : { flex: 1, minWidth: 0 }
      }
    />
  ));
  return (
    <View style={{ gap: 10 }}>
      <View style={[ui.between, { gap: 8 }]}>
        <Text
          accessibilityRole="header"
          style={[ui.heading, ui.grow, { fontSize: 22, fontWeight: "700" }]}
        >
          Quick start
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="See all habit templates"
          accessibilityState={{ disabled, expanded: open }}
          aria-expanded={open}
          disabled={disabled}
          onPress={() => {
            Keyboard.dismiss();
            setOpen(true);
          }}
          style={({ pressed }) => ({
            minHeight: 48,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingLeft: 8,
            opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
          })}
        >
          <Text style={[ui.label, { color: colors.green }]}>See all</Text>
          <Icon name="chevron-forward" size={18} />
        </Pressable>
      </View>
      <Text style={[ui.small, { marginTop: -6 }]}>
        Pick a habit, then make it yours.
      </Text>
      {scrollCards ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
        >
          {cards}
        </ScrollView>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "stretch", gap: 8 }}>
          {cards}
        </View>
      )}
      {open && (
        <Sheet rounded title="Choose a template" onClose={() => setOpen(false)}>
          <Text style={ui.small}>
            Choose an idea, then adjust the details. Nothing is saved until you
            tap Create habit.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {habitTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={selectedId === template.id}
                disabled={disabled}
                onPress={() => select(template.id)}
                style={{
                  flexBasis: singleColumn ? "100%" : "47%",
                  flexGrow: 1,
                }}
              />
            ))}
          </View>
        </Sheet>
      )}
    </View>
  );
}
