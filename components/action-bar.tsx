'use client';
import { useEffect, useRef, useState } from 'react';
import { Pencil, GripVertical } from 'lucide-react';
import {
  ACTIONS_KEY,
  MAX_ACTIONS,
  MAX_PROFILES,
  MAX_IMPORT_BYTES,
  actionFields,
  profileName,
  loadCollection,
  parseCollection,
  appendImport,
  moveAction,
  ensureRoleProfile,
  type ActionCollection,
  type ActionColorMode,
  type SavedAction,
} from '@/lib/action-profiles';
import { PRESET_KEY } from '@/lib/dice-presets';
import { roleProfileSeed } from '@/lib/role-presets';
import type { RoleId } from '@/lib/roles';
import AppearanceEditor from './appearance-editor';
import { defaultAppearance, type DiceAppearance } from '@/lib/dice-appearance';
import {
  validateDamage,
  type DamageGroup,
  type ActionRollOptions,
} from '@/lib/action-damage';

const DEFAULT_COLOR = '#c44dff';
const DEFAULT_COLOR2 = '#4dc4ff';
// A small readability guard for user-chosen backgrounds - not full WCAG
// contrast math, just enough to keep button text legible on any hue.
function contrastText(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
    ? '#12202a'
    : '#ffffff';
}
function actionStyle(a: SavedAction): React.CSSProperties | undefined {
  if (!a.color) return undefined;
  const background =
    a.colorMode === 'flat'
      ? a.color
      : `linear-gradient(135deg, ${a.color}, ${a.color2 || a.color})`;
  return { background, borderColor: a.color, color: contrastText(a.color) };
}

