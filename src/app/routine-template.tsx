import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Button,
  EmptyState,
  Header,
  IconBubble,
  Screen,
} from "../components/ui";
import { routineTemplates } from "../domain/routineTemplates";
import { useTheme } from "../theme";

export default function TemplatePreview() {
  const { ui } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const template = routineTemplates.find((t) => t.id === id);
  return (
    <Screen>
      <Header back title="Template preview" />
      {!template ? (
        <EmptyState
          title="Template unavailable"
          message="Return to Routines to choose one of the starter examples."
          action="See routines"
          onPress={() => router.replace("/routines")}
        />
      ) : (
        <>
          <View style={ui.sageCard}>
            <IconBubble name={template.icon} amber size={64} />
            <Text style={ui.title}>{template.name}</Text>
            <Text style={ui.body}>{template.description}</Text>
            <Text style={ui.small}>
              {template.steps.length} steps ·{" "}
              {template.steps.reduce((sum, step) => sum + step.minutes, 0)} min
              full ·{" "}
              {template.steps.reduce((sum, step) => sum + step.busyMinutes, 0)}{" "}
              min busy
            </Text>
          </View>
          <Text style={ui.heading}>An editable starting point</Text>
          {template.steps.map((step, index) => (
            <View key={index} style={[ui.card, ui.row]}>
              <IconBubble name={step.icon} />
              <View style={ui.grow}>
                <Text style={ui.label}>
                  {index + 1}. {step.name}
                </Text>
                <Text style={ui.small}>
                  {step.minutes} min · Busy {step.busyMinutes} min
                </Text>
              </View>
            </View>
          ))}
          <Text style={ui.body}>
            These are optional examples. Change the name, order, durations or
            steps before saving. All steps start standalone; you can choose
            existing habits to link yourself.
          </Text>
          <Button
            label="Use template"
            icon="add"
            onPress={() =>
              router.push({
                pathname: "/routine",
                params: { template: template.id },
              })
            }
          />
        </>
      )}
    </Screen>
  );
}
