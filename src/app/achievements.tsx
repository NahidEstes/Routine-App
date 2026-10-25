import { useLocalSearchParams } from "expo-router";
import { Header, Screen } from "../components/ui";
import { Achievements } from "../components/Achievements";
export default function AchievementsScreen() {
  const { badge } = useLocalSearchParams<{ badge?: string }>();
  return (
    <Screen>
      <Header back title="Achievements" />
      <Achievements initialSelection={badge} />
    </Screen>
  );
}
