import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT NOW()');
    
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp: result.rows[0].now,
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
