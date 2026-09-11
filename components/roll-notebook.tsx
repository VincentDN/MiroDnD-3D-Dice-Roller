'use client';
import {useEffect,useState} from 'react';
import type {Roll} from '@/lib/dice';
import {MAX_NOTES,mergeNotes,notesMarkdown,readNotes,type RollNote} from '@/lib/roll-notebook';
export default function RollNotebook({room,playerId,rolls}:{room:string;playerId:string;rolls:Roll[]}) {
 const storageKey=`rollparty:notes:${room}:${playerId}`;
 const [notes,setNotes]=useState<RollNote[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const read=()=>{try{setNotes(readNotes(localStorage.getItem(storageKey),playerId));}catch{setError('Notes could not be loaded on this device.');}};read();setLoaded(true);const sync=(event:StorageEvent)=>{if(event.key===storageKey)read();};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[storageKey,playerId]);
 useEffect(()=>{if(loaded)setNotes(n=>mergeNotes(n,rolls,playerId));},[loaded,rolls,playerId]);
 useEffect(()=>{if(!loaded)return;try{localStorage.setItem(storageKey,JSON.stringify({version:1,entries:notes}));}catch{setError('Device storage is full or unavailable. Export your notes to keep them.');}},[loaded,notes,storageKey]);
 function download(){
  const url=URL.createObjectURL(new Blob([notesMarkdown(notes)],{type:'text/markdown'}));
  const a=document.createElement('a');a.href=url;a.download=`VincentsVibeRoller-rolls-${new Date().toISOString().slice(0,10)}.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 return <details className="roll-notebook"><summary>My roll notes ({notes.length})</summary>
  <button type="button" disabled={!notes.length} onClick={download}>Save Markdown</button>
  <p className="muted">Your latest {MAX_NOTES.toLocaleString()} rolls and comments stay on this device. Save Markdown to keep a copy.</p>
  {!notes.length&&<p>Roll once to start your notebook.</p>}
  <div className="note-entries">{[...notes].reverse().map(({roll:r,comment})=><label key={r.id} className="roll-note"><span>{r.expression} = <b>{r.total}</b> · {new Date(r.created).toLocaleTimeString()}</span><textarea aria-label={`Comment on ${r.expression} result ${r.total}`} placeholder="Add a comment…" rows={2} maxLength={2000} value={comment} onChange={e=>setNotes(list=>list.map(n=>n.roll.id===r.id?{...n,comment:e.target.value}:n))}/></label>)}</div>
  {error&&<p role="alert" className="error">{error}</p>}
 </details>;
}
