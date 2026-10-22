import Storage from "expo-sqlite/kv-store";
import { PremiumTrialStore } from "./premiumTrial";

export const premiumTrialStore = new PremiumTrialStore(Storage);
