import type { Roll } from './dice.ts';
export type RollNote = { roll: Roll; comment: string };
export const MAX_NOTES = 1000;
export function readNotes(raw: string | null, playerId: string): RollNote[] {
  try {
    const value=JSON.parse(raw || 'null');
    if(value?.version!==1 || !Array.isArray(value.entries))return [];
    return value.entries.filter((n: RollNote)=>n?.roll?.playerId===playerId && typeof n.roll.id==='string' && typeof n.roll.expression==='string' && typeof n.roll.name==='string' && Number.isFinite(n.roll.total) && Number.isFinite(n.roll.created) && Array.isArray(n.roll.dice) && typeof n.comment==='string').slice(-MAX_NOTES);
  } catch { return []; }
}
export function mergeNotes(notes: RollNote[], rolls: Roll[], playerId: string): RollNote[] {
  const known=new Set(notes.map(n=>n.roll.id));
  const additions=rolls.filter(r=>r.playerId===playerId && !known.has(r.id));
  if(!additions.length)return notes;
  return [...notes,...additions.map(roll=>({roll,comment:''}))].sort((a,b)=>a.roll.created-b.roll.created).slice(-MAX_NOTES);
}
const escape=(text:string)=>text.replace(/[\\`*_{}\[\]<>()#!|~]/g,'\\$&').replace(/[\r\n]+/g,' ');
export function notesMarkdown(notes: RollNote[]) {
  return '# VincentsVibeRoller - My rolls\n\n'+notes.map(({roll:r,comment})=>{
    const values=r.dice.map(d=>`${d.value}${d.kept?'':' (discarded)'}`).join(' + ');
    return `## ${new Date(r.created).toISOString()}\n\n${escape(r.name)} rolls **${escape(r.expression)}** = ${values}${r.modifier ? ` ${r.modifier>0?'+':'-'} ${Math.abs(r.modifier)}`:''} = **${r.total}**\n\n${r.label?`Label: ${escape(r.label)}\n\n`:''}${comment.trim()?`Comment:\n${comment.trim().split(/\r?\n/).map(line=>'> '+escape(line)).join('\n')}\n\n`:''}`;
  }).join('');
}
