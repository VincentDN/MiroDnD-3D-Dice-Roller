'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

// A floating panel resizable via the browser's native bottom-right resize
// handle. Size persists per `storageKey` so OBS/desktop overlay layouts
// survive a reload. Position is fixed (top-left anchored) - only sizing is
// interactive here, not dragging.
export function ResizablePanel({
  storageKey,
  defaultWidth,
  defaultHeight,
  minWidth = 160,
  minHeight = 120,
  className = '',
  style,
  children,
}: {
  storageKey: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  minHeight?: number;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (Number.isFinite(saved?.w) && saved.w >= minWidth) el.style.width = `${saved.w}px`;
      if (Number.isFinite(saved?.h) && saved.h >= minHeight) el.style.height = `${saved.h}px`;
    } catch {}
    const observer = new ResizeObserver(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ w: el.clientWidth, h: el.clientHeight }));
      } catch {}
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [storageKey, minWidth, minHeight]);
  return (
    <div
      ref={ref}
      className={`resizable-panel ${className}`}
      style={{ width: defaultWidth, height: defaultHeight, minWidth, minHeight, ...style }}
    >
      {children}
    </div>
  );
}

// A full-width bar pinned to the bottom of the screen, resizable by dragging
// its top edge (native CSS `resize` only grows from the bottom-right corner,
// which doesn't work for something pinned to the bottom).
export function ResizableTaskbar({
  storageKey,
  defaultHeight,
  minHeight = 64,
  maxHeight,
  className = '',
  onHeightChange,
  children,
}: {
  storageKey: string;
  defaultHeight: number;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
  onHeightChange?: (height: number) => void;
  children: ReactNode;
}) {
  const [height, setHeight] = useState(defaultHeight);
  const heightRef = useRef(height);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (Number.isFinite(saved) && saved >= minHeight) setHeight(saved);
    } catch {}
  }, [storageKey, minHeight]);
  useEffect(() => {
    heightRef.current = height;
    onHeightChange?.(height);
  }, [height, onHeightChange]);
  function persist(next: number) {
    setHeight(next);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch {}
  }
  function onGripPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = heightRef.current;
    const cap = maxHeight ?? window.innerHeight * 0.7;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    function move(ev: PointerEvent) {
      persist(Math.min(cap, Math.max(minHeight, startHeight + (startY - ev.clientY))));
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
  return (
    <div className={`resizable-taskbar ${className}`} style={{ height }}>
      <div className="taskbar-grip" onPointerDown={onGripPointerDown} title="Drag to resize" />
      <div className="taskbar-content">{children}</div>
    </div>
  );
}
