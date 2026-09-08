import { env } from 'cloudflare:workers';
export function database() {
  if (!env.DB) throw Error('The room service is unavailable.');
  return env.DB;
}
