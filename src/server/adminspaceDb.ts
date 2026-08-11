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
export let lastLocalWriteTimestamp = 0;
export let lastDriveSyncTimestamp = 0;

export function markLocalDataModified() {
  lastLocalWriteTimestamp = Date.now();
}

export function ensureTablesExist(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      contactResourceName TEXT,
      contactDisplayName TEXT,
      contacts TEXT,
      linkedEmails TEXT,
      linkedEvents TEXT,
      tags TEXT,
      locationId TEXT,
      date TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      pinned INTEGER DEFAULT 0,
      projectId TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      columns TEXT,
      linkedEmailIds TEXT,
      linkedEventIds TEXT,
      linkedDriveFileIds TEXT,
      linkedContactResourceNames TEXT,
      driveFileId TEXT,
      driveFileUrl TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS project_tasks (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      columnId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT,
      dueDate TEXT,
      assignee TEXT,
      createdAt TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS timelogs (
      id TEXT PRIMARY KEY,
      cardId TEXT,
      cardTitle TEXT NOT NULL,
      projectId TEXT,
      projectName TEXT,
      eventId TEXT,
      eventSummary TEXT,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      durationMinutes INTEGER NOT NULL,
      description TEXT,
      tags TEXT,
      createdAt TEXT
    );
  `);

  try { db.run("ALTER TABLE timelogs ADD COLUMN linkType TEXT"); } catch {}
  try { db.run("ALTER TABLE timelogs ADD COLUMN linkId TEXT"); } catch {}
  try { db.run("ALTER TABLE timelogs ADD COLUMN linkTitle TEXT"); } catch {}
  try { db.run("ALTER TABLE timelogs ADD COLUMN locationId TEXT"); } catch {}

  db.run(`
    CREATE TABLE IF NOT EXISTS note_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      isSystem INTEGER NOT NULL DEFAULT 0,
      icon TEXT,
      color TEXT,
      fields TEXT,
      createdAt TEXT
    );
  `);

  try { db.run("ALTER TABLE notes ADD COLUMN contacts TEXT"); } catch {}
  try { db.run("ALTER TABLE notes ADD COLUMN linkedEmails TEXT"); } catch {}
  try { db.run("ALTER TABLE notes ADD COLUMN linkedEvents TEXT"); } catch {}
  try { db.run("ALTER TABLE notes ADD COLUMN linkedDriveFiles TEXT"); } catch {}
  try { db.run("ALTER TABLE notes ADD COLUMN linkedTasks TEXT"); } catch {}
  try { db.run("ALTER TABLE notes ADD COLUMN projectId TEXT"); } catch {}
  try { db.run("ALTER TABLE notes ADD COLUMN noteType TEXT"); } catch {}
  try { db.run("ALTER TABLE notes ADD COLUMN startTime TEXT"); } catch {}
  try { db.run("ALTER TABLE notes ADD COLUMN endTime TEXT"); } catch {}
  try { db.run("ALTER TABLE notes ADD COLUMN durationMinutes INTEGER"); } catch {}
  try { db.run("ALTER TABLE notes ADD COLUMN customFields TEXT"); } catch {}
  try { db.run("ALTER TABLE notes ADD COLUMN cardId TEXT"); } catch {}
  try { db.run("ALTER TABLE notes ADD COLUMN cardTitle TEXT"); } catch {}
  try { db.run("ALTER TABLE projects ADD COLUMN linkedTaskIds TEXT"); } catch {}

  try { db.run("ALTER TABLE project_tasks ADD COLUMN linkedEmailIds TEXT"); } catch {}
  try { db.run("ALTER TABLE project_tasks ADD COLUMN linkedEventIds TEXT"); } catch {}
  try { db.run("ALTER TABLE project_tasks ADD COLUMN linkedDriveFileIds TEXT"); } catch {}
  try { db.run("ALTER TABLE project_tasks ADD COLUMN linkedContactResourceNames TEXT"); } catch {}
  try { db.run("ALTER TABLE project_tasks ADD COLUMN linkedTaskIds TEXT"); } catch {}

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

// Initialize SQLite with sql.js
export async function getAdminSpaceDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(SQLITE_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(SQLITE_FILE);
      if (fileBuffer.length < 100) {
        throw new Error('SQLite file is too small or truncated');
      }
      const testDb = new SQL.Database(fileBuffer);
      ensureTablesExist(testDb);
      testDb.exec("SELECT COUNT(*) FROM sqlite_master");
      dbInstance = testDb;
    } catch (err) {
      console.warn('SQLite database file is corrupted or invalid. Initializing fresh database. Error:', err);
      try {
        const corruptBackup = `${SQLITE_FILE}.corrupt.${Date.now()}`;
        fs.renameSync(SQLITE_FILE, corruptBackup);
      } catch {
        try { fs.unlinkSync(SQLITE_FILE); } catch {}
      }
      dbInstance = new SQL.Database();
      ensureTablesExist(dbInstance);
    }
  } else {
    dbInstance = new SQL.Database();
    ensureTablesExist(dbInstance);
  }

  // If project_tasks table is empty, attempt to populate from data.json
  try {
    const taskCheck = dbInstance.prepare('SELECT COUNT(*) as cnt FROM project_tasks');
    if (taskCheck.step() && taskCheck.getAsObject().cnt === 0) {
      taskCheck.free();
      if (fs.existsSync(DATA_JSON_FILE)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf-8'));
          if (parsed.projectTasks && Array.isArray(parsed.projectTasks)) {
            parsed.projectTasks.forEach((t: any) => saveProjectTaskToDb(t));
          }
        } catch {}
      }
    } else {
      taskCheck.free();
    }
  } catch (err) {
    console.error('Error restoring project_tasks from data.json:', err);
  }
  try {
    const projCheck = dbInstance.prepare('SELECT COUNT(*) as cnt FROM projects');
    if (projCheck.step() && projCheck.getAsObject().cnt === 0) {
      projCheck.free();
      const demoProjId = 'proj-demo-1';
      const defaultCols = JSON.stringify([
        { id: 'col-1', title: 'Planlanan', color: 'bg-slate-100 text-slate-800' },
        { id: 'col-2', title: 'Devam Eden', color: 'bg-blue-50 text-blue-800' },
        { id: 'col-3', title: 'Test / İnceleme', color: 'bg-amber-50 text-amber-800' },
        { id: 'col-4', title: 'Tamamlandı', color: 'bg-emerald-50 text-emerald-800' },
      ]);
      dbInstance.run(
        `INSERT INTO projects (id, name, description, color, columns, linkedEmailIds, linkedEventIds, linkedDriveFileIds, linkedContactResourceNames, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          demoProjId,
          'Kanban Projesi',
          'Kişisel yönetim platformunun Kanban projesi.',
          'indigo',
          defaultCols,
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([]),
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );
    } else {
      projCheck.free();
    }
  } catch (err) {
    console.error('Error seeding demo projects:', err);
  }

  // Clean any legacy dummy notes/locations from SQLite table
  try {
    dbInstance.run("DELETE FROM notes WHERE id LIKE 'note-demo-%'");
  } catch (err) {
    console.error('Error cleaning dummy data from SQLite:', err);
  }

  // Migrate any existing timelogs to notes as 'timelog' noteType
  migrateTimelogsToNotes(dbInstance);

  saveDbToDisk();
  return dbInstance;
}

