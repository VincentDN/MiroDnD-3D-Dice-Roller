'use client';
import { useState } from 'react';
import { Crown, Sparkles, Swords, Wand2, type LucideIcon } from 'lucide-react';
import { AVATARS, type Avatar } from '@/lib/avatars';

// Icon shown if the portrait file at avatar.file is missing/fails to load -
// see lib/avatars.ts for how to add the real art without touching this file.
const FALLBACK_ICONS: Record<string, LucideIcon> = {
  'star-gods-hunger': Sparkles,
  teddy: Crown,
  saravi: Wand2,
  'tom-varn': Swords,
};

export function AvatarImage({ avatar, size = 32 }: { avatar: Avatar; size?: number }) {
  const [broken, setBroken] = useState(false);
  const Icon = FALLBACK_ICONS[avatar.id] ?? Wand2;
  if (broken)
    return (
      <span className="avatar-fallback" style={{ background: avatar.color, width: size, height: size }} title={avatar.name}>
        <Icon size={Math.round(size * 0.55)} />
      </span>
    );
  return (
    <img
      className="avatar-image"
      style={{ width: size, height: size }}
      src={avatar.file}
      alt={avatar.name}
      width={size}
      height={size}
      onError={() => setBroken(true)}
    />
  );
}

export function AvatarPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="avatar-picker" role="radiogroup" aria-label="Choose your icon">
      {AVATARS.map((a) => (
        <button
          type="button"
          key={a.id}
          role="radio"
          aria-checked={a.id === value}
          className={a.id === value ? 'avatar-option selected' : 'avatar-option'}
          title={a.name}
          onClick={() => onChange(a.id)}
        >
          <AvatarImage avatar={a} size={56} />
          <span className="avatar-option-name">{a.name}</span>
        </button>
      ))}
    </div>
  );
}
