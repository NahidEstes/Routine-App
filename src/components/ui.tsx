import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { router } from "expo-router";
import { DateTimeField } from "./DateTimeField";
import { useLocalFeatures } from "../state/LocalFeaturesProvider";
import { useTheme, classicTheme, premiumTheme, type Palette } from "../theme";
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
  color,
}: {
  name: IconName;
  size?: number;
  color?: React.ComponentProps<typeof Ionicons>["color"];
}) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? colors.green} />;
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
  const { colors, premium } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: premium ? size / 2 : 0,
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
  onPress: () => void | Promise<unknown>;
  secondary?: boolean;
  icon?: IconName;
  disabled?: boolean;
  danger?: boolean;
}) {
  const { colors, premium } = useTheme();
  const styles = premium ? premiumStyles : classicStyles;
  const tone = danger ? colors.danger : colors.green;
  const foreground =
    premium && !secondary && !danger ? "#FFFFFF" : danger ? tone : colors.text;
  const pressedLock = useRef(false);
  const [pending, setPending] = useState(false);
  const inactive = disabled || pending;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: pending }}
      disabled={inactive}
      onPress={async () => {
        if (pressedLock.current) return;
        pressedLock.current = true;
        setPending(true);
        try {
          await onPress();
        } finally {
          pressedLock.current = false;
          setPending(false);
        }
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor:
            secondary || (premium && danger) ? colors.card : colors.button,
          borderColor: danger ? tone : colors.buttonBorder,
          opacity: inactive ? 0.45 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {icon && <Icon name={icon} color={foreground} size={22} />}
      <Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  disabled,
  plain = false,
  color,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  plain?: boolean;
  color?: string;
}) {
  const { colors, premium } = useTheme();
  const styles = premium ? premiumStyles : classicStyles;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        plain && { backgroundColor: "transparent" },
        { opacity: disabled ? 0.3 : pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name={name} color={color ?? colors.green} />
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
  const { colors, premium } = useTheme();
  const styles = premium ? premiumStyles : classicStyles;
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
          borderColor: selected && amber ? colors.amber : colors.border,
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
  const { colors, premium } = useTheme();
  const styles = premium ? premiumStyles : classicStyles;
  const { fontScale, width } = useWindowDimensions();
  return (
    <View
      style={[
        styles.segment,
        fontScale > 1.3 && width < 450 && { flexDirection: "column" },
      ]}
    >
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
  scrollRef,
  compact = false,
}: React.PropsWithChildren<{
  form?: boolean;
  scrollRef?: React.Ref<ScrollView>;
  compact?: boolean;
}>) {
  const { colors, premium } = useTheme();
  const { timer } = useLocalFeatures();
  const styles = premium ? premiumStyles : classicStyles;
  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: colors.toolbar }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled={form}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.content,
            compact && { gap: 14 },
            timer && { paddingBottom: 150 },
          ]}
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
  backDisabled = false,
  action,
  onBack,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  backDisabled?: boolean;
  action?: React.ReactNode;
  onBack?: () => void;
}) {
  const { colors, ui, premium } = useTheme();
  const styles = premium ? premiumStyles : classicStyles;
  return (
    <View style={styles.header}>
      {back ? (
        <View style={ui.between}>
          <IconButton
            name="chevron-back"
            label="Go back"
            disabled={backDisabled}
            plain
            color={colors.toolbarText}
            onPress={
              onBack ??
              (() => (router.canGoBack() ? router.back() : router.replace("/")))
            }
          />
          <Text
            accessibilityRole="header"
            style={[ui.heading, ui.grow, { color: colors.toolbarText }]}
          >
            {title}
          </Text>
          {action ?? <View style={{ width: 48 }} />}
        </View>
      ) : (
        <View style={ui.between}>
          <Text
            accessibilityRole="header"
            style={[ui.title, ui.grow, { color: colors.toolbarText }]}
          >
            {title}
          </Text>
          {action}
        </View>
      )}
      {!!subtitle && (
        <Text style={[ui.subtitle, { color: colors.tabInactive }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}
export function Field({
  label,
  style,
  ...props
}: TextInputProps & { label: string }) {
  const { colors, ui } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[ui.input, style]}
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
  const { ui } = useTheme();
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
  const { colors, ui, premium } = useTheme();
  const safePercent = Math.min(100, Math.max(0, percent));
  if (premium) {
    const radius = (size - 10) / 2;
    const circumference = 2 * Math.PI * radius;
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`${safePercent}% completed`}
        accessibilityValue={{ min: 0, max: 100, now: safePercent }}
        style={{
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.track}
            strokeWidth={8}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.green}
            strokeWidth={8}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - safePercent / 100)}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Text style={ui.heading}>{safePercent}%</Text>
      </View>
    );
  }
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`${percent}% completed`}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={{
        width: size,
        minHeight: 48,
        gap: 6,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={ui.heading}>{percent}%</Text>
      <View style={{ height: 8, width: "100%", backgroundColor: colors.track }}>
        <View
          style={{
            height: 8,
            width: `${Math.min(100, Math.max(0, percent))}%`,
            backgroundColor: colors.green,
          }}
        />
      </View>
    </View>
  );
}
export function DateStrip({
  value,
  onChange,
  compact = false,
  hideWeekNavigation = false,
}: {
  value: string;
  onChange: (date: string) => void;
  compact?: boolean;
  hideWeekNavigation?: boolean;
}) {
  const { colors, ui, premium } = useTheme();
  const styles = premium ? premiumStyles : classicStyles;
  const days = weekDates(value);
  const { fontScale } = useWindowDimensions();
  const strip = useRef<ScrollView>(null);
  useEffect(() => {
    if (weekDates(value).indexOf(value) >= 5)
      strip.current?.scrollToEnd({ animated: false });
    else strip.current?.scrollTo({ x: 0, animated: false });
  }, [value]);
  const keepSelectedVisible = () => {
    if (days.indexOf(value) >= 5)
      strip.current?.scrollToEnd({ animated: false });
    else strip.current?.scrollTo({ x: 0, animated: false });
  };
  return (
    <View style={{ gap: 10 }}>
      {!hideWeekNavigation && (
        <View style={ui.between}>
          <IconButton
            name="chevron-back"
            label="Previous week"
            plain={compact}
            onPress={() => onChange(addDays(value, -7))}
          />
          <Text style={[ui.label, ui.grow, { textAlign: "center" }]}>
            {shortDate(days[0])} – {shortDate(days[6])}
          </Text>
          <IconButton
            name="chevron-forward"
            label="Next week"
            plain={compact}
            onPress={() => onChange(addDays(value, 7))}
          />
        </View>
      )}
      <ScrollView
        ref={strip}
        onContentSizeChange={keepSelectedVisible}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, gap: 4 }}
      >
        {days.map((day) => (
          <Pressable
            key={day}
            accessibilityRole="button"
            accessibilityLabel={parseDate(day).toDateString()}
            accessibilityState={{ selected: day === value }}
            onPress={() => onChange(day)}
            style={[
              styles.date,
              { minWidth: Math.max(48, 36 * fontScale), paddingVertical: 8 },
              {
                backgroundColor:
                  day === value
                    ? colors.green
                    : compact
                      ? "transparent"
                      : colors.card,
              },
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
      </ScrollView>
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
    <DateTimeField mode="time" label="Time" value={value} onChange={onChange} />
  );
}
const createStyles = (colors: Palette, premium: boolean) =>
  StyleSheet.create({
    content: {
      padding: premium ? 20 : 12,
      paddingBottom: 24,
      gap: 14,
      width: "100%",
      maxWidth: 680,
      alignSelf: "center",
    },
    header: {
      backgroundColor: colors.toolbar,
      marginHorizontal: premium ? 0 : -12,
      marginTop: premium ? 0 : -12,
      paddingHorizontal: premium ? 0 : 12,
      paddingVertical: premium ? 4 : 12,
      minHeight: 60,
      justifyContent: "center",
      gap: 4,
    },
    button: {
      minHeight: 52,
      borderRadius: premium ? 16 : 2,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "500",
      textAlign: "center",
      flexShrink: 1,
    },
    iconButton: {
      minWidth: 48,
      minHeight: 48,
      borderRadius: premium ? 24 : 2,
      backgroundColor: colors.sage,
      alignItems: "center",
      justifyContent: "center",
    },
    chip: {
      minHeight: 48,
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: premium ? 24 : 2,
      borderWidth: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    segment: {
      flexDirection: "row",
      backgroundColor: premium ? colors.sage : colors.button,
      borderRadius: premium ? 16 : 0,
      borderWidth: 1,
      borderColor: colors.buttonBorder,
    },
    segmentItem: {
      flex: 1,
      minHeight: 48,
      borderRadius: premium ? 14 : 0,
      paddingHorizontal: 5,
      paddingVertical: 10,
      justifyContent: "center",
    },
    date: {
      flex: 1,
      minHeight: 68,
      borderRadius: premium ? 28 : 0,
      borderWidth: premium ? 0 : 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      gap: 4,
    },
  });

const classicStyles = createStyles(classicTheme.colors, false);
const premiumStyles = createStyles(premiumTheme.colors, true);
