import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeNotes,notesMarkdown,readNotes} from '../lib/roll-notebook.ts';
import type {Roll} from '../lib/dice.ts';
const roll:Roll={id:'one',playerId:'me',name:'Bard *One*',color:'#bb44ff',expression:'2d20kh1+2',dice:[{sides:20,value:3,kept:false},{sides:20,value:14,kept:true}],modifier:2,total:16,label:'Attack',created:1788984000000};
test('notebook keeps only the current player and preserves comments through repeated history refreshes',()=>{
 const notes=mergeNotes([], [roll,{...roll,id:'two',playerId:'other'}], 'me');
 notes[0].comment='Sneak attack\nAgainst the rat';
 assert.equal(notes.length,1);
 assert.equal(mergeNotes(notes,[roll],'me'),notes);
 assert.deepEqual(readNotes(JSON.stringify({version:1,entries:notes}),'me'),notes);
 assert.deepEqual(readNotes(JSON.stringify({version:1,entries:notes}),'other'),[]);
 assert.deepEqual(readNotes('corrupt','me'),[]);
 const markdown=notesMarkdown(notes);
 assert(markdown.includes('3 (discarded) + 14 + 2 = **16**'));
 assert(markdown.includes('> Sneak attack\n> Against the rat'));
 assert(markdown.includes('Bard \\*One\\*'));
 assert(!markdown.includes('playerId'));
});
