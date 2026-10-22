import { Directory, File } from "expo-file-system";
import { MAX_BACKUP_BYTES, parseBackup, type Backup } from "../domain/backup";

export async function exportBackupFile(backup: Backup): Promise<string | null> {
  // Android Storage Access Framework grants access only to the chosen folder.
  let directory: Directory;
  try {
    directory = await Directory.pickDirectoryAsync();
  } catch (e) {
    if (e instanceof Error && /cancel|dismiss/i.test(e.message)) return null;
    throw e;
  }
  const name = `routine-backup-${backup.exportedAt.replace(/[:.]/g, "-")}.json`;
  const file = directory.createFile(name, "application/json");
  try {
    file.write(JSON.stringify(backup));
  } catch (e) {
    try {
      file.delete();
    } catch {
      /* An incomplete export is never a restore source. */
    }
    throw e;
  }
  return name;
}
export async function pickBackupFile(): Promise<Backup | null> {
  // Use the SDK 57 File picker directly so its scoped URI grant is retained.
  // DocumentPicker's unscoped cache copy is unreadable in some Expo Go builds.
  const result = await File.pickFileAsync({
    mimeTypes: ["application/json", "text/plain", "application/octet-stream"],
    multipleFiles: false,
  });
  if (result.canceled) return null;
  const file = result.result;
  if (file.size > MAX_BACKUP_BYTES)
    throw new Error("Choose a backup smaller than 20 MB.");
  // Read only. Never overwrite, move or delete the selected source document.
  return parseBackup(await file.text());
}
