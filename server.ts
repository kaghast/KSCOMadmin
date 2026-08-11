import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import { google } from 'googleapis';
import { createServer as createViteServer } from 'vite';
import {
  getAdminSpaceDb,
  getAllNotesFromDb,
  getAllLocationsFromDb,
  saveNoteToDb,
  saveLocationToDb,
  deleteLocationFromDb,
  deleteNoteFromDb,
  getAllNoteTypesFromDb,
  saveNoteTypeToDb,
  deleteNoteTypeFromDb,
  syncWithGoogleDriveAdminSpace,
  restoreFromGoogleDriveAdminSpace,
  smartSyncWithDrive,
  getSyncStatus,
  performManualSync,
  getOrCreateAdminSpaceFolder,
  getAllProjectsFromDb,
  saveProjectToDb,
  deleteProjectFromDb,
  getAllProjectTasksFromDb,
  saveProjectTaskToDb,
  deleteProjectTaskFromDb,
  exportProjectToMarkdownAndDrive,
  getAllTimelogsFromDb,
  saveTimelogToDb,
  deleteTimelogFromDb,
  getAllSettingsFromDb,
  saveSettingToDb,
} from './src/server/adminspaceDb.js';

type TaskPriority = 'high' | 'medium' | 'low';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function ensureRestoredFromDrive(req: express.Request) {
  const authClient = getAuthenticatedClient(req);
  if (!authClient) return;

  try {
    await smartSyncWithDrive(authClient);
  } catch (err) {
    console.error('Error during Google Drive smart sync:', err);
  }
}

app.set('trust proxy', true);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use(cookieParser());

// OAuth configuration
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

function getAppUrl(req?: express.Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (req) {
    const host = req.get('x-forwarded-host') || req.get('host') || '';
    let proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    if (proto.includes(',')) {
      proto = proto.split(',')[0].trim();
    }
    // If running on a custom domain (non-localhost), force https
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      proto = 'https';
    }
    if (host) return `${proto}://${host}`;
  }
  return 'http://localhost:3000';
}

function getOAuth2Client(req?: express.Request) {
  const redirectUri = `${getAppUrl(req)}/api/auth/callback`;
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.CLIENT_ID ||
    process.env.OAUTH_CLIENT_ID ||
    'DEMO_CLIENT_ID';
  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.CLIENT_SECRET ||
    process.env.OAUTH_CLIENT_SECRET ||
    'DEMO_CLIENT_SECRET';
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// Helper to extract tokens from cookies
function getAuthenticatedClient(req: express.Request) {
  const tokenCookie = req.cookies.google_tokens;
  if (!tokenCookie) return null;

  try {
    const tokens = JSON.parse(tokenCookie);
    const oauth2Client = getOAuth2Client(req);
    oauth2Client.setCredentials(tokens);
    return oauth2Client;
  } catch (err) {
    return null;
  }
}

// In-memory demo state storage for fallback/demo mode additions
let demoState = {
  emails: [] as Array<any>,
  events: [] as Array<any>,
  driveFiles: [
    {
      id: 'file-demo-md-1',
      name: 'README_Proje_Dokumani.md',
      mimeType: 'text/markdown',
      webViewLink: 'https://drive.google.com',
      modifiedTime: new Date().toISOString(),
      size: '12 KB',
      isFolder: false,
      starred: true,
      parents: [],
      content: `# Proje Dokümantasyonu & Notlar

Bu doküman **Google Drive** üzerinde saklanan örnek bir \`.md\` (Markdown) dosyasıdır.

## 🚀 Özellikler & Formatlar
- Live **Markdown Editörü** ve Canlı Önizleme (Preview)
- Anında **Google Drive Kaydetme** (API entegrasyonu)
- Kod blokları, listeler, tablolar ve formatlama araçları

\`\`\`typescript
// Google Drive Markdown Entegrasyonu
const isDriveMarkdownWorking = true;
console.log("Markdown Editörü Aktif!", isDriveMarkdownWorking);
\`\`\`

- [x] Google Drive API \`fileType=markdown\` filtresi eklendi
- [x] Tüm \`.md\` dosyaları listeleniyor
- [x] Editör ve Preview ekranı aktif
- [ ] Yeni notlar yazılacak

> "Zamanınızı verimli yönetin, dokümanlarınızı Google Drive ile senkronize tutun."
`,
    },
    {
      id: 'folder-adminspace-1',
      name: 'adminspace',
      mimeType: 'application/vnd.google-apps.folder',
      webViewLink: 'https://drive.google.com',
      modifiedTime: new Date().toISOString(),
      isFolder: true,
      starred: true,
      parents: [],
    },
    {
      id: 'file-demo-1',
      name: 'Proje_Planlama_Notlari.gdoc',
      mimeType: 'application/vnd.google-apps.document',
      webViewLink: 'https://docs.google.com',
      modifiedTime: new Date().toISOString(),
      size: '1.2 MB',
      isFolder: false,
      starred: true,
      parents: [],
    },
    {
      id: 'file-demo-2',
      name: 'Zaman_Hub_Butce.gsheet',
      mimeType: 'application/vnd.google-apps.spreadsheet',
      webViewLink: 'https://sheets.google.com',
      modifiedTime: new Date().toISOString(),
      size: '850 KB',
      isFolder: false,
      starred: false,
      parents: [],
    },
    {
      id: 'file-demo-3',
      name: 'Finansal_Rapor_2026.pdf',
      mimeType: 'application/pdf',
      webViewLink: 'https://drive.google.com',
      modifiedTime: new Date().toISOString(),
      size: '2.4 MB',
      isFolder: false,
      starred: true,
      parents: [],
    },
  ] as Array<any>,
  tasks: [] as Array<{
    id: string;
    title: string;
    notes: string;
    status: 'needsAction' | 'completed';
    due?: string;
    priority: TaskPriority;
  }>,
  contacts: [] as Array<any>,
  locations: [] as Array<any>,
  notes: [] as Array<any>,
};

// ================= AUTH ROUTES =================

app.get('/api/auth/url', (req, res) => {
  try {
    const oauth2Client = getOAuth2Client(req);
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: OAUTH_SCOPES,
      prompt: 'consent',
    });
    res.setHeader('Content-Type', 'application/json');
    res.json({ url });
  } catch (err: any) {
    console.error('Error in /api/auth/url:', err);
    res.status(500).json({ error: err?.message || 'Giriş adresi oluşturulamadı.' });
  }
});

