import { useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router } from "expo-router";
import { achievements } from "../domain/achievements";
import { defaultProfile } from "../domain/profile";
import { profileSummary } from "../presentation/activity";
import { useTracker } from "../state/TrackerProvider";
import { useLocalFeatures } from "../state/LocalFeaturesProvider";
import { useTheme } from "../theme";
import { Button, Header, Icon, IconButton, Screen } from "../components/ui";
import { BadgePreview, NextAchievementCard } from "../components/Achievements";
import { ActivityTimeline } from "../components/ActivityTimeline";
import { ProfileEditor } from "../components/ProfileEditor";
export default function ProfileScreen() {
  const { ui, colors } = useTheme();
  const { state, today } = useTracker();
  const { preferences, preferencesReady, preferenceError, reload } =
    useLocalFeatures();
  const [editing, setEditing] = useState(false);
  const profile = preferences.profile ?? defaultProfile;
  const badges = useMemo(() => achievements(state, today), [state, today]);
  const summary = useMemo(() => profileSummary(state, today), [state, today]);
  return (
    <Screen>
      <Header
        title="Profile"
        action={
          <IconButton
            name="settings-outline"
            plain
            color={colors.toolbarText}
            label="Profile settings"
            onPress={() => router.push("/settings")}
          />
        }
      />
      <View style={[ui.sageCard, { gap: 16 }]}>
        {!preferencesReady && !preferenceError ? (
          <ActivityIndicator
            color={colors.green}
            accessibilityLabel="Loading profile"
          />
        ) : (
          <>
            <View style={ui.row}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: colors.card,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Icon name={`${profile.avatar}-outline`} size={32} />
              </View>
              <View style={ui.grow}>
                <Text style={ui.title}>{profile.name || "Your journey"}</Text>
                <Text style={ui.small}>Small steps. Your own pace.</Text>
              </View>
            </View>
            {!!profile.intention && (
              <Text style={ui.body}>{profile.intention}</Text>
            )}
            <Button
              label="Edit profile"
              secondary
              icon="pencil-outline"
              disabled={!preferencesReady || !!preferenceError}
              onPress={() => setEditing(true)}
            />
          </>
        )}
        {!!preferenceError && (
          <>
            <Text accessibilityRole="alert" style={ui.error}>
              {preferenceError}
            </Text>
            <Button label="Retry loading profile" secondary onPress={reload} />
          </>
        )}
      </View>
      <View style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={ui.heading}>
          This week, at a glance
        </Text>
        <View style={[ui.row, { flexWrap: "wrap", alignItems: "stretch" }]}>
          {[
            { label: "Habit completions", value: summary.completions },
            { label: "Routines finished", value: summary.routines },
          ].map((stat) => (
            <View
              key={stat.label}
              style={[ui.card, { flexGrow: 1, flexBasis: 140 }]}
            >
              <Text style={[ui.title, { color: colors.green }]}>
                {stat.value}
              </Text>
              <Text style={ui.small}>{stat.label}</Text>
            </View>
          ))}
        </View>
        <Text style={ui.small}>
          Habit completions include daily and weekly habits.
        </Text>
      </View>
      <NextAchievementCard badges={badges} />
      <BadgePreview badges={badges} />
      <ActivityTimeline />
      <Button
        label="View detailed progress"
        secondary
        icon="stats-chart-outline"
        onPress={() => router.navigate("/progress")}
      />
      {editing && <ProfileEditor onClose={() => setEditing(false)} />}
    </Screen>
  );
}
