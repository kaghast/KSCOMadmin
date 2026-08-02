import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, Edit3, Check, Navigation, Search } from 'lucide-react';
import L from 'leaflet';
import { NoteLocation } from '../types';

interface Props {
  isOpen: boolean;
  selectedLocation: NoteLocation | null;
  existingLocations: NoteLocation[];
  onClose: () => void;
  onSelectLocation: (loc: NoteLocation) => void;
  onRenameLocation: (id: string, newName: string) => Promise<void>;
}

export const MapPickerModal: React.FC<Props> = ({
  isOpen,
  selectedLocation,
  existingLocations,
  onClose,
  onSelectLocation,
  onRenameLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const selectedMarkerRef = useRef<L.Marker | null>(null);
  const savedMarkersRef = useRef<{ [key: string]: L.Marker }>({});

  const [currentLat, setCurrentLat] = useState<number>(selectedLocation?.lat || 41.0082);
  const [currentLng, setCurrentLng] = useState<number>(selectedLocation?.lng || 28.9784);
  const [locationName, setLocationName] = useState<string>(selectedLocation?.name || '');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    selectedLocation?.id || null
  );

  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [editingLocName, setEditingLocName] = useState<string>('');

  useEffect(() => {
    if (selectedLocation) {
      setCurrentLat(selectedLocation.lat);
      setCurrentLng(selectedLocation.lng);
      setLocationName(selectedLocation.name);
      setSelectedLocationId(selectedLocation.id);
    } else {
      setCurrentLat(41.0082);
      setCurrentLng(28.9784);
      setLocationName('');
      setSelectedLocationId(null);
    }
  }, [selectedLocation, isOpen]);

  // Initialize or re-render map when modal opens
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Small timeout to allow container animation / sizing
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        // Default center Istanbul if none selected
        const initLat = selectedLocation?.lat || 41.0082;
        const initLng = selectedLocation?.lng || 28.9784;

        const map = L.map(mapContainerRef.current, {
          center: [initLat, initLng],
          zoom: 12,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        // Custom Icon SVG
        const customIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `<div style="background-color: #4f46e5; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                  <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
                </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        // Click event on map to pick custom coordinate
        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          setCurrentLat(lat);
          setCurrentLng(lng);
          setSelectedLocationId(null);

          if (!selectedMarkerRef.current) {
            selectedMarkerRef.current = L.marker([lat, lng], {
              icon: customIcon,
              draggable: true,
            }).addTo(map);

            selectedMarkerRef.current.on('dragend', (evt) => {
              const marker = evt.target;
              const pos = marker.getLatLng();
              setCurrentLat(pos.lat);
              setCurrentLng(pos.lng);
            });
          } else {
            selectedMarkerRef.current.setLatLng([lat, lng]);
          }
        });

        mapInstanceRef.current = map;
      } else {
        mapInstanceRef.current.invalidateSize();
      }

      const map = mapInstanceRef.current;
      if (!map) return;

      // Update existing location markers
      Object.values(savedMarkersRef.current).forEach((m) => m.remove());
      savedMarkersRef.current = {};

      const savedIcon = L.divIcon({
        className: 'saved-map-pin',
        html: `<div style="background-color: #059669; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center;">
                <div style="width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div>
              </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      existingLocations.forEach((loc) => {
        const marker = L.marker([loc.lat, loc.lng], { icon: savedIcon })
          .addTo(map)
          .bindTooltip(loc.name, { permanent: false, direction: 'top' });

        marker.on('click', () => {
          setCurrentLat(loc.lat);
          setCurrentLng(loc.lng);
          setLocationName(loc.name);
          setSelectedLocationId(loc.id);

          map.setView([loc.lat, loc.lng], 14);
        });

        savedMarkersRef.current[loc.id] = marker;
      });

      // Update selected marker position
      if (currentLat && currentLng) {
        const activeIcon = L.divIcon({
          className: 'active-map-pin',
          html: `<div style="background-color: #4f46e5; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(79, 70, 229, 0.4); display: flex; align-items: center; justify-content: center;">
                  <div style="width: 10px; height: 10px; background-color: white; border-radius: 50%;"></div>
                </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        if (!selectedMarkerRef.current) {
          selectedMarkerRef.current = L.marker([currentLat, currentLng], {
            icon: activeIcon,
            draggable: true,
          }).addTo(map);

          selectedMarkerRef.current.on('dragend', (evt) => {
            const pos = evt.target.getLatLng();
            setCurrentLat(pos.lat);
            setCurrentLng(pos.lng);
          });
        } else {
          selectedMarkerRef.current.setLatLng([currentLat, currentLng]);
        }

        map.setView([currentLat, currentLng], 13);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, existingLocations]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const finalName = locationName.trim() || `Lokasyon (${currentLat.toFixed(4)}, ${currentLng.toFixed(4)})`;
    const finalLoc: NoteLocation = {
      id: selectedLocationId || `loc-${Date.now()}`,
      name: finalName,
      lat: currentLat,
      lng: currentLng,
    };
    onSelectLocation(finalLoc);
    onClose();
  };

  const handleSelectExisting = (loc: NoteLocation) => {
    setCurrentLat(loc.lat);
    setCurrentLng(loc.lng);
    setLocationName(loc.name);
    setSelectedLocationId(loc.id);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([loc.lat, loc.lng], 14);
    }
  };

  const handleStartRename = (loc: NoteLocation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLocId(loc.id);
    setEditingLocName(loc.name);
  };

  const handleSaveRename = async (locId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingLocName.trim()) {
      await onRenameLocation(locId, editingLocName.trim());
      if (selectedLocationId === locId) {
        setLocationName(editingLocName.trim());
      }
    }
    setEditingLocId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full h-[600px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Haritadan Konum Seç</h3>
              <p className="text-xs text-slate-500">
                Haritaya tıklayarak yeni konum işaretleyin veya kayıtlı lokasyonlardan birini seçin.
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

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Saved Locations Side Panel */}
          <div className="w-full md:w-72 border-r border-slate-200 bg-slate-50/70 p-3 flex flex-col overflow-y-auto">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-indigo-600" /> Önceki Lokasyonlar
            </h4>

            {existingLocations.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center italic">
                Henüz kayıtlı lokasyon yok. Haritaya tıklayarak yeni bir tane oluşturabilirsiniz.
              </p>
            ) : (
              <div className="space-y-1.5 flex-1">
                {existingLocations.map((loc) => {
                  const isSelected = selectedLocationId === loc.id;
                  const isEditing = editingLocId === loc.id;

                  return (
                    <div
                      key={loc.id}
                      onClick={() => handleSelectExisting(loc)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 group ${
                        isSelected
                          ? 'bg-indigo-50/90 border-indigo-200 text-indigo-900 font-semibold shadow-2xs'
                          : 'bg-white border-slate-200/80 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MapPin
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-indigo-600' : 'text-slate-400'
                          }`}
                        />

                        {isEditing ? (
                          <input
                            type="text"
                            value={editingLocName}
                            onChange={(e) => setEditingLocName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 text-xs bg-white border border-indigo-300 rounded-md focus:outline-hidden text-slate-800"
                          />
                        ) : (
                          <span className="truncate">{loc.name}</span>
                        )}
                      </div>

                      {isEditing ? (
                        <button
                          onClick={(e) => handleSaveRename(loc.id, e)}
                          className="p-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 shrink-0"
                          title="Kaydet"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleStartRename(loc, e)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          title="Lokasyonu Yeniden Adlandır"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Leaflet Map View */}
          <div className="flex-1 relative bg-slate-100">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Floating Selection Box */}
            <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/90 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Seçilen Lokasyon Adı
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Örn: Levent Teknoloji Ofisi"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <MapPin className="w-4 h-4" /> Konumu Onayla
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
