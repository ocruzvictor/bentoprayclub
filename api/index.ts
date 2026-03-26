import express from 'express';
import cors from 'cors';
import { getSheetsClient, SPREADSHEET_ID, SHEET_NAME, CONFIG_SHEET_NAME, ensureSheetReady } from './sheets';
import { normalizeSlotId } from '../shared/slots';

const app = express();

app.use(cors());
app.use(express.json());

function mapParticipacaoRow(row: string[] = []) {
  return {
    slot_id: normalizeSlotId(row[0]),
    nome: row[1] || '',
    user_id: row[2] || '',
    data: row[3] || '',
  };
}

async function getReadySheets(res: express.Response) {
  const sheets = getSheetsClient();

  if (!sheets || !SPREADSHEET_ID) {
    res.status(500).json({ error: 'Google Sheets not configured' });
    return null;
  }

  try {
    await ensureSheetReady();
    return sheets;
  } catch (error) {
    console.error('Error preparing spreadsheet:', error);
    res.status(500).json({ error: 'Failed to prepare spreadsheet' });
    return null;
  }
}

// API Routes
app.get('/api/health', async (req, res) => {
  const sheets = await getReadySheets(res);
  if (!sheets) return;

  res.json({
    ok: true,
    spreadsheetConfigured: Boolean(SPREADSHEET_ID),
  });
});

app.get('/api/config', async (req, res) => {
  const sheets = await getReadySheets(res);
  if (!sheets) return;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${CONFIG_SHEET_NAME}!A2:B`,
    });

    const rows = response.data.values || [];
    const config = rows.reduce((acc, row) => {
      acc[row[0]] = row[1];
      return acc;
    }, {} as Record<string, string>);

    res.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

app.post('/api/config', async (req, res) => {
  const sheets = await getReadySheets(res);
  if (!sheets) return;

  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ error: 'Missing key' });
  }

  try {
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${CONFIG_SHEET_NAME}!A:B`,
    });

    const rows = getResponse.data.values || [];
    const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === key);

    if (rowIndex !== -1) {
      // Update existing
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${CONFIG_SHEET_NAME}!B${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[value]],
        },
      });
    } else {
      // Append new
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${CONFIG_SHEET_NAME}!A:B`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[key, value]],
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

app.get('/api/participacoes', async (req, res) => {
  const sheets = await getReadySheets(res);
  if (!sheets) return;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:D`,
    });

    const rows = response.data.values || [];
    const participacoes = rows.map(mapParticipacaoRow);

    res.json(participacoes);
  } catch (error) {
    console.error('Error fetching participacoes:', error);
    res.status(500).json({ error: 'Failed to fetch participacoes' });
  }
});

app.post('/api/participacoes', async (req, res) => {
  const sheets = await getReadySheets(res);
  if (!sheets) return;

  const { slot_id, nome, user_id } = req.body;
  const normalizedSlotId = normalizeSlotId(slot_id);
  
  if (!normalizedSlotId || !nome || !user_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const today = new Date().toISOString();

  try {
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:D`,
    });
    
    const rows = getResponse.data.values || [];
    const alreadyParticipating = rows.some(
      (row) => normalizeSlotId(row[0]) === normalizedSlotId && row[2] === user_id
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

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding participacao:', error);
    res.status(500).json({ error: 'Failed to add participacao' });
  }
});

app.delete('/api/participacoes', async (req, res) => {
  const sheets = await getReadySheets(res);
  if (!sheets) return;

  const { slot_id, user_id } = req.body;
  const normalizedSlotId = normalizeSlotId(slot_id);

  if (!normalizedSlotId || !user_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:D`,
    });

    const rows = getResponse.data.values || [];
    
    const rowIndexToDelete = rows.findIndex(
      (row, index) =>
        index > 0 && normalizeSlotId(row[0]) === normalizedSlotId && row[2] === user_id
    );

    if (rowIndexToDelete === -1) {
      return res.status(404).json({ error: 'Participacao not found' });
    }

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const sheetId = spreadsheet.data.sheets?.find(
      s => s.properties?.title === SHEET_NAME
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
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndexToDelete,
                endIndex: rowIndexToDelete + 1,
              },
            },
          },
        ],
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting participacao:', error);
    res.status(500).json({ error: 'Failed to delete participacao' });
  }
});

export default app;
