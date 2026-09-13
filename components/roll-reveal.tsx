'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import type { Roll } from '@/lib/dice';

export default function RollReveal({
  roll,
  settledId,
  fresh,
  mode = 'full',
}: {
  roll: Roll | null;
  settledId: string;
  fresh: boolean;
  mode?: 'full' | 'subtle' | 'off';
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!roll || !fresh || settledId !== roll.id) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [roll?.id, settledId, fresh]);
  if (!visible || !roll || mode === 'off') return null;
  return (
    <div
      className={`roll-reveal ${mode}`}
      style={{ '--reveal-color': roll.color } as CSSProperties}
      role="status"
      aria-live="polite"
    >
      <strong className="reveal-player">{roll.name}</strong>
      {mode === 'full' && (
        <>
          <span>{roll.label}</span>
          <p>
            {roll.expression} →{' '}
            {roll.dice.map((d, i) => (
              <span key={i}>
                {i > 0 ? ' + ' : ''}
                {d.kept ? d.value : <del title="Discarded die">{d.value}</del>}
              </span>
            ))}
            {roll.modifier
              ? ` ${roll.modifier > 0 ? '+' : '−'} ${Math.abs(roll.modifier)}`
              : ''}{' '}
            = {roll.total}
          </p>
          <b className="reveal-total">{roll.total}</b>
        </>
      )}
      {mode === 'subtle' && <b>{roll.total}</b>}
    </div>
  );
}
