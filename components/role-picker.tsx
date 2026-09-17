'use client';
import { Crown, Axe, Wand2, ShieldPlus, HandMetal, UserPlus, type LucideIcon } from 'lucide-react';
import { ROLES, CUSTOM_ROLE_ID, DEFAULT_CUSTOM_COLOR, roleById, type RoleId } from '@/lib/roles';

const ROLE_ICONS: Record<Exclude<RoleId, 'custom'>, LucideIcon> = {
  dm: Crown,
  barbarian: Axe,
  wizard: Wand2,
  cleric: ShieldPlus,
  monk: HandMetal,
};

export function RoleBadge({ role, color, size = 32 }: { role: RoleId; color: string; size?: number }) {
  const known = roleById(role);
  const Icon = known ? ROLE_ICONS[known.id] : UserPlus;
  return (
    <span className="role-badge" style={{ background: color, width: size, height: size }} title={known?.name ?? 'Player'}>
      <Icon size={Math.round(size * 0.55)} />
    </span>
  );
}

export function RolePicker({
  value,
  color,
  onChange,
  onColorChange,
}: {
  value: RoleId;
  color: string;
  onChange: (id: RoleId) => void;
  onColorChange: (color: string) => void;
}) {
  return (
    <div className="role-picker">
      <div className="role-picker-options" role="radiogroup" aria-label="Choose your role">
        {ROLES.map((r) => {
          const Icon = ROLE_ICONS[r.id];
          return (
            <button
              type="button"
              key={r.id}
              role="radio"
              aria-checked={r.id === value}
              className={r.id === value ? 'role-option selected' : 'role-option'}
              title={r.description}
              onClick={() => onChange(r.id)}
            >
              <span className="role-badge" style={{ background: r.color }}>
                <Icon size={22} />
              </span>
              <span className="role-option-name">{r.name}</span>
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={value === CUSTOM_ROLE_ID}
          className={value === CUSTOM_ROLE_ID ? 'role-option selected' : 'role-option'}
          title="Pick your own dice color"
          onClick={() => onChange(CUSTOM_ROLE_ID)}
        >
          <span className="role-badge" style={{ background: color || DEFAULT_CUSTOM_COLOR }}>
            <UserPlus size={22} />
          </span>
          <span className="role-option-name">Create Player</span>
        </button>
      </div>
      {value === CUSTOM_ROLE_ID && (
        <label className="role-color-picker">
          Dice color
          <input
            type="color"
            value={color || DEFAULT_CUSTOM_COLOR}
            onChange={(e) => onColorChange(e.target.value)}
          />
        </label>
      )}
    </div>
  );
}
