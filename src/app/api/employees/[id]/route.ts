import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

type Params = Promise<{ id: string }>;

// PUT: Update an employee
export async function PUT(request: Request, context: { params: Params }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { employee_code, name, department_id, designation, mobile, email } = body;

    if (!employee_code || !name || !department_id || !designation || !mobile || !email) {
      return NextResponse.json(
        { success: false, error: 'All fields are required.' },
        { status: 400 }
      );
    }

    const sql = 'UPDATE employees SET employee_code = ?, name = ?, department_id = ?, designation = ?, mobile = ?, email = ? WHERE id = ?';
    const result = await query(sql, [
      employee_code.trim(),
      name.trim(),
      parseInt(department_id),
      designation.trim(),
      mobile.trim(),
      email.trim(),
      parseInt(id)
    ]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Employee updated successfully.' });
  } catch (error: any) {
    console.error('Error updating employee:', error);
    if (error.message.includes('Duplicate entry')) {
      return NextResponse.json({ success: false, error: 'Employee Code already exists.' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove an employee
export async function DELETE(request: Request, context: { params: Params }) {
  try {
    const { id } = await context.params;
    const sql = 'DELETE FROM employees WHERE id = ?';
    const result = await query(sql, [parseInt(id)]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Employee and related requests deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
