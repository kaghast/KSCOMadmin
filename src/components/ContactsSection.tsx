import React, { useState } from 'react';
import { Users, Plus, RefreshCw, Search, Edit2, Mail, Phone, Building, User } from 'lucide-react';
import { ContactItem } from '../types';

interface Props {
  contacts: ContactItem[];
  onAddContact: () => void;
  onEditContact: (contact: ContactItem) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const ContactsSection: React.FC<Props> = ({
  contacts,
  onAddContact,
  onEditContact,
  onRefresh,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredContacts = contacts.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      c.phone.toLowerCase().includes(term) ||
      (c.organization && c.organization.toLowerCase().includes(term)) ||
      (c.jobTitle && c.jobTitle.toLowerCase().includes(term))
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-base">Google Kişiler</h2>
            <p className="text-xs text-slate-500">Rehberdeki Kişileri Görüntüle ve Güncelle</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            title="Yenile"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <button
            onClick={onAddContact}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Yeni Kişi Ekle
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-slate-100 bg-white">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="İsim, e-posta, telefon veya şirket ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="p-3 overflow-y-auto max-h-[380px] space-y-2 flex-1">
        {filteredContacts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Users className="w-8 h-8 stroke-1 text-slate-300" />
            <p className="text-xs font-medium">
              {searchTerm ? 'Aramanıza uygun kişi bulunamadı.' : 'Rehberde kayıtlı kişi bulunamadı.'}
            </p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact.resourceName}
              className="p-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-all flex flex-wrap items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Avatar */}
                {contact.photoUrl ? (
                  <img
                    src={contact.photoUrl}
                    alt={contact.displayName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0">
                    {contact.displayName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || <User className="w-4 h-4" />}
                  </div>
                )}

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                      {contact.displayName}
                    </h4>
                    {(contact.organization || contact.jobTitle) && (
                      <span className="text-[10px] font-medium bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md border border-indigo-100/80 shrink-0 flex items-center gap-1">
                        <Building className="w-2.5 h-2.5" />
                        {contact.organization || contact.jobTitle}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1">
                    {contact.email && (
                      <span className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <a href={`mailto:${contact.email}`} className="truncate">
                          {contact.email}
                        </a>
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{contact.phone}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Action Button */}
              <button
                onClick={() => onEditContact(contact)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs cursor-pointer shrink-0"
              >
                <Edit2 className="w-3.5 h-3.5" /> Düzenle
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
