import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { NoteItem, ContactItem, NoteLocation } from '../types';

interface Props {
  isOpen: boolean;
  note: NoteItem | null;
  contacts: ContactItem[];
  existingLocations: NoteLocation[];
  onClose: () => void;
  onOpenMapPicker: (currentLocation: NoteLocation | null) => void;
  onSave: (data: {
    id?: string;
    title: string;
    content: string;
    contactResourceName?: string;
    contactDisplayName?: string;
    tags: string[];
    location?: NoteLocation | null;
    date: string;
  }) => Promise<void>;
  selectedLocationFromMap: NoteLocation | null;
}

export const NoteModal: React.FC<Props> = ({
  isOpen,
  note,
  contacts,
  existingLocations,
  onClose,
  onOpenMapPicker,
  onSave,
  selectedLocationFromMap,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contactResourceName, setContactResourceName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState<NoteLocation | null>(null);

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setContactResourceName(note.contactResourceName || '');
      setTags(note.tags || []);
      setDate(note.date || new Date().toISOString().split('T')[0]);
      setLocation(note.location || null);
    } else {
      setTitle('');
      setContent('');
      setContactResourceName('');
      setTags([]);
      setDate(new Date().toISOString().split('T')[0]);
      setLocation(null);
    }
  }, [note, isOpen]);

  // Update location if user selected one from the Map Picker
  useEffect(() => {
    if (selectedLocationFromMap) {
      setLocation(selectedLocationFromMap);
    }
  }, [selectedLocationFromMap]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const selectedContactObj = contacts.find((c) => c.resourceName === contactResourceName);

    try {
      await onSave({
        id: note?.id,
        title: title.trim() || 'İsimsiz Not',
        content,
        contactResourceName: contactResourceName || undefined,
        contactDisplayName: selectedContactObj?.displayName || undefined,
        tags,
        location,
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
    <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-2xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {note ? 'Notu Düzenle' : 'Yeni Not Oluştur'}
              </h3>
              <p className="text-xs text-slate-500">
                Markdown metin, kişi bağlantısı, etiket ve konum bilgisi ekleyin.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Note Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Not Başlığı <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Müşteri Görüşmesi & Proje Notları"
              required
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-semibold placeholder:text-slate-400"
            />
          </div>

          {/* Contact & Date row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Link to Contact */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                İlişkili Kişi (Google Contacts)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={contactResourceName}
                  onChange={(e) => setContactResourceName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-medium"
                >
                  <option value="">-- Kişi Bağlantısı Yok --</option>
                  {contacts.map((c) => (
                    <option key={c.resourceName} value={c.resourceName}>
                      {c.displayName} {c.organization ? `(${c.organization})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Note Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Not Tarihi
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Location Picker Row */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Konum Bilgisi</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenMapPicker(location)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 flex items-center gap-2 transition-colors cursor-pointer shrink-0"
              >
                <MapPin className="w-4 h-4 text-indigo-600" />
                {location ? 'Konumu Haritada Değiştir' : 'Haritadan Konum Seç'}
              </button>

              {location ? (
                <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-medium flex items-center gap-2 truncate">
                  <span className="truncate">{location.name}</span>
                  <button
                    type="button"
                    onClick={() => setLocation(null)}
                    className="p-0.5 hover:bg-indigo-200 text-indigo-600 rounded-full cursor-pointer"
                    title="Konumu Kaldır"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">Konum eklenmedi</span>
              )}
            </div>
          </div>

          {/* Tags Row */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Etiketler (Tags)
            </label>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-medium flex items-center gap-1"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-indigo-900 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Yeni etiket yazıp Enter'a veya Ekle'ye basın"
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content with Markdown Editor & Preview Tabs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">Not İçeriği (Markdown Supported)</label>
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
                rows={6}
                placeholder="Not içeriğinizi yazın... Markdown formatı desteklenmektedir (# Başlık, - Liste, **Kalın** vb.)"
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 leading-relaxed"
              />
            ) : (
              <div className="w-full p-4 text-xs bg-slate-50 border border-slate-200 rounded-2xl min-h-[140px] prose max-w-none text-slate-800 overflow-y-auto">
                {content.trim() ? (
                  <ReactMarkdown>{content}</ReactMarkdown>
                ) : (
                  <span className="text-slate-400 italic">Önizleme için not içeriği girin...</span>
                )}
              </div>
            )}
          </div>

          {/* Submit Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
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
        </form>
      </div>
    </div>
  );
};
