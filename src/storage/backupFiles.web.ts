import * as DocumentPicker from "expo-document-picker";
import { MAX_BACKUP_BYTES, parseBackup, type Backup } from "../domain/backup";

export async function exportBackupFile(backup: Backup): Promise<string | null> {
  const name = `routine-backup-${backup.exportedAt.replace(/[:.]/g, "-")}.json`;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(backup)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return name;
}
export async function pickBackupFile(): Promise<Backup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain"],
    multiple: false,
    base64: false,
  });
  if (result.canceled) return null;
  const file = result.assets[0].file;
  if (!file) throw new Error("The browser could not read that file.");
  if (file.size > MAX_BACKUP_BYTES)
    throw new Error("Choose a backup smaller than 20 MB.");
  return parseBackup(await file.text());
}
