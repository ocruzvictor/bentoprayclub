import { hasSheetsEnv, SPREADSHEET_ID } from './_lib/runtime.js';

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    ok: true,
    hasSheetsEnv: hasSheetsEnv(),
    spreadsheetConfigured: Boolean(SPREADSHEET_ID),
  });
}
