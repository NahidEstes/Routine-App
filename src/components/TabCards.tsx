import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useTheme } from "../theme";
import { Icon, type IconName } from "./ui";

export function FeatureIcon({
  name,
  amber = false,
  size = 44,
}: {
  name: IconName;
  amber?: boolean;
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        backgroundColor: amber ? colors.amberLight : colors.sage,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon
        name={name}
        size={size * 0.55}
        color={amber ? colors.amber : colors.green}
      />
    </View>
  );
}

export function TabRow({
  label,
  detail,
  icon,
  onPress,
}: {
  label: string;
  detail?: string;
  icon?: IconName;
  onPress: () => void;
}) {
  const { colors, ui } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        ui.card,
        ui.row,
        { minHeight: 56, paddingVertical: 12, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      {icon && <FeatureIcon name={icon} size={36} />}
      <View style={[ui.grow, { gap: 4 }]}>
        <Text style={ui.label}>{label}</Text>
        {!!detail && <Text style={ui.small}>{detail}</Text>}
      </View>
      <Icon name="chevron-forward" color={colors.muted} size={18} />
    </Pressable>
  );
}

export function StatCards({
  items,
}: {
  items: { label: string; value: string | number; icon: IconName }[];
}) {
  const { ui } = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.3;
  return (
    <View style={{ flexDirection: stacked ? "column" : "row", gap: 10 }}>
      {items.map((item) => (
        <View
          key={item.label}
          style={[
            ui.card,
            ui.row,
            {
              flex: stacked ? undefined : 1,
              padding: 14,
              minWidth: 0,
              flexWrap: "wrap",
            },
          ]}
        >
          <FeatureIcon name={item.icon} size={40} />
          <View style={{ flex: 1, minWidth: 70, gap: 4 }}>
            <Text style={[ui.heading, { fontSize: 22 }]}>{item.value}</Text>
            <Text style={ui.small}>{item.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
