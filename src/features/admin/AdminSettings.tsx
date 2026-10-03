import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getAuditLog, getNames, getSettings, updateSetting, type AuditLogEntry, type SettingRecord } from '../../lib/admin';
import { describeLogEntry } from './AdminScreens';
import { useAppStore } from '../../store/useAppStore';

/** Platform settings stored in the Settings table. Changes are audit-logged by the database. */
export function AdminSettingsScreen() {
  const addToast = useAppStore(state => state.addToast);
  const [settings, setSettings] = useState<SettingRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => getSettings()
    .then(rows => {
      setSettings(rows);
      setDrafts(Object.fromEntries(rows.map(r => [r.Key, JSON.stringify(r.Value)])));
    })
    .catch(err => setError(err?.message || 'Could not load settings.'));

  useEffect(() => { load(); }, []);

  const save = async (key: string) => {
    let value: unknown;
    try {
      value = JSON.parse(drafts[key]);
    } catch {
      addToast('Enter a valid value (a number, or text in quotes).', 'error');
      return;
    }
    setSavingKey(key);
    try {
      await updateSetting(key, value);
      addToast('Setting saved.');
      await load();
    } catch (err: any) {
      addToast(err?.message || 'Could not save the setting.', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-gray-500 mb-8">Platform values used by the app and by database rules. Every change is recorded in the audit log.</p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="space-y-4">
        {settings.map(setting => (
          <Card key={setting.Key} className="p-5 flex items-center justify-between gap-6">
            <div>
              <p className="font-bold text-gray-900 font-mono text-sm">{setting.Key}</p>
              {setting.Description && <p className="text-sm text-gray-500 mt-1">{setting.Description}</p>}
              <p className="text-xs text-gray-400 mt-1">Updated {new Date(setting['Updated-at']).toLocaleString('en-PK')}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                value={drafts[setting.Key] ?? ''}
                onChange={e => setDrafts(d => ({ ...d, [setting.Key]: e.target.value }))}
                className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-center font-bold"
              />
              <Button size="sm" isLoading={savingKey === setting.Key} disabled={savingKey !== null || drafts[setting.Key] === JSON.stringify(setting.Value)} onClick={() => save(setting.Key)}>
                Save
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Append-only audit log (admins can read; nobody can edit or delete entries). */
export function AdminAuditLogScreen() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await getAuditLog(200);
        setEntries(rows);
        setNames(await getNames(rows.flatMap(e => [e['Actor-id'] || '', e['Target-id'] || ''])));
      } catch (err: any) {
        setError(err?.message || 'Could not load the audit log.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Audit Log</h1>
      <p className="text-gray-500 mb-8">Sensitive and administrative actions (latest 200). Entries cannot be changed or deleted.</p>
      <Card className="flex-1 overflow-auto rounded-2xl p-0">
        {error && <p className="p-4 text-sm text-red-600">{error}</p>}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="p-4 text-sm font-semibold text-gray-600">Time</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Action</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Description</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-4 text-sm text-gray-500" colSpan={3}>Loading…</td></tr>}
            {!isLoading && !error && entries.length === 0 && <tr><td className="p-4 text-sm text-gray-500" colSpan={3}>No entries yet.</td></tr>}
            {entries.map(entry => (
              <tr key={entry.ID} className="border-b border-gray-100 align-top">
                <td className="p-4 text-sm text-gray-600 whitespace-nowrap">{new Date(entry['Created-at']).toLocaleString('en-PK')}</td>
                <td className="p-4 font-mono text-xs text-gray-700">{entry.Action}</td>
                <td className="p-4 text-sm text-gray-900">{describeLogEntry(entry, names)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
