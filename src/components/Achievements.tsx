import { useMemo, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { achievements } from "../domain/achievements";
import {
  achievementHint,
  badgeAppearance,
  nextAchievement,
  type Achievement,
  type AchievementId,
} from "../presentation/achievements";
import { useTracker } from "../state/TrackerProvider";
import { useTheme } from "../theme";
import { Button, Chip, Icon } from "./ui";
import { Sheet } from "./Sheet";

export function BadgeMedallion({
  badge,
  small = false,
}: {
  badge: Pick<Achievement, "id" | "earned">;
  small?: boolean;
}) {
  const { colors } = useTheme();
  const appearance = badgeAppearance[badge.id];
  const diameter = small ? 48 : 72;
  const tone = appearance.tone === "amber" ? colors.amber : colors.green;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: diameter,
        height: diameter,
        borderRadius: diameter / 2,
        backgroundColor: !badge.earned
          ? colors.background
          : appearance.tone === "amber"
            ? colors.amberLight
            : colors.sage,
        borderWidth: 2,
        borderColor: badge.earned ? tone : colors.border,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Icon
        name={appearance.icon}
        size={small ? 24 : 34}
        color={badge.earned ? tone : colors.muted}
      />
      {badge.earned && (
        <View
          style={{
            position: "absolute",
            right: -3,
            bottom: -2,
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 2,
          }}
        >
          <Icon name="checkmark-circle" size={small ? 15 : 20} color={tone} />
        </View>
      )}
    </View>
  );
}
function BadgeProgress({ badge }: { badge: Achievement }) {
  const { colors, ui } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`${badge.name} progress`}
        accessibilityValue={{
          min: 0,
          max: badge.target,
          now: Math.min(badge.current, badge.target),
        }}
        style={{
          height: 6,
          backgroundColor: colors.track,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${Math.min(100, (badge.current / badge.target) * 100)}%`,
            height: 6,
            backgroundColor: colors.green,
          }}
        />
      </View>
      <Text style={ui.small}>
        {badge.metric === "streak" ? "Best streak · " : ""}
        {Math.min(badge.current, badge.target)} / {badge.target}{" "}
        {badge.metric === "streak" ? "scheduled days" : "completions"}
      </Text>
    </View>
  );
}
export function NextAchievementCard({
  badges,
  onSelect,
}: {
  badges: Achievement[];
  onSelect?: (id: AchievementId) => void;
}) {
  const { colors, ui } = useTheme();
  const next = nextAchievement(badges);
  if (!next)
    return (
      <View style={ui.sageCard}>
        <Icon name="sparkles-outline" />
        <Text style={ui.heading}>Look how far you have come</Text>
        <Text style={ui.body}>
          You have earned every current badge. Keep choosing the habits that
          matter to you.
        </Text>
        <Button
          label="View your badges"
          secondary
          onPress={() => router.push("/achievements")}
        />
      </View>
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Next achievement: ${next.name}. ${achievementHint(next)}`}
      onPress={() =>
        onSelect
          ? onSelect(next.id)
          : router.push({
              pathname: "/achievements",
              params: { badge: next.id },
            })
      }
      style={[ui.sageCard, { minHeight: 48 }]}
    >
      <View style={ui.between}>
        <Text style={[ui.label, ui.grow, { color: colors.green }]}>
          Your next small win
        </Text>
        <Icon name="chevron-forward" size={20} />
      </View>
      <View style={ui.row}>
        <BadgeMedallion small badge={next} />
        <View style={ui.grow}>
          <Text style={ui.heading}>{next.name}</Text>
          <Text style={ui.small}>{achievementHint(next)}</Text>
        </View>
      </View>
      <BadgeProgress badge={next} />
    </Pressable>
  );
}
export function BadgePreview({ badges }: { badges: Achievement[] }) {
  const { colors, ui } = useTheme();
  const earned = badges.filter((b) => b.earned);
  return (
    <View style={{ gap: 12 }}>
      <View style={ui.between}>
        <Text style={[ui.heading, ui.grow]}>Your badges · {earned.length}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View all achievements"
          onPress={() => router.push("/achievements")}
          style={{
            minHeight: 48,
            justifyContent: "center",
            paddingHorizontal: 8,
          }}
        >
          <Text style={[ui.label, { color: colors.green }]}>View all</Text>
        </Pressable>
      </View>
      {earned.length ? (
        <View style={[ui.row, { flexWrap: "wrap", alignItems: "stretch" }]}>
          {earned.slice(0, 3).map((b) => (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              accessibilityLabel={`Earned badge: ${b.name}`}
              onPress={() =>
                router.push({
                  pathname: "/achievements",
                  params: { badge: b.id },
                })
              }
              style={{
                minHeight: 80,
                flexBasis: 100,
                flexGrow: 1,
                gap: 8,
                alignItems: "center",
                padding: 12,
                backgroundColor: colors.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <BadgeMedallion small badge={b} />
              <Text
                style={[ui.small, { textAlign: "center", color: colors.text }]}
              >
                {b.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={ui.small}>
          Your first badge begins with one completed habit. Every small step has
          a place here.
        </Text>
      )}
    </View>
  );
}
export function Achievements({
  initialSelection,
}: {
  initialSelection?: string;
}) {
  const { state, today } = useTracker();
  const { ui, colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const [filter, setFilter] = useState<"all" | "earned" | "upcoming">("all");
  const [selected, setSelected] = useState<AchievementId | undefined>(
    initialSelection as AchievementId | undefined,
  );
  const badges = useMemo(() => achievements(state, today), [state, today]);
  const earned = badges.filter((b) => b.earned).length;
  const shown = badges.filter(
    (b) => filter === "all" || (filter === "earned" ? b.earned : !b.earned),
  );
  const detail = badges.find((b) => b.id === selected);
  return (
    <>
      <View style={{ gap: 10 }}>
        <Text style={ui.title}>
          {earned
            ? `${earned} small ${earned === 1 ? "win" : "wins"} to be proud of`
            : "Every small step matters"}
        </Text>
        <Text style={ui.subtitle}>
          Your effort, one meaningful step at a time.
        </Text>
      </View>
      <NextAchievementCard badges={badges} onSelect={setSelected} />
      <View style={[ui.row, { flexWrap: "wrap" }]}>
        {(
          [
            { value: "all", label: `All · ${badges.length}` },
            { value: "earned", label: `Earned · ${earned}` },
            {
              value: "upcoming",
              label: `Upcoming · ${badges.length - earned}`,
            },
          ] as const
        ).map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            selected={filter === f.value}
            onPress={() => setFilter(f.value)}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {shown.map((b) => (
          <Pressable
            key={b.id}
            accessibilityRole="button"
            accessibilityLabel={`${b.name}. ${b.earned ? "Earned" : "Upcoming"}. ${Math.min(b.current, b.target)} of ${b.target} ${b.metric === "streak" ? "scheduled days, best streak" : "completions"}`}
            onPress={() => setSelected(b.id)}
            style={{
              width: width < 370 || fontScale > 1.25 ? "100%" : "48%",
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 18,
              padding: 16,
              gap: 12,
              minHeight: 180,
            }}
          >
            <View style={{ alignItems: "center", gap: 12 }}>
              <BadgeMedallion badge={b} />
              <Text style={[ui.label, { textAlign: "center" }]}>{b.name}</Text>
              <View style={[ui.row, { gap: 4 }]}>
                <Icon
                  name={
                    b.earned
                      ? "checkmark-circle-outline"
                      : "lock-closed-outline"
                  }
                  size={14}
                  color={b.earned ? colors.green : colors.muted}
                />
                <Text
                  style={[
                    ui.small,
                    { color: b.earned ? colors.green : colors.muted },
                  ]}
                >
                  {b.earned ? "Earned" : "Upcoming"}
                </Text>
              </View>
            </View>
            <BadgeProgress badge={b} />
          </Pressable>
        ))}
      </View>
      {!shown.length && (
        <Text style={ui.subtitle}>
          {filter === "earned"
            ? "Your first small win is ahead. A single habit completion starts your collection."
            : "You have earned every current badge. Enjoy the progress you have made."}
        </Text>
      )}
      <Text style={ui.small}>
        Badges follow your saved history. Busy goal completions count, and
        correcting a record updates eligibility. Off-days and pauses are neutral
        in streaks.
      </Text>
      {detail && (
        <Sheet title="Your achievement" onClose={() => setSelected(undefined)}>
          <View style={{ alignItems: "center", gap: 16 }}>
            <BadgeMedallion badge={detail} />
            <Text style={ui.heading}>{detail.name}</Text>
            <Text style={ui.subtitle}>
              {badgeAppearance[detail.id].caption}
            </Text>
          </View>
          <Text style={ui.body}>{detail.description}</Text>
          <BadgeProgress badge={detail} />
          <Text style={ui.body}>{achievementHint(detail)}</Text>
          {detail.metric === "streak" && (
            <Text style={ui.small}>
              This is your best recorded streak for one daily habit. A new
              streak builds from your current run; flexible weekly habits earn
              completion badges.
            </Text>
          )}
          <Text style={[ui.label, { color: colors.green }]}>
            {detail.earned
              ? "Earned · Your effort made this possible."
              : "Upcoming · Small steps are enough to begin."}
          </Text>
          <Button
            label="Close achievement"
            secondary
            onPress={() => setSelected(undefined)}
          />
        </Sheet>
      )}
    </>
  );
}
