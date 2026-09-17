'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Music,
  FolderOpen,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Bookmark as BookmarkIcon,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  supported,
  loadSavedFolder,
  pickFolder,
  ensurePermission,
  listTracks,
  type Track,
} from '@/lib/music-library';
import { livePosition, MAX_BOOKMARKS, type MusicState } from '@/lib/music';

const VOLUME_KEY = 'rollparty:musicVolume';
const MUTE_KEY = 'rollparty:musicMuted';
const DRIFT_TOLERANCE = 1.5; // seconds - only reseek local playback past this
const RESYNC_MS = 4000;

function format(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60),
    s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MusicPlayer({
  music,
  isDm,
  disabled,
  onUpdate,
}: {
  music: MusicState;
  isDm: boolean;
  disabled?: boolean;
  onUpdate: (next: Omit<MusicState, 'updated'>) => Promise<void>;
}) {
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [error, setError] = useState('');
  const [bookmarkName, setBookmarkName] = useState('');
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const urlRef = useRef<string | null>(null);
  const musicRef = useRef(music);
  musicRef.current = music;

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(VOLUME_KEY));
      if (Number.isFinite(v) && v >= 0 && v <= 1) setVolume(v);
      setMuted(localStorage.getItem(MUTE_KEY) === '1');
    } catch {}
    if (!supported()) return;
    loadSavedFolder().then(async (saved) => {
      if (!saved) return;
      setHandle(saved);
      if (await ensurePermission(saved)) {
        try {
          setTracks(await listTracks(saved));
        } catch {}
      } else setNeedsPermission(true);
    });
  }, []);

  async function chooseFolder() {
    setError('');
    try {
      const picked = await pickFolder();
      setHandle(picked);
      setNeedsPermission(false);
      setTracks(await listTracks(picked));
    } catch (e) {
      if ((e as Error).name !== 'AbortError')
        setError('Could not open that folder: ' + (e as Error).message);
    }
  }
  async function reconnect() {
    if (!handle) return;
    if (await ensurePermission(handle)) {
      setNeedsPermission(false);
      try {
        setTracks(await listTracks(handle));
      } catch {}
    }
  }

  // Resolve and play whatever the shared state says is playing, using this
  // device's own local copy of the file if one is found by filename.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let cancelled = false;
    const track = tracks.find((t) => t.id === music.trackId);
    if (!track) {
      audio.pause();
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      audio.removeAttribute('src');
      return;
    }
    track.handle.getFile().then((file) => {
      if (cancelled) return;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(file);
      urlRef.current = url;
      audio.src = url;
      audio.currentTime = livePosition(music);
      if (music.playing) audio.play().catch(() => {});
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [music.trackId, tracks]);

  // Play/pause and periodic drift correction for the currently loaded track.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (music.playing) audio.play().catch(() => {});
    else audio.pause();
    const id = setInterval(() => {
      if (!music.playing) return;
      const target = livePosition(musicRef.current);
      if (Math.abs(audio.currentTime - target) > DRIFT_TOLERANCE) audio.currentTime = target;
    }, RESYNC_MS);
    return () => clearInterval(id);
  }, [music.playing, music.position, music.updated]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = muted ? 0 : volume;
    try {
      localStorage.setItem(VOLUME_KEY, String(volume));
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {}
  }, [volume, muted]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  async function send(next: Omit<MusicState, 'updated'>) {
    setError('');
    try {
      await onUpdate(next);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function playTrack(track: Track) {
    send({
      trackId: track.id,
      trackName: track.name,
      playing: true,
      position: 0,
      shuffle: music.shuffle,
      bookmarks: music.bookmarks,
    });
  }
  function step(direction: 1 | -1) {
    if (!tracks.length) return;
    const index = tracks.findIndex((t) => t.id === music.trackId);
    const next =
      direction === 1 && music.shuffle
        ? tracks[Math.floor(Math.random() * tracks.length)]
        : tracks[(index + direction + tracks.length) % tracks.length] ?? tracks[0];
    playTrack(next);
  }
  function togglePlay() {
    if (!music.trackId) return;
    send({ ...music, playing: !music.playing, position: livePosition(music) });
  }
  function toggleShuffle() {
    send({ ...music, shuffle: !music.shuffle, position: livePosition(music) });
  }
  function saveBookmark() {
    if (!music.trackId || !bookmarkName.trim()) return;
    if (music.bookmarks.length >= MAX_BOOKMARKS) {
      setError(`Use up to ${MAX_BOOKMARKS} bookmarks.`);
      return;
    }
    send({
      ...music,
      position: livePosition(music),
      bookmarks: [
        ...music.bookmarks,
        {
          id: crypto.randomUUID(),
          name: bookmarkName.trim(),
          trackId: music.trackId,
          trackName: music.trackName,
          position: livePosition(music),
        },
      ],
    });
    setBookmarkName('');
  }
  function jumpTo(bookmark: MusicState['bookmarks'][number]) {
    send({
      trackId: bookmark.trackId,
      trackName: bookmark.trackName,
      playing: true,
      position: bookmark.position,
      shuffle: music.shuffle,
      bookmarks: music.bookmarks,
    });
  }
  function removeBookmark(id: string) {
    send({ ...music, position: livePosition(music), bookmarks: music.bookmarks.filter((b) => b.id !== id) });
  }

  return (
    <section className="music-player" aria-label="Table music">
      <audio ref={audioRef} hidden />
      <div className="music-header">
        <strong>
          <Music size={15} /> Music
        </strong>
        <span className="music-now-playing">
          {music.trackId ? music.trackName : 'No music playing'}
        </span>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {isDm && (
        <>
          {!supported() ? (
            <p className="muted">
              Playing a local music folder needs a Chromium-based browser (Chrome, Edge, or this
              app's own desktop window).
            </p>
          ) : (
            <>
              <div className="music-tools">
                <button type="button" onClick={chooseFolder}>
                  <FolderOpen size={14} /> {handle ? 'Change folder' : 'Choose music folder'}
                </button>
                {needsPermission && (
                  <button type="button" onClick={reconnect}>
                    Reconnect folder
                  </button>
                )}
              </div>
              {tracks.length > 0 && (
                <>
                  <div className="music-transport">
                    <button type="button" disabled={disabled} aria-label="Previous track" onClick={() => step(-1)}>
                      <SkipBack size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={disabled || !music.trackId}
                      aria-label={music.playing ? 'Pause' : 'Play'}
                      onClick={togglePlay}
                    >
                      {music.playing ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button type="button" disabled={disabled} aria-label="Next track" onClick={() => step(1)}>
                      <SkipForward size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label="Shuffle"
                      aria-pressed={music.shuffle}
                      className={music.shuffle ? 'active' : ''}
                      onClick={toggleShuffle}
                    >
                      <Shuffle size={16} />
                    </button>
                  </div>
                  <div className="music-track-list">
                    {tracks.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        className={t.id === music.trackId ? 'music-track selected' : 'music-track'}
                        disabled={disabled}
                        onClick={() => playTrack(t)}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                  <div className="music-bookmark-form">
                    <input
                      value={bookmarkName}
                      onChange={(e) => setBookmarkName(e.target.value)}
                      maxLength={60}
                      placeholder="Bookmark this moment"
                      disabled={!music.trackId}
                    />
                    <button type="button" disabled={disabled || !music.trackId || !bookmarkName.trim()} onClick={saveBookmark}>
                      <BookmarkIcon size={14} /> Save
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
      {music.bookmarks.length > 0 && (
        <div className="music-bookmarks">
          {music.bookmarks.map((b) => (
            <span className="music-bookmark" key={b.id}>
              <button type="button" disabled={disabled} onClick={() => isDm && jumpTo(b)} title={b.trackName}>
                {b.name}
              </button>
              {isDm && (
                <button type="button" aria-label={`Remove bookmark ${b.name}`} onClick={() => removeBookmark(b.id)}>
                  <X size={11} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {!isDm && supported() && !handle && (
        <button type="button" className="music-follow" onClick={chooseFolder}>
          <FolderOpen size={13} /> Point to your music folder to hear this
        </button>
      )}
      {!isDm && needsPermission && (
        <button type="button" className="music-follow" onClick={reconnect}>
          Reconnect your music folder
        </button>
      )}
      <div className="music-volume">
        <button type="button" aria-label={muted ? 'Unmute music' : 'Mute music'} onClick={() => setMuted((m) => !m)}>
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
        <input
          type="range"
          aria-label="Music volume"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
        />
        {music.trackId && <span className="music-position">{format(livePosition(music))}</span>}
      </div>
    </section>
  );
}
