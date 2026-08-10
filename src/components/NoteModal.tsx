import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  FileText,
  User,
  Tag,
  MapPin,
  Calendar,
  Save,
  Loader2,
  Eye,
  Edit2,
  Plus,
  Mail,
  Calendar as CalendarIcon,
  Search,
  Check,
  Link,
  ChevronDown,
  ChevronUp,
  Compass,
  Pencil,
  CheckCircle2,
  HardDrive,
  Users,
  Image as ImageIcon,
  UploadCloud,
  Clock,
  Trash2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview';
import L from 'leaflet';
import {
  NoteItem,
  ContactItem,
  NoteLocation,
  EmailItem,
  CalendarEvent,
  DriveFile,
  TaskItem,
  LinkedContact,
  LinkedEmail,
  LinkedEvent,
  LinkedDriveFile,
  LinkedTask,
  Project,
  ProjectTask,
  NoteType,
  NoteTypeField,
} from '../types';
import { DrawingCanvas, DrawingElement } from './DrawingCanvas';

interface Props {
  isOpen: boolean;
  note?: NoteItem | null;
  noteTypes?: NoteType[];
  contacts: ContactItem[];
  emails: EmailItem[];
  events: CalendarEvent[];
  existingLocations: NoteLocation[];
  projects?: Project[];
  projectTasks?: ProjectTask[];
  allExistingTags?: string[];
  onDeleteLocation?: (id: string) => Promise<void>;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    title: string;
    content: string;
    noteType?: string;
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
    customFields?: Record<string, any>;
    contacts?: LinkedContact[];
    linkedEmails?: LinkedEmail[];
    linkedEvents?: LinkedEvent[];
    linkedDriveFiles?: LinkedDriveFile[];
    linkedTasks?: LinkedTask[];
    tags: string[];
    location?: NoteLocation | null;
    date: string;
    projectId?: string;
    cardId?: string;
    cardTitle?: string;
  }) => Promise<void>;
}

