'use client';
import { Dices } from 'lucide-react';
import type { Roll } from '@/lib/dice';

export function RollHistory({ history }: { history: Roll[] }) {
  return (
    <div className="roll-log" aria-live="polite">
      {history.length === 0 ? (
        <div className="empty-log">
          <Dices size={25} />
          <p>No rolls yet.</p>
          <span>Your party’s story starts with a roll.</span>
        </div>
      ) : (
        [...history]
          .reverse()
          .slice(0, 100)
          .map((r) => (
            <article key={r.id} className="roll-entry">
              <div className="roll-sentence">
                <strong style={{color:r.color}}>{r.name}</strong>{' '}rolls{' '}
                <code>{r.expression}</code>{' = '}
                <span className="roll-values">{r.dice.map((d,i)=><span key={i} className={!d.kept?'discarded':''} aria-label={!d.kept?`${d.value}, discarded`:undefined}>{i?' + ':''}{d.value}</span>)}
                {r.modifier!==0 ? (r.modifier>0?' + ':' − ')+Math.abs(r.modifier):''}</span>
                {' = '}<b className="roll-total">{r.total}</b>
              </div>
              <div className="roll-meta">{r.label&&<span>{r.label}</span>}{r.parent&&r.label!=="Mouse throw"&&<span>Mouse throw</span>}<time>{new Date(r.created).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time></div>
            </article>
          ))
      )}
    </div>
  );
}
