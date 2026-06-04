import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET: Retrieve list of all employees
export async function GET() {
  try {
    const sql = 'SELECT e.*, b.name AS branch_name FROM employees e JOIN branches b ON e.branch_id = b.id ORDER BY e.employee_code ASC';
    const employees = await query(sql);
    return NextResponse.json({ success: true, data: employees });
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add a new employee
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employee_code, name, branch_id, designation, mobile, email } = body;

    // Simple validations
    if (!employee_code || !name || !branch_id || !designation || !mobile || !email) {
      return NextResponse.json(
        { success: false, error: 'All fields (employee_code, name, branch_id, designation, mobile, email) are required.' },
        { status: 400 }
      );
    }

    const sql = 'INSERT INTO employees (employee_code, name, branch_id, designation, mobile, email) VALUES (?, ?, ?, ?, ?, ?)';
    const result = await query(sql, [
      employee_code.trim(),
      name.trim(),
      parseInt(branch_id),
      designation.trim(),
      mobile.trim(),
      email.trim()
    ]);

    return NextResponse.json({
      success: true,
      message: 'Employee created successfully.',
      data: {
        id: result.insertId,
        employee_code,
        name,
        branch_id,
        designation,
        mobile,
        email
      }
    });
  } catch (error: any) {
    console.error('Error creating employee:', error);
    // Handle unique constraint check
    if (error.message.includes('Duplicate entry') || error.message.includes('employee_code')) {
      return NextResponse.json({ success: false, error: 'Employee Code already exists. Please use a unique code.' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
