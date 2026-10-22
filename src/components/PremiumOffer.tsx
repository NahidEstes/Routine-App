import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useAppearance } from "../state/AppearanceProvider";
import { useTheme } from "../theme";
import { Button, Icon, IconBubble, ProgressRing, Screen } from "./ui";
import { Sheet } from "./Sheet";

export function PremiumOffer({ onClose }: { onClose: () => void }) {
  const { colors, ui } = useTheme();
  const { active, used, error, startTrial, refresh } = useAppearance();
  const [comingSoon, setComingSoon] = useState(false);
  return (
    <Screen>
      <View style={ui.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Settings"
          onPress={onClose}
          style={{ minWidth: 48, minHeight: 48, justifyContent: "center" }}
        >
          <Icon name="arrow-back" color={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={ui.heading}>
          Upgrade Premium
        </Text>
      </View>
      <Text
        style={[
          ui.small,
          { letterSpacing: 3, textAlign: "center", color: colors.green },
        ]}
      >
        PREMIUM DESIGN
      </Text>
      <Text style={[ui.title, { fontSize: 28, textAlign: "center" }]}>
        A fresh look for your routine
      </Text>
      <Text style={[ui.subtitle, { textAlign: "center" }]}>
        Enjoy a calmer, more beautiful daily experience.
      </Text>
      <View
        accessibilityLabel="Premium design preview"
        style={[ui.sageCard, { padding: 20 }]}
      >
        <Text style={ui.heading}>Today</Text>
        <View style={ui.between}>
          <View style={ui.grow}>
            <Text style={ui.label}>Small steps, steady progress</Text>
            <Text style={ui.small}>3 of 5 completed · Sample preview</Text>
          </View>
          <ProgressRing percent={60} size={72} />
        </View>
        <View style={[ui.card, ui.row]}>
          <IconBubble name="water-outline" size={36} />
          <View style={ui.grow}>
            <Text style={ui.label}>Drink water</Text>
            <Text style={ui.small}>7:00 AM · 2 glasses</Text>
          </View>
          <Icon name="checkbox" />
        </View>
      </View>
      {(
        [
          [
            "color-palette-outline",
            "Refined colors",
            "A warmer, calmer, more beautiful look.",
          ],
          [
            "albums-outline",
            "Beautiful habit cards",
            "Thoughtfully designed, easy to scan.",
          ],
          [
            "sparkles-outline",
            "Calm, clear layouts",
            "More space, better focus, less clutter.",
          ],
        ] as const
      ).map(([icon, title, detail]) => (
        <View key={title} style={ui.row}>
          <IconBubble name={icon} />
          <View style={ui.grow}>
            <Text style={ui.label}>{title}</Text>
            <Text style={ui.small}>{detail}</Text>
          </View>
        </View>
      ))}
      <View style={[ui.sageCard, { alignItems: "center" }]}>
        <Text style={[ui.title, { color: colors.green }]}>
          $4.99<Text style={ui.subtitle}> / month</Text>
        </Text>
        <Text style={[ui.heading, { color: colors.green }]}>
          7 days free trial
        </Text>
        <Text style={[ui.small, { textAlign: "center" }]}>
          Demo plan · Paid subscriptions are coming soon.
        </Text>
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      {error ? (
        <Button label="Retry loading trial" onPress={refresh} />
      ) : !used ? (
        <Button
          label="Start 7-day free trial"
          onPress={async () => {
            if (await startTrial()) {
              onClose();
              router.navigate("/");
            }
          }}
        />
      ) : (
        <>
          <Text style={ui.body}>
            {active
              ? "Your premium design trial is already active."
              : "Your free trial has ended. Classic design is now active."}
          </Text>
          <Button label="Upgrade Premium" onPress={() => setComingSoon(true)} />
        </>
      )}
      <Text style={[ui.small, { textAlign: "center" }]}>
        Try the premium design once for 7 days. Then return to Classic
        automatically. No payment is taken.
      </Text>
      <Button
        label={active ? "Back to Settings" : "Continue with Classic"}
        secondary
        onPress={onClose}
      />
      {comingSoon && (
        <Sheet title="Coming soon" onClose={() => setComingSoon(false)}>
          <Text style={ui.body}>
            Paid Premium subscriptions are coming soon. No payment has been
            taken.
          </Text>
          <Button label="OK" onPress={() => setComingSoon(false)} />
        </Sheet>
      )}
    </Screen>
  );
}
