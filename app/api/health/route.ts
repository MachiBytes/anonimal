import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const result = db.prepare("SELECT datetime('now') as now").get() as { now: string };
    
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp: result.now,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
