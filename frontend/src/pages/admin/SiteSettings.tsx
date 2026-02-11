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

const paymentKeys = [
  { key: 'venmo_enabled', label: 'Enable Venmo', type: 'toggle' },
  { key: 'venmo_username', label: 'Venmo Username', type: 'text', placeholder: '@YourVenmo', dependsOn: 'venmo_enabled' },
  { key: 'paypal_enabled', label: 'Enable PayPal', type: 'toggle' },
  { key: 'paypal_username', label: 'PayPal.me Username', type: 'text', placeholder: 'YourPayPal', dependsOn: 'paypal_enabled' },
  { key: 'zelle_enabled', label: 'Enable Zelle', type: 'toggle' },
  { key: 'zelle_info', label: 'Zelle Email or Phone', type: 'text', placeholder: 'you@email.com or (555)-555-5555', dependsOn: 'zelle_enabled' },
];

const allKeys = [...settingKeys, ...paymentKeys];

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
    for (const { key } of allKeys) {
      if (settings[key] !== undefined) {
        await api.put(`/admin/settings/${key}`, { value: settings[key] });
      }
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function renderField(key: string, label: string, type: string, placeholder?: string, dependsOn?: string) {
    if (dependsOn && settings[dependsOn] !== 'true') return null;

    if (type === 'toggle') {
      return (
        <label key={key} className="flex items-center gap-3 cursor-pointer">
          <div
            className={`relative w-11 h-6 rounded-full transition-colors ${settings[key] === 'true' ? 'bg-accent' : 'bg-gray-300'}`}
            onClick={() => setSettings({ ...settings, [key]: settings[key] === 'true' ? 'false' : 'true' })}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[key] === 'true' ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </label>
      );
    }

    if (type === 'textarea') {
      return (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <textarea
            value={settings[key] || ''}
            onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
            rows={6}
            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>
      );
    }

    return (
      <div key={key}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
          type={type}
          value={settings[key] || ''}
          placeholder={placeholder}
          onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-primary mb-6">Site Settings</h1>

      <div className="bg-white border rounded-lg p-6 space-y-4 mb-6">
        <h2 className="text-lg font-semibold text-primary">Business Info</h2>
        {settingKeys.map(({ key, label, type }) => renderField(key, label, type))}
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-4 mb-6">
        <h2 className="text-lg font-semibold text-primary">Payment Methods</h2>
        <p className="text-sm text-muted">Configure payment options that appear on client invoices.</p>
        {paymentKeys.map(({ key, label, type, placeholder, dependsOn }) =>
          renderField(key, label, type, placeholder, dependsOn)
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
      </div>
    </div>
  );
}
