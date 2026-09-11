export type ThemeId = 'default' | 'drakkenheim' | 'miro-light';
export type Settings = { theme: ThemeId; volume: number };

export const SETTINGS_KEY = 'rollparty:settings';

export const THEMES: { id: ThemeId; label: string; description: string }[] = [
  { id: 'default', label: 'Default', description: 'The original purple-and-blue night table.' },
  { id: 'drakkenheim', label: 'Drakkenheim', description: 'Toxic acid-green magic over a ruined, grimy city.' },
  { id: 'miro-light', label: 'Miro Light', description: 'A clean light board, styled after the Miro app.' },
];

export const DEFAULT_VOLUME = 0.7;
export const DEFAULT_SETTINGS: Settings = { theme: 'default', volume: DEFAULT_VOLUME };

function isTheme(value: unknown): value is ThemeId {
  return value === 'default' || value === 'drakkenheim' || value === 'miro-light';
}

export function readSettings(raw: string | null): Settings {
  try {
    const data = JSON.parse(raw || 'null');
    if (!data || data.version !== 1) return DEFAULT_SETTINGS;
    const theme = isTheme(data.theme) ? data.theme : DEFAULT_SETTINGS.theme;
    const volume = Number.isFinite(data.volume) ? Math.min(1, Math.max(0, data.volume)) : DEFAULT_SETTINGS.volume;
    return { theme, volume };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(settings: Settings): string {
  return JSON.stringify({ version: 1, theme: settings.theme, volume: settings.volume });
}