interface PlaceResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export const NoteModal: React.FC<Props> = ({
  isOpen,
  note,
  noteTypes = [
    { id: 'note', name: 'Düz Not', isSystem: true },
    { id: 'timelog', name: 'Timelog', isSystem: true },
  ],
  contacts,
  emails,
  events,
  existingLocations,
  projects = [],
  projectTasks = [],
  allExistingTags = [],
  onDeleteLocation,
  onClose,
  onSave,
}) => {
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [location, setLocation] = useState<NoteLocation | null>(null);
  const [locationName, setLocationName] = useState('');

  // Note Type & Dynamic Parameters State
  const [selectedNoteType, setSelectedNoteType] = useState<string>('note');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Selected Arrays
  const [selectedContacts, setSelectedContacts] = useState<LinkedContact[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [linkedEmails, setLinkedEmails] = useState<LinkedEmail[]>([]);
  const [linkedEvents, setLinkedEvents] = useState<LinkedEvent[]>([]);
  const [linkedDriveFiles, setLinkedDriveFiles] = useState<LinkedDriveFile[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<LinkedTask[]>([]);

  // Workspace Accordion & Realtime Search State
  const [openAccordion, setOpenAccordion] = useState<'tasks' | 'emails' | 'events' | 'drive' | 'contacts' | null>('tasks');
  const [wsSearch, setWsSearch] = useState('');
  const [isWsSearching, setIsWsSearching] = useState(false);

  const [wsRemoteTasks, setWsRemoteTasks] = useState<TaskItem[]>([]);
  const [wsRemoteEmails, setWsRemoteEmails] = useState<EmailItem[]>([]);
  const [wsRemoteEvents, setWsRemoteEvents] = useState<CalendarEvent[]>([]);
  const [wsRemoteDriveFiles, setWsRemoteDriveFiles] = useState<DriveFile[]>([]);
  const [wsRemoteContacts, setWsRemoteContacts] = useState<ContactItem[]>([]);

  // Autocomplete Inputs & Dropdown Toggles for Tags
  const [tagInput, setTagInput] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  // Content Modes: Edit (Markdown), Preview (Markdown), Drawing (Canvas)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'drawing'>('edit');
  const [drawingDataUrl, setDrawingDataUrl] = useState<string>('');
  const [drawingElements, setDrawingElements] = useState<DrawingElement[]>([]);
  const [isFullFocus, setIsFullFocus] = useState<boolean>(false);

  // Escape key handler for Full Focus Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullFocus) {
        setIsFullFocus(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullFocus]);

  // Place Search & Geolocation State
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [isSearchingPlace, setIsSearchingPlace] = useState(false);
  const [showPlaceDropdown, setShowPlaceDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editor Image Upload & Drag/Drop Refs & States
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgressStatus, setUploadProgressStatus] = useState<string | null>(null);

  const handleProcessAndUploadImage = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;

    setIsUploadingImage(true);
    setUploadProgressStatus("Görsel Google Drive'a yükleniyor...");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result as string;

        const res = await fetch('/api/drive/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name || `Gorsel_${Date.now()}.png`,
            mimeType: file.type || 'image/png',
            base64Data,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const driveFile = data.file;
          const imageUrl = data.imageUrl || data.dataUrl || base64Data;

          // Link Drive file to note metadata automatically
          if (driveFile && driveFile.id) {
            setLinkedDriveFiles((prev) => {
              if (prev.some((f) => f.id === driveFile.id)) return prev;
              return [
                ...prev,
                {
                  id: driveFile.id,
                  name: driveFile.name || file.name,
                  mimeType: driveFile.mimeType || file.type,
                  webViewLink: driveFile.webViewLink,
                },
              ];
            });
          }

          // Insert Markdown image snippet into content
          const imageName = (file.name || 'Görsel').replace(/[\[\]]/g, '');
          const markdownTag = `\n\n![${imageName}](${imageUrl})\n\n`;

          if (textareaRef.current) {
            const start = textareaRef.current.selectionStart || 0;
            const end = textareaRef.current.selectionEnd || 0;
            const currentVal = textareaRef.current.value;
            const newContent =
              currentVal.substring(0, start) + markdownTag + currentVal.substring(end);
            setContent(newContent);
          } else {
            setContent((prev) => prev + markdownTag);
          }

          setUploadProgressStatus("✅ Görsel Google Drive'a yüklendi ve nota eklendi!");
          setTimeout(() => setUploadProgressStatus(null), 3500);
        } else {
          setUploadProgressStatus('❌ Görsel yüklenemedi');
          setTimeout(() => setUploadProgressStatus(null), 3500);
        }
        setIsUploadingImage(false);
      };
    } catch (err) {
      console.error('Error processing image:', err);
      setUploadProgressStatus('❌ Görsel işleme hatası');
      setTimeout(() => setUploadProgressStatus(null), 3500);
      setIsUploadingImage(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleProcessAndUploadImage(file);
        }
        break;
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          handleProcessAndUploadImage(files[i]);
          break;
        }
      }
    }
  };

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const savedMarkersRef = useRef<{ [key: string]: L.Marker }>({});

  // Deduplicated list of all previous location names & coordinates
  const allPreviousLocations = useMemo(() => {
    const locMap = new Map<string, NoteLocation>();

    (existingLocations || []).forEach((loc) => {
      if (loc && loc.name && loc.name.trim() && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        const key = loc.name.trim().toLowerCase();
        if (!locMap.has(key)) {
          locMap.set(key, { ...loc, name: loc.name.trim() });
        }
      }
    });

    if (note?.location && note.location.name && note.location.name.trim()) {
      const key = note.location.name.trim().toLowerCase();
      if (!locMap.has(key)) {
        locMap.set(key, { ...note.location, name: note.location.name.trim() });
      }
    }

    return Array.from(locMap.values());
  }, [existingLocations, note?.location]);

  // Filtered previous locations for search dropdown
  const matchedSavedLocations = useMemo(() => {
    if (!placeQuery.trim()) return allPreviousLocations;
    const q = placeQuery.trim().toLowerCase();
    return allPreviousLocations.filter((loc) => loc.name.toLowerCase().includes(q));
  }, [allPreviousLocations, placeQuery]);

  // Helper to select a previous location and pin it on map
  const handleSelectPreviousLocation = (loc: NoteLocation) => {
    setLocation(loc);
    setLocationName(loc.name);
    setShowPlaceDropdown(false);
    setPlaceQuery('');

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([loc.lat, loc.lng], 14);
    }
  };

  // Extract drawing data URL from note content if exists
  const extractDrawingFromContent = (text: string) => {
    const match = text.match(/!\[Çizim Notu\]\((data:image\/[^\)]+)\)/);
    return match ? match[1] : '';
  };

  // Synchronize Note Data on open
  useEffect(() => {
    setIsFullFocus(false);
    if (!isOpen) return;

    if (note) {
      setTitle(note.title || '');
      const noteContent = note.content || '';
      setContent(noteContent);

      const existingDrawing = extractDrawingFromContent(noteContent);
      if (existingDrawing) {
        setDrawingDataUrl(existingDrawing);
      } else {
        setDrawingDataUrl('');
      }

      if (note.customFields?.drawingElements && Array.isArray(note.customFields.drawingElements)) {
        setDrawingElements(note.customFields.drawingElements);
      } else {
        setDrawingElements([]);
      }

      setDate(note.date || new Date().toISOString().split('T')[0]);
      setSelectedProjectId(note.projectId || '');
      setLocation(note.location || null);
      setLocationName(note.location?.name || '');

      setSelectedNoteType(note.noteType || 'note');
      
      const nowIso = new Date().toISOString().slice(0, 16);
      setStartTime(note.startTime ? note.startTime.slice(0, 16) : nowIso);
      setEndTime(note.endTime ? note.endTime.slice(0, 16) : nowIso);
      setCustomFields(note.customFields || {});

      // Multi Contacts
      if (note.contacts && note.contacts.length > 0) {
        setSelectedContacts(note.contacts);
      } else if (note.contactResourceName && note.contactDisplayName) {
        setSelectedContacts([{ resourceName: note.contactResourceName, displayName: note.contactDisplayName }]);
      } else {
        setSelectedContacts([]);
      }

      setSelectedTags(note.tags || []);
      setLinkedEmails(note.linkedEmails || []);
      setLinkedEvents(note.linkedEvents || []);
      setLinkedDriveFiles(note.linkedDriveFiles || []);
      setLinkedTasks(note.linkedTasks || []);
    } else {
      setTitle('');
      setContent('');
      setDrawingDataUrl('');
      setDrawingElements([]);
      setDate(new Date().toISOString().split('T')[0]);
      setLocation(null);
      setLocationName('');
      setSelectedContacts([]);
      setSelectedTags([]);
      setLinkedEmails([]);
      setLinkedEvents([]);
      setLinkedDriveFiles([]);
      setLinkedTasks([]);
      setSelectedNoteType('note');
      const nowIso = new Date().toISOString().slice(0, 16);
      setStartTime(nowIso);
      setEndTime(nowIso);
      setCustomFields({});
    }
  }, [note, isOpen]);

  // Realtime Search for Workspace Accordion
  useEffect(() => {
    if (!isOpen || !openAccordion) return;

    const timer = setTimeout(() => {
      setIsWsSearching(true);
      const q = encodeURIComponent(wsSearch.trim());

      if (openAccordion === 'tasks') {
        fetch(`/api/tasks?search=${q}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.tasks && Array.isArray(data.tasks)) setWsRemoteTasks(data.tasks);
          })
          .catch((err) => console.error('Tasks fetch error:', err))
          .finally(() => setIsWsSearching(false));
      } else if (openAccordion === 'emails') {
        fetch(`/api/gmail/messages?search=${q}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.messages && Array.isArray(data.messages)) setWsRemoteEmails(data.messages);
          })
          .catch((err) => console.error('Emails fetch error:', err))
          .finally(() => setIsWsSearching(false));
      } else if (openAccordion === 'events') {
        fetch(`/api/calendar/events?search=${q}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.events && Array.isArray(data.events)) setWsRemoteEvents(data.events);
          })
          .catch((err) => console.error('Events fetch error:', err))
          .finally(() => setIsWsSearching(false));
      } else if (openAccordion === 'drive') {
        const queryParam = wsSearch.trim() ? `search=${q}&limit=30` : `limit=10`;
        fetch(`/api/drive/files?${queryParam}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.files && Array.isArray(data.files)) setWsRemoteDriveFiles(data.files);
          })
          .catch((err) => console.error('Drive fetch error:', err))
          .finally(() => setIsWsSearching(false));
      } else if (openAccordion === 'contacts') {
        fetch(`/api/contacts?search=${q}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.contacts && Array.isArray(data.contacts)) setWsRemoteContacts(data.contacts);
          })
          .catch((err) => console.error('Contacts fetch error:', err))
          .finally(() => setIsWsSearching(false));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, openAccordion, wsSearch]);

  // Cleanup Leaflet Map on close or unmount
  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.error(e);
        }
        mapInstanceRef.current = null;
        markerRef.current = null;
        savedMarkersRef.current = {};
      }
    }
  }, [isOpen]);

  // Leaflet Map Initialization & Updates
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      const initLat = location?.lat || 41.0082;
      const initLng = location?.lng || 28.9784;

      // Reset map if container element changed or map instance is stale
      if (mapInstanceRef.current) {
        const container = mapInstanceRef.current.getContainer();
        if (!container || !mapContainerRef.current.contains(container)) {
          try {
            mapInstanceRef.current.remove();
          } catch (e) {
            console.error(e);
          }
          mapInstanceRef.current = null;
          markerRef.current = null;
          savedMarkersRef.current = {};
        }
      }

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [initLat, initLng],
          zoom: location ? 14 : 11,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        const customIcon = L.divIcon({
          className: 'custom-note-pin',
          html: `<div style="background-color: #4f46e5; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                  <div style="width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div>
                </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          const newLocName = locationName.trim() || `Lokasyon (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
          const newLoc: NoteLocation = {
            id: location?.id || `loc-${Date.now()}`,
            name: newLocName,
            lat,
            lng,
          };
          setLocation(newLoc);

          if (!markerRef.current) {
            markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(map);
          } else {
            markerRef.current.setLatLng([lat, lng]);
          }
        });

        mapInstanceRef.current = map;
      } else {
        mapInstanceRef.current.invalidateSize();
      }

      const map = mapInstanceRef.current;
      if (!map) return;

      // Render existing location markers as green pins
      Object.values(savedMarkersRef.current).forEach((m) => m.remove());
      savedMarkersRef.current = {};

      const savedIcon = L.divIcon({
        className: 'saved-note-pin',
        html: `<div style="background-color: #059669; width: 22px; height: 22px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center;">
                <div style="width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div>
              </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      allPreviousLocations.forEach((loc) => {
        if (location && (location.id === loc.id || location.name.toLowerCase() === loc.name.toLowerCase())) {
          return;
        }

        const marker = L.marker([loc.lat, loc.lng], { icon: savedIcon })
          .addTo(map)
          .bindTooltip(loc.name, { permanent: false, direction: 'top' });

        marker.on('click', () => {
          handleSelectPreviousLocation(loc);
        });

        savedMarkersRef.current[loc.id || loc.name] = marker;
      });

      if (location) {
        map.setView([location.lat, location.lng], 14);
        const activeIcon = L.divIcon({
          className: 'custom-note-pin-active',
          html: `<div style="background-color: #4f46e5; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(79, 70, 229, 0.4); display: flex; align-items: center; justify-content: center;">
                  <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
                </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        if (!markerRef.current) {
          markerRef.current = L.marker([location.lat, location.lng], { icon: activeIcon }).addTo(map);
        } else {
          markerRef.current.setLatLng([location.lat, location.lng]);
        }
      } else if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen, location, allPreviousLocations]);

  // Place Search Autocomplete Handler
  const handleSearchPlaces = async (query: string) => {
    setPlaceQuery(query);
    if (!query.trim() || query.trim().length < 2) {
      setPlaceResults([]);
      setShowPlaceDropdown(false);
      return;
    }

    setIsSearchingPlace(true);
    setShowPlaceDropdown(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&accept-language=tr,en`
      );
      if (res.ok) {
        const data = await res.json();
        setPlaceResults(data || []);
      }
    } catch (err) {
      console.error('Place search error:', err);
    } finally {
      setIsSearchingPlace(false);
    }
  };

  const handleSelectPlace = (place: PlaceResult) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    const shortName = place.display_name.split(',')[0] || place.display_name;

    const newLoc: NoteLocation = {
      id: `loc-${Date.now()}`,
      name: shortName,
      lat,
      lng,
    };
    setLocation(newLoc);
    setLocationName(shortName);
    setShowPlaceDropdown(false);
    setPlaceQuery('');

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 14);
    }
  };

  // Get GPS Current Position
  const handleGetCurrentPosition = () => {
    if (!navigator.geolocation) {
      alert('Tarayıcınız konum özelliğini desteklemiyor.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let locName = `Mevcut Konumum (${lat.toFixed(3)}, ${lng.toFixed(3)})`;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=tr,en`
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              locName = data.display_name.split(',')[0] || data.display_name;
            }
          }
        } catch (err) {
          console.error('Reverse geocode error:', err);
        }

        const newLoc: NoteLocation = {
          id: `loc-${Date.now()}`,
          name: locName,
          lat,
          lng,
        };
        setLocation(newLoc);
        setLocationName(locName);
        setIsLocating(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 15);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        alert('Konumunuz alınamadı. Lütfen tarayıcı konum izinlerini kontrol edin.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!isOpen) return null;

  // Tag Autocomplete Helpers
  const filteredExistingTags = allExistingTags.filter(
    (t) => t.toLowerCase().includes(tagInput.toLowerCase()) && !selectedTags.includes(t)
  );

  const handleAddTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
      setTagInput('');
      setIsTagDropdownOpen(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tagToRemove));
  };

  // Workspace Accordion Link Toggles
  const handleToggleTaskLink = (task: TaskItem) => {
    const exists = linkedTasks.some((t) => t.id === task.id);
    if (exists) {
      setLinkedTasks(linkedTasks.filter((t) => t.id !== task.id));
    } else {
      setLinkedTasks([
        ...linkedTasks,
        { id: task.id, title: task.title, status: task.status, due: task.due },
      ]);
    }
  };

  const handleToggleEmailLink = (em: EmailItem) => {
    const exists = linkedEmails.some((i) => i.id === em.id);
    if (exists) {
      setLinkedEmails(linkedEmails.filter((i) => i.id !== em.id));
    } else {
      setLinkedEmails([
        ...linkedEmails,
        { id: em.id, subject: em.subject, sender: em.sender, date: em.date },
      ]);
    }
  };

  const handleToggleEventLink = (ev: CalendarEvent) => {
    const exists = linkedEvents.some((i) => i.id === ev.id);
    if (exists) {
      setLinkedEvents(linkedEvents.filter((i) => i.id !== ev.id));
    } else {
      setLinkedEvents([
        ...linkedEvents,
        { id: ev.id, summary: ev.summary, start: ev.start },
      ]);
    }
  };

  const handleToggleDriveLink = (df: DriveFile) => {
    const exists = linkedDriveFiles.some((i) => i.id === df.id);
    if (exists) {
      setLinkedDriveFiles(linkedDriveFiles.filter((i) => i.id !== df.id));
    } else {
      setLinkedDriveFiles([
        ...linkedDriveFiles,
        { id: df.id, name: df.name, webViewLink: df.webViewLink, mimeType: df.mimeType },
      ]);
    }
  };

  const handleToggleContactLink = (c: ContactItem) => {
    const exists = selectedContacts.some((i) => i.resourceName === c.resourceName);
    if (exists) {
      setSelectedContacts(selectedContacts.filter((i) => i.resourceName !== c.resourceName));
    } else {
      setSelectedContacts([
        ...selectedContacts,
        { resourceName: c.resourceName, displayName: c.displayName },
      ]);
    }
  };

  // Handle Drawing Canvas Change
  const handleDrawingCanvasChange = (dataUrl: string, elems?: DrawingElement[]) => {
    setDrawingDataUrl(dataUrl);
    if (elems) {
      setDrawingElements(elems);
      setCustomFields((prev) => ({ ...prev, drawingElements: elems }));
    }
    setContent((prev) => {
      if (!dataUrl) return prev;
      if (prev.includes('![Çizim Notu](')) {
        return prev.replace(
          /!\[Çizim Notu\]\(data:image\/[^\)]+\)/,
          `![Çizim Notu](${dataUrl})`
        );
      } else {
        return prev ? `${prev}\n\n![Çizim Notu](${dataUrl})` : `![Çizim Notu](${dataUrl})`;
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalContent = content;

      if (drawingDataUrl) {
        if (finalContent.includes('![Çizim Notu](')) {
          finalContent = finalContent.replace(
            /!\[Çizim Notu\]\(data:image\/[^\)]+\)/,
            `![Çizim Notu](${drawingDataUrl})`
          );
        } else {
          finalContent = finalContent ? `${finalContent}\n\n![Çizim Notu](${drawingDataUrl})` : `![Çizim Notu](${drawingDataUrl})`;
        }
      }

      let durationMins: number | undefined = undefined;
      if (selectedNoteType === 'timelog' && startTime && endTime) {
        const s = new Date(startTime).getTime();
        const e = new Date(endTime).getTime();
        if (!isNaN(s) && !isNaN(e) && e > s) {
          durationMins = Math.round((e - s) / (1000 * 60));
        } else {
          durationMins = 0;
        }
      }

      await onSave({
        id: note?.id,
        title: title.trim() || 'İsimsiz Not',
        content: finalContent,
        noteType: selectedNoteType,
        startTime: selectedNoteType === 'timelog' ? startTime : undefined,
        endTime: selectedNoteType === 'timelog' ? endTime : undefined,
        durationMinutes: durationMins,
        customFields: customFields,
        contacts: selectedContacts,
        linkedEmails,
        linkedEvents,
        linkedDriveFiles,
        linkedTasks,
        tags: selectedTags,
        location: location
          ? {
              ...location,
              name: locationName.trim() || location.name || 'Lokasyon',
            }
          : null,
        date,
        projectId: selectedProjectId || undefined,
        cardId: note?.cardId || selectedProjectId || undefined,
        cardTitle: note?.cardTitle || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Note Save Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalWorkspaceLinks =
    linkedTasks.length +
    linkedEmails.length +
    linkedEvents.length +
    linkedDriveFiles.length +
    selectedContacts.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl max-w-6xl w-full h-[88vh] max-h-[820px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-2xl shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                {note ? 'Notu Düzenle' : 'Yeni Not Oluştur'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Gelişmiş not editörü: Metin / Çizim modu, lokasyon seçimi ve Google Workspace bağlama.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - 2 Columns */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* BÖLÜM 1: GENİŞ SOL İÇERİK PANELSİ */}
          <div className="w-full md:w-[58%] border-b md:border-b-0 md:border-r border-slate-200 p-4 space-y-3 flex flex-col overflow-y-auto">
            
            {/* Note Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Not Türü
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {noteTypes.map((nt) => {
                  const isSelected = selectedNoteType === nt.id;
                  return (
                    <button
                      key={nt.id}
                      type="button"
                      onClick={() => setSelectedNoteType(nt.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {nt.id === 'timelog' ? <Clock className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                      <span>{nt.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Timelog Fields */}
            {selectedNoteType === 'timelog' && (
              <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-xs font-extrabold text-purple-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-600" /> Timelog Zaman Aralığı
                  </span>
                  {startTime && endTime && (
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-lg">
                      Süre: {Math.max(0, Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60)))} dakika
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-purple-900 mb-1">Başlangıç Zamanı</label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-xl font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-purple-900 mb-1">Bitiş Zamanı</label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-xl font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Custom Note Type Fields */}
            {(() => {
              const activeNt = noteTypes.find((t) => t.id === selectedNoteType);
              if (!activeNt || !activeNt.fields || activeNt.fields.length === 0) return null;
              return (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                  <span className="text-xs font-extrabold text-indigo-900 block">
                    {activeNt.name} Özel Parametreleri
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeNt.fields.map((f) => (
                      <div key={f.id} className={f.type === 'text' ? 'sm:col-span-2' : ''}>
                        <label className="block text-[10px] font-bold text-indigo-900 mb-1">
                          {f.name} {f.required && <span className="text-rose-500">*</span>}
                        </label>
                        {f.type === 'number' && (
                          <input
                            type="number"
                            value={customFields[f.id] ?? ''}
                            onChange={(e) => setCustomFields({ ...customFields, [f.id]: e.target.value })}
                            placeholder={`Sayısal ${f.name} giriniz...`}
                            required={f.required}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-xl font-semibold text-slate-800"
                          />
                        )}
                        {f.type === 'text' && (
                          <input
                            type="text"
                            value={customFields[f.id] ?? ''}
                            onChange={(e) => setCustomFields({ ...customFields, [f.id]: e.target.value })}
                            placeholder={`${f.name} giriniz...`}
                            required={f.required}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-xl font-semibold text-slate-800"
                          />
                        )}
                        {f.type === 'date' && (
                          <input
                            type="date"
                            value={customFields[f.id] ?? ''}
                            onChange={(e) => setCustomFields({ ...customFields, [f.id]: e.target.value })}
                            required={f.required}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-xl font-semibold text-slate-800"
                          />
                        )}
                        {f.type === 'boolean' && (
                          <label className="flex items-center gap-2 cursor-pointer mt-1">
                            <input
                              type="checkbox"
                              checked={!!customFields[f.id]}
                              onChange={(e) => setCustomFields({ ...customFields, [f.id]: e.target.checked })}
                              className="w-4 h-4 rounded text-indigo-600 border-indigo-300 focus:ring-indigo-500"
                            />
                            <span className="text-xs text-slate-800 font-bold">{f.name} Evet/Aktif</span>
                          </label>
                        )}
                        {f.type === 'select' && (
                          <select
                            value={customFields[f.id] ?? ''}
                            onChange={(e) => setCustomFields({ ...customFields, [f.id]: e.target.value })}
                            required={f.required}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-xl font-semibold text-slate-800"
                          >
                            <option value="">Seçiniz...</option>
                            {f.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Note Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Not Başlığı <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Pazarlama Stratejisi & Müşteri Görüşmesi"
                required
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-bold placeholder:text-slate-400 shadow-2xs"
              />
            </div>

            {/* Note Date & Project Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Not Tarihi</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">İlişkili Kanban Kartı veya Proje</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-800"
                >
                  <option value="">İlişki Yok (Genel Not)</option>
                  {projectTasks && projectTasks.length > 0 && (
                    <optgroup label="Kanban Kartları">
                      {projectTasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          📋 {t.title}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {projects && projects.length > 0 && (
                    <optgroup label="Projeler">
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          📁 {p.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>

            {/* Note Content - 3 MODES (Düzenle, Önizleme, Çizim) & FULL FOCUS MODE */}
            <div
              className={
                isFullFocus
                  ? 'fixed inset-0 z-[100] bg-white p-4 md:p-6 flex flex-col h-screen w-screen overflow-hidden shadow-2xl animate-in fade-in duration-200'
                  : 'flex-1 flex flex-col min-h-[280px]'
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    {isFullFocus ? (
                      <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200 flex items-center gap-1.5">
                        ✨ Odak Modu: <strong className="text-slate-900">{title || 'Başlıksız Not'}</strong>
                      </span>
                    ) : (
                      'Not İçeriği Modu'
                    )}
                  </label>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Image Upload Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                    title="Görsel yükle / yapıştır (Google Drive adminspace klasörüne kaydedilir)"
                  >
                    {isUploadingImage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                    <span>{isUploadingImage ? 'Yükleniyor...' : '🖼️ Resim Yükle'}</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleProcessAndUploadImage(e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                  />

                  {/* Editor Mode Tabs */}
                  <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setActiveTab('edit')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                        activeTab === 'edit'
                          ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Edit2 className="w-3 h-3" /> Metin
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                        activeTab === 'preview'
                          ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Eye className="w-3 h-3" /> Önizleme
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('drawing')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                        activeTab === 'drawing'
                          ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-indigo-600'
                      }`}
                    >
                      <Pencil className="w-3 h-3" /> 🎨 Çizim
                    </button>
                  </div>

                  {/* Full Focus Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsFullFocus((prev) => !prev)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                      isFullFocus
                        ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                    title={isFullFocus ? 'Tam Ekran Odak Modundan Çık (Esc)' : 'Not İçeriğini Tam Ekran Yap'}
                  >
                    {isFullFocus ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5 text-white" />
                        <span>Odaktan Çık (Esc)</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Tam Ekran Odak</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Upload Progress Status Banner */}
              {uploadProgressStatus && (
                <div className="mb-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold rounded-xl flex items-center justify-between animate-in fade-in">
                  <span className="flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
                    {uploadProgressStatus}
                  </span>
                </div>
              )}

              {/* Tab Content Display */}
              {activeTab === 'edit' && (
                <div className="flex-1 flex flex-col space-y-1.5 min-h-0">
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onPaste={handlePaste}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    placeholder="Notunuzu yazın... (# Başlık, - Liste, **Kalın metin**). Resim yapıştırabilir (Ctrl+V) veya sürükleyebilirsiniz."
                    className={`w-full flex-1 p-3.5 font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 leading-relaxed resize-none shadow-inner ${
                      isFullFocus ? 'text-sm p-5 min-h-0' : 'text-xs min-h-[220px]'
                    }`}
                  />
                  <p className="text-[10px] text-slate-400 italic px-1 flex items-center justify-between">
                    <span>💡 İpucu: Panodan resim yapıştırabilir (Ctrl+V) veya buraya sürükleyebilirsiniz. Yüklenen görseller Google Drive'a kaydedilir.</span>
                  </p>
                </div>
              )}

              {activeTab === 'preview' && (
                <div className={`w-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl overflow-y-auto ${
                  isFullFocus ? 'text-sm p-6 min-h-0' : 'text-xs min-h-[220px]'
                }`}>
                  {content.trim() ? (
                    <MarkdownPreview content={content} imgMaxHeight={isFullFocus ? 'max-h-[600px]' : 'max-h-72'} />
                  ) : (
                    <span className="text-slate-400 italic">Önizleme için metin giriniz...</span>
                  )}
                </div>
              )}

              {activeTab === 'drawing' && (
                <div className={`flex-1 ${isFullFocus ? 'h-full min-h-0' : 'min-h-[300px]'}`}>
                  <DrawingCanvas
                    initialDataUrl={drawingDataUrl}
                    initialElements={drawingElements}
                    onChange={handleDrawingCanvasChange}
                  />
                </div>
              )}
            </div>
          </div>

          {/* BÖLÜM 2: SAĞ METADATA & WORKSPACE ACCORDION PANELSİ */}
          <div className="w-full md:w-[42%] bg-slate-50/60 p-3.5 space-y-3 flex flex-col overflow-y-auto">
            {/* ÜST BÖLÜM: ETİKETLER & LOKASYON SEÇİMİ */}
            <div className="space-y-2.5 shrink-0">
              {/* 1. ÇOKLU ETİKET SEÇİMİ */}
              <div className="bg-white border border-slate-200 rounded-2xl p-2.5 space-y-1.5 shadow-2xs">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  Etiketler
                </label>

                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-semibold flex items-center gap-1"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-amber-950 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => {
                        setTagInput(e.target.value);
                        setIsTagDropdownOpen(true);
                      }}
                      onFocus={() => setIsTagDropdownOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(tagInput);
                        }
                      }}
                      placeholder="Etiket yazın veya seçin..."
                      className="flex-1 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag(tagInput)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      Ekle
                    </button>
                  </div>

                  {isTagDropdownOpen && filteredExistingTags.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-28 overflow-y-auto z-20 divide-y divide-slate-100">
                      {filteredExistingTags.map((t) => (
                        <div
                          key={t}
                          onClick={() => handleAddTag(t)}
                          className="px-2.5 py-1.5 text-xs hover:bg-slate-50 cursor-pointer font-medium text-slate-700"
                        >
                          #{t}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. LOKASYON & HARİTA SEÇİMİ */}
              <div className="bg-white border border-slate-200 rounded-2xl p-2.5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    Harita & Lokasyon Seçimi
                  </span>
                  {location && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocation(null);
                        setLocationName('');
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Kaldır
                    </button>
                  )}
                </div>

                {/* Önceki Mekan İsimleri Hızlı Seçimi (Chips & Dropdown) */}
                {allPreviousLocations.length > 0 && (
                  <div className="bg-indigo-50/60 p-2 rounded-xl border border-indigo-100/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-indigo-950">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-indigo-600" />
                        Daha Önceki Mekanlar ({allPreviousLocations.length})
                      </span>
                      {location && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md font-extrabold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Pinlendi
                        </span>
                      )}
                    </div>

                    {/* Chips / Badges */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                      {allPreviousLocations.map((loc) => {
                        const isSelected =
                          location?.id === loc.id ||
                          (locationName && locationName.trim().toLowerCase() === loc.name.trim().toLowerCase());
                        return (
                          <div
                            key={loc.id || loc.name}
                            className={`rounded-xl border flex items-center overflow-hidden shrink-0 transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-white hover:bg-indigo-100/80 text-indigo-900 border-indigo-200/80 shadow-2xs'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectPreviousLocation(loc)}
                              className="px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <MapPin className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-indigo-600'}`} />
                              <span>{loc.name}</span>
                            </button>
                            {onDeleteLocation && loc.id && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (confirm(`"${loc.name}" lokasyonunu silmek istediğinize emin misiniz?`)) {
                                    await onDeleteLocation(loc.id);
                                    if (location?.id === loc.id) {
                                      setLocation(null);
                                      setLocationName('');
                                    }
                                  }
                                }}
                                className={`px-1.5 py-1 text-[10px] transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'hover:bg-indigo-700 text-indigo-200 hover:text-white'
                                    : 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'
                                }`}
                                title="Lokasyonu Sil"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Dropdown for list selection */}
                    {allPreviousLocations.length > 3 && (
                      <select
                        onChange={(e) => {
                          const found = allPreviousLocations.find((l) => (l.id || l.name) === e.target.value);
                          if (found) handleSelectPreviousLocation(found);
                        }}
                        value={
                          location?.id ||
                          allPreviousLocations.find((l) => l.name.toLowerCase() === locationName.toLowerCase())?.id ||
                          ''
                        }
                        className="w-full px-2.5 py-1 text-xs bg-white border border-indigo-200/80 rounded-xl focus:outline-hidden text-indigo-900 font-bold cursor-pointer"
                      >
                        <option value="">-- Listeden Önceki Mekan Seç --</option>
                        {allPreviousLocations.map((loc) => (
                          <option key={loc.id || loc.name} value={loc.id || loc.name}>
                            📍 {loc.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Mekan & Adres Arama Kutusu */}
                <div className="flex items-center gap-1.5 relative z-10">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={placeQuery}
                      onFocus={() => setShowPlaceDropdown(true)}
                      onChange={(e) => handleSearchPlaces(e.target.value)}
                      placeholder="Mekan veya Adres Ara..."
                      className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                    />
                    {isSearchingPlace && (
                      <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin absolute right-2 top-1/2 -translate-y-1/2" />
                    )}

                    {showPlaceDropdown && (matchedSavedLocations.length > 0 || placeResults.length > 0) && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-30 divide-y divide-slate-100">
                        {/* Pre-saved locations matching search */}
                        {matchedSavedLocations.length > 0 && (
                          <div className="bg-indigo-50/40">
                            <div className="px-2 py-1 text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">
                              Önceki Mekanlar
                            </div>
                            {matchedSavedLocations.map((loc) => (
                              <div
                                key={`saved-${loc.id || loc.name}`}
                                onClick={() => handleSelectPreviousLocation(loc)}
                                className="p-2 text-xs hover:bg-indigo-100/70 cursor-pointer flex items-center justify-between"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <span className="font-bold text-indigo-950 truncate">{loc.name}</span>
                                </div>
                                <span className="text-[9px] font-extrabold bg-indigo-200/80 text-indigo-800 px-1.5 py-0.5 rounded-md shrink-0">
                                  Kayıtlı
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* OpenStreetMap Nominatim results */}
                        {placeResults.length > 0 && (
                          <div>
                            {matchedSavedLocations.length > 0 && (
                              <div className="px-2 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                Harita Sonuçları
                              </div>
                            )}
                            {placeResults.map((p) => (
                              <div
                                key={p.place_id}
                                onClick={() => handleSelectPlace(p)}
                                className="p-2 text-xs hover:bg-slate-50 cursor-pointer flex items-start gap-1.5"
                              >
                                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate">
                                    {p.display_name.split(',')[0]}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {p.display_name}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleGetCurrentPosition}
                    disabled={isLocating}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-xl shadow-2xs flex items-center gap-1 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    title="Mevcut GPS Konumumu Getir"
                  >
                    {isLocating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Compass className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Konum Al</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocationName(val);
                    const matched = allPreviousLocations.find(
                      (l) => l.name.trim().toLowerCase() === val.trim().toLowerCase()
                    );
                    if (matched) {
                      handleSelectPreviousLocation(matched);
                    } else if (location) {
                      setLocation({ ...location, name: val });
                    }
                  }}
                  placeholder="Lokasyon Adı (Örn: Kadıköy Ofis)"
                  className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800 font-medium"
                />

                <div className="h-28 w-full rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100 shadow-inner">
                  <div ref={mapContainerRef} className="w-full h-full z-0" />
                </div>
              </div>
            </div>

            {/* ALT BÖLÜM: ACCORDION: BAĞLANAN ÖĞELER (WORKSPACE) */}
            <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2 shrink-0">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Link className="w-4 h-4 text-indigo-600" />
                  Bağlanan Öğeler (Workspace)
                </span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                  {totalWorkspaceLinks} Bağlantı
                </span>
              </div>

              {/* Accordion List */}
              <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">
                {/* 1. GOOGLE TASKS ACCORDION */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  <div
                    onClick={() => setOpenAccordion(openAccordion === 'tasks' ? null : 'tasks')}
                    className="p-2 bg-white flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Google Görevler ({linkedTasks.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenAccordion('tasks');
                          setWsSearch('');
                        }}
                        className="w-6 h-6 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-2xs"
                        title="Yeni Görev Bağla"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      {openAccordion === 'tasks' ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {openAccordion === 'tasks' && (
                    <div className="p-2.5 border-t border-slate-200 bg-white space-y-2">
                      {linkedTasks.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Bağlı Görevler</div>
                          {linkedTasks.map((t) => (
                            <div
                              key={t.id}
                              className="px-2 py-1 bg-purple-50 border border-purple-200 rounded-lg text-xs flex items-center justify-between gap-1.5"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                <span className="font-semibold text-slate-800 truncate">{t.title}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setLinkedTasks(linkedTasks.filter((item) => item.id !== t.id))}
                                className="text-purple-600 hover:text-purple-900 cursor-pointer shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={openAccordion === 'tasks' ? wsSearch : ''}
                          onChange={(e) => setWsSearch(e.target.value)}
                          placeholder="Realtime Google Görevler ara..."
                          className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800"
                        />
                        {isWsSearching && (
                          <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                        )}
                      </div>

                      {wsRemoteTasks.length > 0 && (
                        <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-100 border border-slate-100 rounded-xl p-1 bg-slate-50/50">
                          {wsRemoteTasks.map((task) => {
                            const isLinked = linkedTasks.some((t) => t.id === task.id);
                            return (
                              <div
                                key={task.id}
                                onClick={() => handleToggleTaskLink(task)}
                                className={`p-1.5 text-xs rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                                  isLinked ? 'bg-purple-100/70 text-purple-900 font-bold' : 'hover:bg-purple-50 text-slate-700 font-medium'
                                }`}
                              >
                                <span className="truncate">{task.title}</span>
                                {isLinked ? (
                                  <Check className="w-3.5 h-3.5 text-purple-700 shrink-0 ml-1" />
                                ) : (
                                  <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. E-POSTALAR ACCORDION */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  <div
                    onClick={() => setOpenAccordion(openAccordion === 'emails' ? null : 'emails')}
                    className="p-2 bg-white flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-bold text-slate-800">
                        E-postalar ({linkedEmails.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenAccordion('emails');
                          setWsSearch('');
                        }}
                        className="w-6 h-6 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-2xs"
                        title="Yeni E-posta Bağla"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      {openAccordion === 'emails' ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {openAccordion === 'emails' && (
                    <div className="p-2.5 border-t border-slate-200 bg-white space-y-2">
                      {linkedEmails.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Bağlı E-postalar</div>
                          {linkedEmails.map((em) => (
                            <div
                              key={em.id}
                              className="px-2 py-1 bg-rose-50 border border-rose-200 rounded-lg text-xs flex items-center justify-between gap-1.5"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Mail className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span className="font-semibold text-slate-800 truncate">{em.subject}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setLinkedEmails(linkedEmails.filter((item) => item.id !== em.id))}
                                className="text-rose-600 hover:text-rose-900 cursor-pointer shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={openAccordion === 'emails' ? wsSearch : ''}
                          onChange={(e) => setWsSearch(e.target.value)}
                          placeholder="Realtime Gmail e-postası ara..."
                          className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800"
                        />
                        {isWsSearching && (
                          <Loader2 className="w-3.5 h-3.5 text-rose-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                        )}
                      </div>

                      {wsRemoteEmails.length > 0 && (
                        <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-100 border border-slate-100 rounded-xl p-1 bg-slate-50/50">
                          {wsRemoteEmails.map((em) => {
                            const isLinked = linkedEmails.some((i) => i.id === em.id);
                            return (
                              <div
                                key={em.id}
                                onClick={() => handleToggleEmailLink(em)}
                                className={`p-1.5 text-xs rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                                  isLinked ? 'bg-rose-100/70 text-rose-900 font-bold' : 'hover:bg-rose-50 text-slate-700 font-medium'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="truncate font-semibold">{em.subject}</div>
                                  <div className="text-[10px] text-slate-400 truncate">{em.sender}</div>
                                </div>
                                {isLinked ? (
                                  <Check className="w-3.5 h-3.5 text-rose-700 shrink-0 ml-1" />
                                ) : (
                                  <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. TAKVİM ETKİNLİKLERİ ACCORDION */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  <div
                    onClick={() => setOpenAccordion(openAccordion === 'events' ? null : 'events')}
                    className="p-2 bg-white flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold text-slate-800">
                        Takvim Etkinlikleri ({linkedEvents.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenAccordion('events');
                          setWsSearch('');
                        }}
                        className="w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-2xs"
                        title="Yeni Etkinlik Bağla"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      {openAccordion === 'events' ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {openAccordion === 'events' && (
                    <div className="p-2.5 border-t border-slate-200 bg-white space-y-2">
                      {linkedEvents.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Bağlı Etkinlikler</div>
                          {linkedEvents.map((ev) => (
                            <div
                              key={ev.id}
                              className="px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs flex items-center justify-between gap-1.5"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <CalendarIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="font-semibold text-slate-800 truncate">{ev.summary}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setLinkedEvents(linkedEvents.filter((item) => item.id !== ev.id))}
                                className="text-blue-600 hover:text-blue-900 cursor-pointer shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={openAccordion === 'events' ? wsSearch : ''}
                          onChange={(e) => setWsSearch(e.target.value)}
                          placeholder="Realtime Takvim Etkinliği ara..."
                          className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800"
                        />
                        {isWsSearching && (
                          <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                        )}
                      </div>

                      {wsRemoteEvents.length > 0 && (
                        <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-100 border border-slate-100 rounded-xl p-1 bg-slate-50/50">
                          {wsRemoteEvents.map((ev) => {
                            const isLinked = linkedEvents.some((i) => i.id === ev.id);
                            return (
                              <div
                                key={ev.id}
                                onClick={() => handleToggleEventLink(ev)}
                                className={`p-1.5 text-xs rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                                  isLinked ? 'bg-blue-100/70 text-blue-900 font-bold' : 'hover:bg-blue-50 text-slate-700 font-medium'
                                }`}
                              >
                                <span className="truncate">{ev.summary}</span>
                                {isLinked ? (
                                  <Check className="w-3.5 h-3.5 text-blue-700 shrink-0 ml-1" />
                                ) : (
                                  <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. DRIVE DOSYALARI ACCORDION */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  <div
                    onClick={() => setOpenAccordion(openAccordion === 'drive' ? null : 'drive')}
                    className="p-2 bg-white flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-slate-800">
                        Drive Dosyaları ({linkedDriveFiles.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenAccordion('drive');
                          setWsSearch('');
                        }}
                        className="w-6 h-6 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-2xs"
                        title="Yeni Dosya Bağla"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      {openAccordion === 'drive' ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {openAccordion === 'drive' && (
                    <div className="p-2.5 border-t border-slate-200 bg-white space-y-2">
                      {linkedDriveFiles.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Bağlı Drive Dosyaları</div>
                          {linkedDriveFiles.map((df) => (
                            <div
                              key={df.id}
                              className="px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex items-center justify-between gap-1.5"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <HardDrive className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="font-semibold text-slate-800 truncate">{df.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setLinkedDriveFiles(linkedDriveFiles.filter((item) => item.id !== df.id))}
                                className="text-emerald-600 hover:text-emerald-900 cursor-pointer shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={openAccordion === 'drive' ? wsSearch : ''}
                          onChange={(e) => setWsSearch(e.target.value)}
                          placeholder="Realtime Drive dosyası ara..."
                          className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800"
                        />
                        {isWsSearching && (
                          <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                        )}
                      </div>

                      {wsRemoteDriveFiles.length > 0 && (
                        <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-100 border border-slate-100 rounded-xl p-1 bg-slate-50/50">
                          {wsRemoteDriveFiles.map((df) => {
                            const isLinked = linkedDriveFiles.some((i) => i.id === df.id);
                            return (
                              <div
                                key={df.id}
                                onClick={() => handleToggleDriveLink(df)}
                                className={`p-1.5 text-xs rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                                  isLinked ? 'bg-emerald-100/70 text-emerald-900 font-bold' : 'hover:bg-emerald-50 text-slate-700 font-medium'
                                }`}
                              >
                                <span className="truncate">{df.name}</span>
                                {isLinked ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 ml-1" />
                                ) : (
                                  <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 5. KİŞİLER ACCORDION */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  <div
                    onClick={() => setOpenAccordion(openAccordion === 'contacts' ? null : 'contacts')}
                    className="p-2 bg-white flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-bold text-slate-800">
                        Kişiler ({selectedContacts.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenAccordion('contacts');
                          setWsSearch('');
                        }}
                        className="w-6 h-6 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-2xs"
                        title="Yeni Kişi Bağla"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      {openAccordion === 'contacts' ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {openAccordion === 'contacts' && (
                    <div className="p-2.5 border-t border-slate-200 bg-white space-y-2">
                      {selectedContacts.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Bağlı Kişiler</div>
                          {selectedContacts.map((c) => (
                            <div
                              key={c.resourceName}
                              className="px-2 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs flex items-center justify-between gap-1.5"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span className="font-semibold text-slate-800 truncate">{c.displayName}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedContacts(selectedContacts.filter((item) => item.resourceName !== c.resourceName))}
                                className="text-indigo-600 hover:text-indigo-900 cursor-pointer shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={openAccordion === 'contacts' ? wsSearch : ''}
                          onChange={(e) => setWsSearch(e.target.value)}
                          placeholder="Realtime kişi ara..."
                          className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800"
                        />
                        {isWsSearching && (
                          <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                        )}
                      </div>

                      {wsRemoteContacts.length > 0 && (
                        <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-100 border border-slate-100 rounded-xl p-1 bg-slate-50/50">
                          {wsRemoteContacts.map((c) => {
                            const isLinked = selectedContacts.some((i) => i.resourceName === c.resourceName);
                            return (
                              <div
                                key={c.resourceName}
                                onClick={() => handleToggleContactLink(c)}
                                className={`p-1.5 text-xs rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                                  isLinked ? 'bg-indigo-100/70 text-indigo-900 font-bold' : 'hover:bg-indigo-50 text-slate-700 font-medium'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="truncate font-semibold">{c.displayName}</div>
                                  {c.email && <div className="text-[10px] text-slate-400 truncate">{c.email}</div>}
                                </div>
                                {isLinked ? (
                                  <Check className="w-3.5 h-3.5 text-indigo-700 shrink-0 ml-1" />
                                ) : (
                                  <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Hidden submit trigger */}
          <button type="submit" id="note-modal-submit-btn" className="hidden" />
        </form>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-medium">
            {selectedTags.length} etiket, {totalWorkspaceLinks} workspace bağlantısı ({linkedTasks.length} görev, {linkedEmails.length} mail, {linkedEvents.length} etkinlik, {linkedDriveFiles.length} dosya, {selectedContacts.length} kişi).
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={() => {
                const btn = document.getElementById('note-modal-submit-btn');
                if (btn) btn.click();
              }}
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Notu Kaydet
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