export function migrateTimelogsToNotes(db: Database) {
  try {
    const timelogRows = db.exec("SELECT * FROM timelogs");
    if (timelogRows.length > 0 && timelogRows[0].values.length > 0) {
      const cols = timelogRows[0].columns;
      const values = timelogRows[0].values;

      values.forEach((row) => {
        const item: any = {};
        cols.forEach((col, idx) => {
          item[col] = row[idx];
        });

        if (!item.id) return;

        // Check if note already exists with this ID
        const stmt = db.prepare("SELECT id FROM notes WHERE id = ?");
        stmt.bind([item.id]);
        const exists = stmt.step();
        stmt.free();

        if (!exists) {
          const title = item.cardTitle || item.eventSummary || 'Zaman Kaydı';
          const content = item.description || '';
          const projectId = item.projectId || item.cardId || '';
          const cardId = item.cardId || '';
          const cardTitle = item.cardTitle || '';
          const tags = typeof item.tags === 'string' ? item.tags : JSON.stringify(item.tags || []);
          const date = item.startTime ? String(item.startTime).slice(0, 16) : (item.createdAt ? String(item.createdAt).slice(0, 16) : new Date().toISOString().slice(0, 16));

          db.run(
            `INSERT INTO notes (
              id, title, content, noteType, startTime, endTime, durationMinutes, projectId, cardId, cardTitle, tags, date, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.id,
              title,
              content,
              'timelog',
              item.startTime || '',
              item.endTime || '',
              item.durationMinutes || 0,
              projectId,
              cardId,
              cardTitle,
              tags,
              date,
              item.createdAt || new Date().toISOString(),
              new Date().toISOString()
            ]
          );
        }
      });
    }
  } catch (err) {
    console.error('Migration timelogs error:', err);
  }
}

// Persist SQLite DB to ./adminspace/adminspace.sqlite, data.json, adminspace_notes.md, notes/note_*.md, and cards/card_*.md
export function saveDbToDisk() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    const tmpSqliteFile = `${SQLITE_FILE}.tmp`;
    fs.writeFileSync(tmpSqliteFile, buffer);
    fs.renameSync(tmpSqliteFile, SQLITE_FILE);

    // Also maintain readable JSON dump in ./adminspace/data.json
    const locations = getAllLocationsFromDb();
    const notes = getAllNotesFromDb();
    const projects = getAllProjectsFromDb();
    const projectTasks = getAllProjectTasksFromDb();
    const timelogs = getAllTimelogsFromDb();
    const settings = getAllSettingsFromDb();
    fs.writeFileSync(
      DATA_JSON_FILE,
      JSON.stringify({ locations, notes, projects, projectTasks, timelogs, settings, updatedAt: new Date().toISOString() }, null, 2)
    );

    // Save main notes Markdown summary in ./adminspace/adminspace_notes.md
    let notesMd = `# AdminSpace Notlar\n\n- **Son Güncelleme:** ${new Date().toLocaleString('tr-TR')}\n\n---\n\n`;
    if (notes.length === 0) {
      notesMd += `*Henüz kayıtlı not bulunmuyor.*\n`;
    } else {
      notes.forEach((n: any) => {
        notesMd += `## 📝 ${n.title}\n`;
        notesMd += `- **Tarih:** ${n.date || n.createdAt}\n`;
        if (n.pinned) notesMd += `- **Sabitlenmiş:** Evet 📌\n`;
        if (n.contactDisplayName) notesMd += `- **İlişkili Kişi:** ${n.contactDisplayName}\n`;
        if (n.tags && Array.isArray(n.tags) && n.tags.length > 0) notesMd += `- **Etiketler:** ${n.tags.join(', ')}\n`;
        notesMd += `\n${n.content || ''}\n\n---\n\n`;
      });
    }
    const NOTES_MD_FILE = path.join(ADMINSPACE_DIR, 'adminspace_notes.md');
    fs.writeFileSync(NOTES_MD_FILE, notesMd);

    // Save individual Note Markdown files in ./adminspace/notes/
    const NOTES_DIR = path.join(ADMINSPACE_DIR, 'notes');
    if (!fs.existsSync(NOTES_DIR)) {
      fs.mkdirSync(NOTES_DIR, { recursive: true });
    }
    const activeNoteFiles = new Set<string>();
    notes.forEach((n: any) => {
      const fileName = `note_${n.id}.md`;
      activeNoteFiles.add(fileName);
      const notePath = path.join(NOTES_DIR, fileName);

      const noteSingleMd = `# 📝 Not: ${n.title || 'Başlıksız Not'}

- **Not ID:** \`${n.id}\`
- **Tarih:** \`${n.date || n.createdAt || '-'}\`
- **Not Tipi:** \`${n.noteType || 'note'}\`
- **Sabitlenmiş:** \`${n.pinned ? 'Evet 📌' : 'Hayır'}\`
- **İlişkili Kişi:** \`${n.contactDisplayName || 'Yok'}\`
- **İlişkili Proje:** \`${n.projectId || 'Yok'}\`
- **Etiketler:** \`${n.tags && Array.isArray(n.tags) && n.tags.length > 0 ? n.tags.join(', ') : 'Yok'}\`
- **Oluşturulma Tarihi:** \`${n.createdAt || '-'}\`
- **Güncellenme Tarihi:** \`${n.updatedAt || '-'}\`

---

## 📝 Not İçeriği

${n.content || '*İçerik boş.*'}

---

## 🔗 Bağlantılar & Entegrasyonlar

- **Kişiler:** ${n.contacts && Array.isArray(n.contacts) && n.contacts.length > 0 ? n.contacts.join(', ') : 'Yok'}
- **E-postalar:** ${n.linkedEmails && Array.isArray(n.linkedEmails) && n.linkedEmails.length > 0 ? n.linkedEmails.join(', ') : 'Yok'}
- **Etkinlikler:** ${n.linkedEvents && Array.isArray(n.linkedEvents) && n.linkedEvents.length > 0 ? n.linkedEvents.join(', ') : 'Yok'}
- **Drive Dosyaları:** ${n.linkedDriveFiles && Array.isArray(n.linkedDriveFiles) && n.linkedDriveFiles.length > 0 ? n.linkedDriveFiles.join(', ') : 'Yok'}
- **Görevler:** ${n.linkedTasks && Array.isArray(n.linkedTasks) && n.linkedTasks.length > 0 ? n.linkedTasks.join(', ') : 'Yok'}
`;

      fs.writeFileSync(notePath, noteSingleMd);
    });

    // Cleanup deleted note files
    const existingNoteFiles = fs.readdirSync(NOTES_DIR);
    existingNoteFiles.forEach((file) => {
      if (file.startsWith('note_') && file.endsWith('.md') && !activeNoteFiles.has(file)) {
        try { fs.unlinkSync(path.join(NOTES_DIR, file)); } catch {}
      }
    });

    // Save each Kanban card (projectTask) as an individual Markdown file in ./adminspace/cards/
    const CARDS_DIR = path.join(ADMINSPACE_DIR, 'cards');
    if (!fs.existsSync(CARDS_DIR)) {
      fs.mkdirSync(CARDS_DIR, { recursive: true });
    }

    const activeCardFiles = new Set<string>();
    projectTasks.forEach((task: any) => {
      const fileName = `card_${task.id}.md`;
      activeCardFiles.add(fileName);
      const cardPath = path.join(CARDS_DIR, fileName);

      const cardMd = `# 📋 Kanban Kartı: ${task.title || 'Başlıksız Kart'}

- **Kart ID:** \`${task.id}\`
- **Proje ID:** \`${task.projectId || '-'}\`
- **Kolon ID:** \`${task.columnId || '-'}\`
- **Öncelik:** \`${task.priority || 'medium'}\`
- **Son Tarih:** \`${task.dueDate || 'Belirtilmedi'}\`
- **Atanan Kişi:** \`${task.assignee || 'Atanmadı'}\`
- **Oluşturulma Tarihi:** \`${task.createdAt || '-'}\`

---

## 📝 Açıklama

${task.description || '*Açıklama girilmedi.*'}

---

## 🔗 Bağlantılar & Entegrasyonlar

- **E-postalar:** ${task.linkedEmailIds && Array.isArray(task.linkedEmailIds) && task.linkedEmailIds.length > 0 ? task.linkedEmailIds.join(', ') : 'Yok'}
- **Etkinlikler:** ${task.linkedEventIds && Array.isArray(task.linkedEventIds) && task.linkedEventIds.length > 0 ? task.linkedEventIds.join(', ') : 'Yok'}
- **Drive Dosyaları:** ${task.linkedDriveFileIds && Array.isArray(task.linkedDriveFileIds) && task.linkedDriveFileIds.length > 0 ? task.linkedDriveFileIds.join(', ') : 'Yok'}
- **Kişiler:** ${task.linkedContactResourceNames && Array.isArray(task.linkedContactResourceNames) && task.linkedContactResourceNames.length > 0 ? task.linkedContactResourceNames.join(', ') : 'Yok'}
- **Görevler:** ${task.linkedTaskIds && Array.isArray(task.linkedTaskIds) && task.linkedTaskIds.length > 0 ? task.linkedTaskIds.join(', ') : 'Yok'}
`;

      fs.writeFileSync(cardPath, cardMd);
    });

    // Clean up markdown files for deleted cards
    const existingCardFiles = fs.readdirSync(CARDS_DIR);
    existingCardFiles.forEach((file) => {
      if (file.startsWith('card_') && file.endsWith('.md') && !activeCardFiles.has(file)) {
        try { fs.unlinkSync(path.join(CARDS_DIR, file)); } catch {}
      }
    });
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
  markLocalDataModified();
  saveDbToDisk();
}

export function deleteLocationFromDb(id: string) {
  if (!dbInstance) return;
  dbInstance.run('DELETE FROM locations WHERE id = ?', [id]);
  try {
    dbInstance.run('UPDATE notes SET locationId = NULL WHERE locationId = ?', [id]);
  } catch (err) {
    console.error('Error unlinking location from notes:', err);
  }
  markLocalDataModified();
  saveDbToDisk();
}

export function getSystemNoteTypes() {
  return [
    { id: 'note', name: 'Düz Not', isSystem: true, icon: 'FileText', color: 'bg-slate-500', fields: [] },
    { id: 'timelog', name: 'Timelog', isSystem: true, icon: 'Clock', color: 'bg-blue-500', fields: [] },
  ];
}

export function getAllNoteTypesFromDb(): any[] {
  if (!dbInstance) return getSystemNoteTypes();
  try {
    const stmt = dbInstance.prepare('SELECT * FROM note_types ORDER BY isSystem DESC, createdAt ASC');
    const customTypes: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      let fields = [];
      try { fields = row.fields ? JSON.parse(String(row.fields)) : []; } catch {}
      customTypes.push({
        id: String(row.id),
        name: String(row.name),
        isSystem: Number(row.isSystem) === 1,
        icon: row.icon ? String(row.icon) : undefined,
        color: row.color ? String(row.color) : undefined,
        fields,
      });
    }
    stmt.free();

    const systemTypes = getSystemNoteTypes();
    const typeMap = new Map<string, any>();
    systemTypes.forEach((sys) => typeMap.set(sys.id, sys));
    customTypes.forEach((ct) => typeMap.set(ct.id, ct));

    return Array.from(typeMap.values());
  } catch (err) {
    console.error('Error getting note types from SQLite:', err);
    return getSystemNoteTypes();
  }
}

export function saveNoteTypeToDb(typeData: any) {
  if (!dbInstance) return;
  const fieldsJson = JSON.stringify(typeData.fields || []);
  dbInstance.run(
    `INSERT OR REPLACE INTO note_types (id, name, isSystem, icon, color, fields, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      typeData.id,
      typeData.name,
      typeData.isSystem ? 1 : 0,
      typeData.icon || 'FileText',
      typeData.color || 'bg-indigo-500',
      fieldsJson,
      typeData.createdAt || new Date().toISOString(),
    ]
  );
  markLocalDataModified();
  saveDbToDisk();
}

export function deleteNoteTypeFromDb(id: string) {
  if (!dbInstance) return;
  if (id === 'note' || id === 'timelog') return; // Cannot delete built-in system types
  dbInstance.run('DELETE FROM note_types WHERE id = ? AND isSystem = 0', [id]);
  markLocalDataModified();
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

      let contactsList: any[] = [];
      try {
        contactsList = row.contacts ? JSON.parse(String(row.contacts)) : [];
      } catch {
        contactsList = [];
      }

      let linkedEmails: any[] = [];
      try {
        linkedEmails = row.linkedEmails ? JSON.parse(String(row.linkedEmails)) : [];
      } catch {
        linkedEmails = [];
      }

      let linkedEvents: any[] = [];
      try {
        linkedEvents = row.linkedEvents ? JSON.parse(String(row.linkedEvents)) : [];
      } catch {
        linkedEvents = [];
      }

      let linkedDriveFiles: any[] = [];
      try {
        linkedDriveFiles = row.linkedDriveFiles ? JSON.parse(String(row.linkedDriveFiles)) : [];
      } catch {
        linkedDriveFiles = [];
      }

      let linkedTasks: any[] = [];
      try {
        linkedTasks = row.linkedTasks ? JSON.parse(String(row.linkedTasks)) : [];
      } catch {
        linkedTasks = [];
      }

      let customFields: Record<string, any> = {};
      try {
        customFields = row.customFields ? JSON.parse(String(row.customFields)) : {};
      } catch {
        customFields = {};
      }

      const locId = row.locationId ? String(row.locationId) : null;
      const locationObj = locId ? locMap.get(locId) || null : null;

      notes.push({
        id: String(row.id),
        title: String(row.title),
        content: String(row.content || ''),
        noteType: row.noteType ? String(row.noteType) : 'note',
        startTime: row.startTime ? String(row.startTime) : undefined,
        endTime: row.endTime ? String(row.endTime) : undefined,
        durationMinutes: row.durationMinutes !== null && row.durationMinutes !== undefined ? Number(row.durationMinutes) : undefined,
        customFields,
        contactResourceName: row.contactResourceName ? String(row.contactResourceName) : '',
        contactDisplayName: row.contactDisplayName ? String(row.contactDisplayName) : '',
        contacts: contactsList,
        linkedEmails,
        linkedEvents,
        linkedDriveFiles,
        linkedTasks,
        tags,
        location: locationObj,
        date: String(row.date),
        createdAt: String(row.createdAt),
        updatedAt: String(row.updatedAt),
        pinned: Number(row.pinned) === 1,
        projectId: row.projectId ? String(row.projectId) : undefined,
        cardId: row.cardId ? String(row.cardId) : undefined,
        cardTitle: row.cardTitle ? String(row.cardTitle) : undefined,
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
  const contactsJson = JSON.stringify(note.contacts || []);
  const linkedEmailsJson = JSON.stringify(note.linkedEmails || []);
  const linkedEventsJson = JSON.stringify(note.linkedEvents || []);
  const linkedDriveFilesJson = JSON.stringify(note.linkedDriveFiles || []);
  const linkedTasksJson = JSON.stringify(note.linkedTasks || []);
  const customFieldsJson = JSON.stringify(note.customFields || {});

  dbInstance.run(
    `INSERT OR REPLACE INTO notes 
     (id, title, content, noteType, startTime, endTime, durationMinutes, customFields, contactResourceName, contactDisplayName, contacts, linkedEmails, linkedEvents, linkedDriveFiles, linkedTasks, tags, locationId, date, createdAt, updatedAt, pinned, projectId, cardId, cardTitle)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      note.id,
      note.title,
      note.content || '',
      note.noteType || 'note',
      note.startTime || null,
      note.endTime || null,
      note.durationMinutes !== undefined && note.durationMinutes !== null ? Number(note.durationMinutes) : null,
      customFieldsJson,
      note.contactResourceName || '',
      note.contactDisplayName || '',
      contactsJson,
      linkedEmailsJson,
      linkedEventsJson,
      linkedDriveFilesJson,
      linkedTasksJson,
      tagsJson,
      locationId,
      note.date,
      note.createdAt || new Date().toISOString(),
      note.updatedAt || new Date().toISOString(),
      note.pinned ? 1 : 0,
      note.projectId || null,
      note.cardId || null,
      note.cardTitle || null,
    ]
  );

  // If noteType is timelog or durationMinutes is provided, sync to timelogs table as well
  if (note.noteType === 'timelog' || (note.durationMinutes && Number(note.durationMinutes) > 0)) {
    dbInstance.run(
      `INSERT OR REPLACE INTO timelogs
       (id, cardId, cardTitle, projectId, projectName, linkType, linkId, linkTitle, eventId, eventSummary, startTime, endTime, durationMinutes, description, tags, locationId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        note.id,
        note.cardId || null,
        note.cardTitle || note.title || '',
        note.projectId || null,
        note.projectName || null,
        null,
        null,
        null,
        null,
        null,
        note.startTime || note.date || '',
        note.endTime || '',
        Number(note.durationMinutes) || 0,
        note.content || '',
        tagsJson,
        locationId,
        note.createdAt || new Date().toISOString(),
      ]
    );
  }

  markLocalDataModified();
  saveDbToDisk();
}

// PROJECTS DATABASE HELPERS
export function getAllProjectsFromDb() {
  if (!dbInstance) return [];
  try {
    const stmt = dbInstance.prepare('SELECT * FROM projects ORDER BY updatedAt DESC');
    const projects = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      let columns = [];
      try { columns = row.columns ? JSON.parse(String(row.columns)) : []; } catch { columns = []; }
      
      let linkedEmailIds = [];
      try { linkedEmailIds = row.linkedEmailIds ? JSON.parse(String(row.linkedEmailIds)) : []; } catch { linkedEmailIds = []; }

      let linkedEventIds = [];
      try { linkedEventIds = row.linkedEventIds ? JSON.parse(String(row.linkedEventIds)) : []; } catch { linkedEventIds = []; }

      let linkedDriveFileIds = [];
      try { linkedDriveFileIds = row.linkedDriveFileIds ? JSON.parse(String(row.linkedDriveFileIds)) : []; } catch { linkedDriveFileIds = []; }

      let linkedContactResourceNames = [];
      try { linkedContactResourceNames = row.linkedContactResourceNames ? JSON.parse(String(row.linkedContactResourceNames)) : []; } catch { linkedContactResourceNames = []; }

      let linkedTaskIds = [];
      try { linkedTaskIds = row.linkedTaskIds ? JSON.parse(String(row.linkedTaskIds)) : []; } catch { linkedTaskIds = []; }

      projects.push({
        id: String(row.id),
        name: String(row.name),
        description: String(row.description || ''),
        color: String(row.color || 'indigo'),
        columns,
        linkedEmailIds,
        linkedEventIds,
        linkedDriveFileIds,
        linkedContactResourceNames,
        linkedTaskIds,
        driveFileId: row.driveFileId ? String(row.driveFileId) : undefined,
        driveFileUrl: row.driveFileUrl ? String(row.driveFileUrl) : undefined,
        createdAt: String(row.createdAt),
        updatedAt: String(row.updatedAt),
      });
    }
    stmt.free();
    return projects;
  } catch (err) {
    console.error('Error getting projects from SQLite:', err);
    return [];
  }
}

export function saveProjectToDb(project: any) {
  if (!dbInstance) return;

  const colsJson = JSON.stringify(project.columns || []);
  const emailsJson = JSON.stringify(project.linkedEmailIds || []);
  const eventsJson = JSON.stringify(project.linkedEventIds || []);
  const driveJson = JSON.stringify(project.linkedDriveFileIds || []);
  const contactsJson = JSON.stringify(project.linkedContactResourceNames || []);
  const tasksJson = JSON.stringify(project.linkedTaskIds || []);

  dbInstance.run(
    `INSERT OR REPLACE INTO projects 
     (id, name, description, color, columns, linkedEmailIds, linkedEventIds, linkedDriveFileIds, linkedContactResourceNames, linkedTaskIds, driveFileId, driveFileUrl, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      project.id,
      project.name,
      project.description || '',
      project.color || 'indigo',
      colsJson,
      emailsJson,
      eventsJson,
      driveJson,
      contactsJson,
      tasksJson,
      project.driveFileId || null,
      project.driveFileUrl || null,
      project.createdAt || new Date().toISOString(),
      new Date().toISOString(),
    ]
  );

  markLocalDataModified();
  saveDbToDisk();
}

export function deleteProjectFromDb(id: string) {
  if (!dbInstance) return;
  dbInstance.run('DELETE FROM projects WHERE id = ?', [id]);
  dbInstance.run('DELETE FROM project_tasks WHERE projectId = ?', [id]);
  markLocalDataModified();
  saveDbToDisk();
}

// PROJECT TASKS DATABASE HELPERS
export function getAllProjectTasksFromDb(projectId?: string) {
  if (!dbInstance) return [];
  try {
    const query = projectId
      ? 'SELECT * FROM project_tasks WHERE projectId = ? ORDER BY createdAt ASC'
      : 'SELECT * FROM project_tasks ORDER BY createdAt ASC';
    const stmt = dbInstance.prepare(query);
    if (projectId) stmt.bind([projectId]);

    const tasks = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();

      let linkedEmailIds = [];
      try { linkedEmailIds = row.linkedEmailIds ? JSON.parse(String(row.linkedEmailIds)) : []; } catch { linkedEmailIds = []; }

      let linkedEventIds = [];
      try { linkedEventIds = row.linkedEventIds ? JSON.parse(String(row.linkedEventIds)) : []; } catch { linkedEventIds = []; }

      let linkedDriveFileIds = [];
      try { linkedDriveFileIds = row.linkedDriveFileIds ? JSON.parse(String(row.linkedDriveFileIds)) : []; } catch { linkedDriveFileIds = []; }

      let linkedContactResourceNames = [];
      try { linkedContactResourceNames = row.linkedContactResourceNames ? JSON.parse(String(row.linkedContactResourceNames)) : []; } catch { linkedContactResourceNames = []; }

      let linkedTaskIds = [];
      try { linkedTaskIds = row.linkedTaskIds ? JSON.parse(String(row.linkedTaskIds)) : []; } catch { linkedTaskIds = []; }

      tasks.push({
        id: String(row.id),
        projectId: String(row.projectId),
        columnId: String(row.columnId),
        title: String(row.title),
        description: String(row.description || ''),
        priority: (row.priority || 'medium') as 'high' | 'medium' | 'low',
        dueDate: row.dueDate ? String(row.dueDate) : undefined,
        assignee: row.assignee ? String(row.assignee) : undefined,
        createdAt: String(row.createdAt),
        linkedEmailIds,
        linkedEventIds,
        linkedDriveFileIds,
        linkedContactResourceNames,
        linkedTaskIds,
      });
    }
    stmt.free();
    return tasks;
  } catch (err) {
    console.error('Error getting project tasks from SQLite:', err);
    return [];
  }
}

export function saveProjectTaskToDb(task: any) {
  if (!dbInstance) return;

  const emailsJson = JSON.stringify(task.linkedEmailIds || []);
  const eventsJson = JSON.stringify(task.linkedEventIds || []);
  const driveJson = JSON.stringify(task.linkedDriveFileIds || []);
  const contactsJson = JSON.stringify(task.linkedContactResourceNames || []);
  const tasksJson = JSON.stringify(task.linkedTaskIds || []);

  dbInstance.run(
    `INSERT OR REPLACE INTO project_tasks 
     (id, projectId, columnId, title, description, priority, dueDate, assignee, createdAt, linkedEmailIds, linkedEventIds, linkedDriveFileIds, linkedContactResourceNames, linkedTaskIds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      task.projectId,
      task.columnId,
      task.title,
      task.description || '',
      task.priority || 'medium',
      task.dueDate || null,
      task.assignee || null,
      task.createdAt || new Date().toISOString(),
      emailsJson,
      eventsJson,
      driveJson,
      contactsJson,
      tasksJson,
    ]
  );
  saveDbToDisk();
}

export function deleteProjectTaskFromDb(id: string) {
  if (!dbInstance) return;
  dbInstance.run('DELETE FROM project_tasks WHERE id = ?', [id]);
  saveDbToDisk();
}

export function deleteNoteFromDb(id: string) {
  if (!dbInstance) return;
  dbInstance.run('DELETE FROM notes WHERE id = ?', [id]);
  dbInstance.run('DELETE FROM timelogs WHERE id = ?', [id]);
  markLocalDataModified();
  saveDbToDisk();
}

// Helper function to find or create the sync folder in Google Drive
// Prevents duplicate folder creation due to race conditions and cleans up any existing duplicate folders in Drive
let cachedAdminSpaceFolderId: string | null = null;
let cachedAdminSpaceFolderLink: string | null = null;
let cachedAdminSpaceFolderName: string | null = null;
let pendingFolderPromise: Promise<{ folderId: string; folderLink?: string } | null> | null = null;

export function clearAdminSpaceFolderCache() {
  cachedAdminSpaceFolderId = null;
  cachedAdminSpaceFolderLink = null;
  cachedAdminSpaceFolderName = null;
}

export async function getOrCreateAdminSpaceFolder(drive: any): Promise<{ folderId: string; folderLink?: string } | null> {
  const targetFolderName = (getSettingFromDb('driveFolderName') || 'adminspace').trim() || 'adminspace';

  if (cachedAdminSpaceFolderName !== targetFolderName) {
    cachedAdminSpaceFolderId = null;
    cachedAdminSpaceFolderLink = null;
    cachedAdminSpaceFolderName = targetFolderName;
  }

  if (cachedAdminSpaceFolderId) {
    return { folderId: cachedAdminSpaceFolderId, folderLink: cachedAdminSpaceFolderLink || undefined };
  }

  if (pendingFolderPromise) {
    return pendingFolderPromise;
  }

  pendingFolderPromise = (async () => {
    try {
      // Search for all non-trashed target folders in Google Drive
      const searchRes = await drive.files.list({
        q: `mimeType = 'application/vnd.google-apps.folder' and name = '${targetFolderName.replace(/'/g, "\\'")}' and trashed = false`,
        fields: 'files(id, name, webViewLink, createdTime)',
        orderBy: 'createdTime desc',
      });

      const files = searchRes.data.files || [];

      if (files.length > 0) {
        const primaryFolder = files[0];
        cachedAdminSpaceFolderId = primaryFolder.id!;
        cachedAdminSpaceFolderLink = primaryFolder.webViewLink || null;
        cachedAdminSpaceFolderName = targetFolderName;

        // Clean up any duplicate folders with the same name in Google Drive
        if (files.length > 1) {
          console.warn(`[Drive Sync] Found ${files.length} '${targetFolderName}' folders in Google Drive. Keeping primary (${primaryFolder.id}) and trashing duplicates...`);
          for (let i = 1; i < files.length; i++) {
            const dup = files[i];
            if (dup.id) {
              try {
                await drive.files.update({
                  fileId: dup.id,
                  requestBody: { trashed: true },
                });
                console.log(`[Drive Sync] Moved duplicate '${targetFolderName}' folder (${dup.id}) to trash.`);
              } catch (e) {
                console.error(`[Drive Sync] Could not trash duplicate folder ${dup.id}:`, e);
              }
            }
          }
        }

        return { folderId: primaryFolder.id!, folderLink: primaryFolder.webViewLink || undefined };
      }

      // If no folder exists, create one
      const createFolderRes = await drive.files.create({
        requestBody: {
          name: targetFolderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id, webViewLink',
      });

      const folderId = createFolderRes.data.id;
      const folderLink = createFolderRes.data.webViewLink;

      if (folderId) {
        cachedAdminSpaceFolderId = folderId;
        cachedAdminSpaceFolderLink = folderLink || null;
        cachedAdminSpaceFolderName = targetFolderName;
        return { folderId, folderLink: folderLink || undefined };
      }

      return null;
    } catch (err) {
      console.error(`Error getting or creating ${targetFolderName} folder in Google Drive:`, err);
      return null;
    } finally {
      pendingFolderPromise = null;
    }
  })();

  return pendingFolderPromise;
}

