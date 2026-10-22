import { Text, View } from "react-native";
import { router } from "expo-router";
import { useTracker } from "../state/TrackerProvider";
import { useTheme } from "../theme";
import { reviewPromptWeek } from "../domain/weeklyReview";
import { Button } from "./ui";
export function WeeklyReviewCard() {
  const { state, today, dispatch, saving } = useTracker();
  const { ui } = useTheme();
  const week = reviewPromptWeek(state, today);
  return (
    <View style={week ? ui.sageCard : ui.card}>
      <Text style={ui.heading}>Weekly review</Text>
      <Text style={ui.body}>
        {week
          ? "A moment to reflect on last week. What helped, and what would you like to change?"
          : "Notice what worked and plan one small change. Drafts and previous reviews stay here."}
      </Text>
      <Button
        label={week ? "Review last week" : "Open weekly reviews"}
        secondary
        onPress={() =>
          router.push({
            pathname: "/weekly-review",
            params: week ? { week } : {},
          })
        }
      />
      {!!week && (
        <Button
          label="Maybe later"
          secondary
          disabled={saving}
          onPress={() => dispatch({ type: "dismissReview", week })}
        />
      )}
    </View>
  );
}
