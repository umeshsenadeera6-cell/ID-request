import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET: List all ID Card requests
export async function GET() {
  try {
    const sql = `
      SELECT r.*, e.name AS employee_name, e.employee_code, b.name AS branch_name, e.branch_id 
      FROM id_card_requests r 
      JOIN employees e ON r.employee_id = e.id 
      JOIN branches b ON e.branch_id = b.id 
      ORDER BY r.request_date DESC, r.id DESC
    `;
    const requests = await query(sql);
    return NextResponse.json({ success: true, data: requests });
  } catch (error: any) {
    console.error('Error fetching ID card requests:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new ID Card request
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employee_id, card_type, request_date, requested_by, remarks, status } = body;

    if (!employee_id || !card_type || !request_date || !requested_by) {
      return NextResponse.json(
        { success: false, error: 'employee_id, card_type, request_date, and requested_by are required.' },
        { status: 400 }
      );
    }

    const currentStatus = status || 'Pending';
    const sql = 'INSERT INTO id_card_requests (employee_id, card_type, request_date, requested_by, remarks, status) VALUES (?, ?, ?, ?, ?, ?)';
    
    const result = await query(sql, [
      parseInt(employee_id),
      card_type.trim(),
      request_date,
      requested_by.trim(),
      remarks ? remarks.trim() : '',
      currentStatus
    ]);

    return NextResponse.json({
      success: true,
      message: 'ID Card request created successfully.',
      data: {
        id: result.insertId,
        employee_id,
        card_type,
        request_date,
        requested_by,
        remarks,
        status: currentStatus
      }
    });
  } catch (error: any) {
    console.error('Error creating ID card request:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
