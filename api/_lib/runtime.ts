import { CONFIG_SHEET_NAME, getSheetsClient, SHEET_NAME, SPREADSHEET_ID, ensureSheetReady } from '../sheets';
import { normalizeSlotId } from '../../shared/slots';

export { CONFIG_SHEET_NAME, SHEET_NAME, SPREADSHEET_ID };

export function hasSheetsEnv() {
  return Boolean(
    process.env.GOOGLE_SPREADSHEET_ID &&
      (process.env.GOOGLE_CREDENTIALS_JSON ||
        process.env.GOOGLE_CREDENTIALS_BASE64 ||
        process.env.VITE_GOOGLE_CREDENTIALS_BASE)
  );
}

export async function getReadySheets() {
  const sheets = getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
    return null;
  }

  await ensureSheetReady();
  return sheets;
}

export function mapParticipacaoRow(row: string[] = []) {
  return {
    slot_id: normalizeSlotId(row[0]),
    nome: row[1] || '',
    user_id: row[2] || '',
    data: row[3] || '',
  };
}
