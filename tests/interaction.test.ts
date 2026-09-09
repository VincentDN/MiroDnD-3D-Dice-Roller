import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { trayFrustum } from '../lib/dice-camera.ts';
import { resultCue, ResultSounds } from '../lib/dice-audio.ts';
import { readPresets, validatePreset } from '../lib/dice-presets.ts';
import { simulate, replayTable, snapshotMotion, evaluateThrow, isDeliberateThrow, STEP } from '../lib/dice-physics.ts';

test('fixed projection is unchanged by die movement and scales only with viewport',()=> {
  const baseline=trayFrustum(9,6,2,2);
  const camera=new T.OrthographicCamera(baseline.left,baseline.right,baseline.top,baseline.bottom,.1,100);
  camera.position.set(0,20,.001);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const screenWidth=(x:number,y:number,z:number)=>new T.Vector3(x+1,y,z).project(camera).x-new T.Vector3(x-1,y,z).project(camera).x;
  assert(Math.abs(screenWidth(-3,1,-2)-screenWidth(3,4,2))<1e-10);
  assert.notEqual(trayFrustum(9,6,.8,2).top,baseline.top);
  assert.equal(trayFrustum(9,6,2,1).top,baseline.top*2);
});
test('only a kept natural d20=20 triggers trumpets; totals and discarded dice do not',()=> {
  assert.equal(resultCue({dice:[{sides:20,value:20,kept:true}]}),'trumpet');
  assert.equal(resultCue({dice:[{sides:20,value:20,kept:false},{sides:20,value:4,kept:true}]}),'ping');
  assert.equal(resultCue({dice:[{sides:100,value:20,kept:true}]}),'ping');
  const sounds=new ResultSounds();assert.equal(sounds.claim('history',false),false);
  assert.equal(sounds.claim('new',true),true);assert.equal(sounds.claim('new',true),false);
});
test('named presets validate expressions and restore safely from storage',()=> {
  assert.deepEqual(validatePreset(' Attack ',' 2d20kh1 + 5 '),{name:'Attack',expression:'2d20kh1+5'});
  assert.throws(()=>validatePreset('','d20'));assert.throws(()=>validatePreset('Attack','999d20'));
  const saved={id:'one',...validatePreset('Damage','2d6+3')};
  assert.deepEqual(readPresets(JSON.stringify({version:1,presets:[saved,{id:'bad',name:'Oops',expression:'d7'},saved]})),[saved]);
  assert.deepEqual(readPresets('not-json'),[]);
});
test('a deliberate mouse throw generates a replayable new outcome from release motion',()=> {
  const original=simulate([6],123);
  const table=replayTable([6],123);
  for(let i=0;i<original.physics.steps;i++)table.world.step(STEP);
  assert.equal(isDeliberateThrow(table.bodies[0]),false);
  table.bodies[0].velocity.set(4,2,0);table.bodies[0].angularVelocity.set(10,4,3);
  assert.equal(isDeliberateThrow(table.bodies[0]),true);
  const release=table.bodies.map(snapshotMotion);
  const result=evaluateThrow('1d6+2',release);
  assert(result.total>=3&&result.total<=8);assert.deepEqual(result.physics.release,release);
  assert.deepEqual(evaluateThrow('1d6+2',release),result);
  assert.throws(()=>evaluateThrow('2d6',release));
  assert.throws(()=>evaluateThrow('1d6',undefined as never));
  assert.throws(()=>evaluateThrow('1d6',[{...release[0],p:[999,1,0]}]));
});
