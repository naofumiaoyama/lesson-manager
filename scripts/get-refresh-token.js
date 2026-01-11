/**
 * Googleリフレッシュトークン取得スクリプト
 *
 * 使用方法:
 * 1. node scripts/get-refresh-token.js
 * 2. 表示されたURLをブラウザで開く
 * 3. Googleアカウントでログイン
 * 4. 表示されたリフレッシュトークンを .env.local に設定
 */

const http = require('http');
const { google } = require('googleapis');

require('dotenv').config({ path: '.env.local' });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3333/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET を .env.local に設定してください');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

// 認証URL生成
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\n🔐 Googleリフレッシュトークン取得ツール\n');
console.log('='.repeat(50));

// 簡易HTTPサーバーでコールバックを受け取る
const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/callback')) {
    const url = new URL(req.url, 'http://localhost:3333');
    const code = url.searchParams.get('code');

    if (code) {
      try {
        const { tokens } = await oauth2Client.getToken(code);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html>
            <head><title>認証成功</title></head>
            <body style="font-family: sans-serif; padding: 40px; text-align: center;">
              <h1 style="color: #22c55e;">✓ 認証成功</h1>
              <p>ターミナルに表示されたトークンを .env.local に追加してください。</p>
              <p>このウィンドウは閉じて構いません。</p>
            </body>
          </html>
        `);

        console.log('\n✅ 認証成功！\n');
        console.log('='.repeat(50));
        console.log('\n以下を .env.local に追加してください:\n');
        console.log(`GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`);
        console.log('\n' + '='.repeat(50));

        server.close();
        process.exit(0);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>エラーが発生しました</h1>');
        console.error('トークン取得エラー:', error);
        server.close();
        process.exit(1);
      }
    }
  }
});

server.listen(3333, () => {
  console.log('\n📋 以下のURLをブラウザで開いてください:\n');
  console.log(authUrl);
  console.log('\n');
});
