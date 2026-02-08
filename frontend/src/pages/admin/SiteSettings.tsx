import { useState, useEffect } from 'react';
import api from '../../api/client';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface Setting {
  key: string;
  value: string;
}

const settingKeys = [
  { key: 'business_name', label: 'Business Name', type: 'text' },
  { key: 'business_email', label: 'Email', type: 'email' },
  { key: 'business_phone', label: 'Phone', type: 'tel' },
  { key: 'business_address', label: 'Address', type: 'text' },
  { key: 'instagram_url', label: 'Instagram URL', type: 'url' },
  { key: 'facebook_url', label: 'Facebook URL', type: 'url' },
  { key: 'tiktok_url', label: 'TikTok URL', type: 'url' },
  { key: 'about_content', label: 'About Page Content', type: 'textarea' },
  { key: 'hero_text', label: 'Homepage Hero Text', type: 'text' },
];

export default function SiteSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await api.get('/admin/settings');
      const map: Record<string, string> = {};
      data.settings.forEach((s: Setting) => { map[s.key] = s.value; });
      setSettings(map);
    } catch {}
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    for (const { key } of settingKeys) {
      if (settings[key] !== undefined) {
        await api.put(`/admin/settings/${key}`, { value: settings[key] });
      }
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-primary mb-6">Site Settings</h1>
      <div className="bg-white border rounded-lg p-6 space-y-4">
        {settingKeys.map(({ key, label, type }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            {type === 'textarea' ? (
              <textarea
                value={settings[key] || ''}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            ) : (
              <input
                type={type}
                value={settings[key] || ''}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent"
              />
            )}
          </div>
        ))}
        <div className="flex items-center gap-3 pt-4">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          {saved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </div>
    </div>
  );
}