app.get('/api/auth/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    return res.status(400).send('Authorization code missing');
  }

  try {
    const oauth2Client = getOAuth2Client(req);
    const { tokens } = await oauth2Client.getToken(code);

    res.cookie('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Immediately create/sync Google Drive adminspace folder
    syncWithGoogleDriveAdminSpace(oauth2Client)
      .then((res) => {
        if (res) console.log('[OAuth Callback] Google Drive adminspace sync success:', res.folderId);
        else console.warn('[OAuth Callback] Google Drive adminspace sync returned null.');
      })
      .catch((err) => {
        console.error('[OAuth Callback] Google Drive adminspace sync failed:', err);
      });

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Google Authentication Successful</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #0f172a;
              color: #f8fafc;
            }
            .card {
              background-color: #1e293b;
              padding: 2.5rem;
              border-radius: 1.5rem;
              border: 1px solid #334155;
              text-align: center;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
              max-width: 400px;
            }
            .icon {
              width: 50px;
              height: 50px;
              background: #10b981;
              color: white;
              border-radius: 50%;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-size: 28px;
              margin-bottom: 1rem;
            }
            h2 { margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 800; }
            p { margin: 0; font-size: 0.875rem; color: #94a3b8; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h2>Google Hesabı Bağlandı!</h2>
            <p>Google yetkilendirmesi başarıyla tamamlandı. Bu pencere birazdan kapanacak ve oturumunuz açılacaktır.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              setTimeout(() => {
                window.close();
              }, 1000);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('OAuth Callback Error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <body style="font-family: sans-serif; padding: 2rem; background: #0f172a; color: white;">
          <h2>Giriş Hatası</h2>
          <p>${error.message || 'Yetkilendirme sırasında bir hata oluştu.'}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: error.message }, '*');
            }
          </script>
        </body>
      </html>
    `);
  }
});

app.get('/api/auth/status', async (req, res) => {
  const authClient = getAuthenticatedClient(req);
  if (!authClient) {
    return res.json({
      isAuthenticated: false,
      user: { email: 'kemalsahin@gmail.com', name: 'Kemal Şahin' },
      demoMode: true,
    });
  }

  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
    const userInfo = await oauth2.userinfo.get();

    res.json({
      isAuthenticated: true,
      user: {
        email: userInfo.data.email || 'kemalsahin@gmail.com',
        name: userInfo.data.name || 'Kemal Şahin',
        picture: userInfo.data.picture,
      },
      demoMode: false,
    });
  } catch (err) {
    res.json({
      isAuthenticated: false,
      user: { email: 'kemalsahin@gmail.com', name: 'Kemal Şahin' },
      demoMode: true,
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('google_tokens');
  res.json({ success: true });
});

// ================= GMAIL ROUTES =================

app.get('/api/gmail/messages', async (req, res) => {
  const type = (req.query.type as string) || 'inbox'; // 'inbox' or 'starred'
  const search = req.query.search as string | undefined;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const gmail = google.gmail({ version: 'v1', auth: authClient });
      let query = type === 'starred' ? 'is:starred' : 'label:INBOX';
      if (search && search.trim()) {
        query = `${query} ${search.trim()}`;
      }

      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 25,
      });

      const messages = response.data.messages || [];
      const detailedMessages = await Promise.all(
        messages.map(async (msg) => {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'full',
          });

          const headers = detail.data.payload?.headers || [];
          const subjectHeader = headers.find((h) => h.name?.toLowerCase() === 'subject');
          const fromHeader = headers.find((h) => h.name?.toLowerCase() === 'from');
          const dateHeader = headers.find((h) => h.name?.toLowerCase() === 'date');

          const labelIds = detail.data.labelIds || [];
          const isStarred = labelIds.includes('STARRED');
          const isRead = !labelIds.includes('UNREAD');

          const senderRaw = fromHeader?.value || 'Bilinmeyen Gönderen';
          let senderName = senderRaw;
          let senderEmail = senderRaw;
          const match = senderRaw.match(/(.*)<(.*)>/);
          if (match) {
            senderName = match[1].trim().replace(/^"/, '').replace(/"$/, '');
            senderEmail = match[2].trim();
          }

          return {
            id: detail.data.id!,
            threadId: detail.data.threadId!,
            sender: senderName,
            senderEmail: senderEmail,
            subject: subjectHeader?.value || 'Konusuz E-posta',
            snippet: detail.data.snippet || '',
            date: dateHeader?.value ? new Date(dateHeader.value).toISOString() : new Date().toISOString(),
            isRead,
            isStarred,
            labels: labelIds,
          };
        })
      );

      return res.json({ messages: detailedMessages, demoMode: false });
    } catch (err) {
      console.error('Gmail API Error, falling back to demo mode:', err);
    }
  }

  // Fallback demo filtering
  let filtered = demoState.emails;
  if (type === 'starred') {
    filtered = demoState.emails.filter((e) => e.isStarred);
  } else {
    filtered = demoState.emails.filter((e) => e.labels.includes('INBOX'));
  }

  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.subject.toLowerCase().includes(s) ||
        e.sender.toLowerCase().includes(s) ||
        e.snippet.toLowerCase().includes(s)
    );
  }

  res.json({ messages: filtered, demoMode: true });
});

app.post('/api/gmail/send', async (req, res) => {
  const { to, subject, body } = req.body;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const gmail = google.gmail({ version: 'v1', auth: authClient });
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const messageParts = [
        `To: ${to}`,
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '',
        body,
      ];
      const message = messageParts.join('\n');
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage },
      });

      return res.json({ success: true, demoMode: false });
    } catch (err) {
      console.error('Gmail Send API Error:', err);
    }
  }

  // Demo mode add
  const newEmail = {
    id: `demo-email-${Date.now()}`,
    threadId: `t-${Date.now()}`,
    sender: 'Siz (Kemal Şahin)',
    senderEmail: 'kemalsahin@gmail.com',
    subject: subject || 'Gönderilen Mesaj',
    snippet: body ? body.substring(0, 100) : '',
    date: new Date().toISOString(),
    isRead: true,
    isStarred: false,
    labels: ['SENT'],
  };
  demoState.emails.unshift(newEmail);

  res.json({ success: true, message: newEmail, demoMode: true });
});

app.post('/api/gmail/toggle-star', async (req, res) => {
  const { id, isStarred } = req.body;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const gmail = google.gmail({ version: 'v1', auth: authClient });
      await gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: {
          addLabelIds: isStarred ? ['STARRED'] : [],
          removeLabelIds: isStarred ? [] : ['STARRED'],
        },
      });
      return res.json({ success: true, demoMode: false });
    } catch (err) {
      console.error('Gmail Modify Error:', err);
    }
  }

  // Demo update
  const email = demoState.emails.find((e) => e.id === id);
  if (email) {
    email.isStarred = isStarred;
    if (isStarred) {
      if (!email.labels.includes('STARRED')) email.labels.push('STARRED');
    } else {
      email.labels = email.labels.filter((l) => l !== 'STARRED');
    }
  }

  res.json({ success: true, demoMode: true });
});

// ================= CALENDAR ROUTES =================

app.get('/api/calendar/events', async (req, res) => {
  const { search } = req.query;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const calendar = google.calendar({ version: 'v3', auth: authClient });
      const listParams: any = {
        calendarId: 'primary',
        maxResults: 30,
        singleEvents: true,
      };

      if (search && typeof search === 'string' && search.trim()) {
        listParams.q = search.trim();
      } else {
        listParams.timeMin = new Date().toISOString();
        listParams.orderBy = 'startTime';
      }

      const response = await calendar.events.list(listParams);

      const events = (response.data.items || []).map((evt) => ({
        id: evt.id!,
        summary: evt.summary || 'Başlıksız Etkinlik',
        description: evt.description,
        location: evt.location,
        start: evt.start?.dateTime || evt.start?.date || new Date().toISOString(),
        end: evt.end?.dateTime || evt.end?.date || new Date().toISOString(),
        htmlLink: evt.htmlLink,
        colorId: evt.colorId,
      }));

      return res.json({ events, demoMode: false });
    } catch (err) {
      console.error('Calendar API Error, using demo mode:', err);
    }
  }

  let events = demoState.events || [];
  if (search && typeof search === 'string' && search.trim()) {
    const s = search.trim().toLowerCase();
    events = events.filter(
      (e) =>
        e.summary.toLowerCase().includes(s) ||
        (e.description && e.description.toLowerCase().includes(s)) ||
        (e.location && e.location.toLowerCase().includes(s))
    );
  }

  res.json({ events, demoMode: true });
});

app.post('/api/calendar/events', async (req, res) => {
  const { summary, description, location, start, end } = req.body;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const calendar = google.calendar({ version: 'v3', auth: authClient });
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary,
          description,
          location,
          start: { dateTime: new Date(start).toISOString() },
          end: { dateTime: new Date(end).toISOString() },
        },
      });

      return res.json({ success: true, event: response.data, demoMode: false });
    } catch (err) {
      console.error('Calendar Insert Error:', err);
    }
  }

  // Demo mode add
  const newEvent = {
    id: `demo-evt-${Date.now()}`,
    summary: summary || 'Yeni Etkinlik',
    description: description || '',
    location: location || '',
    start: start ? new Date(start).toISOString() : new Date().toISOString(),
    end: end ? new Date(end).toISOString() : new Date(Date.now() + 3600000).toISOString(),
    colorId: '1',
  };
  demoState.events.push(newEvent);
  demoState.events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  res.json({ success: true, event: newEvent, demoMode: true });
});

// ================= DRIVE ROUTES =================

app.get('/api/drive/starred', async (req, res) => {
  const { search } = req.query;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const drive = google.drive({ version: 'v3', auth: authClient });
      let qStr = 'starred = true and trashed = false';
      if (search && typeof search === 'string' && search.trim()) {
        const cleanSearch = search.trim().replace(/'/g, "\\'");
        qStr += ` and name contains '${cleanSearch}'`;
      }

      const response = await drive.files.list({
        q: qStr,
        fields: 'files(id, name, mimeType, webViewLink, iconLink, thumbnailLink, modifiedTime, size, starred, parents)',
        pageSize: 50,
        orderBy: 'modifiedTime desc',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const files = (response.data.files || []).map((f) => ({
        id: f.id!,
        name: f.name || 'İsimsiz Dosya',
        mimeType: f.mimeType || 'application/octet-stream',
        webViewLink:
          f.webViewLink ||
          (f.mimeType === 'application/vnd.google-apps.folder'
            ? `https://drive.google.com/drive/folders/${f.id}`
            : `https://drive.google.com/file/d/${f.id}/view`),
        iconLink: f.iconLink,
        thumbnailLink: f.thumbnailLink,
        modifiedTime: f.modifiedTime || new Date().toISOString(),
        size: f.size ? `${(parseInt(f.size) / (1024 * 1024)).toFixed(1)} MB` : undefined,
        starred: Boolean(f.starred),
        isFolder: f.mimeType === 'application/vnd.google-apps.folder',
        parents: f.parents || [],
      }));

      return res.json({ files, demoMode: false });
    } catch (err: any) {
      console.error('Drive Starred API Error:', err?.message || err);
    }
  }

  let files = demoState.driveFiles || [];
  if (search && typeof search === 'string' && search.trim()) {
    const s = search.trim().toLowerCase();
    files = files.filter((f) => f.name.toLowerCase().includes(s));
  }
  res.json({ files, demoMode: true });
});

