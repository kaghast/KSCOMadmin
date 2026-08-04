export interface EmailItem {
  id: string;
  threadId: string;
  sender: string;
  senderEmail: string;
  subject: string;
  snippet: string;
  body?: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string; // ISO string or datetime
  end: string;
  htmlLink?: string;
  colorId?: string;
  isAllDay?: boolean;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink?: string;
  thumbnailLink?: string;
  modifiedTime: string;
  size?: string;
  starred: boolean;
  isFolder?: boolean;
  parents?: string[];
}

export type TaskPriority = 'high' | 'medium' | 'low' | 'none';

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  priority: TaskPriority;
  updatedAt?: string;
}

export type TimeCategory = 'deep_work' | 'meeting' | 'admin' | 'learning' | 'break';

export interface TimeLog {
  id: string;
  cardId?: string;
  cardTitle: string;
  projectId?: string;
  projectName?: string;
  linkType?: 'tasks' | 'calendar' | 'gmail' | 'drive' | string;
  linkId?: string;
  linkTitle?: string;
  eventId?: string;
  eventSummary?: string;
  startTime: string; // ISO string or YYYY-MM-DDTHH:mm
  endTime: string;   // ISO string or YYYY-MM-DDTHH:mm
  durationMinutes: number;
  description?: string;
  tags: string[];    // Tags (same tag set as notes)
  createdAt: string;
}

export interface TimeBlock {
  id: string;
  hour: number; // 8 to 20
  title: string;
  category: TimeCategory;
  completed: boolean;
}

export interface EisenhowerTask {
  id: string;
  title: string;
  quadrant: 'do_first' | 'schedule' | 'delegate' | 'eliminate';
  completed: boolean;
}

export interface AuthStatus {
  isAuthenticated: boolean;
  user?: {
    email: string;
    name?: string;
    picture?: string;
  };
  demoMode: boolean;
}

export interface ContactItem {
  resourceName: string;
  etag?: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  email: string;
  phone: string;
  organization?: string;
  jobTitle?: string;
  photoUrl?: string;
}

export interface NoteLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface LinkedContact {
  resourceName: string;
  displayName: string;
}

export interface LinkedEmail {
  id: string;
  subject: string;
  sender?: string;
  date?: string;
}

export interface LinkedEvent {
  id: string;
  summary: string;
  start?: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string; // Markdown supported content
  contactResourceName?: string;
  contactDisplayName?: string;
  contacts?: LinkedContact[];
  linkedEmails?: LinkedEmail[];
  linkedEvents?: LinkedEvent[];
  tags: string[];
  location?: NoteLocation;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  projectId?: string;
  projectName?: string;
}

export interface ProjectColumn {
  id: string;
  title: string;
  color?: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  assignee?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  columns: ProjectColumn[];
  linkedNoteIds?: string[];
  linkedEmailIds?: string[];
  linkedEventIds?: string[];
  linkedDriveFileIds?: string[];
  linkedContactResourceNames?: string[];
  driveFileId?: string;
  driveFileUrl?: string;
}

