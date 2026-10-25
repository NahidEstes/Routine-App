import type { achievements } from "../domain/achievements";
export type Achievement = ReturnType<typeof achievements>[number];
export type AchievementId = Achievement["id"];
export const badgeAppearance = {
  first: { icon: "footsteps-outline", caption: "A beginning", tone: "sage" },
  ten: { icon: "leaf-outline", caption: "Growing steady", tone: "sage" },
  fifty: {
    icon: "trophy-outline",
    caption: "Small wins add up",
    tone: "amber",
  },
  seven: {
    icon: "sunny-outline",
    caption: "Finding your rhythm",
    tone: "sage",
  },
  thirty: {
    icon: "ribbon-outline",
    caption: "A lasting rhythm",
    tone: "amber",
  },
} as const;
export function nextAchievement(badges: Achievement[]) {
  return (
    badges
      .filter((b) => !b.earned)
      .sort((a, b) => b.current / b.target - a.current / a.target)[0] ?? null
  );
}
export function achievementHint(badge: Achievement) {
  if (badge.earned) return "A small win worth keeping in view.";
  return badge.metric === "streak"
    ? `Build a ${badge.target} scheduled-day streak for one daily habit.`
    : `${Math.max(0, badge.target - badge.current)} more habit ${badge.target - badge.current === 1 ? "completion" : "completions"} to go.`;
}
