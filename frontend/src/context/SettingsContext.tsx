import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/client';

type Settings = Record<string, string>;

const SettingsContext = createContext<Settings>({});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({});

  useEffect(() => {
    api.get('/settings')
      .then(({ data }) => {
        const map: Settings = {};
        for (const s of data.settings) {
          map[s.key] = s.value;
        }
        setSettings(map);
      })
      .catch(() => {});
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
