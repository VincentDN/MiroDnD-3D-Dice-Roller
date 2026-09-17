'use client';
import { SOUND_EFFECTS, playSoundEffect } from '@/lib/dice-audio';

export default function Soundboard() {
  return (
    <section className="soundboard" aria-label="DM soundboard">
      <strong>Soundboard</strong>
      <div className="soundboard-buttons">
        {SOUND_EFFECTS.map((effect) => (
          <button type="button" key={effect.id} onClick={() => playSoundEffect(effect.id)}>
            {effect.label}
          </button>
        ))}
      </div>
    </section>
  );
}
