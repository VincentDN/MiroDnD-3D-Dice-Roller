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
  Users,
  Move,
  Maximize2,
  Volume2,
  VolumeX,
  Settings as SettingsIcon,
  X,
} from 'lucide-react';
import DiceStage from '@/components/dice-stage';
import IntroDice from '@/components/intro-dice';
import AppVersion from '@/components/app-version';
import RollNotebook from '@/components/roll-notebook';
import { RollHistory } from '@/components/roll-history';
import SettingsPanel, { useSettings } from '@/components/settings-panel';
import { unlockSound, setSoundEnabled } from '@/lib/dice-audio';
import type { Motion, TableBounds } from '@/lib/dice-physics';
import ActionBar from '@/components/action-bar';
import Soundboard from '@/components/soundboard';
import MusicPlayer from '@/components/music-player';
import RollReveal from '@/components/roll-reveal';
import type { ActionRollOptions } from '@/lib/action-damage';
import { SIDES, parseExpression, type Roll } from '@/lib/dice';
import { DEFAULT_ROLE_ID, DEFAULT_CUSTOM_COLOR, CUSTOM_ROLE_ID, roleById, isRoleId, type RoleId } from '@/lib/roles';
import { RoleBadge, RolePicker } from '@/components/role-picker';
import { defaultMusic, type MusicState } from '@/lib/music';
type Player = { id: string; name: string; color: string; role: string | null; seen: number };
type Credential = { id: string; secret: string };
export default function Home() {
  const trayAspect = useRef<number | undefined>(undefined);
  const onViewport = useCallback((aspect: number) => { trayAspect.current = aspect; }, []);
  const [ready, setReady] = useState(false),
    [key, setKey] = useState(''),
    [overlay, setOverlay] = useState(false),
    [desktop, setDesktop] = useState(false),
    [cred, setCred] = useState<Credential | null>(null);
  const [name, setName] = useState(''),
    [roomName, setRoomName] = useState('The Sunday campaign'),
    [role, setRole] = useState<RoleId>(DEFAULT_ROLE_ID),
    [customColor, setCustomColor] = useState(DEFAULT_CUSTOM_COLOR),
    [players, setPlayers] = useState<Player[]>([]),
    [history, setHistory] = useState<Roll[]>([]),
    [active, setActive] = useState<Roll | null>(null),
    [music, setMusic] = useState<MusicState>(defaultMusic());
  const color = role === CUSTOM_ROLE_ID ? customColor : (roleById(role)?.color ?? DEFAULT_CUSTOM_COLOR);
  const [expression, setExpression] = useState('1d20'),
    [label, setLabel] = useState(''),
    [busy, setBusy] = useState(false),
    [pendingExpression, setPendingExpression] = useState<string | undefined>(),
    [error, setError] = useState(''),
    [connected, setConnected] = useState(false),
    [notice, setNotice] = useState(''),
    [help, setHelp] = useState(false);
  const [sound, setSound] = useState(true);
  const [fresh, setFresh] = useState(false);
  const [settledId, setSettledId] = useState('');
  useEffect(()=> {
    const sync=()=> { let value=true;try {value=localStorage.getItem('rollparty:sound')!=='off';}catch {} setSound(value);setSoundEnabled(value); };
    sync();unlockSound();
    window.addEventListener('pointerdown',unlockSound);window.addEventListener('keydown',unlockSound);
    window.addEventListener('storage',sync);
    return ()=> {window.removeEventListener('pointerdown',unlockSound);window.removeEventListener('keydown',unlockSound);window.removeEventListener('storage',sync);};
  },[]);
  function toggleSound() {
    const value=!sound;setSound(value);setSoundEnabled(value);
    try {localStorage.setItem('rollparty:sound',value?'on':'off');}catch {}
    if(value)unlockSound();
  }
  const soundButton=<Button variant="ghost" size="sm" onClick={toggleSound} aria-label={sound?'Mute sounds':'Enable sounds'} title={sound?'Mute sounds':'Enable sounds'} aria-pressed={sound}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</Button>;
  const [surface, setSurface] = useState('');
  const [settings, updateSettings] = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const settingsButton=<Button variant="ghost" size="sm" onClick={()=>setShowSettings(s=>!s)} aria-label="Settings" title="Settings" aria-pressed={showSettings}><SettingsIcon size={18}/></Button>;
  const settingsPanel=showSettings && <SettingsPanel settings={settings} update={updateSettings} onClose={()=>setShowSettings(false)} desktop={desktop}/>;
  const queue = useRef<Roll[]>([]),
    last = useRef(0),
    seen = useRef(new Set<string>()),
    initial = useRef(true),
    animationBusy = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    retry = useRef<{ id: string; expression: string; label: string; options?: ActionRollOptions; quick: boolean } | null>(
      null,
    );
  useEffect(() => {
    const read = () => {
      const p = new URLSearchParams(location.hash.slice(1));
      const k = p.get('room') || '';
      setKey(k);
      setOverlay(p.get('overlay') === '1');
      setDesktop(p.get('desktop') === '1');
      setSurface(p.get('desktop') === '1' && ['table','hotbar'].includes(p.get('surface') || '') ? p.get('surface')! : '');
      try {
        const saved = JSON.parse(
          localStorage.getItem('rollparty:' + k) || 'null',
        );
        setCred(saved);
        setName(localStorage.getItem('rollparty:name') || '');
        const savedRole = localStorage.getItem('rollparty:role');
        setRole(isRoleId(savedRole) ? savedRole : DEFAULT_ROLE_ID);
        const savedColor = localStorage.getItem('rollparty:customColor');
        if (savedColor && /^#[0-9a-f]{6}$/i.test(savedColor)) setCustomColor(savedColor);
      } catch {
        setCred(null);
      }
      setReady(true);
    };
    read();
    window.addEventListener('hashchange', read);
    const syncCredentials = (event: StorageEvent) => {
      if (event.key === 'rollparty:' + new URLSearchParams(location.hash.slice(1)).get('room')) read();
    };
    window.addEventListener('storage', syncCredentials);
    return () => { window.removeEventListener('hashchange', read); window.removeEventListener('storage', syncCredentials); };
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
    setFresh(true);
    setSettledId('');
    setActive(next);
  }, []);
  const onDiceSettled = useCallback((id: string) => {
    setSettledId(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      animationBusy.current = false;
      play();
    }, 2100);
  }, [play]);
  const ingest = useCallback(
    (rolls: Roll[], animate = true) => {
      const fresh = rolls.filter((r) => !seen.current.has(r.id));
      for (const r of fresh) {
        seen.current.add(r.id);
        if (animate && surface !== 'hotbar' && !r.quick) queue.current.push(r);
      }
      // A direct roll()/throwDice() response ingests here too, immediately advancing
      // the poll cursor - otherwise the next scheduled poll re-fetches this same roll
      // (harmless since `seen` still dedupes it, but a wasted round trip every roll).
      if (rolls.length) last.current = Math.max(last.current, ...rolls.map((r) => r.seq || 0));
      if (fresh.length)
        setHistory((h) =>
          [...h, ...fresh]
            .sort((a, b) => (a.seq || 0) - (b.seq || 0))
            .slice(-100),
        );
      if (surface === 'hotbar' && rolls.length) {
        const latest = rolls[rolls.length - 1]; setActive(latest); setSettledId(latest.id);
      } else if (animate) {
        const quick = fresh.findLast(r => r.quick);
        if (quick) {
          // Quickroll bypasses even an in-progress animation/reveal. Its history
          // and server-generated result are shared with every room surface.
          if (timer.current) clearTimeout(timer.current);
          animationBusy.current = true;
          setFresh(false);
          setSettledId(quick.id);
          setActive(quick);
        } else play();
      }
    },
    [play, surface],
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
    setFresh(false);
    setSettledId('');
    setActive(null);
    setMusic(defaultMusic());
    setConnected(false);
    const poll = async () => {
      try {
        const data = await api();
        if (stopped) return;
        setRoomName(data.room.name);
        setMusic(data.room.music);
        setPlayers(data.players);
        ingest(data.rolls, !initial.current);
        if (initial.current && !overlay && data.rolls.length)
          setActive(data.rolls[data.rolls.length - 1]);
        initial.current = false;
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
      { action: 'join', name: name.trim() || 'Adventurer', role, color },
      roomKey,
      null,
    );
    localStorage.setItem('rollparty:' + roomKey, JSON.stringify(data));
    localStorage.setItem('rollparty:name', name);
    localStorage.setItem('rollparty:role', role);
    localStorage.setItem('rollparty:customColor', customColor);
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
    async (raw = expression, rollLabel = label, options?: ActionRollOptions, quick = false) => {
      if (!cred) throw Error('Join this room first.');
      setBusy(true);
      setError('');
      try {
        parseExpression(raw);
        unlockSound();
        if (!quick) setPendingExpression(raw);
        if (
          !retry.current ||
          retry.current.expression !== raw ||
          retry.current.label !== rollLabel || retry.current.quick !== quick || JSON.stringify(retry.current.options) !== JSON.stringify(options)
        )
          retry.current = { id: crypto.randomUUID(), expression: raw, label: rollLabel, options, quick };
        const data = await api({ action: 'roll', ...retry.current, ...options, diceScale: desktop ? 2 : 1.5, aspect: trayAspect.current });
        retry.current = null;
        ingest([data]);
        return { id: data.id, total: data.total, dice: data.dice };
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setBusy(false);
        setPendingExpression(undefined);
      }
    },
    [cred, expression, label, api, ingest, desktop],
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
  async function throwDice(parent: string | null, release: Motion[], bounds: TableBounds, diceScale: number) {
    if (!cred || busy) return;
    unlockSound();setBusy(true);setError('');setPendingExpression('Mouse throw');
    try {
      const result=await api({action:'throw',id:crypto.randomUUID(),parent,release,bounds,diceScale,label:'Mouse throw'});
      ingest([result]);
    } catch(e) {setError((e as Error).message);}
    finally {setBusy(false);setPendingExpression(undefined);}
  }
  async function saveProfile() {
    setBusy(true);
    setError('');
    try {
      await api({ action: 'profile', name, role, color });
      localStorage.setItem('rollparty:name', name);
      localStorage.setItem('rollparty:role', role);
      localStorage.setItem('rollparty:customColor', customColor);
      setNotice('Your dice style is saved.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const updateMusic = useCallback(
    async (next: Omit<MusicState, 'updated'>) => {
      const data = await api({ action: 'music', ...next });
      setMusic(data.music);
    },
    [api],
  );
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
  if (!ready)
    return (
      <main className="app">
        <p className="loading">Opening the table…</p>
      </main>
    );
  if (overlay)
    return (
      <main className={`${desktop ? "overlay-root desktop-overlay" : "overlay-root"}${surface ? ` split-${surface}` : ""}`}>
        {settingsPanel}
        {desktop && <div className="desktop-drag-bar">VincentsVibeRoller <AppVersion /><span className="window-hints" title="Move window / resize from corner"><Move size={15} aria-label="Drag header to move"/><Maximize2 size={15} aria-label="Resize using the corner grip"/></span></div>}
        {surface !== 'hotbar' && <div className="rpg-left">
          <div className="console-panel">
            <div className="console-head">
              <Dices size={16} /> VincentsVibeRoller{' '}
              <span className={connected ? 'live' : 'offline'}>
                {connected ? 'LIVE' : 'CONNECTING'}
              </span>
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="overlay-taskbar">
              <RollHistory history={history} />
            </div>
            {desktop && cred && <RollNotebook key={key+cred.id} room={key} playerId={cred.id} rolls={history}/> }
          </div>
          <div className="dice-panel">
            <RollReveal roll={active} settledId={settledId} fresh={fresh} mode={settings.reveal}/>
            {(active || desktop) && <DiceStage reducedEffects={settings.reducedEffects} pendingExpression={pendingExpression} roll={active} transparent sizeMultiplier={desktop ? 2 : 1} interactive={desktop} fresh={fresh} onSettled={onDiceSettled} onThrow={throwDice} />}
          </div>
        </div>}
        {desktop && surface !== 'table' && <section className="rpg-hotbar desktop-roll-controls">
          {!cred ? <form onSubmit={e => {e.preventDefault(); enter(false);}}>
            <label>Your name<input value={name} onChange={e=>setName(e.target.value)} maxLength={40} placeholder="Adventurer" /></label>
            <Button type="submit" disabled={busy || !connected}>Join and roll</Button>
          </form> : <>
            <div className="rpg-hotbar-top">
              {soundButton}{settingsButton}
              <div className="desktop-dice-picker">{SIDES.map(s => <Button key={s} size="sm" variant="outline" onClick={()=>setExpression('1d'+s)}>d{s}</Button>)}</div>
              <form onSubmit={e => { e.preventDefault(); roll().catch(()=>{}); }}>
                <input aria-label="Dice notation" value={expression} onChange={e=>setExpression(e.target.value)} maxLength={120} spellCheck={false} />
                <div className="roll-submit-stack"><Button type="submit" className="primary" disabled={busy || !connected}>{busy ? 'Rolling…' : 'Roll'}</Button>
                <Button type="button" size="sm" variant="ghost" className="quick-roll" aria-label="Quickroll (QR)" title="Quickroll: show the result without animation" disabled={busy || !connected} onClick={()=>roll(expression,label,undefined,true).catch(()=>{})}>QR</Button></div>
              </form>
              <p className="desktop-result">{pendingExpression ? 'Rolling…' : active ? `${active.name}: ${active.expression}${settledId===active.id ? ` = ${active.total}` : " · rolling…"}` : 'Ready to roll'}</p>
            </div>
            <ActionBar expression={expression} disabled={busy || !connected}
              color={color} role={role} onRoll={(raw, title, options) => { setExpression(raw); setLabel(title); return roll(raw, title, options); }} />
            {role === 'dm' && <Soundboard />}
            <MusicPlayer music={music} isDm={role === 'dm'} disabled={!connected} onUpdate={updateMusic} />
          </>}
          <small>{surface === 'hotbar' ? 'Roll here. Choose Interact with table to drag dice or move the table window.' : 'Drag to move. Throw firmly to record a new roll.'}</small>
        </section>}
      </main>
    );
  return (
    <main className="app">
      {settingsPanel}
      <header>
        <div className="brand-block">
          <a className="brand" href="/">
            <Dices /> VincentsVibeRoller<span> / D&D</span>
          </a>
          <AppVersion />
        </div>
        <div className="header-actions">
          {soundButton}
          {settingsButton}
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
                <label>Pick your role</label>
                <RolePicker value={role} color={customColor} onChange={setRole} onColorChange={setCustomColor} />
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
                <IntroDice color={color} />
                <h2>
                  Your table, your story
                </h2>
                <p className="muted">
                  One party. One room. Every roll, together.
                </p>
                <div className="dice-strip">
                  SIX – SIX – SIX – NATURAL TWENTY – SIX – SIX – SIX
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
                  <div className="tray-label" style={active ? { color: active.color } : undefined}>
                    <span className="live-dot" style={active ? { background: active.color } : undefined} /> Last Roll: {active?.name ?? 'No rolls yet'}
                  </div>
                  <DiceStage reducedEffects={settings.reducedEffects} pendingExpression={pendingExpression} roll={active} color={color} sizeMultiplier={1.5} onViewport={onViewport} fresh={fresh} onSettled={onDiceSettled} onThrow={throwDice} />
                  <RollReveal roll={active} settledId={settledId} fresh={fresh} mode={settings.reveal}/><div className="tray-result">
                    {active ? (
                      <>
                        <span>
                          {active.name} rolled {active.expression}
                        </span>
                        <strong>{settledId===active.id?active.total:"…"}</strong>
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
                <ActionBar expression={expression} disabled={busy || !connected}
                  color={color} role={role} onRoll={(raw, title, options) => { setExpression(raw); setLabel(title); return roll(raw, title, options); }} />
                {role === 'dm' && <Soundboard />}
                <MusicPlayer music={music} isDm={role === 'dm'} disabled={!connected} onUpdate={updateMusic} />
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
                      <div className="roll-submit-stack"><Button
                        type="submit"
                        className="primary roll-button"
                        disabled={busy || !connected}
                      >
                        <Dices />
                        {busy ? 'Rolling…' : 'Roll dice'}
                        <ArrowUpRight />
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="quick-roll" aria-label="Quickroll (QR)" title="Quickroll: show the result without animation" disabled={busy || !connected} onClick={()=>roll(expression,label,undefined,true).catch(()=>{})}>QR</Button></div>
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
                        {isRoleId(p.role) && p.role !== CUSTOM_ROLE_ID ? (
                          <RoleBadge role={p.role} color={p.color} size={32} />
                        ) : (
                          <span style={{ background: p.color }}>
                            {p.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
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
                    <label>Your role</label>
                    <RolePicker value={role} color={customColor} onChange={setRole} onColorChange={setCustomColor} />
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
                  {cred && <RollNotebook key={key+cred.id} room={key} playerId={cred.id} rolls={history}/> }
                  <RollHistory history={history}/>
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
