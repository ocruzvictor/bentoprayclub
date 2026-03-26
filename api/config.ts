import { CONFIG_SHEET_NAME, getReadySheets, SPREADSHEET_ID } from './_lib/runtime.js';

export default async function handler(req: any, res: any) {
  try {
    const sheets = await getReadySheets();
    if (!sheets || !SPREADSHEET_ID) {
      return res.status(500).json({ error: 'Google Sheets not configured' });
    }

    if (req.method === 'GET') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${CONFIG_SHEET_NAME}!A2:B`,
      });

      const rows = response.data.values || [];
      const config = rows.reduce((acc: Record<string, string>, row: string[]) => {
        acc[row[0]] = row[1];
        return acc;
      }, {});

      return res.status(200).json(config);
    }

    if (req.method === 'POST') {
      const { key, value } = req.body || {};
      if (!key) {
        return res.status(400).json({ error: 'Missing key' });
      }

      const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${CONFIG_SHEET_NAME}!A:B`,
      });

      const rows = getResponse.data.values || [];
      const rowIndex = rows.findIndex((row: string[], index: number) => index > 0 && row[0] === key);

      if (rowIndex !== -1) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${CONFIG_SHEET_NAME}!B${rowIndex + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[value]],
          },
        });
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${CONFIG_SHEET_NAME}!A:B`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[key, value]],
          },
        });
      }

      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Config route failed:', error);
    return res.status(500).json({ error: 'Failed to handle config request' });
  }
}
