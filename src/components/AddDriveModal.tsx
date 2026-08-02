import React, { useState } from 'react';
import { X, HardDrive, FileText, FileSpreadsheet, Presentation } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, content: string, mimeType: string) => Promise<void>;
}

export const AddDriveModal: React.FC<Props> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [docType, setDocType] = useState<'doc' | 'sheet' | 'slide'>('doc');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setIsSubmitting(true);
    let mime = 'application/vnd.google-apps.document';
    if (docType === 'sheet') mime = 'application/vnd.google-apps.spreadsheet';
    if (docType === 'slide') mime = 'application/vnd.google-apps.presentation';

    try {
      await onAdd(name, content, mime);
      setName('');
      setContent('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-lg">Google Drive Dokümanı Oluştur</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Doküman Türü</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDocType('doc')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  docType === 'doc'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-5 h-5 mb-1 text-blue-600" />
                Google Doküman
              </button>
              <button
                type="button"
                onClick={() => setDocType('sheet')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  docType === 'sheet'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 mb-1 text-emerald-600" />
                Google E-Tablo
              </button>
              <button
                type="button"
                onClick={() => setDocType('slide')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  docType === 'slide'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Presentation className="w-5 h-5 mb-1 text-amber-600" />
                Google Slayt
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Dosya / Doküman Adı</label>
            <input
              type="text"
              required
              placeholder="Örn: 2026 Strateji Raporu"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Başlangıç İçeriği / Notlar</label>
            <textarea
              rows={4}
              placeholder="Dokümanın başlangıç taslağını girin..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
            />
          </div>

          <p className="text-[11px] text-slate-500 bg-amber-50 border border-amber-200/60 rounded-lg p-2.5">
            ⭐ Oluşturulan dosya otomatik olarak Google Drive hesabınızda Yıldızlı (Starred) listesine eklenecektir.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Oluşturuluyor...' : 'Drive\'a Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
