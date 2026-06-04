import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

type Params = Promise<{ id: string }>;

// PUT: Update an ID Card request
export async function PUT(request: Request, context: { params: Params }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { employee_id, card_type, status, print_date, issue_date, remarks } = body;

    if (!employee_id || !card_type || !status) {
      return NextResponse.json(
        { success: false, error: 'employee_id, card_type, and status are required.' },
        { status: 400 }
      );
    }

    // Auto-update dates based on status changes
    let finalPrintDate = print_date || null;
    let finalIssueDate = issue_date || null;

    const todayStr = new Date().toISOString().split('T')[0];

    if (status === 'Printed' && !finalPrintDate) {
      finalPrintDate = todayStr;
    } else if (status === 'Issued') {
      if (!finalPrintDate) finalPrintDate = todayStr;
      if (!finalIssueDate) finalIssueDate = todayStr;
    } else if (status === 'Pending') {
      finalPrintDate = null;
      finalIssueDate = null;
    }

    const sql = 'UPDATE id_card_requests SET employee_id = ?, card_type = ?, status = ?, print_date = ?, issue_date = ?, remarks = ? WHERE id = ?';
    const result = await query(sql, [
      parseInt(employee_id),
      card_type.trim(),
      status,
      finalPrintDate,
      finalIssueDate,
      remarks ? remarks.trim() : null,
      parseInt(id)
    ]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'ID Card request not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'ID Card request updated successfully.' });
  } catch (error: any) {
    console.error('Error updating ID card request:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete an ID Card request
export async function DELETE(request: Request, context: { params: Params }) {
  try {
    const { id } = await context.params;
    const sql = 'DELETE FROM id_card_requests WHERE id = ?';
    const result = await query(sql, [parseInt(id)]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'ID Card request not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'ID Card request deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting ID card request:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
