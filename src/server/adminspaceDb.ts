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

  dbInstance.run(`
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

  dbInstance.run(`
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

  try { dbInstance.run("ALTER TABLE notes ADD COLUMN contacts TEXT"); } catch {}
  try { dbInstance.run("ALTER TABLE notes ADD COLUMN linkedEmails TEXT"); } catch {}
  try { dbInstance.run("ALTER TABLE notes ADD COLUMN linkedEvents TEXT"); } catch {}
  try { dbInstance.run("ALTER TABLE notes ADD COLUMN projectId TEXT"); } catch {}

  // Seed default demo project if table is empty
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
          'AdminSpace v2.0 Dönüşümü',
          'AdminSpace kişisel yönetim platformunun Kanban projesi, Google Drive markdown çıktıları ve Workspace entegrasyonu.',
          'indigo',
          defaultCols,
          JSON.stringify(['demo-email-1']),
          JSON.stringify(['demo-evt-1']),
          JSON.stringify(['demo-doc-1']),
          JSON.stringify(['people/c1']),
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );

      // Seed demo tasks
      dbInstance.run(
        `INSERT INTO project_tasks (id, projectId, columnId, title, description, priority, dueDate, assignee, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['pt-1', demoProjId, 'col-4', 'SideNavbar Projeler Modülü Tasarımı', 'SideNavbar menüsüne Projeler sekmesini entegre et.', 'high', '2026-08-01', 'Kemal Şahin', new Date().toISOString()]
      );
      dbInstance.run(
        `INSERT INTO project_tasks (id, projectId, columnId, title, description, priority, dueDate, assignee, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['pt-2', demoProjId, 'col-2', 'Google Drive Markdown Senkronizasyonu', 'Proje kaydını Markdown formatında oluşturup Drive adminspace klasörüne kaydet.', 'high', '2026-08-05', 'Kemal Şahin', new Date().toISOString()]
      );
      dbInstance.run(
        `INSERT INTO project_tasks (id, projectId, columnId, title, description, priority, dueDate, assignee, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['pt-3', demoProjId, 'col-1', 'E-Posta & Takvim İlişki Bağlayıcısı', 'Gmail, Takvim ve Rehber ögelerini Kanban projelerine dinamik bağlama arayüzü.', 'medium', '2026-08-10', 'Kemal Şahin', new Date().toISOString()]
      );
    } else {
      projCheck.free();
    }
  } catch (err) {
    console.error('Error seeding demo projects:', err);
  }

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
    const projects = getAllProjectsFromDb();
    const projectTasks = getAllProjectTasksFromDb();
    fs.writeFileSync(
      DATA_JSON_FILE,
      JSON.stringify({ locations, notes, projects, projectTasks, updatedAt: new Date().toISOString() }, null, 2)
    );

    // Save notes as Markdown file in ./adminspace/adminspace_notes.md
    let notesMd = `# AdminSpace Notlar\n\n- **Son Güncelleme:** ${new Date().toLocaleString('tr-TR')}\n\n---\n\n`;
    if (notes.length === 0) {
      notesMd += `*Henüz kayıtlı not bulunmuyor.*\n`;
    } else {
      notes.forEach((n: any) => {
        notesMd += `## 📝 ${n.title}\n`;
        notesMd += `- **Tarih:** ${n.date || n.createdAt}\n`;
        if (n.pinned) notesMd += `- **Sabitlenmiş:** Evet 📌\n`;
        if (n.contactDisplayName) notesMd += `- **İlişkili Kişi:** ${n.contactDisplayName}\n`;
        if (n.tags && n.tags.length > 0) notesMd += `- **Etiketler:** ${n.tags.join(', ')}\n`;
        notesMd += `\n${n.content || ''}\n\n---\n\n`;
      });
    }
    const NOTES_MD_FILE = path.join(ADMINSPACE_DIR, 'adminspace_notes.md');
    fs.writeFileSync(NOTES_MD_FILE, notesMd);
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

      const locId = row.locationId ? String(row.locationId) : null;
      const locationObj = locId ? locMap.get(locId) || null : null;

      notes.push({
        id: String(row.id),
        title: String(row.title),
        content: String(row.content || ''),
        contactResourceName: row.contactResourceName ? String(row.contactResourceName) : '',
        contactDisplayName: row.contactDisplayName ? String(row.contactDisplayName) : '',
        contacts: contactsList,
        linkedEmails,
        linkedEvents,
        tags,
        location: locationObj,
        date: String(row.date),
        createdAt: String(row.createdAt),
        updatedAt: String(row.updatedAt),
        pinned: Number(row.pinned) === 1,
        projectId: row.projectId ? String(row.projectId) : undefined,
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

  dbInstance.run(
    `INSERT OR REPLACE INTO notes 
     (id, title, content, contactResourceName, contactDisplayName, contacts, linkedEmails, linkedEvents, tags, locationId, date, createdAt, updatedAt, pinned, projectId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      note.id,
      note.title,
      note.content || '',
      note.contactResourceName || '',
      note.contactDisplayName || '',
      contactsJson,
      linkedEmailsJson,
      linkedEventsJson,
      tagsJson,
      locationId,
      note.date,
      note.createdAt || new Date().toISOString(),
      note.updatedAt || new Date().toISOString(),
      note.pinned ? 1 : 0,
      note.projectId || null,
    ]
  );

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

  dbInstance.run(
    `INSERT OR REPLACE INTO projects 
     (id, name, description, color, columns, linkedEmailIds, linkedEventIds, linkedDriveFileIds, linkedContactResourceNames, driveFileId, driveFileUrl, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      project.driveFileId || null,
      project.driveFileUrl || null,
      project.createdAt || new Date().toISOString(),
      new Date().toISOString(),
    ]
  );

  saveDbToDisk();
}

export function deleteProjectFromDb(id: string) {
  if (!dbInstance) return;
  dbInstance.run('DELETE FROM projects WHERE id = ?', [id]);
  dbInstance.run('DELETE FROM project_tasks WHERE projectId = ?', [id]);
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
  dbInstance.run(
    `INSERT OR REPLACE INTO project_tasks 
     (id, projectId, columnId, title, description, priority, dueDate, assignee, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    // 3. Sync notes as Markdown file (adminspace_notes.md) into 'adminspace' folder
    const notes = getAllNotesFromDb();
    let notesMd = `# AdminSpace Notlar\n\n- **Son Güncelleme:** ${new Date().toLocaleString('tr-TR')}\n\n---\n\n`;
    if (notes.length === 0) {
      notesMd += `*Henüz kayıtlı not bulunmuyor.*\n`;
    } else {
      notes.forEach((n: any) => {
        notesMd += `## 📝 ${n.title}\n`;
        notesMd += `- **Tarih:** ${n.date || n.createdAt}\n`;
        if (n.pinned) notesMd += `- **Sabitlenmiş:** Evet 📌\n`;
        if (n.contactDisplayName) notesMd += `- **İlişkili Kişi:** ${n.contactDisplayName}\n`;
        if (n.tags && n.tags.length > 0) notesMd += `- **Etiketler:** ${n.tags.join(', ')}\n`;
        notesMd += `\n${n.content || ''}\n\n---\n\n`;
      });
    }

    const fileSearch = await drive.files.list({
      q: `'${folderId}' in parents and name = 'adminspace_notes.md' and trashed = false`,
      fields: 'files(id, name)',
    });

    const existingFileId = fileSearch.data.files?.[0]?.id;

    if (existingFileId) {
      await drive.files.update({
        fileId: existingFileId,
        media: {
          mimeType: 'text/markdown',
          body: notesMd,
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
          body: notesMd,
        },
      });
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

      // Find or create 'adminspace' folder
      const folderSearch = await drive.files.list({
        q: "mimeType = 'application/vnd.google-apps.folder' and name = 'adminspace' and trashed = false",
        fields: 'files(id, webViewLink)',
      });

      let folderId = folderSearch.data.files?.[0]?.id;
      if (!folderId) {
        const newFolder = await drive.files.create({
          requestBody: { name: 'adminspace', mimeType: 'application/vnd.google-apps.folder' },
          fields: 'id',
        });
        folderId = newFolder.data.id || undefined;
      }

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

