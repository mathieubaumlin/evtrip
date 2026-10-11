import { NextResponse } from 'next/server';
import { demo } from '@/lib/planner';
import { livePlan } from '@/lib/providers';
import type { Input } from '@/lib/types';
export const maxDuration = 90;
export async function POST(request: Request) {
  try {
    const input = await request.json() as Input;
    if (!input || !['demo', 'live'].includes(input.mode) || typeof input.origin !== 'string' || typeof input.destination !== 'string' || input.origin.length < 2 || input.destination.length < 2 || input.origin.length > 180 || input.destination.length > 180 || !Array.isArray(input.excluded) || input.excluded.length > 100 || !input.excluded.every(v => typeof v === 'string' && v.length < 100) || typeof input.departure !== 'string' || input.departure.length > 40 || ![input.battery, input.reserve, input.price].every(Number.isFinite) || input.battery > 100 || input.reserve < 5 || input.reserve > 30 || input.battery <= input.reserve || input.price < 0 || input.price > 3 || !['model-y', 'model-3', 'ioniq-5', 'megane'].includes(input.vehicleId) || Number.isNaN(Date.parse(input.departure))) {
      return NextResponse.json({ error: 'Paramètres du trajet invalides.' }, { status: 400 });
    }
    const plan = input.mode === 'demo' ? demo(input) : await livePlan(input);
    return NextResponse.json(plan, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error && !['TimeoutError', 'TypeError', 'SyntaxError'].includes(error.name) ? error.message : 'Le calcul est indisponible ou a dépassé le délai. Réessayez ou ouvrez la démonstration.';
    return NextResponse.json({ error: message }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
  }
}