export default function ActionBar({
  expression,
  disabled,
  onRoll,
  color: playerColor = '#32a6c8',
  role,
}: {
  expression: string;
  disabled: boolean;
  onRoll: (
    expression: string,
    label: string,
    options?: ActionRollOptions,
  ) => Promise<{ id: string }>;
  color?: string;
  role?: RoleId;
}) {
  const [collection, setCollection] = useState<ActionCollection | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dice, setDice] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [appearance, setAppearance] = useState<DiceAppearance>();
  const [damage, setDamage] = useState<DamageGroup[]>([]);
  const [styleName, setStyleName] = useState('');
  const [attack, setAttack] = useState<{
    id: string;
    name: string;
    groups: DamageGroup[];
  } | null>(null);
  const [colorMode, setColorMode] = useState<ActionColorMode | ''>('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [color2, setColor2] = useState(DEFAULT_COLOR2);
  const [character, setCharacter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [undo, setUndo] = useState<{
    profileId: string;
    action: SavedAction;
    index: number;
  } | null>(null);
  const stored = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const managerRef = useRef<HTMLDetailsElement>(null);
  const editorRef = useRef<HTMLFormElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  function resetEditor() {
    setEditing(null);
    setName('');
    setDice(null);
    setNote('');
    setAppearance(undefined);
    setDamage([]);
    setColorMode('');
    setColor(DEFAULT_COLOR);
    setColor2(DEFAULT_COLOR2);
    setConfirmDelete(false);
  }
  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem(ACTIONS_KEY);
        const value = loadCollection(raw, localStorage.getItem(PRESET_KEY));
        stored.current = raw;
        setCollection(value);
        setError('');
        resetEditor();
        setUndo(null);
        // Leave old presets untouched as a backup. Persist the migration once.
        if (raw === null) {
          const encoded = JSON.stringify(value);
          localStorage.setItem(ACTIONS_KEY, encoded);
          stored.current = encoded;
        }
      } catch (e) {
        setError(
          `Could not load saved actions: ${(e as Error).message} Existing data has been left untouched.`,
        );
      }
    };
    sync();
    const listener = (event: StorageEvent) => {
      if (event.key === ACTIONS_KEY || event.key === null) sync();
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, []);
  const profile = collection?.profiles.find(
    (p) => p.id === collection.activeId,
  );
  const renderedStored = stored.current;
  function commit(next: ActionCollection) {
    try {
      parseCollection(JSON.stringify(next));
      if (localStorage.getItem(ACTIONS_KEY) !== renderedStored)
        throw Error(
          'Actions changed in another window. Reload this page before editing again.',
        );
      const encoded = JSON.stringify(next);
      localStorage.setItem(ACTIONS_KEY, encoded);
      stored.current = encoded;
      setCollection(next);
      setError('');
      setMessage('Saved on this device.');
      return true;
    } catch (e) {
      setError(`Could not save: ${(e as Error).message}`);
      return false;
    }
  }
  // Seeds this role's default hotbar the first time it's picked (or switches
  // to it if it already exists) - a no-op once that role has a profile, so
  // re-picking the same role, or any later unrelated edit, never re-seeds it.
  useEffect(() => {
    if (!collection || !role) return;
    const next = ensureRoleProfile(collection, role, roleProfileSeed(role));
    if (next !== collection) commit(next);
  }, [role, collection]);
  function openEditor(a: SavedAction) {
    setEditing(a.id);
    setName(a.name);
    setDice(a.expression);
    setNote(a.note);
    setAppearance(a.appearance);
    setDamage(a.damage ?? []);
    setColorMode(a.colorMode || '');
    setColor(a.color || DEFAULT_COLOR);
    setColor2(a.color2 || DEFAULT_COLOR2);
    if (managerRef.current) managerRef.current.open = true;
    requestAnimationFrame(() =>
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
  }
  function updateActions(actions: SavedAction[]) {
    return (
      !!collection &&
      !!profile &&
      commit({
        ...collection,
        profiles: collection.profiles.map((p) =>
          p.id === profile.id ? { ...p, actions } : p,
        ),
      })
    );
  }
  function saveAction() {
    if (!profile) return;
    try {
      const fields = {
        ...actionFields(
          name,
          dice ?? expression,
          note,
          colorMode ? color : undefined,
          colorMode || undefined,
          colorMode ? color2 : undefined,
        ),
        appearance,
        damage: validateDamage(damage),
      };
      if (
        profile.actions.some(
          (a) =>
            a.id !== editing &&
            a.name.toLowerCase() === fields.name.toLowerCase(),
        )
      )
        throw Error('An action already has that name in this character.');
      if (!editing && profile.actions.length >= MAX_ACTIONS)
        throw Error('Each character can hold up to 30 actions.');
      const actions = editing
        ? profile.actions.map((a) =>
            a.id === editing ? { id: a.id, ...fields } : a,
          )
        : [...profile.actions, { id: crypto.randomUUID(), ...fields }];
      if (updateActions(actions)) resetEditor();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function changeCharacter(create: boolean) {
    if (!collection || !profile) return;
    try {
      const title = profileName(character);
      if (create && collection.profiles.length >= MAX_PROFILES)
        throw Error('You can save up to 12 characters.');
      if (
        collection.profiles.some(
          (p) =>
            (create || p.id !== profile.id) &&
            p.name.toLowerCase() === title.toLowerCase(),
        )
      )
        throw Error('Choose a different character name.');
      const id = create ? crypto.randomUUID() : profile.id;
      const profiles = create
        ? [...collection.profiles, { id, name: title, actions: [] }]
        : collection.profiles.map((p) =>
            p.id === id ? { ...p, name: title } : p,
          );
      if (commit({ ...collection, activeId: id, profiles })) {
        resetEditor();
        setCharacter('');
        setUndo(null);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function importFile(file?: File) {
    if (!file || !collection) return;
    try {
      if (file.size > MAX_IMPORT_BYTES)
        throw Error('Action file is too large (maximum 256 KB).');
      const next = appendImport(collection, await file.text());
      if (commit(next)) {
        resetEditor();
        setUndo(null);
        setMessage('Characters imported. Existing characters were kept.');
      }
    } catch (e) {
      setError(`Import failed: ${(e as Error).message}`);
    }
  }
  function exportFile() {
    if (!collection) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(collection, null, 2) + '\n'], {
        type: 'application/json',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'VincentsVibeRoller-actions.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="action-bar" aria-label="Character actions">
      <div className="action-bar-heading">
        <strong>Character actions</strong>
        {profile && collection && (
          <label className="character-select">
            Character
            <select
              aria-label="Character"
              value={profile.id}
              onChange={(e) => {
                if (commit({ ...collection, activeId: e.target.value })) {
                  resetEditor();
                  setUndo(null);
                }
              }}
            >
              {collection.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {profile && collection && (
        <>
          <div className="action-buttons">
            {profile.actions.map((a) => (
              <div className="saved-action-wrap" key={a.id}>
                <button
                  type="button"
                  className={`saved-action${a.colorMode === 'sparkle' ? ' saved-action-sparkle' : ''}`}
                  style={actionStyle(a)}
                  disabled={disabled}
                  title={a.note || a.expression}
                  aria-label={`Roll ${a.name}`}
                  onClick={async () => {
                    try {
                      const result = await onRoll(a.expression, a.name, {
                        appearance: a.appearance ?? profile.appearance,
                        damage: a.damage,
                      });
                      setAttack(
                        a.damage?.length
                          ? { id: result.id, name: a.name, groups: a.damage }
                          : null,
                      );
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <strong>{a.name}</strong>
                  <small>{a.expression}</small>
                </button>
                <button
                  type="button"
                  className="saved-action-edit"
                  aria-label={`Quick edit ${a.name}`}
                  title="Edit this action"
                  onClick={() => openEditor(a)}
                >
                  <Pencil size={12} />
                </button>
              </div>
            ))}
          </div>
          {attack && (
            <div className="linked-damage">
              <strong>{attack.name}: roll damage if it hits</strong>
              {attack.groups.map((g, i) => (
                <div key={i}>
                  <span>
                    {g.name} · {g.expression}
                  </span>
                  {[false, true].map((critical) => (
                    <button
                      type="button"
                      key={String(critical)}
                      disabled={disabled}
                      onClick={() => {
                        onRoll(g.expression, g.name, {
                          linkedTo: attack.id,
                          damageIndex: i,
                          critical,
                        }).catch((e) => setError((e as Error).message));
                      }}
                    >
                      {critical ? 'Critical damage' : 'Damage'}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
          {!profile.actions.length && (
            <p className="muted">
              Save your attacks, checks and spells for one-click rolls.
            </p>
          )}
          <details className="action-manager" ref={managerRef}>
            <summary>Manage actions</summary>
            <p className="muted">
              Saved on this device. Export to move characters between browser
              and desktop. Rolls still use your room player name. Drag the
              handle to reorder.
            </p>
            <div className="action-edit-list">
              {profile.actions.map((a, i) => (
                <div
                  className={`action-edit-row${dragId === a.id ? ' dragging' : ''}`}
                  key={a.id}
                  draggable
                  onDragStart={() => setDragId(a.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = profile.actions.findIndex((x) => x.id === dragId);
                    const to = profile.actions.findIndex((x) => x.id === a.id);
                    setDragId(null);
                    if (from < 0 || to < 0 || from === to) return;
                    const next = [...profile.actions];
                    const [moved] = next.splice(from, 1);
                    next.splice(to, 0, moved);
                    updateActions(next);
                  }}
                  onDragEnd={() => setDragId(null)}
                >
                  <span
                    className="action-drag-handle"
                    aria-hidden="true"
                    title="Drag to reorder"
                  >
                    <GripVertical size={14} />
                  </span>
                  <span>
                    <strong>
                      {a.color && (
                        <span
                          className="action-color-swatch"
                          style={actionStyle(a)}
                          aria-hidden="true"
                        />
                      )}
                      {a.name}
                    </strong>
                    <small>
                      {a.expression}
                      {a.note && ` · ${a.note}`}
                    </small>
                  </span>
                  <div>
                    <button
                      type="button"
                      aria-label={`Move ${a.name} up`}
                      disabled={i === 0}
                      onClick={() =>
                        updateActions(moveAction(profile.actions, a.id, -1))
                      }
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${a.name} down`}
                      disabled={i === profile.actions.length - 1}
                      onClick={() =>
                        updateActions(moveAction(profile.actions, a.id, 1))
                      }
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label={`Edit ${a.name}`}
                      onClick={() => openEditor(a)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${a.name}`}
                      onClick={() => {
                        if (
                          updateActions(
                            profile.actions.filter((item) => item.id !== a.id),
                          )
                        ) {
                          setUndo({
                            profileId: profile.id,
                            action: a,
                            index: i,
                          });
                          if (editing === a.id) resetEditor();
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {undo?.profileId === profile.id && (
              <p className="action-undo">
                Removed {undo.action.name}.{' '}
                <button
                  type="button"
                  onClick={() => {
                    if (
                      profile.actions.some(
                        (a) =>
                          a.id === undo.action.id ||
                          a.name.toLowerCase() ===
                            undo.action.name.toLowerCase(),
                      )
                    ) {
                      setError(
                        'Rename or remove the replacement action before undoing.',
                      );
                      return;
                    }
                    const next = [...profile.actions];
                    next.splice(undo.index, 0, undo.action);
                    if (updateActions(next)) setUndo(null);
                  }}
                >
                  Undo removal
                </button>
              </p>
            )}
            <form
              className="action-editor"
              ref={editorRef}
              onSubmit={(e) => {
                e.preventDefault();
                saveAction();
              }}
            >
              <strong>{editing ? 'Edit action' : 'Save an action'}</strong>
              <label>
                Action name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={32}
                  required
                  placeholder="Longsword"
                />
              </label>
              <label>
                Action dice
                <input
                  value={dice ?? expression}
                  onChange={(e) => setDice(e.target.value)}
                  maxLength={120}
                  required
                  spellCheck={false}
                />
              </label>
              <label>
                Reminder (optional)
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={240}
                  placeholder="Use while wielding two-handed"
                />
              </label>
              <label>
                Button color
                <select
                  value={colorMode}
                  onChange={(e) =>
                    setColorMode(e.target.value as ActionColorMode | '')
                  }
                >
                  <option value="">Default</option>
                  <option value="flat">Flat color</option>
                  <option value="gradient">Gradient</option>
                  <option value="sparkle">Sparkle</option>
                </select>
              </label>
              {colorMode && (
                <div className="action-color-pickers">
                  <label>
                    Color
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    />
                  </label>
                  {colorMode !== 'flat' && (
                    <label>
                      Second color
                      <input
                        type="color"
                        value={color2}
                        onChange={(e) => setColor2(e.target.value)}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    className={`saved-action action-color-preview${colorMode === 'sparkle' ? ' saved-action-sparkle' : ''}`}
                    style={actionStyle({
                      color,
                      color2,
                      colorMode,
                    } as SavedAction)}
                  >
                    <strong>{name || 'Preview'}</strong>
                    <small>{dice ?? expression}</small>
                  </button>
                </div>
              )}
              <div className="action-tools">
                <button type="submit">
                  {editing ? 'Save changes' : 'Add action'}
                </button>
                {editing && (
                  <button type="button" onClick={resetEditor}>
                    Cancel edit
                  </button>
                )}
              </div>
              <AppearanceEditor
                value={appearance}
                onChange={setAppearance}
                fallback={profile.appearance ?? defaultAppearance(playerColor)}
              />
              <label>
                Copy appearance
                <select
                  value=""
                  onChange={(e) => {
                    const [kind, index] = e.target.value.split(':');
                    setAppearance(
                      kind === 'style'
                        ? profile.styles?.[+index]?.appearance
                        : (profile.actions[+index]?.appearance ??
                            profile.appearance),
                    );
                  }}
                >
                  <option value="">Choose saved style or action</option>
                  {profile.styles?.map((s, i) => (
                    <option value={`style:${i}`} key={`s${i}`}>
                      Style: {s.name}
                    </option>
                  ))}
                  {profile.actions.map((a, i) => (
                    <option value={`action:${i}`} key={a.id}>
                      Action: {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Save this style as
                <input
                  value={styleName}
                  maxLength={40}
                  onChange={(e) => setStyleName(e.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!styleName.trim()) {
                    setError('Name this style first.');
                    return;
                  }
                  const styles = [
                    ...(profile.styles ?? []).filter(
                      (s) => s.name !== styleName.trim(),
                    ),
                    {
                      name: styleName.trim(),
                      appearance:
                        appearance ??
                        profile.appearance ??
                        defaultAppearance(playerColor),
                    },
                  ];
                  if (
                    commit({
                      ...collection,
                      profiles: collection.profiles.map((p) =>
                        p.id === profile.id ? { ...p, styles } : p,
                      ),
                    })
                  )
                    setStyleName('');
                }}
              >
                Save reusable style
              </button>
              <details>
                <summary>Linked damage groups (optional)</summary>
                <p>
                  For attacks: roll damage only after deciding the attack hits.
                  Critical damage doubles dice, not flat bonuses.
                </p>
                {damage.map((g, i) => (
                  <fieldset key={i}>
                    <legend>Damage group {i + 1}</legend>
                    <label>
                      Damage name
                      <input
                        value={g.name}
                        maxLength={40}
                        onChange={(e) =>
                          setDamage(
                            damage.map((x, j) =>
                              j === i ? { ...x, name: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Damage dice
                      <input
                        value={g.expression}
                        onChange={(e) =>
                          setDamage(
                            damage.map((x, j) =>
                              j === i
                                ? { ...x, expression: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <AppearanceEditor
                      title={`${g.name || 'Damage'} appearance`}
                      value={g.appearance}
                      fallback={
                        appearance ??
                        profile.appearance ??
                        defaultAppearance(playerColor)
                      }
                      onChange={(a) =>
                        setDamage(
                          damage.map((x, j) =>
                            j === i ? { ...x, appearance: a } : x,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDamage(damage.filter((_, j) => j !== i))
                      }
                    >
                      Remove damage group
                    </button>
                  </fieldset>
                ))}
                <button
                  type="button"
                  disabled={damage.length >= 6}
                  onClick={() =>
                    setDamage([
                      ...damage,
                      { name: 'Damage', expression: '1d6' },
                    ])
                  }
                >
                  Add damage group
                </button>
              </details>
            </form>
            <AppearanceEditor
              title="Character default appearance"
              value={profile.appearance}
              fallback={defaultAppearance(playerColor)}
              onChange={(a) =>
                commit({
                  ...collection,
                  profiles: collection.profiles.map((p) =>
                    p.id === profile.id ? { ...p, appearance: a } : p,
                  ),
                })
              }
            />
            <form
              className="character-editor"
              onSubmit={(e) => {
                e.preventDefault();
                changeCharacter(true);
              }}
            >
              <label>
                Character name
                <input
                  value={character}
                  onChange={(e) => setCharacter(e.target.value)}
                  maxLength={40}
                  placeholder={profile.name}
                />
              </label>
              <div className="action-tools">
                <button type="submit">New character</button>
                <button type="button" onClick={() => changeCharacter(false)}>
                  Rename character
                </button>
                <button
                  type="button"
                  disabled={collection.profiles.length === 1}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete character
                </button>
              </div>
            </form>
            {confirmDelete && (
              <fieldset
                className="action-delete"
                aria-label="Confirm character deletion"
              >
                <p>
                  Delete {profile.name} and its {profile.actions.length}{' '}
                  actions?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const profiles = collection.profiles.filter(
                      (p) => p.id !== profile.id,
                    );
                    if (
                      profiles.length &&
                      commit({
                        ...collection,
                        profiles,
                        activeId: profiles[0].id,
                      })
                    ) {
                      resetEditor();
                      setUndo(null);
                    }
                  }}
                >
                  Confirm deletion
                </button>{' '}
                <button type="button" onClick={() => setConfirmDelete(false)}>
                  Keep character
                </button>
              </fieldset>
            )}
            <div className="action-tools">
              <button type="button" onClick={exportFile}>
                Export characters
              </button>
              <button type="button" onClick={() => fileInput.current?.click()}>
                Import characters
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".json,application/json"
                aria-label="Import character file"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  void importFile(file);
                }}
              />
            </div>
            <output className="muted">
              {message ||
                'Imports add characters without replacing your current collection.'}
            </output>
          </details>
        </>
      )}
    </section>
  );
}
