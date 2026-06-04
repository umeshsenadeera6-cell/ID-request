import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const departments = await query('SELECT * FROM departments ORDER BY name ASC');
    return NextResponse.json({ success: true, data: departments });
  } catch (error: any) {
    console.error('Error fetching departments:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
