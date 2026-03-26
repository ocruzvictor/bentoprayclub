import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const DEFAULT_TOP_MESSAGE =
  'Bento está internado com diagnóstico de alcapa e estamos orando por ele e pelos seus pais.';

let sheetSetupPromise: Promise<void> | null = null;

function getRawCredentials() {
  return (
    process.env.GOOGLE_CREDENTIALS_JSON ||
    process.env.GOOGLE_CREDENTIALS_BASE64 ||
    process.env.VITE_GOOGLE_CREDENTIALS_BASE ||
    null
  );
}

function getSpreadsheetInput() {
  return process.env.GOOGLE_SPREADSHEET_ID || process.env.VITE_GOOGLE_SPREADSHEET_ID;
}

export function getAuthClient() {
  const creds = getRawCredentials();
  if (!creds) {
    return null;
  }
  
  try {
    let credentialsJson = creds.trim();
    if (!credentialsJson.startsWith('{')) {
      credentialsJson = Buffer.from(creds, 'base64').toString('utf-8');
    }
    const credentials = JSON.parse(credentialsJson);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });
  } catch (err) {
    console.error('Error parsing Google Credentials:', err);
    return null;
  }
}

export const getSheetsClient = () => {
  const auth = getAuthClient();
  if (!auth) return null;
  return google.sheets({ version: 'v4', auth });
};

export function extractSpreadsheetId(input: string | undefined): string | null {
  if (!input) return null;
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return input.trim();
}

export const SPREADSHEET_ID = extractSpreadsheetId(getSpreadsheetInput());
export const SHEET_NAME = 'participacoes';
export const CONFIG_SHEET_NAME = 'config';

async function setupSheets() {
  const sheets = getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) return;

  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheetExists = response.data.sheets?.some(
    (s) => s.properties?.title === SHEET_NAME
  );

  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: SHEET_NAME,
              },
            },
          },
        ],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:D1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [['slot_id', 'nome', 'user_id', 'data']],
      },
    });
  }

  const configSheetExists = response.data.sheets?.some(
    (s) => s.properties?.title === CONFIG_SHEET_NAME
  );

  if (!configSheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: CONFIG_SHEET_NAME,
              },
            },
          },
        ],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${CONFIG_SHEET_NAME}!A1:B1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [['key', 'value']],
      },
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${CONFIG_SHEET_NAME}!A:B`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['mensagem_topo', DEFAULT_TOP_MESSAGE]],
      },
    });
  }
}

export async function ensureSheetReady() {
  if (!getSheetsClient() || !SPREADSHEET_ID) return;

  if (!sheetSetupPromise) {
    sheetSetupPromise = setupSheets().catch((error) => {
      sheetSetupPromise = null;
      throw error;
    });
  }

  await sheetSetupPromise;
}