app.get('/api/drive/files', async (req, res) => {
  const { folderId, search, starredOnly, fileType, limit } = req.query;
  const authClient = getAuthenticatedClient(req);

  const maxCount = limit ? Math.min(100, Math.max(1, parseInt(limit as string) || 100)) : 100;

  if (authClient) {
    try {
      const drive = google.drive({ version: 'v3', auth: authClient });
      let qStr = 'trashed = false';

      if (starredOnly === 'true' || fileType === 'starred') {
        qStr += ' and starred = true';
      }

      if (fileType === 'pdf') {
        qStr += " and (mimeType = 'application/pdf' or name contains '.pdf')";
      } else if (fileType === 'markdown') {
        qStr += " and (mimeType = 'text/markdown' or mimeType = 'text/x-markdown' or mimeType = 'text/plain' or name contains '.md' or name contains '.markdown')";
      } else if (fileType === 'docs') {
        qStr += " and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/msword' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')";
      } else if (fileType === 'sheets') {
        qStr += " and (mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.ms-excel' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')";
      } else if (fileType === 'slides') {
        qStr += " and (mimeType = 'application/vnd.google-apps.presentation' or mimeType = 'application/vnd.ms-powerpoint' or mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation')";
      } else if (fileType === 'folders') {
        qStr += " and mimeType = 'application/vnd.google-apps.folder'";
      }

      if (search && typeof search === 'string' && search.trim()) {
        const cleanSearch = search.trim().replace(/'/g, "\\'");
        qStr += ` and name contains '${cleanSearch}'`;
      } else if (
        folderId &&
        typeof folderId === 'string' &&
        folderId !== 'all' &&
        starredOnly !== 'true' &&
        fileType !== 'starred' &&
        fileType !== 'pdf' &&
        fileType !== 'markdown'
      ) {
        const parent = folderId === 'root' ? 'root' : folderId;
        qStr += ` and '${parent}' in parents`;
      }

      const response = await drive.files.list({
        q: qStr,
        fields: 'files(id, name, mimeType, webViewLink, iconLink, thumbnailLink, modifiedTime, size, starred, parents)',
        pageSize: maxCount,
        orderBy: 'modifiedTime desc',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const files = (response.data.files || []).map((f) => ({
        id: f.id!,
        name: f.name || 'İsimsiz Dosya',
        mimeType: f.mimeType || 'application/octet-stream',
        webViewLink:
          f.webViewLink ||
          (f.mimeType === 'application/vnd.google-apps.folder'
            ? `https://drive.google.com/drive/folders/${f.id}`
            : `https://drive.google.com/file/d/${f.id}/view`),
        iconLink: f.iconLink,
        thumbnailLink: f.thumbnailLink,
        modifiedTime: f.modifiedTime || new Date().toISOString(),
        size: f.size ? `${(parseInt(f.size) / (1024 * 1024)).toFixed(1)} MB` : undefined,
        starred: Boolean(f.starred),
        isFolder: f.mimeType === 'application/vnd.google-apps.folder',
        parents: f.parents || [],
      }));

      // Sort folders first, then by modified time / name
      files.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return 0;
      });

      return res.json({ files, currentFolderId: folderId || 'all', demoMode: false });
    } catch (err: any) {
      console.error('Drive Files API Error:', err?.message || err);
      const isScopeError =
        err?.message?.toLowerCase().includes('scope') ||
        err?.message?.toLowerCase().includes('permission') ||
        err?.message?.toLowerCase().includes('invalid_grant') ||
        err?.code === 403 ||
        err?.code === 401;
      return res.json({
        files: demoState.driveFiles || [],
        error: `Google Drive API Uyarısı: ${err?.message || 'Hesabınızın Drive yetkisi yenilenmelidir.'}`,
        requiresReauth: isScopeError,
        demoMode: false,
      });
    }
  }

  let files = demoState.driveFiles || [];
  if (starredOnly === 'true' || fileType === 'starred') {
    files = files.filter((f) => f.starred);
  } else if (fileType === 'pdf') {
    files = files.filter((f) => f.mimeType === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
  } else if (fileType === 'markdown') {
    files = files.filter((f) => f.mimeType?.includes('markdown') || f.name.toLowerCase().endsWith('.md') || f.name.toLowerCase().endsWith('.markdown'));
  } else if (fileType === 'docs') {
    files = files.filter((f) => f.mimeType?.includes('document') || f.name.toLowerCase().endsWith('.gdoc') || f.name.toLowerCase().endsWith('.doc') || f.name.toLowerCase().endsWith('.docx'));
  } else if (fileType === 'sheets') {
    files = files.filter((f) => f.mimeType?.includes('spreadsheet') || f.name.toLowerCase().endsWith('.gsheet') || f.name.toLowerCase().endsWith('.xls') || f.name.toLowerCase().endsWith('.xlsx'));
  } else if (fileType === 'slides') {
    files = files.filter((f) => f.mimeType?.includes('presentation') || f.name.toLowerCase().endsWith('.gslides') || f.name.toLowerCase().endsWith('.ppt') || f.name.toLowerCase().endsWith('.pptx'));
  } else if (fileType === 'folders') {
    files = files.filter((f) => f.isFolder || f.mimeType?.includes('folder'));
  }

  if (search && typeof search === 'string' && search.trim()) {
    const s = search.trim().toLowerCase();
    files = files.filter((f) => f.name.toLowerCase().includes(s));
  }
  res.json({ files, currentFolderId: folderId || 'all', demoMode: true });
});

// GET file content from Drive
app.get('/api/drive/files/:id/content', async (req, res) => {
  const { id } = req.params;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const drive = google.drive({ version: 'v3', auth: authClient });
      const response = await drive.files.get(
        { fileId: id, alt: 'media' },
        { responseType: 'text' }
      );
      return res.json({ content: response.data || '', demoMode: false });
    } catch (err: any) {
      console.error('Drive Get File Content Error:', err?.message || err);
      return res.status(500).json({ error: 'Dosya içeriği okunamadı: ' + (err?.message || err) });
    }
  }

  // Demo state lookup
  const file = demoState.driveFiles.find((f) => f.id === id);
  if (file && (file as any).content !== undefined) {
    return res.json({ content: (file as any).content, demoMode: true });
  }

  return res.json({
    content: `# ${file?.name || 'Markdown Dokümanı.md'}\n\nBu dosya Google Drive hesabınızdaki bir Markdown belgesidir.\n\n## 📝 Düzenleme ve Önizleme\nSol tarafta Markdown kodlarınızı yazabilir, sağ tarafta canlı önizlemesini görebilirsiniz.\n\n- [x] Başlıklar ve Listeler\n- [x] Kod Blokları\n- [x] Google Drive Senkronizasyonu\n\n\`\`\`javascript\nconsole.log("Drive Markdown Editor ready!");\n\`\`\``,
    demoMode: true,
  });
});

// PUT update file content in Drive
app.put('/api/drive/files/:id/content', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const drive = google.drive({ version: 'v3', auth: authClient });
      await drive.files.update({
        fileId: id,
        media: {
          mimeType: 'text/markdown',
          body: content || '',
        },
      });
      return res.json({ success: true, demoMode: false });
    } catch (err: any) {
      console.error('Drive Update File Content Error:', err?.message || err);
      return res.status(500).json({ error: 'Dosya içeriği kaydedilemedi: ' + (err?.message || err) });
    }
  }

  // Demo state update
  const file = demoState.driveFiles.find((f) => f.id === id);
  if (file) {
    (file as any).content = content;
    file.modifiedTime = new Date().toISOString();
  }
  return res.json({ success: true, demoMode: true });
});

