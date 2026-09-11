'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, X } from 'lucide-react';
import { setVolume as setAudioVolume, testSound } from '@/lib/dice-audio';
import { DEFAULT_SETTINGS, readSettings, SETTINGS_KEY, THEMES, writeSettings, type Settings } from '@/lib/settings';

// Applies the persisted (or default) theme before paint, then keeps `lib/dice-audio`'s
// gain in sync with the saved volume. Shared by every Settings panel instance.
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    let value = DEFAULT_SETTINGS;
    try {
      value = readSettings(localStorage.getItem(SETTINGS_KEY));
    } catch {}
    setSettings(value);
    setAudioVolume(value.volume);
    document.documentElement.dataset.theme = value.theme;
  }, []);
  function update(next: Partial<Settings>) {
    setSettings((current) => {
      const merged = { ...current, ...next };
      try {
        localStorage.setItem(SETTINGS_KEY, writeSettings(merged));
      } catch {}
      if (next.volume !== undefined) setAudioVolume(merged.volume);
      if (next.theme !== undefined) document.documentElement.dataset.theme = merged.theme;
      return merged;
    });
  }
  return [settings, update] as const;
}

export default function SettingsPanel({
  settings,
  update,
  onClose,
  desktop = false,
}: {
  settings: Settings;
  update: (next: Partial<Settings>) => void;
  onClose: () => void;
  desktop?: boolean;
}) {
  return (
    <div className="settings-panel" role="dialog" aria-label="Settings" aria-modal="true">
      <div className="settings-head">
        <h2>Settings</h2>
        <button type="button" aria-label="Close settings" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <section className="settings-section">
        <label htmlFor="settings-volume">Volume</label>
        <div className="volume-row">
          <Volume2 size={16} aria-hidden="true" />
          <input
            id="settings-volume"
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.volume * 100)}
            aria-valuetext={`${Math.round(settings.volume * 100)} percent`}
            onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
          />
          <span className="volume-value">{Math.round(settings.volume * 100)}%</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void testSound()}>
            Test
          </Button>
        </div>
      </section>
      <section className="settings-section">
        <label>Theme</label>
        <div className="theme-options">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === settings.theme ? 'theme-option selected' : 'theme-option'}
              aria-pressed={t.id === settings.theme}
              onClick={() => update({ theme: t.id })}
            >
              <span className={`theme-swatch theme-swatch-${t.id}`} aria-hidden="true" />
              <span className="theme-option-text">
                <strong>{t.label}</strong>
                <small>{t.description}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="settings-section">
        <label>Saved roll path</label>
        {desktop ? (
          <p className="muted">
            Set a default save folder for roll-notebook exports from the VincentsVibeRoller
            tray icon → Desktop controls → Roll notebook. Once set, Save Markdown saves there
            automatically instead of asking every time.
          </p>
        ) : (
          <p className="muted">
            Save Markdown downloads a roll-notebook file through your browser, so it lands in
            your browser&apos;s normal downloads folder. Use the Windows app for a configurable
            save folder.
          </p>
        )}
      </section>
    </div>
  );
}
