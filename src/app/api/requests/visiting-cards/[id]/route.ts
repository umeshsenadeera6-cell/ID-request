import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

type Params = Promise<{ id: string }>;

// PUT: Update a Visiting Card request
export async function PUT(request: Request, context: { params: Params }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { employee_id, quantity, status, print_date, issue_date, remarks } = body;

    if (!employee_id || !quantity || !status) {
      return NextResponse.json(
        { success: false, error: 'employee_id, quantity, and status are required.' },
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

    const sql = 'UPDATE visiting_card_requests SET employee_id = ?, quantity = ?, status = ?, print_date = ?, issue_date = ?, remarks = ? WHERE id = ?';
    const result = await query(sql, [
      parseInt(employee_id),
      parseInt(quantity),
      status,
      finalPrintDate,
      finalIssueDate,
      remarks ? remarks.trim() : null,
      parseInt(id)
    ]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Visiting Card request not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Visiting Card request updated successfully.' });
  } catch (error: any) {
    console.error('Error updating Visiting card request:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a Visiting Card request
export async function DELETE(request: Request, context: { params: Params }) {
  try {
    const { id } = await context.params;
    const sql = 'DELETE FROM visiting_card_requests WHERE id = ?';
    const result = await query(sql, [parseInt(id)]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Visiting Card request not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Visiting Card request deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting Visiting card request:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