app.post('/api/drive/create-folder', async (req, res) => {
  const { name, parentId } = req.body;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const drive = google.drive({ version: 'v3', auth: authClient });
      const requestBody: any = {
        name: name || 'Yeni Klasör',
        mimeType: 'application/vnd.google-apps.folder',
      };
      if (parentId && parentId !== 'root') {
        requestBody.parents = [parentId];
      }

      const response = await drive.files.create({
        requestBody,
        fields: 'id, name, mimeType, webViewLink, modifiedTime, starred, parents',
      });

      const f = response.data;
      const folderItem = {
        id: f.id!,
        name: f.name || name || 'Yeni Klasör',
        mimeType: 'application/vnd.google-apps.folder',
        webViewLink: f.webViewLink || '#',
        modifiedTime: f.modifiedTime || new Date().toISOString(),
        starred: false,
        isFolder: true,
        parents: f.parents || [],
      };

      return res.json({ success: true, folder: folderItem, demoMode: false });
    } catch (err: any) {
      console.error('Drive Create Folder Error:', err?.message || err);
      return res.status(500).json({ error: 'Klasör oluşturulamadı: ' + (err?.message || err) });
    }
  }

  const newFolder = {
    id: `demo-folder-${Date.now()}`,
    name: name || 'Yeni Klasör',
    mimeType: 'application/vnd.google-apps.folder',
    webViewLink: 'https://drive.google.com',
    modifiedTime: new Date().toISOString(),
    starred: false,
    isFolder: true,
  };
  demoState.driveFiles.unshift(newFolder as any);

  res.json({ success: true, folder: newFolder, demoMode: true });
});

app.patch('/api/drive/files/:id/rename', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const authClient = getAuthenticatedClient(req);

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Geçerli bir dosya adı giriniz.' });
  }

  if (authClient) {
    try {
      const drive = google.drive({ version: 'v3', auth: authClient });
      const response = await drive.files.update({
        fileId: id,
        requestBody: {
          name: name.trim(),
        },
        fields: 'id, name, modifiedTime',
      });
      return res.json({ success: true, file: response.data, demoMode: false });
    } catch (err: any) {
      console.error('Drive Rename Error:', err?.message || err);
      return res.status(500).json({ error: 'Yeniden adlandırılamadı: ' + (err?.message || err) });
    }
  }

  const file = demoState.driveFiles.find((f) => f.id === id);
  if (file) {
    file.name = name.trim();
  }
  res.json({ success: true, demoMode: true });
});

app.patch('/api/drive/files/:id/star', async (req, res) => {
  const { id } = req.params;
  const { starred } = req.body;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const drive = google.drive({ version: 'v3', auth: authClient });
      await drive.files.update({
        fileId: id,
        requestBody: {
          starred: Boolean(starred),
        },
      });
      return res.json({ success: true, demoMode: false });
    } catch (err: any) {
      console.error('Drive Star Error:', err?.message || err);
      return res.status(500).json({ error: 'Yıldız durumu değiştirilemedi: ' + (err?.message || err) });
    }
  }

  const file = demoState.driveFiles.find((f) => f.id === id);
  if (file) {
    file.starred = Boolean(starred);
  }
  res.json({ success: true, demoMode: true });
});

app.delete('/api/drive/files/:id', async (req, res) => {
  const { id } = req.params;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const drive = google.drive({ version: 'v3', auth: authClient });
      await drive.files.update({
        fileId: id,
        requestBody: {
          trashed: true,
        },
      });
      return res.json({ success: true, demoMode: false });
    } catch (err: any) {
      console.error('Drive Trash Error:', err?.message || err);
      return res.status(500).json({ error: 'Dosya silinemedi: ' + (err?.message || err) });
    }
  }

  demoState.driveFiles = demoState.driveFiles.filter((f) => f.id !== id);
  res.json({ success: true, demoMode: true });
});

app.post('/api/drive/create', async (req, res) => {
  const { name, content, mimeType, parentId } = req.body;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const drive = google.drive({ version: 'v3', auth: authClient });
      const requestBody: any = {
        name: name || 'Yeni Doküman.gdoc',
        mimeType: mimeType || 'application/vnd.google-apps.document',
        starred: true,
      };
      if (parentId && parentId !== 'root') {
        requestBody.parents = [parentId];
      }

      const response = await drive.files.create({
        requestBody,
        media: {
          mimeType: 'text/plain',
          body: content || '',
        },
        fields: 'id, name, mimeType, webViewLink, modifiedTime, starred',
      });

      return res.json({ success: true, file: response.data, demoMode: false });
    } catch (err: any) {
      console.error('Drive Create Error:', err?.message || err);
      return res.status(500).json({ error: 'Doküman oluşturulamadı: ' + (err?.message || err) });
    }
  }

  // Demo mode file add
  const newDoc = {
    id: `demo-doc-${Date.now()}`,
    name: name ? (name.endsWith('.gdoc') ? name : `${name}.gdoc`) : 'Yeni Not & Doküman.gdoc',
    mimeType: mimeType || 'application/vnd.google-apps.document',
    webViewLink: 'https://docs.google.com',
    modifiedTime: new Date().toISOString(),
    starred: true,
    size: '0.1 MB',
  };
  demoState.driveFiles.unshift(newDoc);

  res.json({ success: true, file: newDoc, demoMode: true });
});

