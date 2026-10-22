import type { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { IconButton } from "./ui";

export function Sheet({
  title,
  onClose,
  children,
}: PropsWithChildren<{ title: string; onClose: () => void }>) {
  const { colors, ui, premium } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "#00000066",
        }}
      >
        <Pressable
          accessibilityLabel="Dismiss sheet"
          accessibilityRole="button"
          onPress={onClose}
          style={{ position: "absolute", inset: 0 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: "90%",
            borderTopLeftRadius: premium ? 24 : 0,
            borderTopRightRadius: premium ? 24 : 0,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingBottom: Math.max(12, insets.bottom),
            width: "100%",
            maxWidth: 680,
            alignSelf: "center",
          }}
        >
          <View
            style={{
              width: 38,
              height: 4,
              backgroundColor: colors.border,
              alignSelf: "center",
              borderRadius: 3,
              marginTop: 12,
            }}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, gap: 16 }}
          >
            <View style={ui.between}>
              <Text accessibilityRole="header" style={[ui.heading, ui.grow]}>
                {title}
              </Text>
              <IconButton
                name="close"
                label={`Close ${title}`}
                plain
                onPress={onClose}
              />
            </View>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
