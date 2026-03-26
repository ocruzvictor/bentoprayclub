# Bento Pray Club

MVP de escala de oracao com frontend em React/Vite e backend em funcoes serverless para persistir participacoes no Google Sheets.

## Rodando localmente

Prerequisito: Node.js 20+

1. Instale as dependencias:
   `npm ci`
2. Configure as variaveis do `.env` a partir de [.env.example](./.env.example)
3. Rode em desenvolvimento:
   `npm run dev`

## Deploy na Vercel

Configure estas variaveis de ambiente no projeto:

- `GOOGLE_CREDENTIALS_JSON`
  JSON completo da service account do Google
- `GOOGLE_CREDENTIALS_BASE64`
  opcional, caso prefira enviar as credenciais em base64
- `GOOGLE_SPREADSHEET_ID`
  id da planilha ou a URL completa da planilha

Observacoes:

- O backend aceita os formatos antigos `VITE_GOOGLE_CREDENTIALS_BASE` e `VITE_GOOGLE_SPREADSHEET_ID`, mas o recomendado em producao e usar apenas variaveis server-only.
- A service account precisa ter acesso de edicao na planilha.
- No primeiro cold start, a API garante a criacao das abas `participacoes` e `config` se elas ainda nao existirem.

## Verificacao rapida em producao

Depois do deploy, valide:

1. `GET /api/health`
   deve retornar `{"ok":true,"spreadsheetConfigured":true}`
2. Abrir o app, entrar com um nome e selecionar um horario
3. Confirmar se a participacao apareceu na planilha
4. Remover o horario e confirmar se a linha saiu da planilha

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
