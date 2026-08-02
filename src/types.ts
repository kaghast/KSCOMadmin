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
}

export type TaskPriority = 'high' | 'medium' | 'low';

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
  title: string;
  category: TimeCategory;
  durationMinutes: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
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

