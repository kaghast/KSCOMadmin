import React, { useState, useEffect } from 'react';
import {
  AuthStatus,
  EmailItem,
  CalendarEvent,
  DriveFile,
  TaskItem,
  TaskPriority,
  ContactItem,
  NoteItem,
  NoteLocation,
} from './types';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { GmailSection } from './components/GmailSection';
import { CalendarSection } from './components/CalendarSection';
import { DriveSection } from './components/DriveSection';
import { TasksSection } from './components/TasksSection';
import { ContactsSection } from './components/ContactsSection';
import { NotesSection } from './components/NotesSection';
import { ComposeEmailModal } from './components/ComposeEmailModal';
import { AddEventModal } from './components/AddEventModal';
import { AddDriveModal } from './components/AddDriveModal';
import { AddTaskModal } from './components/AddTaskModal';
import { EditContactModal } from './components/EditContactModal';
import { AddContactModal } from './components/AddContactModal';
import { NoteModal } from './components/NoteModal';
import { MapPickerModal } from './components/MapPickerModal';
import { TimeManagementApp } from './components/TimeManagementApp';
import { Sparkles, ShieldCheck, Zap, RefreshCw, AlertCircle, HardDrive } from 'lucide-react';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<'workspace' | 'timeManagement'>('workspace');
  const [sidebarTab, setSidebarTab] = useState<NavTab>('notes'); // Default to Notes tab as requested
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Auth State
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    user: { email: 'kemalsahin@gmail.com', name: 'Kemal Şahin' },
    demoMode: true,
  });

  // Data States
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [gmailTab, setGmailTab] = useState<'inbox' | 'starred'>('inbox');
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [locations, setLocations] = useState<NoteLocation[]>([]);

  // Loading States
  const [isLoadingGmail, setIsLoadingGmail] = useState(false);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  // Modals States
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isAddDriveOpen, setIsAddDriveOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactItem | null>(null);

  // Note Modals States
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);

  // Map Picker Modal States
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [mapPickerInitLocation, setMapPickerInitLocation] = useState<NoteLocation | null>(null);
  const [selectedLocationFromMap, setSelectedLocationFromMap] = useState<NoteLocation | null>(null);

  // Check Auth Status on Mount
  useEffect(() => {
    fetchAuthStatus();
  }, []);

  const fetchAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setAuthStatus(data);
    } catch (err) {
      console.error('Auth Status Fetch Error:', err);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/auth/url');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('OAuth URL Fetch Error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAuthStatus({
        isAuthenticated: false,
        user: { email: 'kemalsahin@gmail.com', name: 'Kemal Şahin' },
        demoMode: true,
      });
      fetchAllData();
    } catch (err) {
      console.error('Logout Error:', err);
    }
  };

  // Fetch All Modules Data
  const fetchEmails = async () => {
    setIsLoadingGmail(true);
    try {
      const res = await fetch(`/api/gmail/messages?type=${gmailTab}`);
      const data = await res.json();
      if (data.messages) setEmails(data.messages);
    } catch (err) {
      console.error('Fetch Gmail Error:', err);
    } finally {
      setIsLoadingGmail(false);
    }
  };

  const fetchCalendar = async () => {
    setIsLoadingCalendar(true);
    try {
      const res = await fetch('/api/calendar/events');
      const data = await res.json();
      if (data.events) setCalendarEvents(data.events);
    } catch (err) {
      console.error('Fetch Calendar Error:', err);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const fetchDrive = async () => {
    setIsLoadingDrive(true);
    try {
      const res = await fetch('/api/drive/starred');
      const data = await res.json();
      if (data.files) setDriveFiles(data.files);
    } catch (err) {
      console.error('Fetch Drive Error:', err);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const fetchTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch (err) {
      console.error('Fetch Tasks Error:', err);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const fetchContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      if (data.contacts) setContacts(data.contacts);
    } catch (err) {
      console.error('Fetch Contacts Error:', err);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const fetchNotes = async () => {
    setIsLoadingNotes(true);
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      if (data.notes) setNotes(data.notes);
      if (data.locations) setLocations(data.locations);
    } catch (err) {
      console.error('Fetch Notes Error:', err);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const fetchAllData = () => {
    fetchEmails();
    fetchCalendar();
    fetchDrive();
    fetchTasks();
    fetchContacts();
    fetchNotes();
  };

  useEffect(() => {
    fetchAllData();
  }, [gmailTab, authStatus.isAuthenticated]);

  // Gmail Actions
  const handleSendEmail = async (to: string, subject: string, body: string) => {
    await fetch('/api/gmail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body }),
    });
    fetchEmails();
  };

  const handleToggleStarEmail = async (id: string, currentStarred: boolean) => {
    await fetch('/api/gmail/toggle-star', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isStarred: !currentStarred }),
    });
    fetchEmails();
  };

  // Calendar Actions
  const handleAddEvent = async (
    summary: string,
    description: string,
    location: string,
    start: string,
    end: string
  ) => {
    await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary, description, location, start, end }),
    });
    fetchCalendar();
  };

  // Drive Actions
  const handleAddDriveDoc = async (name: string, content: string, mimeType: string) => {
    await fetch('/api/drive/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content, mimeType }),
    });
    fetchDrive();
  };

  // Tasks Actions
  const handleAddTask = async (
    title: string,
    notes: string,
    due: string,
    priority: TaskPriority
  ) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, notes, due, priority }),
    });
    fetchTasks();
  };

  const handleToggleTaskStatus = async (
    id: string,
    currentStatus: 'needsAction' | 'completed'
  ) => {
    const newStatus = currentStatus === 'completed' ? 'needsAction' : 'completed';
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchTasks();
  };

  // Contacts Actions
  const handleAddContact = async (data: {
    givenName: string;
    familyName: string;
    email: string;
    phone: string;
    organization: string;
    jobTitle: string;
  }) => {
    await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    fetchContacts();
  };

  const handleUpdateContact = async (data: {
    resourceName: string;
    etag?: string;
    givenName: string;
    familyName: string;
    email: string;
    phone: string;
    organization: string;
    jobTitle: string;
  }) => {
    await fetch('/api/contacts/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    fetchContacts();
  };

  // Notes Actions
  const handleSaveNote = async (data: {
    id?: string;
    title: string;
    content: string;
    contactResourceName?: string;
    contactDisplayName?: string;
    tags: string[];
    location?: NoteLocation | null;
    date: string;
  }) => {
    if (data.id) {
      await fetch(`/api/notes/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }
    fetchNotes();
  };

  const handleDeleteNote = async (id: string) => {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    fetchNotes();
  };

  const handleTogglePinNote = async (note: NoteItem) => {
    await fetch(`/api/notes/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !note.pinned }),
    });
    fetchNotes();
  };

  const handleRenameLocation = async (id: string, newName: string) => {
    await fetch(`/api/locations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    fetchNotes();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Navbar Header */}
      <Navbar
        activeScreen={activeScreen}
        onScreenChange={setActiveScreen}
        authStatus={authStatus}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Main Flex Layout with Left Sidenav */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidenav */}
        <Sidebar
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          notesCount={notes.length}
        />

        {/* Right Main Content Panel */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Auth Status Banner */}
          {!authStatus.isAuthenticated && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border border-amber-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-amber-900">
                    Sistem Yerel SQLite (./adminspace) ve Google Drive Senkronizasyonlu
                  </h3>
                  <p className="text-[11px] text-amber-700/90">
                    Not verileriniz local SQLite veritabanına ve Google Drive hesabınızdaki <code className="font-bold text-amber-900">adminspace</code> klasörüne otomatik kaydedilir.
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogin}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Zap className="w-4 h-4 fill-white" /> Canlı Google İzni Ver
              </button>
            </div>
          )}

          {/* 1. DEDICATED NOTES SECTION */}
          {sidebarTab === 'notes' && (
            <NotesSection
              notes={notes}
              contacts={contacts}
              locations={locations}
              onAddNote={() => {
                setEditingNote(null);
                setSelectedLocationFromMap(null);
                setIsNoteModalOpen(true);
              }}
              onEditNote={(note) => {
                setEditingNote(note);
                setSelectedLocationFromMap(null);
                setIsNoteModalOpen(true);
              }}
              onDeleteNote={handleDeleteNote}
              onTogglePin={handleTogglePinNote}
              onRefresh={fetchNotes}
              isLoading={isLoadingNotes}
              onOpenMapForLocation={(loc) => {
                setMapPickerInitLocation(loc);
                setIsMapPickerOpen(true);
              }}
            />
          )}

          {/* 2. WORKSPACE DASHBOARD (GENEL BAKIŞ) */}
          {sidebarTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Tek Ekran Google Workspace Kontrol Paneli
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Gmail, Calendar, Drive, Tasks ve Contacts akışınızı tek bir ekrandan anlık takip edin.
                  </p>
                </div>

                <button
                  onClick={fetchAllData}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-slate-500" /> Tümünü Yenile
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <GmailSection
                  emails={emails}
                  activeTab={gmailTab}
                  onTabChange={setGmailTab}
                  onCompose={() => setIsComposeOpen(true)}
                  onToggleStar={handleToggleStarEmail}
                  onRefresh={fetchEmails}
                  isLoading={isLoadingGmail}
                />
                <CalendarSection
                  events={calendarEvents}
                  onAddEvent={() => setIsAddEventOpen(true)}
                  onRefresh={fetchCalendar}
                  isLoading={isLoadingCalendar}
                />
                <DriveSection
                  files={driveFiles}
                  onAddDriveDoc={() => setIsAddDriveOpen(true)}
                  onRefresh={fetchDrive}
                  isLoading={isLoadingDrive}
                />
                <TasksSection
                  tasks={tasks}
                  onAddTask={() => setIsAddTaskOpen(true)}
                  onToggleTaskStatus={handleToggleTaskStatus}
                  onRefresh={fetchTasks}
                  isLoading={isLoadingTasks}
                />
                <ContactsSection
                  contacts={contacts}
                  onAddContact={() => setIsAddContactOpen(true)}
                  onEditContact={(contact) => setEditingContact(contact)}
                  onRefresh={fetchContacts}
                  isLoading={isLoadingContacts}
                />
              </div>
            </div>
          )}

          {/* 3. TIME MANAGEMENT VIEW */}
          {sidebarTab === 'time' && <TimeManagementApp />}

          {/* 4. GMAIL INDIVIDUAL FOCUS VIEW */}
          {sidebarTab === 'gmail' && (
            <div className="max-w-4xl mx-auto">
              <GmailSection
                emails={emails}
                activeTab={gmailTab}
                onTabChange={setGmailTab}
                onCompose={() => setIsComposeOpen(true)}
                onToggleStar={handleToggleStarEmail}
                onRefresh={fetchEmails}
                isLoading={isLoadingGmail}
              />
            </div>
          )}

          {/* 5. CALENDAR INDIVIDUAL FOCUS VIEW */}
          {sidebarTab === 'calendar' && (
            <div className="max-w-4xl mx-auto">
              <CalendarSection
                events={calendarEvents}
                onAddEvent={() => setIsAddEventOpen(true)}
                onRefresh={fetchCalendar}
                isLoading={isLoadingCalendar}
              />
            </div>
          )}

          {/* 6. DRIVE INDIVIDUAL FOCUS VIEW */}
          {sidebarTab === 'drive' && (
            <div className="max-w-4xl mx-auto">
              <DriveSection
                files={driveFiles}
                onAddDriveDoc={() => setIsAddDriveOpen(true)}
                onRefresh={fetchDrive}
                isLoading={isLoadingDrive}
              />
            </div>
          )}

          {/* 7. TASKS INDIVIDUAL FOCUS VIEW */}
          {sidebarTab === 'tasks' && (
            <div className="max-w-4xl mx-auto">
              <TasksSection
                tasks={tasks}
                onAddTask={() => setIsAddTaskOpen(true)}
                onToggleTaskStatus={handleToggleTaskStatus}
                onRefresh={fetchTasks}
                isLoading={isLoadingTasks}
              />
            </div>
          )}

          {/* 8. CONTACTS INDIVIDUAL FOCUS VIEW */}
          {sidebarTab === 'contacts' && (
            <div className="max-w-4xl mx-auto">
              <ContactsSection
                contacts={contacts}
                onAddContact={() => setIsAddContactOpen(true)}
                onEditContact={(contact) => setEditingContact(contact)}
                onRefresh={fetchContacts}
                isLoading={isLoadingContacts}
              />
            </div>
          )}
        </main>
      </div>

      {/* Creation & Edit Modals */}
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleSendEmail}
      />

      <AddEventModal
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
        onAdd={handleAddEvent}
      />

      <AddDriveModal
        isOpen={isAddDriveOpen}
        onClose={() => setIsAddDriveOpen(false)}
        onAdd={handleAddDriveDoc}
      />

      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onAdd={handleAddTask}
      />

      <AddContactModal
        isOpen={isAddContactOpen}
        onClose={() => setIsAddContactOpen(false)}
        onAdd={handleAddContact}
      />

      <EditContactModal
        isOpen={!!editingContact}
        contact={editingContact}
        onClose={() => setEditingContact(null)}
        onSave={handleUpdateContact}
      />

      {/* Note Edit / Add Modal */}
      <NoteModal
        isOpen={isNoteModalOpen}
        note={editingNote}
        contacts={contacts}
        existingLocations={locations}
        onClose={() => {
          setIsNoteModalOpen(false);
          setEditingNote(null);
        }}
        onOpenMapPicker={(currentLoc) => {
          setMapPickerInitLocation(currentLoc);
          setIsMapPickerOpen(true);
        }}
        onSave={handleSaveNote}
        selectedLocationFromMap={selectedLocationFromMap}
      />

      {/* Interactive Map Picker Modal */}
      <MapPickerModal
        isOpen={isMapPickerOpen}
        selectedLocation={mapPickerInitLocation}
        existingLocations={locations}
        onClose={() => setIsMapPickerOpen(false)}
        onSelectLocation={(loc) => {
          setSelectedLocationFromMap(loc);
          setIsMapPickerOpen(false);
        }}
        onRenameLocation={handleRenameLocation}
      />
    </div>
  );
}

