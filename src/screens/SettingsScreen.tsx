import { BackHandler, Text, View } from "react-native";
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Button, Header, Screen } from "../components/ui";
import { PremiumOffer } from "../components/PremiumOffer";
import { premiumTheme, ThemeContext, useTheme } from "../theme";
import { useAppearance } from "../state/AppearanceProvider";
import { dataFeatureLicenses } from "../content/dataLicenses";
import { ReminderSettings } from "../components/ReminderSettings";
import { useLocalFeatures } from "../state/LocalFeaturesProvider";

export default function Settings() {
  const { colors, ui } = useTheme();
  const { active, used, daysLeft, trial, error, refresh } = useAppearance();
  const { preferenceError, timerError, reload } = useLocalFeatures();
  const [licenses, setLicenses] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (!premiumOpen) return;
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          setPremiumOpen(false);
          return true;
        },
      );
      return () => subscription.remove();
    }, [premiumOpen]),
  );
  if (premiumOpen)
    return (
      <ThemeContext.Provider value={premiumTheme}>
        <PremiumOffer onClose={() => setPremiumOpen(false)} />
      </ThemeContext.Provider>
    );
  return (
    <Screen>
      <Header title="Settings" />
      <View style={ui.card}>
        <Text style={ui.heading}>App preferences</Text>
        <Text style={ui.body}>Language · English</Text>
        <Button
          label="Vacation / Pause mode"
          secondary
          icon="pause-circle-outline"
          onPress={() => router.push("/pause-habits")}
        />
        <Button
          label="Priorities, pins & custom order"
          secondary
          icon="options-outline"
          onPress={() => router.push("/organize-habits")}
        />
        <Button
          label="Getting started and habit templates"
          secondary
          onPress={() => router.push("/getting-started")}
        />
      </View>
      <ReminderSettings />
      {!!(preferenceError || timerError) && (
        <View style={ui.card}>
          <Text style={ui.error}>{preferenceError || timerError}</Text>
          <Button label="Retry local preferences" onPress={reload} />
        </View>
      )}
      {active && (
        <View style={ui.sageCard}>
          <Text style={[ui.heading, { color: colors.green }]}>
            Premium trial · Active
          </Text>
          <Text style={ui.title}>
            {daysLeft} {daysLeft === 1 ? "day" : "days"} remaining
          </Text>
          <Text style={ui.body}>Your premium design is unlocked.</Text>
          <View style={ui.row}>
            {Array.from({ length: 7 }, (_, index) => (
              <View
                key={index}
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    index <= 7 - daysLeft ? colors.green : colors.track,
                }}
              />
            ))}
          </View>
          <Text style={ui.small}>
            Ends{" "}
            {trial ? new Date(trial.expiresAt).toLocaleString("en-US") : ""}
          </Text>
        </View>
      )}
      <View style={ui.card}>
        <Text style={ui.heading}>Appearance</Text>
        <Text style={ui.body}>
          {active ? "Premium design · Active" : "Classic design · Default"}
        </Text>
        <Text style={ui.small}>
          {active
            ? "Warm colors and refined habit cards."
            : error
              ? "Classic is active while your appearance settings are unavailable. Retry loading below."
              : used
                ? "Your free trial has ended. Classic design is active; all your habits and progress are still here."
                : "A simple layout with lists, checkboxes and familiar controls."}
        </Text>
        <Button
          label="Upgrade Premium"
          icon="star-outline"
          onPress={() => setPremiumOpen(true)}
        />
      </View>
      {active && (
        <View style={ui.card}>
          <Text style={ui.heading}>Premium plan</Text>
          <Text style={ui.title}>
            $4.99<Text style={ui.subtitle}> / month</Text>
          </Text>
          <Text style={ui.small}>
            Demo plan · Paid subscriptions are coming soon.
          </Text>
          <Button
            label="View Premium plan"
            onPress={() => setPremiumOpen(true)}
          />
        </View>
      )}
      {!!error && (
        <View style={ui.card}>
          <Text accessibilityRole="alert" style={ui.error}>
            {error}
          </Text>
          <Button label="Retry loading trial" onPress={refresh} />
        </View>
      )}
      <View style={ui.card}>
        <Text style={ui.heading}>Your data, in your hands</Text>
        <Text style={ui.body}>
          Keep a copy of your habits, routines, notes and history, or restore an
          earlier backup.
        </Text>
        <Button
          label="Data & Backup"
          icon="folder-open-outline"
          onPress={() => router.push("/data-backup")}
        />
      </View>
      <Text style={ui.small}>Routine App · Offline storage on this device</Text>
      <Button
        label={licenses ? "Hide open-source licenses" : "Open-source licenses"}
        secondary
        onPress={() => setLicenses(!licenses)}
      />
      {licenses && (
        <Text selectable style={ui.small}>
          {dataFeatureLicenses}
        </Text>
      )}
    </Screen>
  );
}
