'use client';
import { useState } from 'react';
import {
  defaultAppearance,
  readableNumbers,
  STYLES,
  type DiceAppearance,
} from '@/lib/dice-appearance';
import DiceStage from './dice-stage';
import { evaluatePhysical } from '@/lib/dice-physics';
import type { Roll } from '@/lib/dice';

export default function AppearanceEditor({
  value,
  onChange,
  fallback = defaultAppearance(),
  title = 'Dice appearance',
}: {
  value?: DiceAppearance;
  onChange: (a: DiceAppearance | undefined) => void;
  fallback?: DiceAppearance;
  title?: string;
}) {
  const a = value ?? fallback;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sides, setSides] = useState(20),
    [preview, setPreview] = useState<Roll | null>(null),
    [error, setError] = useState('');
  const update = (patch: Partial<DiceAppearance>) =>
    onChange({ ...a, ...patch });
  function test() {
    try {
      setPreview({
        id: crypto.randomUUID(),
        name: 'Preview',
        label: '',
        color: a.body,
        created: Date.now(),
        ...evaluatePhysical(`1d${sides}`, 1.5),
      });
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <fieldset className="appearance-editor">
      <legend>{title}</legend>
      <label>
        <input
          type="checkbox"
          checked={!value}
          onChange={(e) =>
            onChange(e.target.checked ? undefined : { ...fallback })
          }
        />
        Use inherited appearance
      </label>
      <div className="appearance-fields">
        <label>
          Style
          <select
            value={a.style}
            onChange={(e) =>
              update({ style: e.target.value as DiceAppearance['style'] })
            }
          >
            {STYLES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Die color
          <input
            type="color"
            value={a.body}
            onChange={(e) => update({ body: e.target.value })}
          />
        </label>
        <label>
          Number color
          <input
            type="color"
            value={a.numbers}
            onChange={(e) => update({ numbers: e.target.value })}
          />
        </label>
        {a.style === 'gradient' && (
          <label>
            Second color
            <input
              type="color"
              value={a.secondary}
              onChange={(e) => update({ secondary: e.target.value })}
            />
          </label>
        )}
        {a.style === 'sparkly' && (
          <>
            <label>
              Sparkle color
              <input
                type="color"
                value={a.sparkle}
                onChange={(e) => update({ sparkle: e.target.value })}
              />
            </label>
            <label>
              Sparkle intensity
              <input
                type="range"
                min="0"
                max="1"
                step=".05"
                value={a.intensity}
                onChange={(e) => update({ intensity: +e.target.value })}
              />
            </label>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() =>
          update({
            numbers: readableNumbers(a.style === 'dark' ? '#101820' : a.body),
          })
        }
      >
        Suggest readable numbers
      </button>{' '}
      <button type="button" onClick={() => onChange(undefined)}>
        Reset appearance
      </button>
      <details onToggle={(e) => setPreviewOpen(e.currentTarget.open)}>
        <summary>Live preview and test roll</summary>
        <label>
          Preview die
          <select
            value={sides}
            onChange={(e) => {
              setSides(+e.target.value);
              setPreview(null);
            }}
          >
            {[4, 6, 8, 10, 12, 20, 100].map((s) => (
              <option value={s} key={s}>
                d{s}
              </option>
            ))}
          </select>
        </label>
        {previewOpen && (
          <div className="appearance-preview">
            <DiceStage
              key={sides}
              roll={
                preview ?? {
                  id: `preview-${sides}`,
                  dice: [{ sides, value: 1, kept: true }],
                  name: 'Preview',
                  color: a.body,
                  expression: `1d${sides}`,
                  label: '',
                  modifier: 0,
                  total: 1,
                  created: 0,
                }
              }
              appearance={a}
              color={a.body}
              interactive={false}
            />
          </div>
        )}
        <button type="button" onClick={test}>
          Test roll
        </button>
        {error && <p role="alert">{error}</p>}
      </details>
    </fieldset>
  );
}
