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
} from '../types';

interface Props {
  isOpen: boolean;
  note: NoteItem | null;
  contacts: ContactItem[];
  emails: EmailItem[];
  events: CalendarEvent[];
  existingLocations: NoteLocation[];
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
  }) => Promise<void>;
}

export const NoteModal: React.FC<Props> = ({
  isOpen,
  note,
  contacts,
  emails,
  events,
  existingLocations,
  allExistingTags = [],
  onClose,
  onSave,
}) => {
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
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

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Synchronize Note Data on open
  useEffect(() => {
    if (!isOpen) return;

    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setDate(note.date || new Date().toISOString().split('T')[0]);
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
          html: `<div style="background-color: #4f46e5; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                  <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
                </div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
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
  }, [isOpen, location]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSave({
        id: note?.id,
        title: title.trim() || 'İsimsiz Not',
        content,
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
      <div className="bg-white rounded-3xl max-w-6xl w-full h-[90vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-2xl shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {note ? 'Notu Düzenle' : 'Yeni Not Oluştur'}
              </h3>
              <p className="text-xs text-slate-500">
                2 bölümlü gelişmiş not editörü: İçerik, büyük harita konumu, ilişkili kişiler, mailler ve etkinlikler.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - 2 Columns */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* BÖLÜM 1: GENİŞ SOL İÇERİK PANELSİ */}
          <div className="w-full md:w-[58%] border-b md:border-b-0 md:border-r border-slate-200 p-5 space-y-4 overflow-y-auto flex flex-col">
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
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-bold placeholder:text-slate-400 shadow-2xs"
              />
            </div>

            {/* Note Date */}
            <div className="w-full sm:w-1/2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Not Tarihi</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-800"
                />
              </div>
            </div>

            {/* Note Content (Markdown Editor / Preview) */}
            <div className="flex-1 flex flex-col min-h-[280px]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Not İçeriği (Markdown Formatı Desteklenmektedir)
                </label>
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                      activeTab === 'edit'
                        ? 'bg-white text-indigo-600 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Edit2 className="w-3 h-3" /> Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                      activeTab === 'preview'
                        ? 'bg-white text-indigo-600 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Eye className="w-3 h-3" /> Önizleme
                  </button>
                </div>
              </div>

              {activeTab === 'edit' ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Notunuzu yazın... (# Başlık, - Liste ögesi, **Kalın metin** vb. formatlar desteklenir)"
                  className="w-full flex-1 p-4 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 leading-relaxed resize-none shadow-inner"
                />
              ) : (
                <div className="w-full flex-1 p-4 text-xs bg-slate-50 border border-slate-200 rounded-2xl prose max-w-none text-slate-800 overflow-y-auto">
                  {content.trim() ? (
                    <ReactMarkdown>{content}</ReactMarkdown>
                  ) : (
                    <span className="text-slate-400 italic">Önizleme için metin giriniz...</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* BÖLÜM 2: SAĞ METADATA, BÜYÜK HARİTA VEYA İLİŞKİLİ ÖGELER PANELSİ */}
          <div className="w-full md:w-[42%] bg-slate-50/50 p-5 space-y-4 overflow-y-auto flex flex-col">
            {/* 1. EMBEDDED HARİTA SEÇİMİ (Daha Büyük & İnteraktif) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  Harita & Lokasyon Seçimi
                </span>
                {location && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocation(null);
                      setLocationName('');
                    }}
                    className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Konumu Kaldır
                  </button>
                )}
              </div>

              {/* Location Name Input */}
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Lokasyon Adı (Örn: Kadıköy Ofis)"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800 font-medium"
              />

              {/* Existing Locations Dropdown */}
              {existingLocations.length > 0 && (
                <select
                  value={location?.id || ''}
                  onChange={(e) => {
                    const found = existingLocations.find((l) => l.id === e.target.value);
                    if (found) {
                      setLocation(found);
                      setLocationName(found.name);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
                >
                  <option value="">-- Kayıtlı Lokasyon Seç --</option>
                  {existingLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Leaflet Map Box */}
              <div className="h-44 w-full rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100 shadow-inner">
                <div ref={mapContainerRef} className="w-full h-full z-0" />
              </div>
              <p className="text-[10px] text-slate-400 italic text-center">
                * Haritaya tıklayarak konumu doğrudan harita üzerinden güncelleyin.
              </p>
            </div>

            {/* 2. ÇOKLU KİŞİ SEÇİMİ (AUTO-COMPLETE) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2 shadow-2xs">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-600" />
                İlişkili Kişiler (Çoklu Seçim)
              </label>

              {/* Selected Contacts Pills */}
              <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                {selectedContacts.map((c) => (
                  <span
                    key={c.resourceName}
                    className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
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
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => {
                      setContactSearch(e.target.value);
                      setIsContactDropdownOpen(true);
                    }}
                    onFocus={() => setIsContactDropdownOpen(true)}
                    placeholder="Kişi ara ve ekle..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800"
                  />
                </div>

                {isContactDropdownOpen && filteredContacts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-36 overflow-y-auto z-20 divide-y divide-slate-100">
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
                          className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between hover:bg-slate-50 ${
                            isSelected ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="font-bold">{c.displayName}</div>
                            {c.email && <div className="text-[10px] text-slate-400">{c.email}</div>}
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 3. ÇOKLU ETİKET SEÇİMİ (AUTO-COMPLETE) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2 shadow-2xs">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-amber-600" />
                Etiketler (Çoklu Auto-Complete)
              </label>

              {/* Tag Pills */}
              <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
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

              {/* Tag Input & Dropdown */}
              <div className="relative">
                <div className="flex gap-1.5">
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
                    placeholder="Etiket yazın veya var olanı seçin..."
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag(tagInput)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    Ekle
                  </button>
                </div>

                {isTagDropdownOpen && filteredExistingTags.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-32 overflow-y-auto z-20 divide-y divide-slate-100">
                    {filteredExistingTags.map((t) => (
                      <div
                        key={t}
                        onClick={() => handleAddTag(t)}
                        className="px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer font-medium text-slate-700"
                      >
                        #{t}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 4. İLİŞKİLİ ÖGELER: MAİL LİNKLEME & ETKİNLİK LİNKLEME */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3 shadow-2xs">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Link className="w-4 h-4 text-indigo-600" />
                İlişkili Ögeler (Mail & Takvim Etkinliği)
              </span>

              {/* A. Mail Linkleme */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-rose-500" /> İlişkili E-posta Mailleri
                </label>

                {/* Selected Emails */}
                <div className="space-y-1">
                  {linkedEmails.map((em) => (
                    <div
                      key={em.id}
                      className="p-2 bg-rose-50/70 border border-rose-200/80 rounded-xl text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate">{em.subject}</div>
                        <div className="text-[10px] text-slate-500 truncate">{em.sender}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLinkedEmails(linkedEmails.filter((i) => i.id !== em.id))}
                        className="p-1 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Mail Selection Search & Dropdown */}
                <div className="relative">
                  <input
                    type="text"
                    value={emailSearch}
                    onChange={(e) => {
                      setEmailSearch(e.target.value);
                      setIsEmailDropdownOpen(true);
                    }}
                    onFocus={() => setIsEmailDropdownOpen(true)}
                    placeholder="E-posta konusu veya gönderen ara..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800"
                  />

                  {isEmailDropdownOpen && filteredEmails.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-36 overflow-y-auto z-20 divide-y divide-slate-100">
                      {filteredEmails.map((em) => {
                        const isSelected = linkedEmails.some((i) => i.id === em.id);
                        return (
                          <div
                            key={em.id}
                            onClick={() => {
                              handleToggleEmail(em);
                              setIsEmailDropdownOpen(false);
                              setEmailSearch('');
                            }}
                            className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between hover:bg-slate-50 ${
                              isSelected ? 'bg-rose-50 text-rose-900 font-semibold' : 'text-slate-700'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-bold truncate">{em.subject}</div>
                              <div className="text-[10px] text-slate-400 truncate">{em.sender}</div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* B. Etkinlik Linkleme */}
              <div className="space-y-1.5 border-t border-slate-100 pt-2">
                <label className="block text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-blue-500" /> İlişkili Takvim Etkinlikleri
                </label>

                {/* Selected Events */}
                <div className="space-y-1">
                  {linkedEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-2 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate">{ev.summary}</div>
                        {ev.start && (
                          <div className="text-[10px] text-slate-500 truncate">
                            {new Date(ev.start).toLocaleString('tr-TR')}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setLinkedEvents(linkedEvents.filter((i) => i.id !== ev.id))}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Event Selection Search & Dropdown */}
                <div className="relative">
                  <input
                    type="text"
                    value={eventSearch}
                    onChange={(e) => {
                      setEventSearch(e.target.value);
                      setIsEventDropdownOpen(true);
                    }}
                    onFocus={() => setIsEventDropdownOpen(true)}
                    placeholder="Takvim etkinliği ara..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800"
                  />

                  {isEventDropdownOpen && filteredEvents.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-36 overflow-y-auto z-20 divide-y divide-slate-100">
                      {filteredEvents.map((ev) => {
                        const isSelected = linkedEvents.some((i) => i.id === ev.id);
                        return (
                          <div
                            key={ev.id}
                            onClick={() => {
                              handleToggleEvent(ev);
                              setIsEventDropdownOpen(false);
                              setEventSearch('');
                            }}
                            className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between hover:bg-slate-50 ${
                              isSelected ? 'bg-blue-50 text-blue-900 font-semibold' : 'text-slate-700'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-bold truncate">{ev.summary}</div>
                              {ev.start && (
                                <div className="text-[10px] text-slate-400">
                                  {new Date(ev.start).toLocaleDateString('tr-TR')}
                                </div>
                              )}
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                          </div>
                        );
                      })}
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
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {selectedContacts.length} kişi, {selectedTags.length} etiket, {linkedEmails.length} e-posta, {linkedEvents.length} etkinlik seçili.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Notu Kaydet
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
