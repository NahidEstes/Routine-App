import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { achievementDefinitions } from "../domain/achievements";
import { defaultProfile } from "../domain/profile";
import { useLocalFeatures } from "../state/LocalFeaturesProvider";
import { useTracker } from "../state/TrackerProvider";
import { useTheme } from "../theme";
import { BadgeMedallion } from "./Achievements";
import { Icon, IconButton } from "./ui";

/** One global, non-blocking celebration; eligibility/acknowledgement stay in TrackerProvider. */
export function AchievementCelebration() {
  const { achievementNotice, dismissAchievements } = useTracker();
  const { preferences, preferencesReady } = useLocalFeatures();
  const { colors, ui } = useTheme();
  const insets = useSafeAreaInsets();
  const [reduced, setReduced] = useState(true);
  const [reader, setReader] = useState(true);
  const [entrance] = useState(() => new Animated.Value(1));
  const enabled =
    preferencesReady && (preferences.profile ?? defaultProfile).celebrations;
  const noticeKey = achievementNotice.join("|");
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (live) setReduced(v);
      })
      .catch(() => {});
    void AccessibilityInfo.isScreenReaderEnabled()
      .then((v) => {
        if (live) setReader(v);
      })
      .catch(() => {});
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    const screenReader = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setReader,
    );
    return () => {
      live = false;
      motion.remove();
      screenReader.remove();
    };
  }, []);
  useEffect(() => {
    if (!enabled || !noticeKey || reduced) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: 450,
      useNativeDriver: Platform.OS !== "web",
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [enabled, noticeKey, reduced, entrance]);
  useEffect(() => {
    if (preferencesReady && !enabled && noticeKey) dismissAchievements();
  }, [preferencesReady, enabled, noticeKey, dismissAchievements]);
  useEffect(() => {
    if (!enabled || !noticeKey || reader) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout =
      Platform.OS === "android"
        ? AccessibilityInfo.getRecommendedTimeoutMillis(8000)
        : Promise.resolve(8000);
    void timeout
      .catch(() => 8000)
      .then((ms) => {
        if (live) timer = setTimeout(dismissAchievements, Math.max(8000, ms));
      });
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, noticeKey, reader, dismissAchievements]);
  const badges = achievementDefinitions.filter((b) =>
    achievementNotice.includes(b.id),
  );
  if (!enabled || !badges.length) return null;
  const badge = badges[0];
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: insets.top + 8,
        left: 0,
        right: 0,
        alignItems: "center",
        paddingHorizontal: 12,
        zIndex: 100,
        elevation: 6,
      }}
    >
      <Animated.View
        accessibilityLiveRegion="polite"
        style={{
          width: "100%",
          maxWidth: 640,
          borderRadius: 20,
          backgroundColor: colors.card,
          borderWidth: 2,
          borderColor: colors.green,
          padding: 12,
          gap: 6,
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [-12, 0],
              }),
            },
          ],
        }}
      >
        <View style={ui.row}>
          <View style={{ gap: 3, alignItems: "center" }}>
            <Icon name="sparkles-outline" size={16} color={colors.amber} />
            <BadgeMedallion small badge={{ ...badge, earned: true }} />
          </View>
          <View style={[ui.grow, { gap: 4 }]}>
            <Text style={[ui.label, { color: colors.green }]}>
              A small win, just for you
            </Text>
            <Text style={ui.heading}>
              {badge.name}
              {badges.length > 1 ? ` +${badges.length - 1}` : ""}
            </Text>
          </View>
          <IconButton
            plain
            name="close"
            label="Dismiss achievement celebration"
            onPress={dismissAchievements}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View newly earned achievements"
          onPress={() => {
            dismissAchievements();
            router.push({
              pathname: "/achievements",
              params: { badge: badge.id },
            });
          }}
          style={{
            minHeight: 48,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <Text style={[ui.label, { color: colors.green }]}>
            Enjoy your achievement
          </Text>
          <Icon name="arrow-forward" size={20} />
        </Pressable>
      </Animated.View>
    </View>
  );
}
