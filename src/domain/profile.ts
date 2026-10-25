export const profileAvatars = [
  "leaf",
  "sunny",
  "book",
  "walk",
  "heart",
] as const;
export type ProfileAvatar = (typeof profileAvatars)[number];
export type LocalProfile = {
  name: string;
  intention: string;
  avatar: ProfileAvatar;
  celebrations: boolean;
};
export const defaultProfile: LocalProfile = {
  name: "",
  intention: "",
  avatar: "leaf",
  celebrations: true,
};

/** Optional extension of existing device preferences; old saves remain valid. */
export function validateProfile(value: unknown): LocalProfile {
  const p = value as LocalProfile | undefined;
  if (
    !p ||
    typeof p.name !== "string" ||
    p.name.length > 40 ||
    typeof p.intention !== "string" ||
    p.intention.length > 140 ||
    !profileAvatars.includes(p.avatar) ||
    typeof p.celebrations !== "boolean"
  ) {
    throw new Error(
      "Could not read your profile. Your saved activities are unchanged.",
    );
  }
  return {
    name: p.name.trim(),
    intention: p.intention.trim(),
    avatar: p.avatar,
    celebrations: p.celebrations,
  };
}
