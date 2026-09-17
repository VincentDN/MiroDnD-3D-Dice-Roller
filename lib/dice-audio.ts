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
let enabled = true, volume = .7, lastImpact = -Infinity;
const voices = new Set<AudioScheduledSourceNode>();
function applyGain() {
  if (output && context) output.gain.setValueAtTime(enabled ? volume : 0, context.currentTime);
}
export function setSoundEnabled(value: boolean) {
  enabled = value;
  applyGain();
  if (!value) { for (const voice of voices) { try { voice.stop(); } catch {} } voices.clear(); }
}
export function setVolume(value: number) {
  volume = Math.min(1, Math.max(0, value));
  applyGain();
}
export function unlockSound() {
  if (!enabled || typeof window === 'undefined') return;
  try {
    context ??= new AudioContext();
    if (!output) { output = context.createGain(); output.gain.value=volume; output.connect(context.destination); }
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
function playPing(now: number) {
  tone(523.25,now,.32,.13);tone(659.25,now+.075,.36,.09);
}
function playFanfare(now: number) {
  // Original synthesized brass fanfare; no external recordings or network requests.
  for(const [i,f] of [261.63,329.63,392,523.25].entries()) {
    const at=now+i*.14, length=i===3?.6:.21;
    tone(f,at,length,.13,true);tone(f*.997,at+.004,length,.07,true);
  }
}
function noiseBurst(time: number, duration: number, volume: number, frequency: number) {
  const ctx=context!, buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate);
  const samples=buffer.getChannelData(0);
  for(let i=0;i<samples.length;i++) samples[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*duration*.35));
  const noise=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), gain=ctx.createGain();
  noise.buffer=buffer;filter.type='lowpass';filter.frequency.value=frequency;filter.Q.value=.5;
  gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  noise.connect(filter);filter.connect(gain);gain.connect(output!);
  track(noise,[filter,gain]);noise.start(time);
}
// Quickroll skips the physical animation entirely, so its impact sounds never
// play. A short synthesized "dice cup rattle" stands in for them, ending
// right before the usual result cue - a quick, distinct cue that a fresh
// result just printed rather than settled physically.
const QUICKROLL_RATTLE_DURATION = .34;
function playQuickrollRattle(now: number) {
  const taps = 5;
  for (let i=0;i<taps;i++) {
    const t = now + i*.055 + Math.random()*.02;
    noiseBurst(t,.09,.17-i*.02,500+Math.random()*400);
    tone(140+Math.random()*60,t,.07,.05);
  }
}
export function confirmedSound(roll: Roll, fresh: boolean) {
  // Claim before checking playback, so a blocked/muted historical cue is never replayed later.
  if (!results.claim(roll.id,fresh) || !ready()) return;
  const now=context!.currentTime+.015;
  const resultAt = roll.quick ? now+QUICKROLL_RATTLE_DURATION : now;
  if (roll.quick) playQuickrollRattle(now);
  if(resultCue(roll)==='trumpet') playFanfare(resultAt); else playPing(resultAt);
}
// Lets a Settings panel preview the current volume without waiting for a real roll.
export async function testSound() {
  unlockSound();
  if (!context) return;
  // A fresh AudioContext (or one suspended by autoplay policy) resumes asynchronously.
  if (context.state === 'suspended') { try { await context.resume(); } catch { return; } }
  if (!ready()) return;
  playPing(context.currentTime+.015);
}

// DM soundboard: a handful of fun table cues, all synthesized like every
// other sound in this file - no external recordings or network requests.
function slide(freqFrom: number, freqTo: number, time: number, duration: number, volume: number) {
  const ctx=context!, oscillator=ctx.createOscillator(), gain=ctx.createGain();
  oscillator.type='sine';
  oscillator.frequency.setValueAtTime(freqFrom,time);
  oscillator.frequency.exponentialRampToValueAtTime(freqTo,time+duration);
  gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.02);
  gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  oscillator.connect(gain);gain.connect(output!);
  track(oscillator,[gain]);oscillator.start(time);oscillator.stop(time+duration+.03);
}
function playDrumroll(now: number) {
  const duration=1.1, taps=Math.floor(duration/.045);
  for(let i=0;i<taps;i++) noiseBurst(now+i*.045,.05,.09+(i/taps)*.11,900);
  tone(90,now+duration-.02,.4,.22,true);
}
function playDramaticSting(now: number) {
  for(const [i,f] of [220,196,174.6].entries()) tone(f,now+i*.22,.9,.16,true);
}
function playApplause(now: number) {
  const ctx=context!, duration=1.6, buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate);
  const samples=buffer.getChannelData(0);
  for(let i=0;i<samples.length;i++) samples[i]=Math.random()*2-1;
  const noise=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), gain=ctx.createGain();
  noise.buffer=buffer;filter.type='bandpass';filter.frequency.value=2400;filter.Q.value=.7;
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.2,now+.25);
  gain.gain.linearRampToValueAtTime(.16,now+duration-.3);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  noise.connect(filter);filter.connect(gain);gain.connect(output!);
  track(noise,[filter,gain]);noise.start(now);
}
function playSadTrombone(now: number) {
  for(const [i,[f0,f1]] of ([[392,349.23],[349.23,329.63],[329.63,293.66],[293.66,246.94]] as [number,number][]).entries())
    slide(f0,f1,now+i*.32,.42,.14);
}
function playRimshot(now: number) {
  noiseBurst(now,.05,.2,2200);tone(200,now,.05,.18);
  noiseBurst(now+.22,.07,.22,1800);tone(160,now+.22,.09,.2);
}
export const SOUND_EFFECTS: { id: string; label: string; play: (now: number) => void }[] = [
  { id: 'drumroll', label: 'Drumroll', play: playDrumroll },
  { id: 'sting', label: 'Dramatic sting', play: playDramaticSting },
  { id: 'applause', label: 'Applause', play: playApplause },
  { id: 'trombone', label: 'Sad trombone', play: playSadTrombone },
  { id: 'rimshot', label: 'Rimshot', play: playRimshot },
];
export function playSoundEffect(id: string) {
  unlockSound();
  if (!context) return;
  const run = () => { if(!ready())return; SOUND_EFFECTS.find(e=>e.id===id)?.play(context!.currentTime+.02); };
  if (context.state==='suspended') { void context.resume().then(run).catch(()=>{}); } else run();
}
