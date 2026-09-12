'use client';
import { useState } from 'react';
import DiceStage from './dice-stage';

export default function IntroDice({ color }: { color: string }) {
  const [request, setRequest] = useState(0);
  const [results, setResults] = useState<{ id: number; value: number }[]>([]);
  return <>
    <div className="lobby-dice">
      <DiceStage roll={null} color={color} sizeMultiplier={1.5} localRollRequest={request}
        onLocalResult={value => setResults(previous => [{ id: (previous[0]?.id ?? 0) + 1, value }, ...previous].slice(0, 5))} />
    </div>
    <section className="intro-console" aria-label="Practice roll console">
      <div><strong>Try the dice</strong><button type="button" className="outline" onClick={() => setRequest(n => n + 1)}>Roll d20</button></div>
      <p>Drag and throw, or roll here. Practice rolls stay on this screen.</p>
      <div role="log" aria-live="polite" aria-relevant="additions">
        {results.length ? results.map(result => <p key={result.id}>#{result.id} · d20 → <b>{result.value}</b></p>) : <p>No rolls yet.</p>}
      </div>
    </section>
  </>;
}
