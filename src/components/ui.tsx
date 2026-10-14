import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { router } from "expo-router";
import { colors, ui } from "../theme";
import {
  addDays,
  DAY_NAMES,
  parseDate,
  shortDate,
  weekDates,
} from "../utils/dates";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export function Icon({
  name,
  size = 24,
  color = colors.green,
}: {
  name: IconName;
  size?: number;
  color?: React.ComponentProps<typeof Ionicons>["color"];
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function IconBubble({
  name,
  amber = false,
  size = 48,
}: {
  name: IconName;
  amber?: boolean;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: amber ? colors.amberLight : colors.sage,
      }}
    >
      <Icon
        name={name}
        color={amber ? colors.amber : colors.green}
        size={size * 0.5}
      />
    </View>
  );
}
export function Button({
  label,
  onPress,
  secondary,
  icon,
  disabled,
  danger,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: IconName;
  disabled?: boolean;
  danger?: boolean;
}) {
  const tone = danger ? colors.danger : colors.green;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? "transparent" : tone,
          borderColor: tone,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {icon && (
        <Icon name={icon} color={secondary ? tone : "white"} size={22} />
      )}
      <Text style={[styles.buttonText, { color: secondary ? tone : "white" }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  disabled,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { opacity: disabled ? 0.3 : pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function Chip({
  label,
  accessibilityLabel = label,
  selected,
  onPress,
  amber,
}: {
  label: string;
  accessibilityLabel?: string;
  selected?: boolean;
  onPress: () => void;
  amber?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? amber
              ? colors.amberLight
              : colors.green
            : colors.sage,
          borderColor: selected && amber ? colors.amber : "transparent",
        },
      ]}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: selected && !amber ? "white" : colors.green,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Segment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="button"
          accessibilityLabel={option.label}
          accessibilityState={{ selected: option.value === value }}
          onPress={() => onChange(option.value)}
          style={[
            styles.segmentItem,
            option.value === value && { backgroundColor: colors.green },
          ]}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              textAlign: "center",
              color: option.value === value ? "white" : colors.text,
            }}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Screen({
  children,
  form = false,
}: React.PropsWithChildren<{ form?: boolean }>) {
  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled={form}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.content}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Header({
  title,
  subtitle,
  back = false,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      {back ? (
        <View style={ui.between}>
          <IconButton
            name="chevron-back"
            label="Go back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
          />
          <Text style={[ui.heading, ui.grow, { textAlign: "center" }]}>
            {title}
          </Text>
          {action ?? <View style={{ width: 44 }} />}
        </View>
      ) : (
        <View style={ui.between}>
          <Text style={[ui.title, ui.grow]}>{title}</Text>
          {action}
        </View>
      )}
      {!!subtitle && <Text style={ui.subtitle}>{subtitle}</Text>}
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={ui.input}
        {...props}
      />
    </View>
  );
}
export function EmptyState({
  title,
  message,
  action,
  onPress,
}: {
  title: string;
  message: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={[ui.card, { alignItems: "center", paddingVertical: 32 }]}>
      <IconBubble name="leaf-outline" />
      <Text style={ui.heading}>{title}</Text>
      <Text style={[ui.subtitle, { textAlign: "center" }]}>{message}</Text>
      {action && onPress && (
        <Button label={action} onPress={onPress} secondary />
      )}
    </View>
  );
}
export function ProgressRing({
  percent,
  size = 80,
}: {
  percent: number;
  size?: number;
}) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  return (
    <View
      accessibilityLabel={`${percent}% completed`}
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        style={StyleSheet.absoluteFill}
      >
        <Circle
          cx="40"
          cy="40"
          r={radius}
          stroke="#CDD8CA"
          strokeWidth="7"
          fill="none"
        />
        <Circle
          cx="40"
          cy="40"
          r={radius}
          stroke={colors.green}
          strokeWidth="7"
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference * (1 - percent / 100)}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
      </Svg>
      <Text style={[ui.heading, { fontSize: size > 80 ? 24 : 18 }]}>
        {percent}%
      </Text>
    </View>
  );
}
export function DateStrip({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  const days = weekDates(value);
  return (
    <View style={{ gap: 10 }}>
      <View style={ui.between}>
        <IconButton
          name="chevron-back"
          label="Previous week"
          onPress={() => onChange(addDays(value, -7))}
        />
        <Text style={ui.label}>
          {shortDate(days[0])} – {shortDate(days[6])}
        </Text>
        <IconButton
          name="chevron-forward"
          label="Next week"
          onPress={() => onChange(addDays(value, 7))}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {days.map((day) => (
          <Pressable
            key={day}
            accessibilityRole="button"
            accessibilityLabel={parseDate(day).toDateString()}
            accessibilityState={{ selected: day === value }}
            onPress={() => onChange(day)}
            style={[
              styles.date,
              { backgroundColor: day === value ? colors.green : "#F0F0E9" },
            ]}
          >
            <Text
              style={{
                fontSize: 12,
                color: day === value ? "white" : colors.muted,
              }}
            >
              {DAY_NAMES[parseDate(day).getDay()]}
            </Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "600",
                color: day === value ? "white" : colors.text,
              }}
            >
              {parseDate(day).getDate()}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function TimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (time: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Field
        label="Time (24-hour HH:MM)"
        value={value}
        onChangeText={onChange}
        maxLength={5}
        keyboardType="numbers-and-punctuation"
        placeholder="07:00"
      />
      <View style={[ui.row, { flexWrap: "wrap" }]}>
        {["07:00", "12:00", "18:00", "21:30"].map((time) => (
          <Chip
            key={time}
            label={time}
            selected={time === value}
            onPress={() => onChange(time)}
          />
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 22,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
  },
  button: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#EBECE5",
    borderRadius: 16,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    minHeight: 46,
    borderRadius: 13,
    paddingHorizontal: 5,
    paddingVertical: 10,
    justifyContent: "center",
  },
  date: {
    flex: 1,
    minHeight: 68,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
});
