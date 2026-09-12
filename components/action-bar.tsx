'use client';
import { useEffect, useRef, useState } from 'react';
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
  type ActionCollection,
  type SavedAction,
} from '@/lib/action-profiles';
import { PRESET_KEY } from '@/lib/dice-presets';

export default function ActionBar({
  expression,
  disabled,
  onRoll,
}: {
  expression: string;
  disabled: boolean;
  onRoll: (expression: string, label: string) => void;
}) {
  const [collection, setCollection] = useState<ActionCollection | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dice, setDice] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [character, setCharacter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [undo, setUndo] = useState<{
    profileId: string;
    action: SavedAction;
    index: number;
  } | null>(null);
  const stored = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  function resetEditor() {
    setEditing(null);
    setName('');
    setDice(null);
    setNote('');
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
      const fields = actionFields(name, dice ?? expression, note);
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
            a.id === editing ? { ...a, ...fields } : a,
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
              <button
                type="button"
                key={a.id}
                className="saved-action"
                disabled={disabled}
                title={a.note || a.expression}
                aria-label={`Roll ${a.name}`}
                onClick={() => onRoll(a.expression, a.name)}
              >
                <strong>{a.name}</strong>
                <small>{a.expression}</small>
              </button>
            ))}
          </div>
          {!profile.actions.length && (
            <p className="muted">
              Save your attacks, checks and spells for one-click rolls.
            </p>
          )}
          <details className="action-manager">
            <summary>Manage actions</summary>
            <p className="muted">
              Saved on this device. Export to move characters between browser
              and desktop. Rolls still use your room player name.
            </p>
            <div className="action-edit-list">
              {profile.actions.map((a, i) => (
                <div className="action-edit-row" key={a.id}>
                  <span>
                    <strong>{a.name}</strong>
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
                      onClick={() => {
                        setEditing(a.id);
                        setName(a.name);
                        setDice(a.expression);
                        setNote(a.note);
                      }}
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
            </form>
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
