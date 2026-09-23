'use client';

import { useEffect, useState, useCallback } from 'react';
import { Settings, Building2, Shield, Save, Check, AlertCircle, RotateCcw } from 'lucide-react';
import { getPracticeInfo, updatePracticeInfo } from '@/lib/services';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [practiceName, setPracticeName] = useState('');
  const [tagline, setTagline] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyInfo, setEmergencyInfo] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const info = await getPracticeInfo();
      setPracticeName(info.name ?? '');
      setTagline(info.tagline ?? '');
      setPhone(info.phone ?? '');
      setAddress(info.address ?? '');
      setEmergencyInfo(info.emergencyInfo ?? '');
    } catch (err) {
      console.error('[Settings] Error loading practice info:', err);
      setLoadError('Unable to load practice settings from the database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await updatePracticeInfo({
        name: practiceName,
        tagline,
        phone,
        address,
        emergency_info: emergencyInfo,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('[Settings] Error saving practice info:', err);
      setSaveError('Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Practice Configuration &amp; Aura AI Settings</h1>
            <p className="text-xs text-gray-500">
              Manage practice identity, contact details, and clinical safety protocols.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading || saving || !!loadError}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              Settings Saved
            </>
          ) : saving ? (
            <>
              <Save className="w-4 h-4" />
              Saving…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {saveError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          {saveError}
        </div>
      )}

      {loadError ? (
        <div className="flex flex-col items-center justify-center gap-3 text-center p-8 bg-white rounded-2xl border border-gray-100 shadow-2xs">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-red-700">{loadError}</p>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-300 rounded-lg text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center p-8 text-sm text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-2xs">
          Loading practice settings…
        </div>
      ) : (
        <div className="space-y-4">
          {/* Practice Identity */}
          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">Practice Identity &amp; Information</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Practice Display Name</label>
                <input
                  type="text"
                  value={practiceName}
                  onChange={(e) => setPracticeName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[10.5px] text-gray-400 mt-1 block">Reflected in patient navigation and voice greeting.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Practice Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[10.5px] text-gray-400 mt-1 block">Shown in header and patient trust badges.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[10.5px] text-gray-400 mt-1 block">Main practice contact number.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Practice Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[10.5px] text-gray-400 mt-1 block">Used for patient enquiries and directions.</span>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Emergency Guidance</label>
                <input
                  type="text"
                  value={emergencyInfo}
                  onChange={(e) => setEmergencyInfo(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[10.5px] text-gray-400 mt-1 block">Message Aura conveys for life-threatening emergencies.</span>
              </div>
            </div>
          </div>

          {/* Aura AI Receptionist Parameters */}
          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Shield className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-gray-900">Aura Voice AI &amp; Clinical Safety</h3>
            </div>
            <p className="text-[11px] text-gray-500">
              Aura always escalates red-flag symptoms (chest pain, stroke signs, severe breathing difficulty) to emergency guidance during calls. Configurable AI toggles are planned for a future release.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
