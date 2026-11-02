import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
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
import { StatCards, TabRow } from "../components/TabCards";
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
    <Screen tab>
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
      <View
        style={[
          ui.heroCard,
          {
            gap: 12,
            padding: 16,
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
          },
        ]}
      >
        {!preferencesReady && !preferenceError ? (
          <ActivityIndicator
            color={colors.onHero}
            accessibilityLabel="Loading profile"
          />
        ) : (
          <>
            <View style={[ui.row, { flexGrow: 1, flexBasis: 186 }]}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.sage,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Icon name={`${profile.avatar}-outline`} size={28} />
              </View>
              <View style={ui.grow}>
                <Text
                  style={[ui.heading, { color: colors.onHero, fontSize: 22 }]}
                >
                  {profile.name || "Your journey"}
                </Text>
                <Text style={[ui.small, { color: colors.heroMuted }]}>
                  Small steps. Your own pace.
                </Text>
              </View>
            </View>
            {!!profile.intention && (
              <Text style={[ui.body, { color: colors.onHero }]}>
                {profile.intention}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              accessibilityState={{
                disabled: !preferencesReady || !!preferenceError,
              }}
              disabled={!preferencesReady || !!preferenceError}
              onPress={() => setEditing(true)}
              style={({ pressed }) => ({
                minHeight: 48,
                borderWidth: 1,
                borderColor: colors.heroMuted,
                borderRadius: 24,
                paddingHorizontal: 14,
                paddingVertical: 12,
                alignSelf: "flex-start",
                justifyContent: "center",
                opacity:
                  !preferencesReady || preferenceError
                    ? 0.5
                    : pressed
                      ? 0.7
                      : 1,
              })}
            >
              <Text style={[ui.label, { color: colors.onHero }]}>
                Edit profile
              </Text>
            </Pressable>
          </>
        )}
        {!!preferenceError && (
          <>
            <Text
              accessibilityRole="alert"
              style={[ui.body, { color: colors.onHero }]}
            >
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
        <StatCards
          items={[
            {
              label: "Habit completions",
              value: summary.completions,
              icon: "checkmark-circle-outline",
            },
            {
              label: "Routines finished",
              value: summary.routines,
              icon: "calendar-outline",
            },
          ]}
        />
      </View>
      <NextAchievementCard compact badges={badges} />
      <TabRow
        label="Your challenges"
        detail="Keep a promise to yourself"
        icon="flag-outline"
        onPress={() => router.push("/challenges")}
      />
      <BadgePreview compact badges={badges} />
      <ActivityTimeline compact />
      <TabRow
        label="View detailed progress"
        icon="stats-chart-outline"
        onPress={() => router.navigate("/progress")}
      />
      {editing && <ProfileEditor onClose={() => setEditing(false)} />}
    </Screen>
  );
}
