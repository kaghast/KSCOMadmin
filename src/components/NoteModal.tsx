import React, { useState, useEffect, useRef } from 'react';
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
  Compass,
  Pencil,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import L from 'leaflet';
import {
  NoteItem,
  ContactItem,
  NoteLocation,
  EmailItem,
  CalendarEvent,
  LinkedContact,
  LinkedEmail,
  LinkedEvent,
  Project,
  ProjectTask,
} from '../types';
import { DrawingCanvas } from './DrawingCanvas';

interface Props {
  isOpen: boolean;
  note: NoteItem | null;
  contacts: ContactItem[];
  emails: EmailItem[];
  events: CalendarEvent[];
  existingLocations: NoteLocation[];
  projects?: Project[];
  projectTasks?: ProjectTask[];
  allExistingTags?: string[];
  onClose: () => void;
  onSave: (data: {
    id?: string;
    title: string;
    content: string;
    contacts?: LinkedContact[];
    linkedEmails?: LinkedEmail[];
    linkedEvents?: LinkedEvent[];
    tags: string[];
    location?: NoteLocation | null;
    date: string;
    projectId?: string;
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
  contacts,
  emails,
  events,
  existingLocations,
  projects = [],
  projectTasks = [],
  allExistingTags = [],
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

  // Selected Arrays
  const [selectedContacts, setSelectedContacts] = useState<LinkedContact[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [linkedEmails, setLinkedEmails] = useState<LinkedEmail[]>([]);
  const [linkedEvents, setLinkedEvents] = useState<LinkedEvent[]>([]);

  // Autocomplete Inputs & Dropdown Toggles
  const [contactSearch, setContactSearch] = useState('');
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false);

  const [tagInput, setTagInput] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  const [emailSearch, setEmailSearch] = useState('');
  const [isEmailDropdownOpen, setIsEmailDropdownOpen] = useState(false);

  const [eventSearch, setEventSearch] = useState('');
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);

  // Content Modes: Edit (Markdown), Preview (Markdown), Drawing (Canvas)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'drawing'>('edit');
  const [drawingDataUrl, setDrawingDataUrl] = useState<string>('');

  // Place Search & Geolocation State
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [isSearchingPlace, setIsSearchingPlace] = useState(false);
  const [showPlaceDropdown, setShowPlaceDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Extract drawing data URL from note content if exists
  const extractDrawingFromContent = (text: string) => {
    const match = text.match(/!\[Çizim Notu\]\((data:image\/[^\)]+)\)/);
    return match ? match[1] : '';
  };

  // Synchronize Note Data on open
  useEffect(() => {
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

      setDate(note.date || new Date().toISOString().split('T')[0]);
      setSelectedProjectId(note.projectId || '');
      setLocation(note.location || null);
      setLocationName(note.location?.name || '');

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
    } else {
      setTitle('');
      setContent('');
      setDrawingDataUrl('');
      setDate(new Date().toISOString().split('T')[0]);
      setLocation(null);
      setLocationName('');
      setSelectedContacts([]);
      setSelectedTags([]);
      setLinkedEmails([]);
      setLinkedEvents([]);
    }
  }, [note, isOpen]);

  // Leaflet Map Initialization & Updates inside Modal
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      const initLat = location?.lat || 41.0082;
      const initLng = location?.lng || 28.9784;

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