app.post('/api/drive/upload-image', async (req, res) => {
  const { name, mimeType, base64Data } = req.body;
  if (!base64Data) {
    return res.status(400).json({ error: 'base64Data parametresi gereklidir.' });
  }

  const authClient = getAuthenticatedClient(req);
  const fileName = name || `Gorsel_${Date.now()}.png`;
  const fileMime = mimeType || 'image/png';

  let cleanBase64 = base64Data;
  if (base64Data.includes(',')) {
    cleanBase64 = base64Data.split(',')[1];
  }

  const buffer = Buffer.from(cleanBase64, 'base64');
  const dataUrl = base64Data.startsWith('data:')
    ? base64Data
    : `data:${fileMime};base64,${cleanBase64}`;

  if (authClient) {
    try {
      const drive = google.drive({ version: 'v3', auth: authClient });

      // 1. Get or create single 'adminspace' folder in Google Drive
      const folderInfo = await getOrCreateAdminSpaceFolder(drive);
      const folderId = folderInfo?.folderId || 'root';

      // 2. Upload image file
      const requestBody: any = {
        name: fileName,
        mimeType: fileMime,
        parents: [folderId],
      };

      const response = await drive.files.create({
        requestBody,
        media: {
          mimeType: fileMime,
          body: Readable.from(buffer),
        },
        fields: 'id, name, mimeType, webViewLink, webContentLink, thumbnailLink, modifiedTime, size',
      });

      const fileData = response.data;

      // 3. Make permission public if possible
      try {
        await drive.permissions.create({
          fileId: fileData.id!,
          requestBody: { role: 'reader', type: 'anyone' },
        });
      } catch (permErr) {
        // ignore if restricted
      }

      const imageUrl = `https://lh3.googleusercontent.com/d/${fileData.id}=s1600` ||
        fileData.thumbnailLink ||
        fileData.webViewLink ||
        dataUrl;

      const driveFile = {
        id: fileData.id || `drive-img-${Date.now()}`,
        name: fileData.name || fileName,
        mimeType: fileData.mimeType || fileMime,
        webViewLink: fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`,
        modifiedTime: fileData.modifiedTime || new Date().toISOString(),
        size: `${(buffer.length / 1024).toFixed(1)} KB`,
      };

      demoState.driveFiles.unshift(driveFile);

      return res.json({
        success: true,
        file: driveFile,
        imageUrl: imageUrl,
        dataUrl: dataUrl,
        demoMode: false,
      });
    } catch (err: any) {
      console.error('Drive Image Upload Error:', err?.message || err);
      const fallbackFile = {
        id: `img-file-${Date.now()}`,
        name: fileName,
        mimeType: fileMime,
        webViewLink: dataUrl,
        modifiedTime: new Date().toISOString(),
        size: `${(buffer.length / 1024).toFixed(1)} KB`,
      };
      demoState.driveFiles.unshift(fallbackFile);
      return res.json({
        success: true,
        file: fallbackFile,
        imageUrl: dataUrl,
        dataUrl: dataUrl,
        demoMode: true,
      });
    }
  }

  // Demo mode
  const demoFile = {
    id: `demo-img-${Date.now()}`,
    name: fileName,
    mimeType: fileMime,
    webViewLink: dataUrl,
    modifiedTime: new Date().toISOString(),
    size: `${(buffer.length / 1024).toFixed(1)} KB`,
  };
  demoState.driveFiles.unshift(demoFile);

  return res.json({
    success: true,
    file: demoFile,
    imageUrl: dataUrl,
    dataUrl: dataUrl,
    demoMode: true,
  });
});

// ================= TASKS ROUTES =================

app.get('/api/tasks', async (req, res) => {
  const { search } = req.query;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const tasksApi = google.tasks({ version: 'v1', auth: authClient });
      const response = await tasksApi.tasks.list({
        tasklist: '@default',
        showCompleted: true,
        showHidden: true,
        maxResults: 100,
      });

      let tasks = (response.data.items || []).map((t, idx) => ({
        id: t.id!,
        title: t.title || 'Başlıksız Görev',
        notes: t.notes || '',
        status: (t.status === 'completed' ? 'completed' : 'needsAction') as 'needsAction' | 'completed',
        due: t.due ? new Date(t.due).toISOString() : undefined,
        priority: (idx % 3 === 0 ? 'high' : idx % 3 === 1 ? 'medium' : 'low') as TaskPriority,
        updatedAt: t.updated || new Date().toISOString(),
      }));

      if (search && typeof search === 'string' && search.trim()) {
        const s = search.trim().toLowerCase();
        tasks = tasks.filter(
          (t) => t.title.toLowerCase().includes(s) || t.notes.toLowerCase().includes(s)
        );
      }

      return res.json({ tasks, demoMode: false });
    } catch (err: any) {
      console.error('Tasks API Error:', err?.message || err);
      const isScopeError =
        err?.message?.toLowerCase().includes('scope') ||
        err?.message?.toLowerCase().includes('permission') ||
        err?.code === 403 ||
        err?.code === 401;
      return res.json({
        tasks: [],
        error: err?.message || 'Google Tasks erişim hatası',
        requiresReauth: isScopeError,
        demoMode: false,
      });
    }
  }

  let tasks = demoState.tasks || [];
  if (search && typeof search === 'string' && search.trim()) {
    const s = search.trim().toLowerCase();
    tasks = tasks.filter(
      (t) => t.title.toLowerCase().includes(s) || t.notes.toLowerCase().includes(s)
    );
  }

  res.json({ tasks: demoState.tasks, demoMode: true });
});

app.post('/api/tasks', async (req, res) => {
  const { title, notes, due, priority } = req.body;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const tasksApi = google.tasks({ version: 'v1', auth: authClient });
      const requestBody: any = {
        title: title || 'Yeni Görev',
        notes: notes || '',
      };
      if (due) {
        requestBody.due = new Date(due).toISOString();
      }

      const response = await tasksApi.tasks.insert({
        tasklist: '@default',
        requestBody,
      });

      const t = response.data;
      const formattedTask = {
        id: t.id!,
        title: t.title || title || 'Yeni Görev',
        notes: t.notes || notes || '',
        status: (t.status === 'completed' ? 'completed' : 'needsAction') as 'needsAction' | 'completed',
        due: t.due ? new Date(t.due).toISOString() : (due ? new Date(due).toISOString() : undefined),
        priority: (priority as TaskPriority) || 'medium',
        updatedAt: t.updated || new Date().toISOString(),
      };

      return res.json({
        success: true,
        task: formattedTask,
        demoMode: false,
      });
    } catch (err: any) {
      console.error('Tasks Insert Error:', err?.message || err);
      return res.status(500).json({ error: 'Google Tasks eklenirken hata oluştu: ' + (err?.message || err) });
    }
  }

  // Demo mode add
  const newTask = {
    id: `demo-tsk-${Date.now()}`,
    title: title || 'Yeni Görev',
    notes: notes || '',
    status: 'needsAction' as const,
    due: due ? new Date(due).toISOString() : new Date(Date.now() + 86400000).toISOString(),
    priority: (priority as TaskPriority) || 'medium',
  };
  demoState.tasks.unshift(newTask);

  res.json({ success: true, task: newTask, demoMode: true });
});

app.patch('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { status, title, notes, due, priority } = req.body;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const tasksApi = google.tasks({ version: 'v1', auth: authClient });
      const requestBody: any = {};
      if (status !== undefined) {
        requestBody.status = status === 'completed' ? 'completed' : 'needsAction';
        if (status === 'completed') {
          requestBody.completed = new Date().toISOString();
        } else {
          requestBody.completed = null;
        }
      }
      if (title !== undefined) requestBody.title = title;
      if (notes !== undefined) requestBody.notes = notes;
      if (due !== undefined) requestBody.due = due ? new Date(due).toISOString() : null;

      const response = await tasksApi.tasks.patch({
        tasklist: '@default',
        task: id,
        requestBody,
      });

      return res.json({ success: true, task: response.data, demoMode: false });
    } catch (err: any) {
      console.error('Task Patch Error:', err?.message || err);
      return res.status(500).json({ error: 'Google Tasks güncellenirken hata oluştu: ' + (err?.message || err) });
    }
  }

  // Demo update
  const task = demoState.tasks.find((t) => t.id === id);
  if (task) {
    if (status !== undefined) task.status = status;
    if (title !== undefined) task.title = title;
    if (notes !== undefined) task.notes = notes;
    if (due !== undefined) task.due = due;
    if (priority !== undefined) task.priority = priority;
  }

  res.json({ success: true, demoMode: true });
});

app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const tasksApi = google.tasks({ version: 'v1', auth: authClient });
      await tasksApi.tasks.delete({
        tasklist: '@default',
        task: id,
      });
      return res.json({ success: true, demoMode: false });
    } catch (err: any) {
      console.error('Task Delete Error:', err?.message || err);
      return res.status(500).json({ error: 'Google Tasks silinirken hata oluştu: ' + (err?.message || err) });
    }
  }

  demoState.tasks = demoState.tasks.filter((t) => t.id !== id);
  res.json({ success: true, demoMode: true });
});

// ================= CONTACTS ROUTES =================

app.get('/api/contacts', async (req, res) => {
  const { search } = req.query;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const people = google.people({ version: 'v1', auth: authClient });
      let connections: any[] = [];

      if (search && typeof search === 'string' && search.trim()) {
        try {
          const searchRes = await people.people.searchContacts({
            query: search.trim(),
            readMask: 'names,emailAddresses,phoneNumbers,organizations,photos',
            pageSize: 50,
          });
          connections = (searchRes.data.results || []).map((r) => r.person).filter(Boolean);
        } catch (searchErr) {
          console.warn('searchContacts failed, falling back to connections list:', searchErr);
          const response = await people.people.connections.list({
            resourceName: 'people/me',
            personFields: 'names,emailAddresses,phoneNumbers,organizations,photos',
            pageSize: 1000,
          });
          connections = response.data.connections || [];
        }
      } else {
        const response = await people.people.connections.list({
          resourceName: 'people/me',
          personFields: 'names,emailAddresses,phoneNumbers,organizations,photos',
          pageSize: 1000,
        });
        connections = response.data.connections || [];
      }

      let contacts = connections.map((person) => {
        const nameObj = person.names?.[0] || {};
        const emailObj = person.emailAddresses?.[0] || {};
        const phoneObj = person.phoneNumbers?.[0] || {};
        const orgObj = person.organizations?.[0] || {};
        const photoObj = person.photos?.[0] || {};

        return {
          resourceName: person.resourceName || '',
          etag: person.etag || '',
          displayName: nameObj.displayName || `${nameObj.givenName || ''} ${nameObj.familyName || ''}`.trim() || 'İsimsiz Kişi',
          givenName: nameObj.givenName || '',
          familyName: nameObj.familyName || '',
          email: emailObj.value || '',
          phone: phoneObj.value || '',
          organization: orgObj.name || '',
          jobTitle: orgObj.title || '',
          photoUrl: photoObj.url || '',
        };
      });

      if (search && typeof search === 'string' && search.trim()) {
        const q = search.trim().toLowerCase();
        contacts = contacts.filter(
          (c) =>
            c.displayName.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q) ||
            c.organization.toLowerCase().includes(q)
        );
      }

      return res.json({ contacts, demoMode: false });
    } catch (err) {
      console.error('Contacts API Error:', err);
    }
  }

  let contacts = demoState.contacts || [];
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    contacts = contacts.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.organization.toLowerCase().includes(q)
    );
  }

  res.json({ contacts, demoMode: true });
});

app.post('/api/contacts', async (req, res) => {
  const { givenName, familyName, email, phone, organization, jobTitle } = req.body;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const people = google.people({ version: 'v1', auth: authClient });
      const displayName = `${givenName || ''} ${familyName || ''}`.trim() || email || 'Yeni Kişi';

      const response = await people.people.createContact({
        requestBody: {
          names: [{ givenName: givenName || '', familyName: familyName || '', displayName }],
          emailAddresses: email ? [{ value: email }] : [],
          phoneNumbers: phone ? [{ value: phone }] : [],
          organizations: (organization || jobTitle) ? [{ name: organization || '', title: jobTitle || '' }] : [],
        },
      });

      const created = response.data;
      const nameObj = created.names?.[0] || {};
      const emailObj = created.emailAddresses?.[0] || {};
      const phoneObj = created.phoneNumbers?.[0] || {};
      const orgObj = created.organizations?.[0] || {};

      const contactItem = {
        resourceName: created.resourceName || '',
        etag: created.etag || '',
        displayName: nameObj.displayName || displayName,
        givenName: nameObj.givenName || givenName || '',
        familyName: nameObj.familyName || familyName || '',
        email: emailObj.value || email || '',
        phone: phoneObj.value || phone || '',
        organization: orgObj.name || organization || '',
        jobTitle: orgObj.title || jobTitle || '',
        photoUrl: created.photos?.[0]?.url || '',
      };

      return res.json({ success: true, contact: contactItem, demoMode: false });
    } catch (err) {
      console.error('Create Contact Error:', err);
    }
  }

  // Demo mode add
  const displayName = `${givenName || ''} ${familyName || ''}`.trim() || 'Yeni Kişi';
  const newContact = {
    resourceName: `people/demo-c${Date.now()}`,
    etag: `etag-${Date.now()}`,
    displayName,
    givenName: givenName || '',
    familyName: familyName || '',
    email: email || '',
    phone: phone || '',
    organization: organization || '',
    jobTitle: jobTitle || '',
    photoUrl: '',
  };
  demoState.contacts.unshift(newContact);

  res.json({ success: true, contact: newContact, demoMode: true });
});

app.patch('/api/contacts/update', async (req, res) => {
  const { resourceName, etag, givenName, familyName, email, phone, organization, jobTitle } = req.body;
  const authClient = getAuthenticatedClient(req);

  if (authClient) {
    try {
      const people = google.people({ version: 'v1', auth: authClient });

      let currentEtag = etag;
      if (!currentEtag) {
        const existing = await people.people.get({
          resourceName,
          personFields: 'names,emailAddresses,phoneNumbers,organizations',
        });
        currentEtag = existing.data.etag || '';
      }

      const displayName = `${givenName || ''} ${familyName || ''}`.trim();

      const updateResponse = await people.people.updateContact({
        resourceName,
        updatePersonFields: 'names,emailAddresses,phoneNumbers,organizations',
        requestBody: {
          etag: currentEtag,
          names: [{ givenName: givenName || '', familyName: familyName || '', displayName }],
          emailAddresses: email ? [{ value: email }] : [],
          phoneNumbers: phone ? [{ value: phone }] : [],
          organizations: (organization || jobTitle) ? [{ name: organization || '', title: jobTitle || '' }] : [],
        },
      });

      const updated = updateResponse.data;
      const nameObj = updated.names?.[0] || {};
      const emailObj = updated.emailAddresses?.[0] || {};
      const phoneObj = updated.phoneNumbers?.[0] || {};
      const orgObj = updated.organizations?.[0] || {};

      const updatedContact = {
        resourceName: updated.resourceName || resourceName,
        etag: updated.etag || '',
        displayName: nameObj.displayName || displayName,
        givenName: nameObj.givenName || givenName || '',
        familyName: nameObj.familyName || familyName || '',
        email: emailObj.value || email || '',
        phone: phoneObj.value || phone || '',
        organization: orgObj.name || organization || '',
        jobTitle: orgObj.title || jobTitle || '',
        photoUrl: updated.photos?.[0]?.url || '',
      };

      return res.json({ success: true, contact: updatedContact, demoMode: false });
    } catch (err) {
      console.error('Update Contact Error:', err);
    }
  }

  // Demo mode update
  const contact = demoState.contacts.find((c) => c.resourceName === resourceName);
  if (contact) {
    if (givenName !== undefined) contact.givenName = givenName;
    if (familyName !== undefined) contact.familyName = familyName;
    contact.displayName = `${givenName || contact.givenName || ''} ${familyName || contact.familyName || ''}`.trim() || contact.displayName;
    if (email !== undefined) contact.email = email;
    if (phone !== undefined) contact.phone = phone;
    if (organization !== undefined) contact.organization = organization;
    if (jobTitle !== undefined) contact.jobTitle = jobTitle;
  }

  res.json({ success: true, contact, demoMode: true });
});

// ================= NOTES & LOCATIONS ROUTES (SQLITE IN ./ADMINSPACE & DRIVE SYNC) =================

app.get('/api/notes', async (req, res) => {
  await getAdminSpaceDb();

  let notes = getAllNotesFromDb();
  let locations = getAllLocationsFromDb();

  // Attempt background sync to Google Drive 'adminspace' folder if user is authenticated
  const authClient = getAuthenticatedClient(req);
  if (authClient) {
    syncWithGoogleDriveAdminSpace(authClient).catch((err) =>
      console.error('Background Drive sync error:', err)
    );
  }

  res.json({
    notes,
    locations,
    storageType: 'sqlite',
    storageFolder: 'adminspace',
  });
});

// ================= NOTE TYPES ROUTES =================
app.get('/api/note-types', async (req, res) => {
  await getAdminSpaceDb();
  const noteTypes = getAllNoteTypesFromDb();
  res.json({ noteTypes });
});

app.post('/api/note-types', async (req, res) => {
  await getAdminSpaceDb();
  const typeData = req.body;
  if (!typeData.id) {
    typeData.id = `type-${Date.now()}`;
  }
  saveNoteTypeToDb(typeData);

  const authClient = getAuthenticatedClient(req);
  if (authClient) {
    syncWithGoogleDriveAdminSpace(authClient).catch(() => {});
  }

  res.json({ success: true, noteType: typeData });
});

app.delete('/api/note-types/:id', async (req, res) => {
  await getAdminSpaceDb();
  const { id } = req.params;
  if (id === 'note' || id === 'timelog') {
    return res.status(400).json({ error: 'Sabit sistem not türleri silinemez.' });
  }
  deleteNoteTypeFromDb(id);

  const authClient = getAuthenticatedClient(req);
  if (authClient) {
    syncWithGoogleDriveAdminSpace(authClient).catch(() => {});
  }

  res.json({ success: true });
});

app.post('/api/notes', async (req, res) => {
  await getAdminSpaceDb();
  const {
    id,
    title,
    content,
    noteType,
    startTime,
    endTime,
    durationMinutes,
    customFields,
    contactResourceName,
    contactDisplayName,
    contacts,
    linkedEmails,
    linkedEvents,
    linkedDriveFiles,
    linkedTasks,
    tags,
    location,
    date,
    pinned,
    projectId,
    cardId,
    cardTitle,
  } = req.body;

  let savedLocation = location;
  if (location && location.lat && location.lng) {
    const existingLocations = getAllLocationsFromDb();
    const existingLoc = existingLocations.find((l) => l.id === location.id);
    if (!existingLoc) {
      const newLoc = {
        id: location.id || `loc-${Date.now()}`,
        name: location.name || 'Haritadan Seçilen Lokasyon',
        lat: Number(location.lat),
        lng: Number(location.lng),
      };
      saveLocationToDb(newLoc);
      savedLocation = newLoc;
    } else {
      savedLocation = existingLoc;
    }
  }

  const newNote = {
    id: id || `note-${Date.now()}`,
    title: title || 'İsimsiz Not',
    content: content || '',
    noteType: noteType || 'note',
    startTime: startTime || null,
    endTime: endTime || null,
    durationMinutes: durationMinutes !== undefined && durationMinutes !== null ? Number(durationMinutes) : null,
    customFields: customFields || {},
    contactResourceName: contactResourceName || '',
    contactDisplayName: contactDisplayName || '',
    contacts: Array.isArray(contacts) ? contacts : [],
    linkedEmails: Array.isArray(linkedEmails) ? linkedEmails : [],
    linkedEvents: Array.isArray(linkedEvents) ? linkedEvents : [],
    linkedDriveFiles: Array.isArray(linkedDriveFiles) ? linkedDriveFiles : [],
    linkedTasks: Array.isArray(linkedTasks) ? linkedTasks : [],
    tags: Array.isArray(tags) ? tags : [],
    location: savedLocation || null,
    date: date || new Date().toISOString().split('T')[0],
    createdAt: req.body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pinned: !!pinned,
    projectId: projectId || null,
    cardId: cardId || null,
    cardTitle: cardTitle || null,
  };

  saveNoteToDb(newNote);

  // If noteType is timelog, also sync to timelogs table for backward compatibility
  if (newNote.noteType === 'timelog') {
    const timelogObj = {
      id: newNote.id,
      cardId: newNote.cardId || newNote.projectId || '',
      cardTitle: newNote.cardTitle || newNote.title || 'Timelog',
      projectId: newNote.projectId || '',
      startTime: newNote.startTime || new Date().toISOString(),
      endTime: newNote.endTime || new Date().toISOString(),
      durationMinutes: newNote.durationMinutes || 0,
      description: newNote.content,
      tags: newNote.tags,
      createdAt: newNote.createdAt,
    };
    try {
      saveTimelogToDb(timelogObj);
    } catch (e) {
      console.error('Failed to save timelog compat:', e);
    }
  }

  const authClient = getAuthenticatedClient(req);
  if (authClient) {
    syncWithGoogleDriveAdminSpace(authClient).catch(() => {});
  }

  res.json({ success: true, note: newNote });
});

app.put('/api/notes/:id', async (req, res) => {
  await getAdminSpaceDb();
  const { id } = req.params;
  const {
    title,
    content,
    noteType,
    startTime,
    endTime,
    durationMinutes,
    customFields,
    contactResourceName,
    contactDisplayName,
    contacts,
    linkedEmails,
    linkedEvents,
    linkedDriveFiles,
    linkedTasks,
    tags,
    location,
    date,
    pinned,
    projectId,
    cardId,
    cardTitle,
  } = req.body;

  const notes = getAllNotesFromDb();
  const existingNote = notes.find((n) => n.id === id);
  if (!existingNote) {
    return res.status(404).json({ error: 'Note not found' });
  }

  let savedLocation = location !== undefined ? location : existingNote.location;
  if (location && location.lat && location.lng) {
    const existingLocations = getAllLocationsFromDb();
    const existingLoc = existingLocations.find((l) => l.id === location.id);
    if (!existingLoc) {
      const newLoc = {
        id: location.id || `loc-${Date.now()}`,
        name: location.name || 'Haritadan Seçilen Lokasyon',
        lat: Number(location.lat),
        lng: Number(location.lng),
      };
      saveLocationToDb(newLoc);
      savedLocation = newLoc;
    }
  }

  const updatedNote = {
    ...existingNote,
    title: title !== undefined ? title : existingNote.title,
    content: content !== undefined ? content : existingNote.content,
    noteType: noteType !== undefined ? noteType : existingNote.noteType,
    startTime: startTime !== undefined ? startTime : existingNote.startTime,
    endTime: endTime !== undefined ? endTime : existingNote.endTime,
    durationMinutes: durationMinutes !== undefined ? durationMinutes : existingNote.durationMinutes,
    customFields: customFields !== undefined ? customFields : existingNote.customFields,
    contactResourceName: contactResourceName !== undefined ? contactResourceName : existingNote.contactResourceName,
    contactDisplayName: contactDisplayName !== undefined ? contactDisplayName : existingNote.contactDisplayName,
    contacts: contacts !== undefined ? (Array.isArray(contacts) ? contacts : []) : existingNote.contacts,
    linkedEmails: linkedEmails !== undefined ? (Array.isArray(linkedEmails) ? linkedEmails : []) : existingNote.linkedEmails,
    linkedEvents: linkedEvents !== undefined ? (Array.isArray(linkedEvents) ? linkedEvents : []) : existingNote.linkedEvents,
    linkedDriveFiles: linkedDriveFiles !== undefined ? (Array.isArray(linkedDriveFiles) ? linkedDriveFiles : []) : existingNote.linkedDriveFiles,
    linkedTasks: linkedTasks !== undefined ? (Array.isArray(linkedTasks) ? linkedTasks : []) : existingNote.linkedTasks,
    tags: Array.isArray(tags) ? tags : existingNote.tags,
    location: savedLocation,
    date: date !== undefined ? date : existingNote.date,
    pinned: pinned !== undefined ? pinned : existingNote.pinned,
    projectId: projectId !== undefined ? projectId : existingNote.projectId,
    cardId: cardId !== undefined ? cardId : existingNote.cardId,
    cardTitle: cardTitle !== undefined ? cardTitle : existingNote.cardTitle,
    updatedAt: new Date().toISOString(),
  };

  saveNoteToDb(updatedNote);

  const authClient = getAuthenticatedClient(req);
  if (authClient) {
    syncWithGoogleDriveAdminSpace(authClient).catch(() => {});
  }

  res.json({ success: true, note: updatedNote });
});

// ================= PROJECTS & KANBAN ROUTES =================

app.get('/api/projects', async (req, res) => {
  await getAdminSpaceDb();

  const projects = getAllProjectsFromDb();
  const tasks = getAllProjectTasksFromDb();

  res.json({ projects, tasks, storageType: 'sqlite', storageFolder: 'adminspace' });
});

app.post('/api/projects', async (req, res) => {
  await getAdminSpaceDb();
  const { name, description, color, columns, linkedEmailIds, linkedEventIds, linkedDriveFileIds, linkedContactResourceNames } = req.body;

  const defaultColumns = [
    { id: 'col-1', title: 'Planlanan', color: 'bg-slate-100 text-slate-800' },
    { id: 'col-2', title: 'Devam Eden', color: 'bg-blue-50 text-blue-800' },
    { id: 'col-3', title: 'Test / İnceleme', color: 'bg-amber-50 text-amber-800' },
    { id: 'col-4', title: 'Tamamlandı', color: 'bg-emerald-50 text-emerald-800' },
  ];

  const newProject = {
    id: `proj-${Date.now()}`,
    name: name || 'Yeni Proje',
    description: description || '',
    color: color || 'indigo',
    columns: Array.isArray(columns) && columns.length > 0 ? columns : defaultColumns,
    linkedEmailIds: Array.isArray(linkedEmailIds) ? linkedEmailIds : [],
    linkedEventIds: Array.isArray(linkedEventIds) ? linkedEventIds : [],
    linkedDriveFileIds: Array.isArray(linkedDriveFileIds) ? linkedDriveFileIds : [],
    linkedContactResourceNames: Array.isArray(linkedContactResourceNames) ? linkedContactResourceNames : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveProjectToDb(newProject);

  const authClient = getAuthenticatedClient(req);
  if (authClient) {
    syncWithGoogleDriveAdminSpace(authClient).catch(() => {});
  }

  res.json({ success: true, project: newProject });
});

app.put('/api/projects/:id', async (req, res) => {
  await getAdminSpaceDb();
  const { id } = req.params;
  const { name, description, color, columns, linkedEmailIds, linkedEventIds, linkedDriveFileIds, linkedContactResourceNames } = req.body;

  const projects = getAllProjectsFromDb();
  const existing = projects.find((p) => p.id === id);
  if (!existing) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const updatedProject = {
    ...existing,
    name: name !== undefined ? name : existing.name,
    description: description !== undefined ? description : existing.description,
    color: color !== undefined ? color : existing.color,
    columns: columns !== undefined ? columns : existing.columns,
    linkedEmailIds: linkedEmailIds !== undefined ? linkedEmailIds : existing.linkedEmailIds,
    linkedEventIds: linkedEventIds !== undefined ? linkedEventIds : existing.linkedEventIds,
    linkedDriveFileIds: linkedDriveFileIds !== undefined ? linkedDriveFileIds : existing.linkedDriveFileIds,
    linkedContactResourceNames: linkedContactResourceNames !== undefined ? linkedContactResourceNames : existing.linkedContactResourceNames,
    updatedAt: new Date().toISOString(),
  };

  saveProjectToDb(updatedProject);

  const authClient = getAuthenticatedClient(req);
  if (authClient) {
    syncWithGoogleDriveAdminSpace(authClient).catch(() => {});
  }

  res.json({ success: true, project: updatedProject });
});

app.delete('/api/projects/:id', async (req, res) => {
  await getAdminSpaceDb();
  const { id } = req.params;
  deleteProjectFromDb(id);

  const authClient = getAuthenticatedClient(req);
  if (authClient) {
    syncWithGoogleDriveAdminSpace(authClient).catch(() => {});
  }

  res.json({ success: true });
});

// PROJECT TASKS ENDPOINTS
app.get('/api/projects/:id/tasks', async (req, res) => {
  await getAdminSpaceDb();

  const { id } = req.params;
  const tasks = getAllProjectTasksFromDb(id);
  res.json({ tasks });
});

app.post('/api/projects/:id/tasks', async (req, res) => {
  await getAdminSpaceDb();
  const { id } = req.params;
  const { columnId, title, description, priority, dueDate, assignee, linkedEmailIds, linkedEventIds, linkedDriveFileIds, linkedContactResourceNames, linkedTaskIds } = req.body;

  const newTask = {
    id: `pt-${Date.now()}`,
    projectId: id,
    columnId: columnId || 'col-1',
    title: title || 'Yeni Görev',
    description: description || '',
    priority: priority || 'medium',
    dueDate: dueDate || null,
    assignee: assignee || null,
    createdAt: new Date().toISOString(),
    linkedEmailIds: Array.isArray(linkedEmailIds) ? linkedEmailIds : [],
    linkedEventIds: Array.isArray(linkedEventIds) ? linkedEventIds : [],
    linkedDriveFileIds: Array.isArray(linkedDriveFileIds) ? linkedDriveFileIds : [],
    linkedContactResourceNames: Array.isArray(linkedContactResourceNames) ? linkedContactResourceNames : [],
    linkedTaskIds: Array.isArray(linkedTaskIds) ? linkedTaskIds : [],
  };

  saveProjectTaskToDb(newTask);

  const authClient = getAuthenticatedClient(req);
  if (authClient) {
    syncWithGoogleDriveAdminSpace(authClient).catch(() => {});
  }

  res.json({ success: true, task: newTask });
});

app.put('/api/projects/tasks/:taskId', async (req, res) => {
  await getAdminSpaceDb();
  const { taskId } = req.params;
  const { columnId, title, description, priority, dueDate, assignee, linkedEmailIds, linkedEventIds, linkedDriveFileIds, linkedContactResourceNames, linkedTaskIds } = req.body;

  const allTasks = getAllProjectTasksFromDb();
  const existing = allTasks.find((t) => t.id === taskId);
  if (!existing) {
    return res.status(404).json({ error: 'Project task not found' });
  }

  const updatedTask = {
    ...existing,
    columnId: columnId !== undefined ? columnId : existing.columnId,
    title: title !== undefined ? title : existing.title,
    description: description !== undefined ? description : existing.description,
    priority: priority !== undefined ? priority : existing.priority,
    dueDate: dueDate !== undefined ? dueDate : existing.dueDate,
    assignee: assignee !== undefined ? assignee : existing.assignee,
    linkedEmailIds: linkedEmailIds !== undefined ? (Array.isArray(linkedEmailIds) ? linkedEmailIds : []) : existing.linkedEmailIds,
    linkedEventIds: linkedEventIds !== undefined ? (Array.isArray(linkedEventIds) ? linkedEventIds : []) : existing.linkedEventIds,
    linkedDriveFileIds: linkedDriveFileIds !== undefined ? (Array.isArray(linkedDriveFileIds) ? linkedDriveFileIds : []) : existing.linkedDriveFileIds,
    linkedContactResourceNames: linkedContactResourceNames !== undefined ? (Array.isArray(linkedContactResourceNames) ? linkedContactResourceNames : []) : existing.linkedContactResourceNames,
    linkedTaskIds: linkedTaskIds !== undefined ? (Array.isArray(linkedTaskIds) ? linkedTaskIds : []) : existing.linkedTaskIds,
  };

  saveProjectTaskToDb(updatedTask);

  const authClient = getAuthenticatedClient(req);
  if (authClient) {
    syncWithGoogleDriveAdminSpace(authClient).catch(() => {});
  }

  res.json({ success: true, task: updatedTask });
});

app.delete('/api/projects/tasks/:taskId', async (req, res) => {
  await getAdminSpaceDb();
  const { taskId } = req.params;
  deleteProjectTaskFromDb(taskId);

  const authClient = getAuthenticatedClient(req);
  if (authClient) {
    syncWithGoogleDriveAdminSpace(authClient).catch(() => {});
  }

  res.json({ success: true });
});

// EXPORT PROJECT TO MARKDOWN & DRIVE
app.post('/api/projects/:id/export-markdown', async (req, res) => {
  await getAdminSpaceDb();
  const { id } = req.params;
  const extraData = req.body || {};
  const authClient = getAuthenticatedClient(req);

  try {
    const result = await exportProjectToMarkdownAndDrive(id, authClient, extraData);
    res.json(result);
  } catch (err: any) {
    console.error('Export project markdown error:', err);
    res.status(500).json({ error: err.message || 'Export failed' });
  }
});

// ================= TIMELOGS ROUTES =================

app.get('/api/timelogs', async (req, res) => {
  await getAdminSpaceDb();

  const logs = getAllTimelogsFromDb();
  res.json({ timelogs: logs });
});

app.post('/api/timelogs', async (req, res) => {
  await getAdminSpaceDb();
  const log = req.body;
  if (!log.id) {
    log.id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }
  saveTimelogToDb(log);

  const authClient = getAuthenticatedClient(req);
  if (authClient) {
    syncWithGoogleDriveAdminSpace(authClient).catch(() => {});
  }

  res.json({ success: true, timelog: log });
});

app.delete('/api/timelogs/:id', async (req, res) => {
  await getAdminSpaceDb();
  const { id } = req.params;
  deleteTimelogFromDb(id);

  const authClient = getAuthenticatedClient(req);
  if (authClient) {
    syncWithGoogleDriveAdminSpace(authClient).catch(() => {});
  }

  res.json({ success: true });
});

app.delete('/api/notes/:id', async (req, res) => {
  await getAdminSpaceDb();
  const { id } = req.params;
  deleteNoteFromDb(id);

  const authClient = getAuthenticatedClient(req);
  if (authClient) {
    syncWithGoogleDriveAdminSpace(authClient).catch(() => {});
  }

  res.json({ success: true });
});

app.patch('/api/locations/:id', async (req, res) => {
  await getAdminSpaceDb();
  const { id } = req.params;
  const { name, lat, lng } = req.body;

  const locations = getAllLocationsFromDb();
  const loc = locations.find((l) => l.id === id);

  if (loc) {
    if (name) loc.name = name;
    if (lat !== undefined) loc.lat = Number(lat);
    if (lng !== undefined) loc.lng = Number(lng);

    saveLocationToDb(loc);

    // Update location name in notes in SQLite
    const notes = getAllNotesFromDb();
    notes.forEach((n) => {
      if (n.location && n.location.id === id) {
        n.location = { ...n.location, name: loc.name, lat: loc.lat, lng: loc.lng };
        saveNoteToDb(n);
      }
    });
  }

  const authClient = getAuthenticatedClient(req);
  if (authClient) {
    syncWithGoogleDriveAdminSpace(authClient).catch(() => {});
  }

  res.json({ success: true, location: loc });
});

app.delete('/api/locations/:id', async (req, res) => {
  await getAdminSpaceDb();
  const { id } = req.params;
  deleteLocationFromDb(id);

  const authClient = getAuthenticatedClient(req);
  if (authClient) {
    syncWithGoogleDriveAdminSpace(authClient).catch(() => {});
  }

  res.json({ success: true });
});

app.get('/api/adminspace/sync-status', async (req, res) => {
  const authClient = getAuthenticatedClient(req);
  const status = await getSyncStatus(authClient);
  res.json(status);
});

app.post('/api/adminspace/manual-sync', async (req, res) => {
  const authClient = getAuthenticatedClient(req);
  if (!authClient) {
    return res.status(401).json({ error: 'Google OAuth oturumu gerekli' });
  }

  await getAdminSpaceDb();
  const result = await performManualSync(authClient);
  res.json(result);
});

app.post('/api/adminspace/sync', async (req, res) => {
  const authClient = getAuthenticatedClient(req);
  if (!authClient) {
    return res.status(401).json({ error: 'Google OAuth authentication required' });
  }

  const result = await syncWithGoogleDriveAdminSpace(authClient);
  if (result) {
    res.json({ success: true, ...result });
  } else {
    res.status(500).json({ error: 'Failed to sync adminspace folder to Google Drive' });
  }
});

app.post('/api/adminspace/restore', async (req, res) => {
  const authClient = getAuthenticatedClient(req);
  if (!authClient) {
    return res.status(401).json({ error: 'Google OAuth authentication required' });
  }

  await getAdminSpaceDb();
  const result = await restoreFromGoogleDriveAdminSpace(authClient);
  if (result) {
    res.json({ success: true, ...result });
  } else {
    res.status(500).json({ error: 'Failed to restore adminspace from Google Drive' });
  }
});

app.get('/api/adminspace/settings', async (req, res) => {
  await getAdminSpaceDb();
  const settings = getAllSettingsFromDb();
  res.json({ settings });
});

app.post('/api/adminspace/settings', async (req, res) => {
  await getAdminSpaceDb();
  const { key, value } = req.body || {};
  if (!key) return res.status(400).json({ error: 'Key is required' });
  saveSettingToDb(key, String(value ?? ''));
  res.json({ success: true, key, value });
});

app.get('/api/adminspace/drive-folders', async (req, res) => {
  const authClient = getAuthenticatedClient(req);
  if (!authClient) {
    return res.status(401).json({ error: 'Google OAuth oturumu gerekli' });
  }

  try {
    const drive = google.drive({ version: 'v3', auth: authClient });
    const response = await drive.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id, name, webViewLink, createdTime, modifiedTime)',
      orderBy: 'name',
      pageSize: 100,
    });

    const folders = (response.data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      link: f.webViewLink,
    }));

    res.json({ folders });
  } catch (err: any) {
    console.error('Error fetching Google Drive folders:', err);
    res.status(500).json({ error: 'Google Drive klasörleri alınamadı.' });
  }
});

// Global Express Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Express Error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err?.message || 'Sunucuda bir iç hata oluştu.' });
});

// ================= VITE / STATIC SERVING =================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
