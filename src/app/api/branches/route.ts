import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const branches = await query('SELECT * FROM branches ORDER BY name ASC');
    return NextResponse.json({ success: true, data: branches });
  } catch (error: any) {
    console.error('Error fetching branches:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
