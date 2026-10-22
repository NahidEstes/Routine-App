import { Text, View } from "react-native";
import { useTracker } from "../state/TrackerProvider";
import { useTheme } from "../theme";
import { Button, IconButton } from "./ui";
export function ActionFeedback() {
  const { colors, ui } = useTheme();
  const { feedback, dismissFeedback, dispatch, notify, saving } = useTracker();
  if (!feedback) return null;
  return (
    <View
      style={{
        backgroundColor: colors.sage,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
        gap: 8,
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <Text
        accessibilityLiveRegion="polite"
        style={[ui.body, { flexGrow: 1, flexBasis: 150 }]}
      >
        {feedback.message}
      </Text>
      {feedback.undo && (
        <Button
          label="Undo"
          secondary
          disabled={saving}
          onPress={async () => {
            if (await dispatch(feedback.undo!)) notify("Change undone.");
          }}
        />
      )}
      <IconButton
        plain
        name="close"
        label="Dismiss feedback"
        onPress={dismissFeedback}
      />
    </View>
  );
}
