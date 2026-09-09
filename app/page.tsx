'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dices,
  ArrowUpRight,
  Radio,
  Link,
  MonitorUp,
  ArrowLeft,
  RotateCcw,
  Plus,
  Minus,
  Check,
  Users,
} from 'lucide-react';
import DiceStage from '@/components/dice-stage';
import { SIDES, parseExpression, type Roll } from '@/lib/dice';
type Player = { id: string; name: string; color: string; seen: number };
type Credential = { id: string; secret: string };
const colors = [
  '#32a6c8',
  '#ab79ef',
  '#ef8267',
  '#b8d96c',
  '#f3bd5b',
  '#ed82b5',
];
export default function Home() {
  const [ready, setReady] = useState(false),
    [key, setKey] = useState(''),
    [overlay, setOverlay] = useState(false),
    [desktop, setDesktop] = useState(false),
    [cred, setCred] = useState<Credential | null>(null);
  const [name, setName] = useState(''),
    [roomName, setRoomName] = useState('The Sunday campaign'),
    [color, setColor] = useState(colors[0]),
    [players, setPlayers] = useState<Player[]>([]),
    [history, setHistory] = useState<Roll[]>([]),
    [active, setActive] = useState<Roll | null>(null);
  const [expression, setExpression] = useState('1d20'),
    [label, setLabel] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [connected, setConnected] = useState(false),
    [notice, setNotice] = useState(''),
    [help, setHelp] = useState(false);
  const activeDuration = useRef(1800);
  const queue = useRef<Roll[]>([]),
    last = useRef(0),
    seen = useRef(new Set<string>()),
    initial = useRef(true),
    animationBusy = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    retry = useRef<{ id: string; expression: string; label: string } | null>(
      null,
    );
  useEffect(() => {
    const read = () => {
      const p = new URLSearchParams(location.hash.slice(1));
      const k = p.get('room') || '';
      setKey(k);
      setOverlay(p.get('overlay') === '1');
      setDesktop(p.get('desktop') === '1');
      try {
        const saved = JSON.parse(
          localStorage.getItem('rollparty:' + k) || 'null',
        );
        setCred(saved);
        setName(localStorage.getItem('rollparty:name') || '');
        setColor(localStorage.getItem('rollparty:color') || colors[0]);
      } catch {
        setCred(null);
      }
      setReady(true);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const api = useCallback(
    async (body?: unknown, roomKey = key, credential = cred) => {
      const res = await fetch(
        '/api/session' + (!body ? '?after=' + last.current : ''),
        {
          method: body ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-room-key': roomKey,
            'x-player-key': credential?.secret || '',
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      );
      const data: any = await res.json();
      if (!res.ok) throw Error(data.error || 'Unable to reach the room.');
      return data;
    },
    [key, cred],
  );
  const play = useCallback(() => {
    if (animationBusy.current || !queue.current.length) return;
    animationBusy.current = true;
    const next = queue.current.shift()!;
    activeDuration.current = next.physics ? next.physics.steps / 60 * 1000 : 1800;
    setActive(next);
    timer.current = setTimeout(() => {
      animationBusy.current = false;
      play();
    }, Math.max(2600, (activeDuration.current || 0) + 500));
  }, []);
  const ingest = useCallback(
    (rolls: Roll[], animate = true) => {
      const fresh = rolls.filter((r) => !seen.current.has(r.id));
      for (const r of fresh) {
        seen.current.add(r.id);
        if (animate) queue.current.push(r);
      }
      if (fresh.length)
        setHistory((h) =>
          [...h, ...fresh]
            .sort((a, b) => (a.seq || 0) - (b.seq || 0))
            .slice(-100),
        );
      if (animate) play();
    },
    [play],
  );
  useEffect(() => {
    if (!key) return;
    let stopped = false,
      timeout: ReturnType<typeof setTimeout>;
    if (timer.current) clearTimeout(timer.current);
    animationBusy.current = false;
    last.current = 0;
    seen.current.clear();
    queue.current = [];
    initial.current = true;
    setHistory([]);
    setActive(null);
    setConnected(false);
    const poll = async () => {
      try {
        const data = await api();
        if (stopped) return;
        setRoomName(data.room.name);
        setPlayers(data.players);
        ingest(data.rolls, !initial.current);
        if (initial.current && !overlay && data.rolls.length)
          setActive(data.rolls[data.rolls.length - 1]);
        initial.current = false;
        last.current = Math.max(
          last.current,
          ...data.rolls.map((r: Roll) => r.seq || 0),
        );
        setConnected(true);
        setError((e) => (e.startsWith('Connection lost') ? '' : e));
      } catch (e) {
        if (!stopped) {
          setConnected(false);
          setError('Connection lost: ' + (e as Error).message);
        }
      }
      if (!stopped) timeout = setTimeout(poll, 1200);
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timeout);
    };
  }, [key, api, ingest, overlay]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  async function join(roomKey = key) {
    const data = await api(
      { action: 'join', name: name.trim() || 'Adventurer', color },
      roomKey,
      null,
    );
    localStorage.setItem('rollparty:' + roomKey, JSON.stringify(data));
    localStorage.setItem('rollparty:name', name);
    localStorage.setItem('rollparty:color', color);
    setCred(data);
  }
  async function enter(create: boolean) {
    setBusy(true);
    setError('');
    try {
      if (create) {
        const data = await api({ action: 'create', name: roomName });
        await join(data.key);
        location.hash = new URLSearchParams({ room: data.key }).toString();
      } else await join();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const roll = useCallback(
    async (raw = expression) => {
      if (!cred) throw Error('Join this room first.');
      setBusy(true);
      setError('');
      try {
        parseExpression(raw);
        if (
          !retry.current ||
          retry.current.expression !== raw ||
          retry.current.label !== label
        )
          retry.current = { id: crypto.randomUUID(), expression: raw, label };
        const data = await api({ action: 'roll', ...retry.current });
        retry.current = null;
        ingest([data]);
        return { id: data.id, total: data.total, dice: data.dice };
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [cred, expression, label, api, ingest],
  );
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool || !cred || overlay) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'roll_dice',
            title: 'Roll dice in this room',
            description:
              'Roll D&D dice and publish the result to every player in the current room.',
            inputSchema: {
              type: 'object',
              properties: { expression: { type: 'string' } },
              required: ['expression'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute: async (input: unknown) => {
              if (!input || typeof (input as any).expression !== 'string')
                throw Error('expression is required');
              return roll((input as any).expression);
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, [roll, cred, overlay]);
  async function saveProfile() {
    setBusy(true);
    setError('');
    try {
      await api({ action: 'profile', name, color });
      localStorage.setItem('rollparty:name', name);
      localStorage.setItem('rollparty:color', color);
      setNotice('Your dice style is saved.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function url(asOverlay = false) {
    return (
      location.origin +
      '/#' +
      new URLSearchParams({ room: key, ...(asOverlay ? { overlay: '1' } : {}) })
    );
  }
  async function copy(asOverlay = false) {
    const text = url(asOverlay);
    try {
      await navigator.clipboard.writeText(text);
      setNotice(asOverlay ? 'Overlay link copied.' : 'Invite link copied.');
    } catch {
      setNotice(text);
    }
  }
  function addDie(sides: number) {
    setExpression((e) => {
      if (e === '1d20') return '1d' + sides;
      return e + '+1d' + sides;
    });
  }
  function modify(delta: number) {
    setExpression((e) => {
      const m = e.match(/([+-]\d+)$/);
      if (m) {
        const n = Number(m[1]) + delta;
        return e.slice(0, -m[1].length) + (n ? (n > 0 ? '+' : '') + n : '');
      }
      return e + (delta > 0 ? '+1' : '-1');
    });
  }
  const consoleList = (compact = false) => (
    <div
      className={compact ? 'roll-log compact' : 'roll-log'}
      aria-live="polite"
    >
      {history.length === 0 ? (
        <div className="empty-log">
          <Dices size={25} />
          <p>No rolls yet.</p>
          <span>Your party’s story starts with a roll.</span>
        </div>
      ) : (
        [...history]
          .reverse()
          .slice(0, compact ? 3 : 100)
          .map((r) => (
            <article key={r.id} className="roll-entry">
              <div className="avatar-dot" style={{ background: r.color }} />
              <div>
                <div className="entry-top">
                  <strong>{r.name}</strong>
                  <time>
                    {new Date(r.created).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
                <p>
                  {r.label || r.expression}
                  <span>{r.label ? ' · ' + r.expression : ''}</span>
                </p>
                <small>
                  {r.dice.map((d, i) => (
                    <span key={i} className={!d.kept ? 'discarded' : ''}>
                      {i ? ' + ' : ''}
                      {d.value}
                    </span>
                  ))}
                  {r.modifier !== 0
                    ? (r.modifier > 0 ? ' + ' : ' − ') + Math.abs(r.modifier)
                    : ''}
                </small>
              </div>
              <b style={{ color: r.color }}>{r.total}</b>
            </article>
          ))
      )}
    </div>
  );
  if (!ready)
    return (
      <main className="app">
        <p className="loading">Opening the table…</p>
      </main>
    );
  if (overlay)
    return (
      <main className={desktop ? "overlay-root desktop-overlay" : "overlay-root"}>
        <div className="overlay-corner">
          {desktop && <div className="desktop-drag-bar">Rollparty <span>Drag here to move · resize at the corner</span></div>}
          {(active || desktop) && <DiceStage roll={active} transparent sizeMultiplier={desktop ? 2 : 1} interactive={desktop} />}
          {desktop && <section className="desktop-roll-controls">
            {!cred ? <form onSubmit={e => {e.preventDefault(); enter(false);}}>
              <label>Your name<input value={name} onChange={e=>setName(e.target.value)} maxLength={40} placeholder="Adventurer" /></label>
              <Button type="submit" disabled={busy || !connected}>Join and roll</Button>
            </form> : <>
              <div className="desktop-dice-picker">{SIDES.map(s => <Button key={s} size="sm" variant="outline" onClick={()=>setExpression('1d'+s)}>d{s}</Button>)}</div>
              <form onSubmit={e => { e.preventDefault(); roll().catch(()=>{}); }}>
                <input aria-label="Dice notation" value={expression} onChange={e=>setExpression(e.target.value)} maxLength={120} spellCheck={false} />
                <Button type="submit" className="primary" disabled={busy || !connected}>{busy ? 'Rolling…' : 'Roll'}</Button>
              </form>
            </>}
            <p className="desktop-result">{active ? `${active.name}: ${active.expression} = ${active.total}` : 'Ready to roll'}</p>
            <small>Drag settled dice to move them. Moving dice does not change the recorded roll.</small>
            {error && <p className="error" role="alert">{error}</p>}
          </section>}
          <div className="overlay-console">
            <div className="console-head">
              <Dices size={16} /> ROLLPARTY{' '}
              <span className={connected ? 'live' : 'offline'}>
                {connected ? 'LIVE' : 'CONNECTING'}
              </span>
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {consoleList(true)}
          </div>
        </div>
      </main>
    );
  return (
    <main className="app">
      <header>
        <a className="brand" href="/">
          <Dices /> rollparty<span> / D&D</span>
        </a>
        <div className="header-actions">
          {key && (
            <>
              <Button
                variant="outline"
                className="outline"
                onClick={() => copy()}
              >
                <Link /> Invite players
              </Button>
              <Button
                variant="outline"
                className="outline"
                onClick={() => setHelp(!help)}
              >
                <MonitorUp /> Overlay
              </Button>
            </>
          )}
          <span className="status">
            <Radio size={14} />
            {key
              ? connected
                ? 'Room connected'
                : 'Connecting…'
              : 'Your next adventure starts here'}
          </span>
        </div>
      </header>
      <section className="workspace">
        {!key || !cred ? (
          <>
            <div className="room-heading">
              <p className="eyebrow">
                {key ? 'YOU’RE INVITED' : 'THE TABLE IS YOURS'}
              </p>
              <h1>{key ? 'Take your seat.' : 'Let fate roll.'}</h1>
              <p className="muted">
                {key ? roomName : 'One party. One room. Every roll, together.'}
              </p>
            </div>
            <div className="lobby">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  enter(!key);
                }}
              >
                <p className="eyebrow">
                  {key ? 'JOIN THE PARTY' : 'START A SESSION'}
                </p>
                <h2>{key ? 'Make your entrance' : 'Gather your party'}</h2>
                <label>
                  Your name
                  <input
                    value={name}
                    maxLength={40}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dungeon Master"
                    required
                  />
                </label>
                {!key && (
                  <label>
                    Session name
                    <input
                      value={roomName}
                      maxLength={40}
                      onChange={(e) => setRoomName(e.target.value)}
                      required
                    />
                  </label>
                )}
                <label>Pick your dice color</label>
                <div className="swatches">
                  {colors.map((c) => (
                    <button
                      type="button"
                      key={c}
                      className={c === color ? 'selected' : ''}
                      style={{ background: c }}
                      aria-label={'Dice color ' + c}
                      aria-pressed={c === color}
                      onClick={() => setColor(c)}
                    >
                      {c === color && <Check size={18} />}
                    </button>
                  ))}
                </div>
                <Button type="submit" disabled={busy} className="primary">
                  {busy ? 'Opening room…' : key ? 'Join room' : 'Create a room'}{' '}
                  <ArrowUpRight />
                </Button>
                {error && (
                  <p role="alert" className="error">
                    {error}
                  </p>
                )}
              </form>
              <aside className="lobby-art">
                <div className="lobby-dice">
                  <DiceStage roll={null} color={color} />
                </div>
                <h2>
                  A little chaos.
                  <br />A great story.
                </h2>
                <p className="muted">
                  All seven D&D dice. Your own colors.
                  <br />A shared roll history and a transparent overlay.
                </p>
                <div className="dice-strip">
                  d4 · d6 · d8 · d10 · d12 · d20 · d100
                </div>
              </aside>
            </div>
            {!key && (
              <p className="muted invitation-note">
                Joining friends? Open the invite link from your Dungeon Master.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="room-title">
              <div>
                <p className="eyebrow">YOUR SHARED TABLE</p>
                <h1>{roomName}</h1>
              </div>
              <span className="room-badge">
                <Users size={16} /> {players.length} at the table
              </span>
            </div>
            {help && (
              <section className="overlay-help">
                <div>
                  <h2>Bring the dice to your screen</h2>
                  <p>
                    Use the overlay link as a browser source in OBS or your
                    streaming app. Set it to your screen size, for example 1920
                    × 1080. Dice and a small console stay in the bottom right;
                    the rest is transparent.
                  </p>
                  <p>
                    A normal browser tab cannot float transparently over desktop
                    apps. For that, use a transparent, always-on-top
                    browser-source host.
                  </p>
                  <p>
                    Anyone with an invite can join this room. The overlay link
                    also grants access to its roll history; share both only with
                    your party.
                  </p>
                </div>
                <div className="help-actions">
                  <Button className="primary" onClick={() => copy(true)}>
                    Copy overlay link
                  </Button>
                  <a
                    className="outline"
                    href={url(true)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open overlay <ArrowUpRight size={16} />
                  </a>
                </div>
              </section>
            )}
            <div className="table-grid">
              <div className="table-main">
                <div className="tray">
                  <div className="tray-label">
                    <span className="live-dot" /> SHARED DICE TRAY
                    <span>3D · LIVE ROLLS</span>
                  </div>
                  <DiceStage roll={active} color={color} />
                  <div className="tray-result">
                    {active ? (
                      <>
                        <span>
                          {active.name} rolled {active.expression}
                        </span>
                        <strong>{active.total}</strong>
                        <small>{active.label || 'Let the story unfold.'}</small>
                      </>
                    ) : (
                      <>
                        <span>THE DICE ARE READY</span>
                        <strong className="ready-title">Your move.</strong>
                        <small>Choose your dice and let fate decide.</small>
                      </>
                    )}
                  </div>
                </div>
                <section className="roller">
                  <div className="section-heading">
                    <h2>Make a roll</h2>
                    <Button
                      variant="ghost"
                      className="reset"
                      onClick={() => {
                        setExpression('1d20');
                        setLabel('');
                      }}
                    >
                      <RotateCcw /> Reset
                    </Button>
                  </div>
                  <div className="dice-picker">
                    {SIDES.map((s) => (
                      <Button
                        variant="outline"
                        key={s}
                        className="die-button"
                        onClick={() => addDie(s)}
                      >
                        <Dices />
                        <span>d{s}</span>
                      </Button>
                    ))}
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      roll().catch(() => {});
                    }}
                  >
                    <label>
                      Dice notation{' '}
                      <span className="muted"> · e.g. 2d6+1d4+3</span>
                      <input
                        value={expression}
                        onChange={(e) => setExpression(e.target.value)}
                        maxLength={120}
                        spellCheck={false}
                      />
                    </label>
                    <div className="quick-controls">
                      <Button
                        variant="outline"
                        className="outline"
                        onClick={() => setExpression('2d20kh1')}
                      >
                        Advantage
                      </Button>
                      <Button
                        variant="outline"
                        className="outline"
                        onClick={() => setExpression('2d20kl1')}
                      >
                        Disadvantage
                      </Button>
                      <Button
                        variant="outline"
                        className="outline"
                        aria-label="Subtract one modifier"
                        onClick={() => modify(-1)}
                      >
                        <Minus />
                      </Button>
                      <Button
                        variant="outline"
                        className="outline"
                        aria-label="Add one modifier"
                        onClick={() => modify(1)}
                      >
                        <Plus />
                      </Button>
                    </div>
                    <div className="roll-bottom">
                      <label>
                        Roll label <span className="muted"> · optional</span>
                        <input
                          value={label}
                          maxLength={40}
                          onChange={(e) => setLabel(e.target.value)}
                          placeholder="Perception check"
                        />
                      </label>
                      <Button
                        type="submit"
                        className="primary roll-button"
                        disabled={busy || !connected}
                      >
                        <Dices />
                        {busy ? 'Rolling…' : 'Roll dice'}
                        <ArrowUpRight />
                      </Button>
                    </div>
                  </form>
                  <p className="notation-hint">
                    Supports multiple dice, modifiers, keep highest (kh) and
                    keep lowest (kl). Up to 40 dice per roll.
                  </p>
                </section>
              </div>
              <aside className="right-panel">
                <section className="party">
                  <div className="section-heading">
                    <h2>The party</h2>
                    <span>{players.length} players</span>
                  </div>
                  <div className="player-list">
                    {players.map((p) => (
                      <div key={p.id} className="player">
                        <span style={{ background: p.color }}>
                          {p.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          {p.name}
                          {p.id === cred.id && <small>you</small>}
                        </div>
                        <Dices size={18} color={p.color} />
                      </div>
                    ))}
                  </div>
                  <details>
                    <summary>Your dice & profile</summary>
                    <label>
                      Name
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={40}
                      />
                    </label>
                    <label className="color-label">
                      Dice color
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                      />
                    </label>
                    <Button
                      className="outline"
                      disabled={busy}
                      onClick={saveProfile}
                    >
                      Save profile
                    </Button>
                  </details>
                </section>
                <section className="history">
                  <div className="section-heading">
                    <h2>Roll console</h2>
                    <span className="live">LIVE</span>
                  </div>
                  {consoleList()}
                </section>
              </aside>
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {notice && (
              <div role="status" className="notice">
                <span>{notice}</span>
                <button
                  aria-label="Dismiss message"
                  onClick={() => setNotice('')}
                >
                  ×
                </button>
              </div>
            )}
          </>
        )}
      </section>
      <footer>
        ROLL TOGETHER. ADVENTURE ANYWHERE.
        {key && (
          <a href="/">
            <ArrowLeft size={14} /> Leave room
          </a>
        )}
      </footer>
    </main>
  );
}
