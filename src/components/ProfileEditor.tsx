import { useState } from "react";
import { Switch, Text, View } from "react-native";
import {
  defaultProfile,
  profileAvatars,
  validateProfile,
} from "../domain/profile";
import { useLocalFeatures } from "../state/LocalFeaturesProvider";
import { useTheme } from "../theme";
import { Button, Chip, Field } from "./ui";
import { Sheet } from "./Sheet";
export function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { preferences, preferencesReady, preferenceError, updatePreferences } =
    useLocalFeatures();
  const { ui } = useTheme();
  const [draft, setDraft] = useState(() => ({
    ...(preferences.profile ?? defaultProfile),
  }));
  const [error, setError] = useState("");
  return (
    <Sheet title="Make it yours" onClose={onClose}>
      <Field
        label="Your name (optional)"
        value={draft.name}
        onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
        maxLength={40}
        placeholder="How should we call you?"
        autoCapitalize="words"
      />
      <Field
        label="What matters to you? (optional)"
        value={draft.intention}
        onChangeText={(intention) => setDraft((d) => ({ ...d, intention }))}
        maxLength={140}
        placeholder="Make a little more time for myself"
        multiline
      />
      <Text style={ui.label}>Choose your avatar</Text>
      <View style={[ui.row, { flexWrap: "wrap" }]}>
        {profileAvatars.map((avatar) => (
          <Chip
            key={avatar}
            label={avatar[0].toUpperCase() + avatar.slice(1)}
            selected={draft.avatar === avatar}
            onPress={() => setDraft((d) => ({ ...d, avatar }))}
          />
        ))}
      </View>
      <View style={ui.between}>
        <View style={ui.grow}>
          <Text style={ui.label}>Achievement celebrations</Text>
          <Text style={ui.small}>
            A small moment when you earn a new badge. Animation respects your
            device Reduce Motion setting.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Achievement celebrations"
          value={draft.celebrations}
          onValueChange={(celebrations) =>
            setDraft((d) => ({ ...d, celebrations }))
          }
        />
      </View>
      {!!(error || preferenceError) && (
        <Text style={ui.error} accessibilityRole="alert">
          {error || preferenceError}
        </Text>
      )}
      <Text style={ui.small}>
        Saved on this device. Profile details and this preference are separate
        from habit backups.
      </Text>
      <Button
        label="Save profile"
        disabled={!preferencesReady || !!preferenceError}
        onPress={async () => {
          try {
            const profile = validateProfile(draft);
            if (
              await updatePreferences((previous) => ({ ...previous, profile }))
            )
              onClose();
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Could not save your profile.",
            );
          }
        }}
      />
      <Button label="Cancel profile changes" secondary onPress={onClose} />
    </Sheet>
  );
}
