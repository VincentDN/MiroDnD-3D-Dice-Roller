import { parseExpression } from './dice.ts';
export type DicePreset = { id: string; name: string; expression: string };
export const PRESET_KEY = 'rollparty:presets:v1';
export function validatePreset(name: string, expression: string) {
  const title=name.trim();
  if (!title || title.length>32) throw Error('Give this combination a name (up to 32 characters).');
  return { name:title, expression:parseExpression(expression).expression };
}
export function readPresets(raw: string | null): DicePreset[] {
  if (!raw) return [];
  try {
    const data=JSON.parse(raw);
    if (data.version!==1 || !Array.isArray(data.presets)) return [];
    const used=new Set<string>();
    return data.presets.slice(0,30).flatMap((p: unknown)=> {
      try {
        const value=p as DicePreset;
        if(typeof value.id!=='string'||value.id.length>80||used.has(value.id)||typeof value.name!=='string'||typeof value.expression!=='string')return [];
        const valid=validatePreset(value.name,value.expression);used.add(value.id);
        return [{id:value.id,...valid}];
      } catch { return []; }
    });
  }catch{return [];}
}
