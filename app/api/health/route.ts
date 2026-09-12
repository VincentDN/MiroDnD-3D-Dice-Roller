import { database } from '@/db/raw';

// Read-only deployment check: confirms the current player schema without
// creating test rooms or exposing player data.
export async function GET() {
  try {
    await database().prepare('SELECT id, avatar FROM players LIMIT 0').all();
    return Response.json({ ok: true, revision: process.env.VVR_BUILD_SHA || 'local' },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
