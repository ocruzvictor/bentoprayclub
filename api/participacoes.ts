import { getReadySheets, mapParticipacaoRow, SHEET_NAME, SPREADSHEET_ID } from './_lib/runtime.js';
import { normalizeSlotId } from '../shared/slots.js';

export default async function handler(req: any, res: any) {
  try {
    const sheets = await getReadySheets();
    if (!sheets || !SPREADSHEET_ID) {
      return res.status(500).json({ error: 'Google Sheets not configured' });
    }

    if (req.method === 'GET') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A2:D`,
      });

      const rows = response.data.values || [];
      return res.status(200).json(rows.map(mapParticipacaoRow));
    }

    if (req.method === 'POST') {
      const { slot_id, nome, user_id } = req.body || {};
      const normalizedSlotId = normalizeSlotId(slot_id);

      if (!normalizedSlotId || !nome || !user_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const today = new Date().toISOString();
      const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A2:D`,
      });

      const rows = getResponse.data.values || [];
      const alreadyParticipating = rows.some(
        (row: string[]) => normalizeSlotId(row[0]) === normalizedSlotId && row[2] === user_id
      );

      if (alreadyParticipating) {
        return res.status(400).json({ error: 'Already participating in this slot' });
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:D`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[normalizedSlotId, nome, user_id, today]],
        },
      });

      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { slot_id, user_id } = req.body || {};
      const normalizedSlotId = normalizeSlotId(slot_id);

      if (!normalizedSlotId || !user_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:D`,
      });

      const rows = getResponse.data.values || [];
      const rowIndexToDelete = rows.findIndex(
        (row: string[], index: number) =>
          index > 0 && normalizeSlotId(row[0]) === normalizedSlotId && row[2] === user_id
      );

      if (rowIndexToDelete === -1) {
        return res.status(404).json({ error: 'Participacao not found' });
      }

      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });

      const sheetId = spreadsheet.data.sheets?.find(
        (sheet: any) => sheet.properties?.title === SHEET_NAME
      )?.properties?.sheetId;

      if (sheetId === undefined) {
        return res.status(500).json({ error: 'Sheet ID not found' });
      }

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndexToDelete,
                  endIndex: rowIndexToDelete + 1,
                },
              },
            },
          ],
        },
      });

      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Participacoes route failed:', error);
    return res.status(500).json({ error: 'Failed to handle participacoes request' });
  }
}
