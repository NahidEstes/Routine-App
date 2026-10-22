import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Button, Header, IconBubble, Screen } from "../components/ui";
import { backupCounts, type Backup } from "../domain/backup";
import { exportBackupFile, pickBackupFile } from "../storage/backupFiles";
import { useTracker } from "../state/TrackerProvider";
import { useTheme } from "../theme";

export default function DataBackup() {
  const { colors, ui } = useTheme();
  const { exportSnapshot, restoreSnapshot, saving } = useTracker();
  const { restored } = useLocalSearchParams<{ restored?: string }>();
  const [preview, setPreview] = useState<Backup | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [working, setWorking] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState(
    restored ? "Backup restored. Your history and progress are ready." : "",
  );
  const [error, setError] = useState("");
  const disabled = working || saving;
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (lock.current) return true;
        if (confirm) {
          setConfirm(false);
          return true;
        }
        if (preview) {
          setPreview(null);
          return true;
        }
        if (!router.canGoBack()) {
          router.replace("/");
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [confirm, preview]),
  );
  async function run(task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not complete this action. Your saved data is unchanged.",
      );
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }
  const exportCurrent = () =>
    run(async () => {
      const snapshot = await exportSnapshot();
      const name = await exportBackupFile(snapshot);
      setMessage(
        name
          ? `Backup file created: ${name}`
          : "Export cancelled. Your data is unchanged.",
      );
    });
  return (
    <Screen>
      <Header back backDisabled={working} title="Data & Backup" />
      <Text style={ui.subtitle}>
        A portable copy of the things you have been building.
      </Text>
      {working && (
        <View style={ui.row}>
          <ActivityIndicator color={colors.green} />
          <Text style={ui.body}>Working with your backup…</Text>
        </View>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      {!!message && (
        <Text
          accessibilityLiveRegion="polite"
          style={[ui.body, { color: colors.green }]}
        >
          {message}
        </Text>
      )}
      <View style={ui.sageCard}>
        <IconBubble name="download-outline" />
        <Text style={ui.heading}>Export backup</Text>
        <Text style={ui.body}>
          Save habits, routines, daily notes and history, including schedule
          revisions, reschedules, weekly commitments, sessions and busy-day
          settings, pause periods, habit organization and weekly reviews.
        </Text>
        <Text style={ui.small}>
          Choose or create a folder in the Android system picker. The JSON file
          is plain text; keep it somewhere you trust.
        </Text>
        <Button
          label="Export current data"
          disabled={disabled}
          onPress={exportCurrent}
        />
      </View>
      <View style={ui.card}>
        <IconBubble name="folder-open-outline" amber />
        <Text style={ui.heading}>Restore backup</Text>
        <Text style={ui.body}>
          Choose a Routine App JSON backup. Check its date and contents before
          replacing the data on this device.
        </Text>
        <Text style={ui.small}>
          Replace only · No merge · Reads formats 1 and 2 · Exports format 2 ·
          Maximum 20 MB
        </Text>
        <Button
          label={preview ? "Choose a different backup" : "Choose backup file"}
          secondary
          disabled={disabled}
          onPress={() =>
            run(async () => {
              // A failed/new picker cannot leave an older preview armed for replacement.
              setPreview(null);
              setConfirm(false);
              const selected = await pickBackupFile();
              setPreview(selected);
              setMessage(
                selected
                  ? "Backup validated. Review its contents below. Nothing has been replaced."
                  : "Selection cancelled. Your data is unchanged.",
              );
            })
          }
        />
        {!preview && (
          <Text style={ui.small}>
            No backup selected. Nothing will change until you confirm a valid
            file.
          </Text>
        )}
      </View>
      {preview && (
        <View style={ui.sageCard}>
          <Text style={ui.heading}>Backup preview</Text>
          <Text style={ui.body}>
            Created {new Date(preview.exportedAt).toLocaleString()}
          </Text>
          <Text style={ui.small}>
            App {preview.appVersion} · Backup format {preview.formatVersion}
          </Text>
          {Object.entries(backupCounts(preview)).map(([name, count]) => (
            <View key={name} style={ui.between}>
              <Text style={[ui.body, ui.grow]}>{name}</Text>
              <Text style={ui.label}>{count}</Text>
            </View>
          ))}
          <Text style={ui.small}>
            Day records include progress, skips, missed-day history and
            reschedule overrides. Counts include archived items.
          </Text>
          <Button
            label="Export current data before replacing"
            secondary
            disabled={disabled}
            onPress={exportCurrent}
          />
          {confirm ? (
            <View style={ui.card}>
              <Text accessibilityRole="alert" style={ui.heading}>
                Replace all current data?
              </Text>
              <Text style={ui.body}>
                Current habits, routines, notes and history will be replaced by
                this backup. This cannot be undone without another backup.
              </Text>
              <Button
                label="Confirm replace current data"
                danger
                disabled={disabled}
                onPress={() =>
                  run(async () => {
                    if (!(await restoreSnapshot(preview))) {
                      setError(
                        "Restore failed. Your previous saved data is unchanged. See the storage message and try again.",
                      );
                      return;
                    }
                    setConfirm(false);
                    setPreview(null);
                    router.dismissAll();
                    router.replace({
                      pathname: "/data-backup",
                      params: { restored: "1" },
                    });
                    setMessage(
                      "Backup restored. Your history and progress are ready.",
                    );
                  })
                }
              />
              <Button
                label="Cancel replacement"
                secondary
                disabled={disabled}
                onPress={() => setConfirm(false)}
              />
            </View>
          ) : (
            <Button
              label="Replace current data…"
              danger
              secondary
              disabled={disabled}
              onPress={() => setConfirm(true)}
            />
          )}
          <Button
            label="Cancel restore preview"
            secondary
            disabled={disabled}
            onPress={() => {
              setPreview(null);
              setConfirm(false);
            }}
          />
        </View>
      )}
    </Screen>
  );
}
