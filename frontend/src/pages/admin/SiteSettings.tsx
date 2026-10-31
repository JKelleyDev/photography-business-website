import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import api from '../../api/client';
import { Button, Card, CardHeader, Input, PageHeader, Skeleton, Switch } from '../../components/admin/ui';

interface Setting { key: string; value: string }

const methods = [
  { name: 'Venmo', toggle: 'venmo_enabled', field: 'venmo_username', label: 'Venmo username', placeholder: '@YourVenmo' },
  { name: 'PayPal', toggle: 'paypal_enabled', field: 'paypal_username', label: 'PayPal.me username', placeholder: 'YourPayPal' },
  { name: 'Zelle', toggle: 'zelle_enabled', field: 'zelle_info', label: 'Zelle email or phone', placeholder: 'you@email.com or (555)-555-5555' },
];
const allKeys = methods.flatMap((m) => [m.toggle, m.field]);

export default function SiteSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/admin/settings').then(({ data }) => {
      const map: Record<string, string> = {};
      data.settings.forEach((s: Setting) => { map[s.key] = s.value; });
      setSettings(map);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    for (const key of allKeys) {
      if (settings[key] !== undefined) await api.put(`/admin/settings/${key}`, { value: settings[key] });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" />
      <Card>
        <CardHeader title="Payment methods" description="Turn on the ways clients can pay. Enabled methods appear on every invoice." />
        <ul className="divide-y divide-line">
          {methods.map((m) => {
            const on = settings[m.toggle] === 'true';
            const switchId = `sw-${m.toggle}`;
            return (
              <li key={m.toggle} className="px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor={switchId} className="text-sm font-medium">{m.name}</label>
                  {loading ? <Skeleton className="h-6 w-11 rounded-full" /> : (
                    <Switch id={switchId} checked={on} onChange={(v) => setSettings({ ...settings, [m.toggle]: String(v) })} />
                  )}
                </div>
                {on && (
                  <div className="mt-3">
                    <label htmlFor={m.field} className="mb-1.5 block text-[13px] text-fixer">{m.label}</label>
                    <Input id={m.field} value={settings[m.field] || ''} placeholder={m.placeholder}
                      onChange={(e) => setSettings({ ...settings, [m.field]: e.target.value })} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-end gap-3 border-t border-line px-4 py-3 sm:px-5">
          {saved && <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700" role="status"><Check className="size-4" /> Saved</span>}
          <Button onClick={handleSave} disabled={saving || loading}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </div>
      </Card>
    </div>
  );
}