      if (location) {
        map.setView([location.lat, location.lng], 13);
        const activeIcon = L.divIcon({
          className: 'custom-note-pin-active',
          html: `<div style="background-color: #4f46e5; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(79, 70, 229, 0.4); display: flex; align-items: center; justify-content: center;">
                  <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
                </div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
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
  }, [isOpen, location]);

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

  // Contact Autocomplete Helpers
  const filteredContacts = contacts.filter(
    (c) =>
      c.displayName.toLowerCase().includes(contactSearch.toLowerCase()) ||
      (c.organization && c.organization.toLowerCase().includes(contactSearch.toLowerCase()))
  );

  const handleToggleContact = (c: ContactItem) => {
    const exists = selectedContacts.some((item) => item.resourceName === c.resourceName);
    if (exists) {
      setSelectedContacts(selectedContacts.filter((item) => item.resourceName !== c.resourceName));
    } else {
      setSelectedContacts([
        ...selectedContacts,
        { resourceName: c.resourceName, displayName: c.displayName },
      ]);
    }
  };

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

  // Email Autocomplete Helpers
  const filteredEmails = emails.filter(
    (e) =>
      e.subject.toLowerCase().includes(emailSearch.toLowerCase()) ||
      e.sender.toLowerCase().includes(emailSearch.toLowerCase())
  );

  const handleToggleEmail = (eItem: EmailItem) => {
    const exists = linkedEmails.some((item) => item.id === eItem.id);
    if (exists) {
      setLinkedEmails(linkedEmails.filter((item) => item.id !== eItem.id));
    } else {
      setLinkedEmails([
        ...linkedEmails,
        { id: eItem.id, subject: eItem.subject, sender: eItem.sender, date: eItem.date },
      ]);
    }
  };

  // Calendar Event Autocomplete Helpers
  const filteredEvents = events.filter(
    (ev) =>
      ev.summary.toLowerCase().includes(eventSearch.toLowerCase()) ||
      (ev.description && ev.description.toLowerCase().includes(eventSearch.toLowerCase()))
  );

  const handleToggleEvent = (ev: CalendarEvent) => {
    const exists = linkedEvents.some((item) => item.id === ev.id);
    if (exists) {
      setLinkedEvents(linkedEvents.filter((item) => item.id !== ev.id));
    } else {
      setLinkedEvents([
        ...linkedEvents,
        { id: ev.id, summary: ev.summary, start: ev.start },
      ]);
    }
  };

  // Handle Drawing Canvas Change
  const handleDrawingCanvasChange = (dataUrl: string) => {
    setDrawingDataUrl(dataUrl);
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

      // Merge drawing image into content if drawing exists
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

      await onSave({
        id: note?.id,
        title: title.trim() || 'İsimsiz Not',
        content: finalContent,
        contacts: selectedContacts,
        linkedEmails,
        linkedEvents,
        tags: selectedTags,
        location: location
          ? {
              ...location,
              name: locationName.trim() || location.name || 'Lokasyon',
            }
          : null,
        date,
        projectId: selectedProjectId || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Note Save Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
                Gelişmiş not editörü: Metin / Çizim modu, mekan arama & anlık konum haritası, ilişkili kişiler ve mailler.
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
                <label className="block text-[11px] font-bold text-slate-700 mb-1">İlişkili Kanban Kartı</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-800"
                >
                  <option value="">Kart Yok (Genel Not)</option>
                  {projectTasks && projectTasks.length > 0
                    ? projectTasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))
                    : projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                </select>
              </div>
            </div>

            {/* Note Content - 3 MODES (Düzenle, Önizleme, Çizim) */}
            <div className="flex-1 flex flex-col min-h-[280px]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Not İçeriği Modu
                </label>
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
              </div>

              {/* Tab Content Display */}
              {activeTab === 'edit' && (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Notunuzu yazın... (# Başlık, - Liste ögesi, **Kalın metin** vb. formatlar desteklenir)"
                  className="w-full flex-1 p-3.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 leading-relaxed resize-none shadow-inner"
                />
              )}

              {activeTab === 'preview' && (
                <div className="w-full flex-1 p-4 text-xs bg-slate-50 border border-slate-200 rounded-2xl prose max-w-none text-slate-800 overflow-y-auto">
                  {content.trim() ? (
                    <ReactMarkdown
                      urlTransform={(url) => url}
                      components={{
                        img: ({ src, alt, ...props }) => {
                          if (!src) return null;
                          return (
                            <img
                              src={src}
                              alt={alt || 'Çizim Notu'}
                              className="max-h-72 rounded-xl border border-slate-200 my-2 object-contain bg-white shadow-2xs"
                              {...props}
                            />
                          );
                        },
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  ) : (
                    <span className="text-slate-400 italic">Önizleme için metin giriniz...</span>
                  )}
                </div>
              )}

              {activeTab === 'drawing' && (
                <div className="flex-1 min-h-[300px]">
                  <DrawingCanvas
                    initialDataUrl={drawingDataUrl}
                    onChange={handleDrawingCanvasChange}
                  />
                </div>
              )}
            </div>
          </div>

          {/* BÖLÜM 2: SAĞ METADATA & HARİTA PANELSİ - Fits cleanly without scrolling */}
          <div className="w-full md:w-[42%] bg-slate-50/60 p-4 space-y-3 flex flex-col justify-between overflow-y-auto">
            {/* 1. EMBEDDED HARİTA SEÇİMİ (Mekan Arama Autocomplete + GPS Position) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-2.5 space-y-2 shadow-2xs shrink-0">
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

              {/* Place Search Autocomplete & Current GPS Button */}
              <div className="flex items-center gap-1.5 relative z-20">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={placeQuery}
                    onChange={(e) => handleSearchPlaces(e.target.value)}
                    placeholder="Mekan veya Adres Ara..."
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                  />
                  {isSearchingPlace && (
                    <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin absolute right-2 top-1/2 -translate-y-1/2" />
                  )}

                  {/* Autocomplete Dropdown */}
                  {showPlaceDropdown && placeResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto z-30 divide-y divide-slate-100">
                      {placeResults.map((p) => (
                        <div
                          key={p.place_id}
                          onClick={() => handleSelectPlace(p)}
                          className="p-2 text-xs hover:bg-indigo-50 cursor-pointer flex items-start gap-1.5"
                        >
                          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
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

              {/* Location Name Input */}
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Lokasyon Adı (Örn: Kadıköy Ofis)"
                className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800 font-medium"
              />

              {/* Compact Leaflet Map Box */}
              <div className="h-28 w-full rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100 shadow-inner">
                <div ref={mapContainerRef} className="w-full h-full z-0" />
              </div>
            </div>

            {/* 2. ÇOKLU KİŞİ SEÇİMİ (AUTO-COMPLETE) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-2.5 space-y-1.5 shadow-2xs shrink-0">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                İlişkili Kişiler
              </label>

              {/* Selected Contacts Pills */}
              <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                {selectedContacts.map((c) => (
                  <span
                    key={c.resourceName}
                    className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                  >
                    <span>{c.displayName}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedContacts(selectedContacts.filter((item) => item.resourceName !== c.resourceName))
                      }
                      className="hover:text-emerald-950 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Contact Autocomplete Input */}
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => {
                    setContactSearch(e.target.value);
                    setIsContactDropdownOpen(true);
                  }}
                  onFocus={() => setIsContactDropdownOpen(true)}
                  placeholder="Kişi ara..."
                  className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800"
                />

                {isContactDropdownOpen && filteredContacts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-32 overflow-y-auto z-20 divide-y divide-slate-100">
                    {filteredContacts.map((c) => {
                      const isSelected = selectedContacts.some((sc) => sc.resourceName === c.resourceName);
                      return (
                        <div
                          key={c.resourceName}
                          onClick={() => {
                            handleToggleContact(c);
                            setIsContactDropdownOpen(false);
                            setContactSearch('');
                          }}
                          className={`px-2.5 py-1.5 text-xs cursor-pointer flex items-center justify-between hover:bg-slate-50 ${
                            isSelected ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-slate-700'
                          }`}
                        >
                          <div className="truncate font-semibold">{c.displayName}</div>
                          {isSelected && <Check className="w-3 h-3 text-emerald-600" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 3. ÇOKLU ETİKET SEÇİMİ (AUTO-COMPLETE) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-2.5 space-y-1.5 shadow-2xs shrink-0">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                Etiketler
              </label>

              {/* Tag Pills */}
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

              {/* Tag Input */}
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

            {/* 4. İLİŞKİLİ ÖGELER: MAİL LİNKLEME & ETKİNLİK LİNKLEME */}
            <div className="bg-white border border-slate-200 rounded-2xl p-2.5 space-y-2 shadow-2xs shrink-0">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-indigo-600" />
                İlişkili Mailler & Etkinlikler
              </span>

              {/* Selected Links Compact List */}
              {(linkedEmails.length > 0 || linkedEvents.length > 0) && (
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {linkedEmails.map((em) => (
                    <div
                      key={em.id}
                      className="px-2 py-0.5 bg-rose-50 border border-rose-200 rounded-lg text-[10px] flex items-center justify-between gap-1"
                    >
                      <span className="font-bold text-slate-800 truncate">📧 {em.subject}</span>
                      <button
                        type="button"
                        onClick={() => setLinkedEmails(linkedEmails.filter((i) => i.id !== em.id))}
                        className="text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {linkedEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-lg text-[10px] flex items-center justify-between gap-1"
                    >
                      <span className="font-bold text-slate-800 truncate">📅 {ev.summary}</span>
                      <button
                        type="button"
                        onClick={() => setLinkedEvents(linkedEvents.filter((i) => i.id !== ev.id))}
                        className="text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Select Autocomplete Inputs */}
              <div className="grid grid-cols-2 gap-1.5">
                {/* Mail Autocomplete */}
                <div className="relative">
                  <input
                    type="text"
                    value={emailSearch}
                    onChange={(e) => {
                      setEmailSearch(e.target.value);
                      setIsEmailDropdownOpen(true);
                    }}
                    onFocus={() => setIsEmailDropdownOpen(true)}
                    placeholder="Mail ara..."
                    className="w-full px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800"
                  />
                  {isEmailDropdownOpen && filteredEmails.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-32 overflow-y-auto z-20 divide-y divide-slate-100">
                      {filteredEmails.map((em) => (
                        <div
                          key={em.id}
                          onClick={() => {
                            handleToggleEmail(em);
                            setIsEmailDropdownOpen(false);
                            setEmailSearch('');
                          }}
                          className="px-2 py-1.5 text-[11px] cursor-pointer hover:bg-slate-50 truncate font-semibold"
                        >
                          {em.subject}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Event Autocomplete */}
                <div className="relative">
                  <input
                    type="text"
                    value={eventSearch}
                    onChange={(e) => {
                      setEventSearch(e.target.value);
                      setIsEventDropdownOpen(true);
                    }}
                    onFocus={() => setIsEventDropdownOpen(true)}
                    placeholder="Etkinlik ara..."
                    className="w-full px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800"
                  />
                  {isEventDropdownOpen && filteredEvents.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-32 overflow-y-auto z-20 divide-y divide-slate-100">
                      {filteredEvents.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => {
                            handleToggleEvent(ev);
                            setIsEventDropdownOpen(false);
                            setEventSearch('');
                          }}
                          className="px-2 py-1.5 text-[11px] cursor-pointer hover:bg-slate-50 truncate font-semibold"
                        >
                          {ev.summary}
                        </div>
                      ))}
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
            {selectedContacts.length} kişi, {selectedTags.length} etiket, {linkedEmails.length} mail, {linkedEvents.length} etkinlik.
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
