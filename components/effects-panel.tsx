'use client';
import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  defaultEffects,
  readEffects,
  writeEffects,
  MAX_EFFECTS,
  type AdvantageMode,
  type Effect,
  type EffectsState,
} from '@/lib/effects';

// Room+player scoped, like the roll notebook - a temporary in-game state for
// one character in one session, not a device-wide preference. Loads once the
// room key and player id are known and resets to defaults when either changes.
export function useEffects(room: string, playerId: string | undefined) {
  const storageKey = room && playerId ? `rollparty:effects:${room}:${playerId}` : '';
  const [state, setState] = useState<EffectsState>(defaultEffects());
  useEffect(() => {
    if (!storageKey) {
      setState(defaultEffects());
      return;
    }
    const sync = () => setState(readEffects(localStorage.getItem(storageKey)));
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) sync();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey]);
  function update(next: EffectsState) {
    setState(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, writeEffects(next));
      } catch {}
    }
  }
  return [state, update] as const;
}

const ADVANTAGE_OPTIONS: { id: AdvantageMode; label: string }[] = [
  { id: 'disadvantage', label: 'Disadvantage' },
  { id: 'normal', label: 'Normal' },
  { id: 'advantage', label: 'Advantage' },
];

export default function EffectsPanel({
  effects,
  update,
}: {
  effects: EffectsState;
  update: (next: EffectsState) => void;
}) {
  const [name, setName] = useState('');
  const [die, setDie] = useState('1d4');
  const [persistent, setPersistent] = useState(true);
  const [error, setError] = useState('');
  function setAdvantage(advantage: AdvantageMode) {
    update({ ...effects, advantage });
  }
  function toggleEffect(id: string) {
    update({
      ...effects,
      effects: effects.effects.map((e) => (e.id === id ? { ...e, active: !e.active } : e)),
    });
  }
  function removeEffect(id: string) {
    update({ ...effects, effects: effects.effects.filter((e) => e.id !== id) });
  }
  function addEffect(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (effects.effects.length >= MAX_EFFECTS) {
      setError(`Use up to ${MAX_EFFECTS} effects.`);
      return;
    }
    if (!/^\d{1,2}d(4|6|8|10|12|20|100)$/i.test(die.trim())) {
      setError('Die must look like 1d4, 2d6, and so on.');
      return;
    }
    const effect: Effect = {
      id: crypto.randomUUID(),
      name: name.trim() || die.trim(),
      die: die.trim().toLowerCase(),
      persistent,
      active: false,
    };
    update({ ...effects, effects: [...effects.effects, effect] });
    setName('');
    setDie('1d4');
    setPersistent(true);
  }
  return (
    <section className="effects-panel" aria-label="Roll effects">
      <strong>Roll effects</strong>
      <div className="effects-advantage" role="radiogroup" aria-label="Advantage">
        {ADVANTAGE_OPTIONS.map((o) => (
          <button
            type="button"
            key={o.id}
            role="radio"
            aria-checked={effects.advantage === o.id}
            className={effects.advantage === o.id ? 'selected' : ''}
            onClick={() => setAdvantage(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="effects-list">
        {effects.effects.map((e) => (
          <span className={e.active ? 'effect-chip active' : 'effect-chip'} key={e.id}>
            <button type="button" aria-pressed={e.active} onClick={() => toggleEffect(e.id)}>
              {e.name} <small>+{e.die}</small>
              {!e.persistent && <em>1×</em>}
            </button>
            <button type="button" aria-label={`Remove ${e.name}`} onClick={() => removeEffect(e.id)}>
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <form className="effect-add-form" onSubmit={addEffect}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="Name (e.g. Rage)"
        />
        <input
          value={die}
          onChange={(e) => setDie(e.target.value)}
          maxLength={10}
          placeholder="1d4"
        />
        <label>
          <input type="checkbox" checked={persistent} onChange={(e) => setPersistent(e.target.checked)} />
          Persistent
        </label>
        <button type="submit">
          <Plus size={13} /> Add
        </button>
      </form>
      <p className="muted">
        A persistent effect stays on until you turn it off; a one-use effect turns itself off after
        its next roll. Advantage/disadvantage only applies to a plain d20 roll - never a saved
        action that already shapes its own dice, and never a damage roll.
      </p>
    </section>
  );
}
