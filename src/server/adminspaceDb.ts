import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';
import { google } from 'googleapis';

const ADMINSPACE_DIR = path.join(process.cwd(), 'adminspace');
const SQLITE_FILE = path.join(ADMINSPACE_DIR, 'adminspace.sqlite');
const DATA_JSON_FILE = path.join(ADMINSPACE_DIR, 'data.json');

// Ensure local ./adminspace directory exists
if (!fs.existsSync(ADMINSPACE_DIR)) {
  fs.mkdirSync(ADMINSPACE_DIR, { recursive: true });
}

let dbInstance: Database | null = null;

// Initialize SQLite with sql.js
export async function getAdminSpaceDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(SQLITE_FILE)) {
    const fileBuffer = fs.readFileSync(SQLITE_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Ensure tables exist
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      contactResourceName TEXT,
      contactDisplayName TEXT,
      tags TEXT,
      locationId TEXT,
      date TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      pinned INTEGER DEFAULT 0
    );
  `);

  saveDbToDisk();
  return dbInstance;
}

// Persist SQLite DB to ./adminspace/adminspace.sqlite and backup data.json
export function saveDbToDisk() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(SQLITE_FILE, buffer);

    // Also maintain readable JSON dump in ./adminspace/data.json for double verification
    const locations = getAllLocationsFromDb();
    const notes = getAllNotesFromDb();
    fs.writeFileSync(
      DATA_JSON_FILE,
      JSON.stringify({ locations, notes, updatedAt: new Date().toISOString() }, null, 2)
    );
  } catch (err) {
    console.error('Error saving SQLite DB to disk in adminspace:', err);
  }
}

export function getAllLocationsFromDb() {
  if (!dbInstance) return [];
  try {
    const stmt = dbInstance.prepare('SELECT * FROM locations');
    const locations = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      locations.push({
        id: String(row.id),
        name: String(row.name),
        lat: Number(row.lat),
        lng: Number(row.lng),
      });
    }
    stmt.free();
    return locations;
  } catch (err) {
    console.error('Error getting locations from SQLite:', err);
    return [];
  }
}

export function saveLocationToDb(loc: { id: string; name: string; lat: number; lng: number }) {
  if (!dbInstance) return;
  dbInstance.run(
    'INSERT OR REPLACE INTO locations (id, name, lat, lng) VALUES (?, ?, ?, ?)',
    [loc.id, loc.name, loc.lat, loc.lng]
  );
  saveDbToDisk();
}

export function getAllNotesFromDb() {
  if (!dbInstance) return [];
  try {
    const locations = getAllLocationsFromDb();
    const locMap = new Map(locations.map((l) => [l.id, l]));

    const stmt = dbInstance.prepare('SELECT * FROM notes ORDER BY pinned DESC, date DESC');
    const notes = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      let tags: string[] = [];
      try {
        tags = row.tags ? JSON.parse(String(row.tags)) : [];
      } catch {
        tags = [];
      }

      const locId = row.locationId ? String(row.locationId) : null;
      const locationObj = locId ? locMap.get(locId) || null : null;

      notes.push({
        id: String(row.id),
        title: String(row.title),
        content: String(row.content || ''),
        contactResourceName: row.contactResourceName ? String(row.contactResourceName) : '',
        contactDisplayName: row.contactDisplayName ? String(row.contactDisplayName) : '',
        tags,
        location: locationObj,
        date: String(row.date),
        createdAt: String(row.createdAt),
        updatedAt: String(row.updatedAt),
        pinned: Number(row.pinned) === 1,
      });
    }
    stmt.free();
    return notes;
  } catch (err) {
    console.error('Error getting notes from SQLite:', err);
    return [];
  }
}

export function saveNoteToDb(note: any) {
  if (!dbInstance) return;

  const locationId = note.location ? note.location.id : null;
  if (note.location) {
    saveLocationToDb(note.location);
  }

  const tagsJson = JSON.stringify(note.tags || []);

  dbInstance.run(
    `INSERT OR REPLACE INTO notes 
     (id, title, content, contactResourceName, contactDisplayName, tags, locationId, date, createdAt, updatedAt, pinned)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      note.id,
      note.title,
      note.content || '',
      note.contactResourceName || '',
      note.contactDisplayName || '',
      tagsJson,
      locationId,
      note.date,
      note.createdAt || new Date().toISOString(),
      note.updatedAt || new Date().toISOString(),
      note.pinned ? 1 : 0,
    ]
  );

  saveDbToDisk();
}

export function deleteNoteFromDb(id: string) {
  if (!dbInstance) return;
  dbInstance.run('DELETE FROM notes WHERE id = ?', [id]);
  saveDbToDisk();
}

// Ensure Google Drive folder 'adminspace' exists and sync SQLite/JSON data into it
export async function syncWithGoogleDriveAdminSpace(authClient: any) {
  if (!authClient) return null;

  try {
    const drive = google.drive({ version: 'v3', auth: authClient });

    // 1. Search if 'adminspace' folder exists
    const searchRes = await drive.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder' and name = 'adminspace' and trashed = false",
      fields: 'files(id, name, webViewLink)',
    });

    let folderId = searchRes.data.files?.[0]?.id;
    let folderLink = searchRes.data.files?.[0]?.webViewLink;

    // 2. If not found, create folder 'adminspace'
    if (!folderId) {
      const createFolderRes = await drive.files.create({
        requestBody: {
          name: 'adminspace',
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id, webViewLink',
      });
      folderId = createFolderRes.data.id || undefined;
      folderLink = createFolderRes.data.webViewLink || undefined;
    }

    if (!folderId) return null;

    // 3. Sync database file and data.json into 'adminspace' folder
    if (fs.existsSync(DATA_JSON_FILE)) {
      const fileContent = fs.readFileSync(DATA_JSON_FILE, 'utf-8');

      // Check if data.json already exists in 'adminspace' folder
      const fileSearch = await drive.files.list({
        q: `'${folderId}' in parents and name = 'adminspace_notes.json' and trashed = false`,
        fields: 'files(id, name)',
      });

      const existingFileId = fileSearch.data.files?.[0]?.id;

      if (existingFileId) {
        await drive.files.update({
          fileId: existingFileId,
          media: {
            mimeType: 'application/json',
            body: fileContent,
          },
        });
      } else {
        await drive.files.create({
          requestBody: {
            name: 'adminspace_notes.json',
            parents: [folderId],
            mimeType: 'application/json',
          },
          media: {
            mimeType: 'application/json',
            body: fileContent,
          },
        });
      }
    }

    return {
      folderId,
      folderLink,
      syncedAt: new Date().toISOString(),
      storagePath: SQLITE_FILE,
    };
  } catch (err) {
    console.error('Google Drive adminspace sync error:', err);
    return null;
  }
}