// Helper to sync local subfolder Markdown files to Google Drive subfolder
async function syncSubfolderMarkdownFiles(drive: any, parentFolderId: string, subfolderName: string, localDir: string) {
  if (!fs.existsSync(localDir)) return;

  const folderSearch = await drive.files.list({
    q: `'${parentFolderId}' in parents and name = '${subfolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  });
  const folders = folderSearch.data.files || [];
  let subfolderId = folders[0]?.id;

  if (folders.length > 1) {
    for (let i = 1; i < folders.length; i++) {
      if (folders[i].id) {
        try { await drive.files.update({ fileId: folders[i].id, requestBody: { trashed: true } }); } catch {}
      }
    }
  }

  if (!subfolderId) {
    const createRes = await drive.files.create({
      requestBody: {
        name: subfolderName,
        parents: [parentFolderId],
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });
    subfolderId = createRes.data.id || undefined;
  }

  if (!subfolderId) return;

  const existingRes = await drive.files.list({
    q: `'${subfolderId}' in parents and trashed = false`,
    fields: 'files(id, name)',
  });

  const filesByName = new Map<string, string[]>();
  (existingRes.data.files || []).forEach((f: any) => {
    if (f.name && f.id) {
      if (!filesByName.has(f.name)) filesByName.set(f.name, []);
      filesByName.get(f.name)!.push(f.id);
    }
  });

  const driveFilesMap = new Map<string, string>();
  for (const [fileName, fileIds] of filesByName.entries()) {
    if (fileIds.length > 1) {
      for (let i = 1; i < fileIds.length; i++) {
        try { await drive.files.update({ fileId: fileIds[i], requestBody: { trashed: true } }); } catch {}
      }
    }
    driveFilesMap.set(fileName, fileIds[0]);
  }

  const localFiles = fs.readdirSync(localDir);
  const localFileSet = new Set(localFiles);

  for (const fileName of localFiles) {
    if (!fileName.endsWith('.md')) continue;
    const filePath = path.join(localDir, fileName);
    const existingDriveFileId = driveFilesMap.get(fileName);

    if (existingDriveFileId) {
      await drive.files.update({
        fileId: existingDriveFileId,
        media: {
          mimeType: 'text/markdown',
          body: fs.createReadStream(filePath),
        },
      });
    } else {
      await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [subfolderId],
          mimeType: 'text/markdown',
        },
        media: {
          mimeType: 'text/markdown',
          body: fs.createReadStream(filePath),
        },
      });
    }
  }

  for (const [driveFileName, driveFileId] of driveFilesMap.entries()) {
    if (!localFileSet.has(driveFileName) && driveFileName.endsWith('.md')) {
      try { await drive.files.update({ fileId: driveFileId, requestBody: { trashed: true } }); } catch {}
    }
  }
}

// Helper to restore subfolder Markdown files from Google Drive
async function restoreSubfolderMarkdownFiles(drive: any, parentFolderId: string, subfolderName: string, localDir: string) {
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  const folderSearch = await drive.files.list({
    q: `'${parentFolderId}' in parents and name = '${subfolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  });
  const subfolderId = folderSearch.data.files?.[0]?.id;
  if (!subfolderId) return;

  const driveFilesRes = await drive.files.list({
    q: `'${subfolderId}' in parents and trashed = false`,
    fields: 'files(id, name)',
  });

  for (const f of driveFilesRes.data.files || []) {
    if (f.id && f.name && f.name.endsWith('.md')) {
      try {
        const fileRes = await drive.files.get(
          { fileId: f.id, alt: 'media' },
          { responseType: 'text' }
        );
        fs.writeFileSync(path.join(localDir, f.name), String(fileRes.data));
      } catch (err) {
        console.error(`Error downloading ${subfolderName}/${f.name} from Drive:`, err);
      }
    }
  }
}

let pendingSyncPromise: Promise<any> | null = null;

// Ensure Google Drive folder 'adminspace' exists and sync SQLite/JSON/MD data into it
export async function syncWithGoogleDriveAdminSpace(authClient: any) {
  if (!authClient) return null;
  if (pendingSyncPromise) {
    return pendingSyncPromise;
  }

  pendingSyncPromise = (async () => {
    try {
      saveDbToDisk();
      const drive = google.drive({ version: 'v3', auth: authClient });

      // 1. Get or create single 'adminspace' folder (with duplicate cleanup)
      const folderInfo = await getOrCreateAdminSpaceFolder(drive);
      if (!folderInfo?.folderId) return null;
      const { folderId, folderLink } = folderInfo;

      // 2. Sync adminspace.sqlite binary file into Drive
      if (fs.existsSync(SQLITE_FILE)) {
        const sqliteSearch = await drive.files.list({
          q: `'${folderId}' in parents and name = 'adminspace.sqlite' and trashed = false`,
          fields: 'files(id, name)',
        });
        const sqliteFiles = sqliteSearch.data.files || [];
        const sqliteFileId = sqliteFiles[0]?.id;

        if (sqliteFiles.length > 1) {
          console.warn(`[Drive Sync] Cleaning up ${sqliteFiles.length - 1} duplicate 'adminspace.sqlite' files...`);
          for (let i = 1; i < sqliteFiles.length; i++) {
            if (sqliteFiles[i].id) {
              try { await drive.files.update({ fileId: sqliteFiles[i].id, requestBody: { trashed: true } }); } catch {}
            }
          }
        }

        if (sqliteFileId) {
          await drive.files.update({
            fileId: sqliteFileId,
            media: {
              mimeType: 'application/x-sqlite3',
              body: fs.createReadStream(SQLITE_FILE),
            },
          });
        } else {
          await drive.files.create({
            requestBody: {
              name: 'adminspace.sqlite',
              parents: [folderId],
              mimeType: 'application/x-sqlite3',
            },
            media: {
              mimeType: 'application/x-sqlite3',
              body: fs.createReadStream(SQLITE_FILE),
            },
          });
        }
      }

      // 3. Sync data.json dump file into Drive
      if (fs.existsSync(DATA_JSON_FILE)) {
        const jsonSearch = await drive.files.list({
          q: `'${folderId}' in parents and name = 'data.json' and trashed = false`,
          fields: 'files(id, name)',
        });
        const jsonFiles = jsonSearch.data.files || [];
        const jsonFileId = jsonFiles[0]?.id;

        if (jsonFiles.length > 1) {
          console.warn(`[Drive Sync] Cleaning up ${jsonFiles.length - 1} duplicate 'data.json' files...`);
          for (let i = 1; i < jsonFiles.length; i++) {
            if (jsonFiles[i].id) {
              try { await drive.files.update({ fileId: jsonFiles[i].id, requestBody: { trashed: true } }); } catch {}
            }
          }
        }

        if (jsonFileId) {
          await drive.files.update({
            fileId: jsonFileId,
            media: {
              mimeType: 'application/json',
              body: fs.createReadStream(DATA_JSON_FILE),
            },
          });
        } else {
          await drive.files.create({
            requestBody: {
              name: 'data.json',
              parents: [folderId],
              mimeType: 'application/json',
            },
            media: {
              mimeType: 'application/json',
              body: fs.createReadStream(DATA_JSON_FILE),
            },
          });
        }
      }

      // 4. Sync adminspace_notes.md Markdown file into Drive
      const NOTES_MD_FILE = path.join(ADMINSPACE_DIR, 'adminspace_notes.md');
      if (fs.existsSync(NOTES_MD_FILE)) {
        const mdSearch = await drive.files.list({
          q: `'${folderId}' in parents and name = 'adminspace_notes.md' and trashed = false`,
          fields: 'files(id, name)',
        });
        const mdFiles = mdSearch.data.files || [];
        const mdFileId = mdFiles[0]?.id;

        if (mdFiles.length > 1) {
          console.warn(`[Drive Sync] Cleaning up ${mdFiles.length - 1} duplicate 'adminspace_notes.md' files...`);
          for (let i = 1; i < mdFiles.length; i++) {
            if (mdFiles[i].id) {
              try { await drive.files.update({ fileId: mdFiles[i].id, requestBody: { trashed: true } }); } catch {}
            }
          }
        }

        if (mdFileId) {
          await drive.files.update({
            fileId: mdFileId,
            media: {
              mimeType: 'text/markdown',
              body: fs.createReadStream(NOTES_MD_FILE),
            },
          });
        } else {
          await drive.files.create({
            requestBody: {
              name: 'adminspace_notes.md',
              parents: [folderId],
              mimeType: 'text/markdown',
            },
            media: {
              mimeType: 'text/markdown',
              body: fs.createReadStream(NOTES_MD_FILE),
            },
          });
        }
      }

      // 5. Sync individual Note Markdown files in notes/ subfolder into Drive
      await syncSubfolderMarkdownFiles(drive, folderId, 'notes', path.join(ADMINSPACE_DIR, 'notes'));

      // 6. Sync individual Kanban card Markdown files in cards/ subfolder into Drive
      await syncSubfolderMarkdownFiles(drive, folderId, 'cards', path.join(ADMINSPACE_DIR, 'cards'));

      lastDriveSyncTimestamp = Date.now();
      return {
        folderId,
        folderLink,
        syncedAt: new Date().toISOString(),
        storagePath: SQLITE_FILE,
      };
    } catch (err) {
      console.error('Google Drive adminspace sync error:', err);
      return null;
    } finally {
      pendingSyncPromise = null;
    }
  })();

  return pendingSyncPromise;
}

// Smart sync function: automatically compares local vs Drive timestamps and either restores or syncs
let lastDriveCheckTime = 0;
let pendingSmartSyncPromise: Promise<any> | null = null;

export async function getSyncStatus(authClient: any) {
  if (!authClient) {
    return { authenticated: false, needsSync: false, reason: 'Oturum açılmadı' };
  }

  try {
    const drive = google.drive({ version: 'v3', auth: authClient });
    const folderInfo = await getOrCreateAdminSpaceFolder(drive);
    if (!folderInfo?.folderId) {
      return { authenticated: true, needsSync: true, reason: 'Google Drive klasörü henüz oluşturulmadı' };
    }

    const sqliteSearch = await drive.files.list({
      q: `'${folderInfo.folderId}' in parents and name = 'adminspace.sqlite' and trashed = false`,
      fields: 'files(id, name, modifiedTime)',
    });
    const sqliteFiles = sqliteSearch.data.files || [];
    const sqliteFile = sqliteFiles[0];

    let needsSync = false;
    let reason = 'Veriler senkronize';

    if (!sqliteFile) {
      needsSync = true;
      reason = 'Google Drive üzerinde henüz veritabanı yedeği yok';
    } else {
      const driveModifiedMs = new Date(sqliteFile.modifiedTime || 0).getTime();
      if (driveModifiedMs > lastDriveSyncTimestamp + 2000) {
        needsSync = true;
        reason = 'Google Drive üzerinde daha yeni veriler mevcut';
      } else if (lastLocalWriteTimestamp > lastDriveSyncTimestamp + 2000) {
        needsSync = true;
        reason = 'Yerel veriler henüz Google Drive ile eşitlenmedi';
      }
    }

    return {
      authenticated: true,
      needsSync,
      reason,
      lastLocalWriteTimestamp,
      lastDriveSyncTimestamp,
      driveModifiedTime: sqliteFile?.modifiedTime || null,
    };
  } catch (err: any) {
    console.error('Error in getSyncStatus:', err);
    return { authenticated: true, needsSync: false, reason: err?.message || 'Hata' };
  }
}

export async function performManualSync(authClient: any) {
  if (!authClient) return { success: false, error: 'Google OAuth oturumu gerekli' };

  try {
    saveDbToDisk();
    const drive = google.drive({ version: 'v3', auth: authClient });
    const folderInfo = await getOrCreateAdminSpaceFolder(drive);
    if (!folderInfo?.folderId) {
      return { success: false, error: 'Google Drive klasörü oluşturulamadı' };
    }

    const sqliteSearch = await drive.files.list({
      q: `'${folderInfo.folderId}' in parents and name = 'adminspace.sqlite' and trashed = false`,
      fields: 'files(id, name, modifiedTime)',
    });
    const sqliteFiles = sqliteSearch.data.files || [];
    const sqliteFile = sqliteFiles[0];

    if (sqliteFile?.modifiedTime) {
      const driveModifiedMs = new Date(sqliteFile.modifiedTime).getTime();
      // If Drive file is newer than local write timestamp by more than 2 seconds, restore from Drive
      if (driveModifiedMs > lastLocalWriteTimestamp + 2000) {
        console.log(`[Manual Sync] Google Drive is NEWER (${sqliteFile.modifiedTime} vs local write ${new Date(lastLocalWriteTimestamp).toISOString()}). Restoring from Drive...`);
        const restoreRes = await restoreFromGoogleDriveAdminSpace(authClient);
        return {
          success: true,
          action: 'downloaded',
          message: 'Google Drive’daki güncel veriler yerele indirildi ve yüklendi.',
          details: restoreRes,
        };
      }
    }

    // Otherwise upload local DB to Google Drive
    console.log('[Manual Sync] Local DB is newer or Drive has no DB. Uploading local DB to Drive...');
    const syncRes = await syncWithGoogleDriveAdminSpace(authClient);
    return {
      success: true,
      action: 'uploaded',
      message: 'Yerel verileriniz Google Drive’daki adminspace klasörüne kaydedildi.',
      details: syncRes,
    };
  } catch (err: any) {
    console.error('Manual sync error:', err);
    return { success: false, error: err?.message || 'Eşitleme sırasında bir hata oluştu.' };
  }
}

export async function smartSyncWithDrive(authClient: any) {
  if (!authClient) return null;

  const now = Date.now();
  if (now - lastDriveCheckTime < 2500 && lastLocalWriteTimestamp <= lastDriveSyncTimestamp) {
    return null;
  }

  if (pendingSmartSyncPromise) {
    return pendingSmartSyncPromise;
  }

  pendingSmartSyncPromise = (async () => {
    try {
      lastDriveCheckTime = Date.now();
      const drive = google.drive({ version: 'v3', auth: authClient });
      const folderInfo = await getOrCreateAdminSpaceFolder(drive);
      if (!folderInfo?.folderId) return null;
      const folderId = folderInfo.folderId;

      const sqliteSearch = await drive.files.list({
        q: `'${folderId}' in parents and name = 'adminspace.sqlite' and trashed = false`,
        fields: 'files(id, name, modifiedTime)',
      });
      const sqliteFiles = sqliteSearch.data.files || [];
      const sqliteFile = sqliteFiles[0];

      if (sqliteFile?.modifiedTime) {
        const driveModifiedMs = new Date(sqliteFile.modifiedTime).getTime();

        if (driveModifiedMs > lastLocalWriteTimestamp + 2000) {
          console.log(`[Smart Sync] Drive is NEWER (${sqliteFile.modifiedTime} vs local write ${new Date(lastLocalWriteTimestamp).toISOString()}). Restoring from Drive...`);
          const res = await restoreFromGoogleDriveAdminSpace(authClient);
          return res;
        }
      }

      if (lastLocalWriteTimestamp > lastDriveSyncTimestamp || !sqliteFile) {
        console.log('[Smart Sync] Local database has updates. Syncing to Google Drive...');
        const res = await syncWithGoogleDriveAdminSpace(authClient);
        return res;
      }

      return null;
    } catch (err) {
      console.error('[Smart Sync Error]:', err);
      return null;
    } finally {
      pendingSmartSyncPromise = null;
    }
  })();

  return pendingSmartSyncPromise;
}

// Restore SQLite DB / data.json / cards from Google Drive 'adminspace' folder into local SQLite engine
export async function restoreFromGoogleDriveAdminSpace(authClient: any) {
  if (!authClient) return null;

  try {
    const drive = google.drive({ version: 'v3', auth: authClient });

    // 1. Get or create single 'adminspace' folder (with duplicate cleanup)
    const folderInfo = await getOrCreateAdminSpaceFolder(drive);
    if (!folderInfo?.folderId) {
      console.log('No adminspace folder found in Google Drive to restore from.');
      return { restored: false, reason: 'No adminspace folder in Drive' };
    }
    const folderId = folderInfo.folderId;

    // 2. Search for adminspace.sqlite or data.json inside 'adminspace' folder
    const sqliteSearch = await drive.files.list({
      q: `'${folderId}' in parents and name = 'adminspace.sqlite' and trashed = false`,
      fields: 'files(id, name, modifiedTime)',
    });
    const sqliteFile = sqliteSearch.data.files?.[0];

    const jsonSearch = await drive.files.list({
      q: `'${folderId}' in parents and name = 'data.json' and trashed = false`,
      fields: 'files(id, name, modifiedTime)',
    });
    const jsonFile = jsonSearch.data.files?.[0];

    const SQL = await initSqlJs();
    let isRestored = false;

    if (sqliteFile?.id) {
      console.log('Restoring adminspace.sqlite from Google Drive...');
      try {
        const fileRes = await drive.files.get(
          { fileId: sqliteFile.id, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        const buffer = Buffer.from(fileRes.data as ArrayBuffer);
        if (buffer.length < 100) {
          throw new Error('Downloaded SQLite file is truncated or invalid');
        }
        const tempDb = new SQL.Database(buffer);
        ensureTablesExist(tempDb);
        tempDb.exec("SELECT COUNT(*) FROM sqlite_master");
        dbInstance = tempDb;
        const tmpSqliteFile = `${SQLITE_FILE}.tmp`;
        fs.writeFileSync(tmpSqliteFile, buffer);
        fs.renameSync(tmpSqliteFile, SQLITE_FILE);
        saveDbToDisk();
        isRestored = true;
      } catch (err) {
        console.error('Failed to restore SQLite file from Google Drive (corrupted file):', err);
        if (!dbInstance) {
          dbInstance = new SQL.Database();
          ensureTablesExist(dbInstance);
          saveDbToDisk();
        }
      }
    } else if (jsonFile?.id) {
      console.log('Restoring data.json from Google Drive...');
      const fileRes = await drive.files.get(
        { fileId: jsonFile.id, alt: 'media' },
        { responseType: 'text' }
      );
      const jsonStr = String(fileRes.data);
      fs.writeFileSync(DATA_JSON_FILE, jsonStr);

      const parsed = JSON.parse(jsonStr);
      dbInstance = new SQL.Database();
      ensureTablesExist(dbInstance);

      if (parsed.locations && Array.isArray(parsed.locations)) {
        parsed.locations.forEach((l: any) => saveLocationToDb(l));
      }
      if (parsed.notes && Array.isArray(parsed.notes)) {
        parsed.notes.forEach((n: any) => saveNoteToDb(n));
      }
      if (parsed.projects && Array.isArray(parsed.projects)) {
        parsed.projects.forEach((p: any) => saveProjectToDb(p));
      }
      if (parsed.projectTasks && Array.isArray(parsed.projectTasks)) {
        parsed.projectTasks.forEach((t: any) => saveProjectTaskToDb(t));
      }
      if (parsed.timelogs && Array.isArray(parsed.timelogs)) {
        parsed.timelogs.forEach((t: any) => saveTimelogToDb(t));
      }

      saveDbToDisk();
      isRestored = true;
    }

    // 3. Restore notes and cards markdown subfolders from Drive
    await restoreSubfolderMarkdownFiles(drive, folderId, 'notes', path.join(ADMINSPACE_DIR, 'notes'));
    await restoreSubfolderMarkdownFiles(drive, folderId, 'cards', path.join(ADMINSPACE_DIR, 'cards'));

    lastDriveSyncTimestamp = Date.now();
    if (sqliteFile?.modifiedTime) {
      lastLocalWriteTimestamp = new Date(sqliteFile.modifiedTime).getTime();
    } else {
      lastLocalWriteTimestamp = Date.now();
    }

    return { restored: isRestored, modifiedTime: sqliteFile?.modifiedTime || jsonFile?.modifiedTime };
  } catch (err: any) {
    console.error('Error restoring from Google Drive:', err);
    return { restored: false, error: err?.message || String(err) };
  }
}

// Generate Markdown file for project and sync to Google Drive
export async function exportProjectToMarkdownAndDrive(
  projectId: string,
  authClient: any,
  extraData?: {
    notes?: any[];
    emails?: any[];
    events?: any[];
    driveFiles?: any[];
    contacts?: any[];
  }
) {
  const projects = getAllProjectsFromDb();
  const project = projects.find((p: any) => p.id === projectId);
  if (!project) throw new Error('Project not found');

  const tasks = getAllProjectTasksFromDb(projectId);
  const allNotes = extraData?.notes || getAllNotesFromDb();
  const linkedNotes = allNotes.filter((n: any) => n.projectId === projectId || (project.linkedNoteIds && project.linkedNoteIds.includes(n.id)));

  // Build Markdown text
  let md = `# Proje: ${project.name}\n\n`;
  if (project.description) {
    md += `> **Açıklama:** ${project.description}\n\n`;
  }
  md += `- **Oluşturulma Tarihi:** ${new Date(project.createdAt).toLocaleString('tr-TR')}\n`;
  md += `- **Son Güncelleme:** ${new Date().toLocaleString('tr-TR')}\n\n`;
  md += `---\n\n`;

  // 1. Kanban Board Tasks
  md += `## 📋 Kanban Pano Görevleri\n\n`;
  const cols = project.columns || [];
  if (cols.length === 0) {
    md += `*Henüz sütun tanımlanmamış.*\n\n`;
  } else {
    for (const col of cols) {
      const colTasks = tasks.filter((t: any) => t.columnId === col.id);
      md += `### 📌 ${col.title} (${colTasks.length})\n`;
      if (colTasks.length === 0) {
        md += `*Bu sütunda görev bulunmuyor.*\n\n`;
      } else {
        colTasks.forEach((t: any) => {
          const priorityBadge = t.priority ? ` [Öncelik: ${t.priority.toUpperCase()}]` : '';
          const dueBadge = t.dueDate ? ` (Son Tarih: ${t.dueDate})` : '';
          const assigneeBadge = t.assignee ? ` - Atanan: ${t.assignee}` : '';
          md += `- [ ] **${t.title}**${priorityBadge}${dueBadge}${assigneeBadge}\n`;
          if (t.description) {
            md += `  > ${t.description.replace(/\n/g, '\n  > ')}\n`;
          }
        });
        md += `\n`;
      }
    }
  }

  md += `---\n\n`;

  // 2. Linked Notes
  md += `## 📝 Bağlı Notlar (${linkedNotes.length})\n\n`;
  if (linkedNotes.length === 0) {
    md += `*Bu projeye bağlı not bulunmuyor.*\n\n`;
  } else {
    linkedNotes.forEach((note: any) => {
      md += `### 📄 ${note.title} (Tarih: ${note.date || 'Belirtilmedi'})\n`;
      if (note.content) {
        md += `${note.content}\n\n`;
      }
    });
  }

  md += `---\n\n`;

  // 3. Linked Emails
  const linkedEmails = extraData?.emails || [];
  md += `## ✉️ Bağlı E-postalar (${linkedEmails.length})\n\n`;
  if (linkedEmails.length === 0) {
    md += `*Bu projeye bağlı e-posta bulunmuyor.*\n\n`;
  } else {
    linkedEmails.forEach((email: any) => {
      md += `- **${email.subject}** | Gönderen: \`${email.sender}\` (${email.date || ''})\n`;
      if (email.snippet) md += `  > ${email.snippet}\n`;
    });
    md += `\n`;
  }

  md += `---\n\n`;

  // 4. Linked Calendar Events
  const linkedEvents = extraData?.events || [];
  md += `## 📅 Bağlı Takvim Etkinlikleri (${linkedEvents.length})\n\n`;
  if (linkedEvents.length === 0) {
    md += `*Bu projeye bağlı takvim etkinliği bulunmuyor.*\n\n`;
  } else {
    linkedEvents.forEach((evt: any) => {
      md += `- **${evt.summary}** | Tarih: \`${evt.start ? new Date(evt.start).toLocaleString('tr-TR') : 'Belirtilmedi'}\``;
      if (evt.location) md += ` | Konum: ${evt.location}`;
      md += `\n`;
      if (evt.description) md += `  > ${evt.description}\n`;
    });
    md += `\n`;
  }

  md += `---\n\n`;

  // 5. Linked Drive Files
  const linkedDriveFiles = extraData?.driveFiles || [];
  md += `## 📁 Bağlı Drive Dosyaları (${linkedDriveFiles.length})\n\n`;
  if (linkedDriveFiles.length === 0) {
    md += `*Bu projeye bağlı Drive dosyası bulunmuyor.*\n\n`;
  } else {
    linkedDriveFiles.forEach((file: any) => {
      md += `- [${file.name}](${file.webViewLink || '#'}) (${file.mimeType || 'Dosya'})\n`;
    });
    md += `\n`;
  }

  md += `---\n\n`;

  // 6. Linked Contacts
  const linkedContacts = extraData?.contacts || [];
  md += `## 👤 Bağlı Kişiler (${linkedContacts.length})\n\n`;
  if (linkedContacts.length === 0) {
    md += `*Bu projeye bağlı kişi bulunmuyor.*\n\n`;
  } else {
    linkedContacts.forEach((contact: any) => {
      md += `- **${contact.displayName}** (${contact.email || 'E-posta yok'}, ${contact.phone || 'Tel yok'})${contact.organization ? ` - ${contact.organization}` : ''}\n`;
    });
    md += `\n`;
  }

  // Save local Markdown file in ./adminspace/projects/{ProjectName}.md
  const projectsDir = path.join(ADMINSPACE_DIR, 'projects');
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }

  const safeFileName = `${project.name.replace(/[/\\?%*:|"<>]/g, '_')}.md`;
  const localMdPath = path.join(projectsDir, safeFileName);
  fs.writeFileSync(localMdPath, md, 'utf-8');

  let driveFileId = project.driveFileId;
  let driveFileUrl = project.driveFileUrl;

  // Sync with Google Drive 'adminspace' folder if Google Auth client is provided
  if (authClient) {
    try {
      const drive = google.drive({ version: 'v3', auth: authClient });

      // Get or create single 'adminspace' folder
      const folderInfo = await getOrCreateAdminSpaceFolder(drive);
      const folderId = folderInfo?.folderId;

      if (folderId) {
        // Check if markdown file already exists in 'adminspace' folder
        const mdSearch = await drive.files.list({
          q: `'${folderId}' in parents and name = '${safeFileName}' and trashed = false`,
          fields: 'files(id, webViewLink)',
        });

        const existingFile = mdSearch.data.files?.[0];

        if (existingFile?.id) {
          driveFileId = existingFile.id;
          driveFileUrl = existingFile.webViewLink || undefined;
          await drive.files.update({
            fileId: existingFile.id,
            media: { mimeType: 'text/markdown', body: md },
          });
        } else {
          const createdFile = await drive.files.create({
            requestBody: {
              name: safeFileName,
              parents: [folderId],
              mimeType: 'text/markdown',
            },
            media: { mimeType: 'text/markdown', body: md },
            fields: 'id, webViewLink',
          });
          driveFileId = createdFile.data.id || undefined;
          driveFileUrl = createdFile.data.webViewLink || undefined;
        }

        // Save updated drive file info into project in SQLite DB
        project.driveFileId = driveFileId;
        project.driveFileUrl = driveFileUrl;
        saveProjectToDb(project);
      }
    } catch (err) {
      console.error('Google Drive markdown sync error for project:', err);
    }
  }

  return {
    success: true,
    localMdPath,
    markdownContent: md,
    driveFileId,
    driveFileUrl,
  };
}

// ================= TIMELOGS DB OPERATIONS =================

export function getAllTimelogsFromDb(): any[] {
  if (!dbInstance) return [];
  try {
    const locations = getAllLocationsFromDb();
    const locMap = new Map(locations.map((l) => [l.id, l]));

    const stmt = dbInstance.prepare('SELECT * FROM timelogs ORDER BY startTime DESC');
    const logs: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      let tags: string[] = [];
      try {
        tags = JSON.parse(String(row.tags || '[]'));
      } catch {}

      const locId = row.locationId ? String(row.locationId) : null;
      const locationObj = locId ? locMap.get(locId) || null : null;

      logs.push({
        id: String(row.id),
        cardId: row.cardId ? String(row.cardId) : undefined,
        cardTitle: String(row.cardTitle || ''),
        projectId: row.projectId ? String(row.projectId) : undefined,
        projectName: row.projectName ? String(row.projectName) : undefined,
        linkType: row.linkType ? String(row.linkType) : undefined,
        linkId: row.linkId ? String(row.linkId) : undefined,
        linkTitle: row.linkTitle ? String(row.linkTitle) : undefined,
        eventId: row.eventId ? String(row.eventId) : undefined,
        eventSummary: row.eventSummary ? String(row.eventSummary) : undefined,
        startTime: String(row.startTime || ''),
        endTime: String(row.endTime || ''),
        durationMinutes: Number(row.durationMinutes || 0),
        description: row.description ? String(row.description) : '',
        tags,
        location: locationObj || undefined,
        createdAt: String(row.createdAt || new Date().toISOString()),
      });
    }
    stmt.free();
    return logs;
  } catch (err) {
    console.error('Error getting timelogs from SQLite:', err);
    return [];
  }
}

export function saveTimelogToDb(log: any) {
  if (!dbInstance) return;

  const locationId = log.location ? log.location.id : null;
  if (log.location) {
    saveLocationToDb(log.location);
  }

  const tagsJson = JSON.stringify(log.tags || []);
  dbInstance.run(
    `INSERT OR REPLACE INTO timelogs
     (id, cardId, cardTitle, projectId, projectName, linkType, linkId, linkTitle, eventId, eventSummary, startTime, endTime, durationMinutes, description, tags, locationId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      log.id,
      log.cardId || null,
      log.cardTitle || '',
      log.projectId || null,
      log.projectName || null,
      log.linkType || null,
      log.linkId || null,
      log.linkTitle || null,
      log.eventId || null,
      log.eventSummary || null,
      log.startTime || '',
      log.endTime || '',
      log.durationMinutes || 0,
      log.description || '',
      tagsJson,
      locationId,
      log.createdAt || new Date().toISOString(),
    ]
  );

  // Sync to notes table as well so it appears in Notes Management as a note
  const title = log.cardTitle || log.eventSummary || log.linkTitle || (log.description ? (log.description.length > 30 ? log.description.slice(0, 30) + '...' : log.description) : 'Zaman Kaydı');
  const dateStr = log.startTime ? String(log.startTime).slice(0, 16) : (log.createdAt ? String(log.createdAt).slice(0, 16) : new Date().toISOString().slice(0, 16));

  dbInstance.run(
    `INSERT OR REPLACE INTO notes 
     (id, title, content, noteType, startTime, endTime, durationMinutes, customFields, contactResourceName, contactDisplayName, contacts, linkedEmails, linkedEvents, linkedDriveFiles, linkedTasks, tags, locationId, date, createdAt, updatedAt, pinned, projectId, cardId, cardTitle)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      log.id,
      title,
      log.description || '',
      'timelog',
      log.startTime || '',
      log.endTime || '',
      Number(log.durationMinutes) || 0,
      JSON.stringify({}),
      '',
      '',
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify(log.eventId ? [{ id: log.eventId, summary: log.eventSummary || '' }] : []),
      JSON.stringify([]),
      JSON.stringify([]),
      tagsJson,
      locationId,
      dateStr,
      log.createdAt || new Date().toISOString(),
      new Date().toISOString(),
      0,
      log.projectId || null,
      log.cardId || null,
      log.cardTitle || null,
    ]
  );

  markLocalDataModified();
  saveDbToDisk();
}

export function deleteTimelogFromDb(id: string) {
  if (!dbInstance) return;
  dbInstance.run('DELETE FROM timelogs WHERE id = ?', [id]);
  dbInstance.run('DELETE FROM notes WHERE id = ? AND noteType = "timelog"', [id]);
  markLocalDataModified();
  saveDbToDisk();
}

// ================= SETTINGS DB OPERATIONS =================

export function getSettingFromDb(key: string): string | null {
  if (!dbInstance) return null;
  try {
    const stmt = dbInstance.prepare('SELECT value FROM settings WHERE key = ?');
    stmt.bind([key]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return String(row.value || '');
    }
    stmt.free();
    return null;
  } catch {
    return null;
  }
}

export function saveSettingToDb(key: string, value: string) {
  if (!dbInstance) return;
  try {
    dbInstance.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    if (key === 'driveFolderName') {
      clearAdminSpaceFolderCache();
    }
    markLocalDataModified();
    saveDbToDisk();
  } catch (err) {
    console.error('Error saving setting to DB:', err);
  }
}

export function getAllSettingsFromDb(): Record<string, string> {
  if (!dbInstance) return {};
  try {
    const stmt = dbInstance.prepare('SELECT * FROM settings');
    const result: Record<string, string> = {};
    while (stmt.step()) {
      const row = stmt.getAsObject();
      if (row.key) {
        result[String(row.key)] = String(row.value || '');
      }
    }
    stmt.free();
    return result;
  } catch {
    return {};
  }
}


