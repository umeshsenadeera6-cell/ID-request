import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // 1. Fetch ID Card requests with employee and department names
    const idSql = `
      SELECT r.id, r.status, r.request_date, r.card_type AS details, e.name AS employee_name, e.employee_code, d.name AS department_name
      FROM id_card_requests r
      JOIN employees e ON r.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
    `;
    const idRequests = await query(idSql);

    // 2. Fetch Visiting Card requests with employee and department names
    const vcSql = `
      SELECT r.id, r.status, r.request_date, CONCAT(r.quantity, ' Cards') AS details, e.name AS employee_name, e.employee_code, d.name AS department_name
      FROM visiting_card_requests r
      JOIN employees e ON r.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
    `;
    const vcRequests = await query(vcSql);

    // 3. Aggregate totals and statuses
    const totalIdCards = idRequests.length;
    const totalVisitingCards = vcRequests.length;

    let pendingCount = 0;
    let printedCount = 0;
    let issuedCount = 0;

    idRequests.forEach((r: any) => {
      if (r.status === 'Pending') pendingCount++;
      else if (r.status === 'Printed') printedCount++;
      else if (r.status === 'Issued') issuedCount++;
    });

    vcRequests.forEach((r: any) => {
      if (r.status === 'Pending') pendingCount++;
      else if (r.status === 'Printed') printedCount++;
      else if (r.status === 'Issued') issuedCount++;
    });

    // 4. Monthly Statistics (Group by month-year for the last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize monthly tracker
    const monthlyMap: { [key: string]: { month: string; idCards: number; visitingCards: number } } = {};
    
    // We will collect months from the data or generate the last 6 months
    const last6Months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = `${months[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`;
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      last6Months.push(mKey);
      monthlyMap[mKey] = { month: mLabel, idCards: 0, visitingCards: 0 };
    }

    idRequests.forEach((r: any) => {
      if (!r.request_date) return;
      const date = new Date(r.request_date);
      const mKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[mKey]) {
        monthlyMap[mKey].idCards++;
      }
    });

    vcRequests.forEach((r: any) => {
      if (!r.request_date) return;
      const date = new Date(r.request_date);
      const mKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[mKey]) {
        monthlyMap[mKey].visitingCards++;
      }
    });

    const monthlyStats = last6Months.map(key => monthlyMap[key]);

    // 5. Department-wise Statistics
    const departmentsList = await query('SELECT name FROM departments');
    const deptMap: { [key: string]: { department: string; idCards: number; visitingCards: number } } = {};

    departmentsList.forEach((d: any) => {
      deptMap[d.name] = { department: d.name, idCards: 0, visitingCards: 0 };
    });

    idRequests.forEach((r: any) => {
      if (deptMap[r.department_name]) {
        deptMap[r.department_name].idCards++;
      } else {
        deptMap[r.department_name] = { department: r.department_name, idCards: 1, visitingCards: 0 };
      }
    });

    vcRequests.forEach((r: any) => {
      if (deptMap[r.department_name]) {
        deptMap[r.department_name].visitingCards++;
      } else {
        deptMap[r.department_name] = { department: r.department_name, idCards: 0, visitingCards: 1 };
      }
    });

    const departmentStats = Object.values(deptMap);

    // 6. Recent Requests (Compose 5 most recent overall)
    const idMapped = idRequests.map((r: any) => ({
      id: r.id,
      category: 'ID Card',
      employee_name: r.employee_name,
      employee_code: r.employee_code,
      department_name: r.department_name,
      details: r.details,
      date: r.request_date,
      status: r.status
    }));

    const vcMapped = vcRequests.map((r: any) => ({
      id: r.id,
      category: 'Visiting Card',
      employee_name: r.employee_name,
      employee_code: r.employee_code,
      department_name: r.department_name,
      details: r.details,
      date: r.request_date,
      status: r.status
    }));

    const recentRequests = [...idMapped, ...vcMapped]
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalIdCards,
          totalVisitingCards,
          pendingRequests: pendingCount,
          printedRequests: printedCount,
          issuedRequests: issuedCount,
          totalRequests: totalIdCards + totalVisitingCards
        },
        monthlyStats,
        departmentStats,
        recentRequests
      }
    });
  } catch (error: any) {
    console.error('Error compiling dashboard stats:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
