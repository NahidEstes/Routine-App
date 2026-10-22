import { router } from "expo-router";
import { GettingStarted } from "../components/GettingStarted";
import { Header, Screen } from "../components/ui";
export default function GettingStartedScreen() {
  return (
    <Screen>
      <Header title="Getting started" back />
      <GettingStarted
        onClose={() =>
          router.canGoBack() ? router.back() : router.replace("/")
        }
      />
    </Screen>
  );
}
