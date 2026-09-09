import type { Roll } from './dice.ts';

export function resultCue(roll: Pick<Roll, 'dice'>): 'ping' | 'trumpet' {
  return roll.dice.some(d => d.sides === 20 && d.value === 20 && d.kept) ? 'trumpet' : 'ping';
}
export class ResultSounds {
  private played = new Set<string>();
  claim(id: string, fresh: boolean) {
    if (!fresh || this.played.has(id)) return false;
    this.played.add(id);
    if (this.played.size > 500) this.played.delete(this.played.values().next().value!);
    return true;
  }
}
const results = new ResultSounds();
let context: AudioContext | undefined, output: GainNode | undefined;
let enabled = true, lastImpact = -Infinity;
const voices = new Set<AudioScheduledSourceNode>();
export function setSoundEnabled(value: boolean) {
  enabled = value;
  if (output && context) output.gain.setValueAtTime(value ? .5 : 0, context.currentTime);
  if (!value) { for (const voice of voices) { try { voice.stop(); } catch {} } voices.clear(); }
}
export function unlockSound() {
  if (!enabled || typeof window === 'undefined') return;
  try {
    context ??= new AudioContext();
    if (!output) { output = context.createGain(); output.gain.value=.5; output.connect(context.destination); }
    if (context.state === 'suspended') void context.resume().catch(()=>{});
  } catch { /* Audio is optional: unavailable devices never interrupt a roll. */ }
}
function ready() {
  return enabled && context?.state === 'running' && document.visibilityState === 'visible';
}
function track(source: AudioScheduledSourceNode, nodes: AudioNode[]) {
  voices.add(source);
  source.onended=()=> { voices.delete(source); source.disconnect(); nodes.forEach(n=>n.disconnect()); };
}
function tone(frequency: number, time: number, duration: number, volume: number, brass = false) {
  const ctx=context!, oscillator=ctx.createOscillator(), gain=ctx.createGain(), filter=ctx.createBiquadFilter();
  oscillator.type=brass?'sawtooth':'sine';
  oscillator.frequency.setValueAtTime(frequency,time);
  if (brass) { oscillator.frequency.setValueAtTime(frequency*.985,time); oscillator.frequency.exponentialRampToValueAtTime(frequency,time+.035); }
  filter.type='lowpass';filter.Q.value=.4;
  filter.frequency.setValueAtTime(brass?500:1600,time);
  if (brass) {filter.frequency.linearRampToValueAtTime(1400,time+.07);filter.frequency.exponentialRampToValueAtTime(650,time+duration);}
  gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.025);
  gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  oscillator.connect(filter);filter.connect(gain);gain.connect(output!);
  track(oscillator,[filter,gain]);oscillator.start(time);oscillator.stop(time+duration+.03);
}
export function diceImpact(speed: number) {
  if (!ready() || speed < .65) return;
  const ctx=context!, now=ctx.currentTime;
  if (now-lastImpact < .045 || voices.size>24) return;
  lastImpact=now;
  const length=.12, buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*length),ctx.sampleRate);
  const samples=buffer.getChannelData(0);
  for(let i=0;i<samples.length;i++) samples[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*.025));
  const noise=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), gain=ctx.createGain();
  noise.buffer=buffer;filter.type='lowpass';filter.frequency.value=550+Math.random()*300;filter.Q.value=.4;
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(Math.min(.24,.035+speed*.018),now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+length);
  noise.connect(filter);filter.connect(gain);gain.connect(output!);track(noise,[filter,gain]);noise.start(now);
  tone(150+Math.random()*90,now,.11,Math.min(.19,speed*.018));
}
export function confirmedSound(roll: Roll, fresh: boolean) {
  // Claim before checking playback, so a blocked/muted historical cue is never replayed later.
  if (!results.claim(roll.id,fresh) || !ready()) return;
  const now=context!.currentTime+.015;
  if(resultCue(roll)==='trumpet') {
    // Original synthesized brass fanfare; no external recordings or network requests.
    for(const [i,f] of [261.63,329.63,392,523.25].entries()) {
      const at=now+i*.14, length=i===3?.6:.21;
      tone(f,at,length,.13,true);tone(f*.997,at+.004,length,.07,true);
    }
  } else { tone(523.25,now,.32,.13);tone(659.25,now+.075,.36,.09); }
}
