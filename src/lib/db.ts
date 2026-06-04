import mysql from 'mysql2/promise';

// Initialize mock store globally to persist across development hot-reloads
interface MockStore {
  branches: any[];
  employees: any[];
  id_card_requests: any[];
  visiting_card_requests: any[];
  users: any[];
}

const initialMockStore: MockStore = {
  branches: [
    { id: 1, name: 'Headoffice', created_at: new Date() },
    { id: 2, name: 'Kandy', created_at: new Date() },
    { id: 3, name: 'Kurunegala', created_at: new Date() },
    { id: 4, name: 'Galle', created_at: new Date() },
    { id: 5, name: 'Matara', created_at: new Date() },
    { id: 6, name: 'Ambalantota', created_at: new Date() },
    { id: 7, name: 'Thissamaharama', created_at: new Date() },
    { id: 8, name: 'Spices factory', created_at: new Date() },
    { id: 9, name: 'Jaffna', created_at: new Date() },
    { id: 10, name: 'Rathnapura', created_at: new Date() },
    { id: 11, name: 'Trincomalee', created_at: new Date() },
  ],
  employees: [
    { id: 1, employee_code: 'EMP001', name: 'John Doe', branch_id: 1, designation: 'Senior Software Engineer', mobile: '+1 555-0101', email: 'john.doe@company.com' },
    { id: 2, employee_code: 'EMP002', name: 'Jane Smith', branch_id: 2, designation: 'HR Manager', mobile: '+1 555-0102', email: 'jane.smith@company.com' },
    { id: 3, employee_code: 'EMP003', name: 'Robert Johnson', branch_id: 3, designation: 'Financial Analyst', mobile: '+1 555-0103', email: 'robert.j@company.com' },
    { id: 4, employee_code: 'EMP004', name: 'Emily Davis', branch_id: 4, designation: 'Marketing Executive', mobile: '+1 555-0104', email: 'emily.d@company.com' },
    { id: 5, employee_code: 'EMP005', name: 'Michael Brown', branch_id: 5, designation: 'Operations Supervisor', mobile: '+1 555-0105', email: 'michael.b@company.com' },
    { id: 6, employee_code: 'EMP006', name: 'Sarah Wilson', branch_id: 1, designation: 'QA Engineer', mobile: '+1 555-0106', email: 'sarah.w@company.com' },
  ],
  id_card_requests: [
    { id: 1, employee_id: 1, card_type: 'RFID', request_date: '2026-05-10', requested_by: 'Jane Smith', print_date: '2026-05-12', issue_date: '2026-05-13', status: 'Issued', remarks: 'RFID card configuration complete' },
    { id: 2, employee_id: 2, card_type: 'Standard', request_date: '2026-05-15', requested_by: 'Jane Smith', print_date: '2026-05-16', issue_date: null, status: 'Printed', remarks: 'Awaiting pick up' },
    { id: 3, employee_id: 3, card_type: 'Smart Card', request_date: '2026-06-01', requested_by: 'Jane Smith', print_date: null, issue_date: null, status: 'Pending', remarks: 'Requires access control integration' },
    { id: 4, employee_id: 4, card_type: 'Standard', request_date: '2026-06-02', requested_by: 'Jane Smith', print_date: null, issue_date: null, status: 'Pending', remarks: 'New joining request' }
  ],
  visiting_card_requests: [
    { id: 1, employee_id: 4, quantity: 200, request_date: '2026-05-08', requested_by: 'Jane Smith', print_date: '2026-05-10', issue_date: '2026-05-11', status: 'Issued', remarks: 'Premium matte finish' },
    { id: 2, employee_id: 1, quantity: 100, request_date: '2026-05-20', requested_by: 'Jane Smith', print_date: '2026-05-22', issue_date: null, status: 'Printed', remarks: 'Standard company template' },
    { id: 3, employee_id: 5, quantity: 500, request_date: '2026-06-01', requested_by: 'Jane Smith', print_date: null, issue_date: null, status: 'Pending', remarks: 'Need for upcoming vendor conference' }
  ],
  users: [
    { id: 1, username: 'admin', password_hash: 'admin123', role: 'Admin', name: 'System Administrator', email: 'admin@company.com' },
    { id: 2, username: 'user', password_hash: 'user123', role: 'User', name: 'Staff User', email: 'user@company.com' }
  ]
};

// Global typing for Node environment
declare global {
  var _mockDb: MockStore | undefined;
}

if (!global._mockDb) {
  global._mockDb = JSON.parse(JSON.stringify(initialMockStore));
}
const mockDb = global._mockDb!;

let pool: mysql.Pool | null = null;
let useMock = false;

// Attempt to create MySQL pool if credentials exist
if (process.env.DB_USER || process.env.MYSQL_USER) {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || process.env.MYSQL_USER,
      password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD,
      database: process.env.DB_NAME || 'id_card_tracker',
      port: parseInt(process.env.DB_PORT || '3306'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log('MySQL connection pool initialized.');
  } catch (error) {
    console.error('Failed to initialize MySQL connection pool. Falling back to mock DB.', error);
    useMock = true;
  }
} else {
  console.log('No database credentials found in environment. Booting in Mock Database Mode.');
  useMock = true;
}

// Function to run SQL query on MySQL or fallback to mock
export async function query(sql: string, params: any[] = []): Promise<any> {
  if (!useMock && pool) {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (error: any) {
      // If table doesn't exist, we fall back to mock
      console.warn('MySQL execution error, falling back to mock database operation:', error.message);
      return executeMockQuery(sql, params);
    }
  } else {
    return executeMockQuery(sql, params);
  }
}

export function isMockDatabase(): boolean {
  return useMock || !pool;
}

// Simple Mock Query Interpreter (implements basic CRUD operations for our specific queries)
function executeMockQuery(sql: string, params: any[]): any {
  const cleanSql = sql.replace(/\s+/g, ' ').trim();
  
  // 1. Branches Query
  if (cleanSql.startsWith('SELECT * FROM branches') || cleanSql.startsWith('SELECT * FROM `branches`')) {
    return mockDb.branches;
  }

  // 2. Employees Queries
  if (cleanSql.includes('FROM employees') || cleanSql.includes('FROM `employees`')) {
    // Check if SELECT e.*, b.name AS branch_name FROM employees
    if (cleanSql.startsWith('SELECT')) {
      // Return employees with branch names joined
      return mockDb.employees.map(emp => {
        const branch = mockDb.branches.find(b => b.id === emp.branch_id);
        return {
          ...emp,
          branch_name: branch ? branch.name : 'Unknown'
        };
      });
    }
  }

  if (cleanSql.startsWith('INSERT INTO employees') || cleanSql.startsWith('INSERT INTO `employees`')) {
    const nextId = mockDb.employees.length > 0 ? Math.max(...mockDb.employees.map(e => e.id)) + 1 : 1;
    const employee_code = params[0];
    const name = params[1];
    const branch_id = parseInt(params[2]);
    const designation = params[3];
    const mobile = params[4];
    const email = params[5];

    // Check unique employee code
    if (mockDb.employees.some(e => e.employee_code === employee_code)) {
      throw new Error(`Duplicate entry '${employee_code}' for key 'employee_code'`);
    }

    const newEmp = { id: nextId, employee_code, name, branch_id, designation, mobile, email };
    mockDb.employees.push(newEmp);
    return { insertId: nextId, affectedRows: 1 };
  }

  if (cleanSql.startsWith('UPDATE employees') || cleanSql.startsWith('UPDATE `employees`')) {
    // Expected params: [employee_code, name, branch_id, designation, mobile, email, id]
    const employee_code = params[0];
    const name = params[1];
    const branch_id = parseInt(params[2]);
    const designation = params[3];
    const mobile = params[4];
    const email = params[5];
    const id = parseInt(params[6]);

    const idx = mockDb.employees.findIndex(e => e.id === id);
    if (idx !== -1) {
      // Check unique code (ignoring self)
      if (mockDb.employees.some(e => e.employee_code === employee_code && e.id !== id)) {
        throw new Error(`Duplicate entry '${employee_code}' for key 'employee_code'`);
      }
      mockDb.employees[idx] = { id, employee_code, name, branch_id, designation, mobile, email };
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (cleanSql.startsWith('DELETE FROM employees') || cleanSql.startsWith('DELETE FROM `employees`')) {
    const id = parseInt(params[0]);
    const idx = mockDb.employees.findIndex(e => e.id === id);
    if (idx !== -1) {
      mockDb.employees.splice(idx, 1);
      // Cascade delete requests
      mockDb.id_card_requests = mockDb.id_card_requests.filter(r => r.employee_id !== id);
      mockDb.visiting_card_requests = mockDb.visiting_card_requests.filter(r => r.employee_id !== id);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // 3. ID Card Requests Queries
  if (cleanSql.includes('FROM id_card_requests') || cleanSql.includes('FROM `id_card_requests`')) {
    if (cleanSql.startsWith('SELECT')) {
      return mockDb.id_card_requests.map(req => {
        const emp = mockDb.employees.find(e => e.id === req.employee_id);
        const branch = emp ? mockDb.branches.find(b => b.id === emp.branch_id) : null;
        return {
          ...req,
          employee_name: emp ? emp.name : 'Unknown',
          employee_code: emp ? emp.employee_code : 'N/A',
          branch_name: branch ? branch.name : 'Unknown',
          branch_id: emp ? emp.branch_id : null
        };
      });
    }
  }

  if (cleanSql.startsWith('INSERT INTO id_card_requests') || cleanSql.startsWith('INSERT INTO `id_card_requests`')) {
    // Expected params: [employee_id, card_type, request_date, requested_by, remarks, status]
    const nextId = mockDb.id_card_requests.length > 0 ? Math.max(...mockDb.id_card_requests.map(r => r.id)) + 1 : 1;
    const employee_id = parseInt(params[0]);
    const card_type = params[1];
    const request_date = params[2];
    const requested_by = params[3];
    const remarks = params[4];
    const status = params[5] || 'Pending';

    const newReq = {
      id: nextId,
      employee_id,
      card_type,
      request_date,
      requested_by,
      print_date: null,
      issue_date: null,
      status,
      remarks
    };
    mockDb.id_card_requests.push(newReq);
    return { insertId: nextId, affectedRows: 1 };
  }

  if (cleanSql.startsWith('UPDATE id_card_requests') || cleanSql.startsWith('UPDATE `id_card_requests`')) {
    // Expected params: [employee_id, card_type, status, print_date, issue_date, remarks, id]
    const employee_id = parseInt(params[0]);
    const card_type = params[1];
    const status = params[2];
    const print_date = params[3];
    const issue_date = params[4];
    const remarks = params[5];
    const id = parseInt(params[6]);

    const idx = mockDb.id_card_requests.findIndex(r => r.id === id);
    if (idx !== -1) {
      mockDb.id_card_requests[idx] = {
        ...mockDb.id_card_requests[idx],
        employee_id,
        card_type,
        status,
        print_date,
        issue_date,
        remarks
      };
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (cleanSql.startsWith('DELETE FROM id_card_requests') || cleanSql.startsWith('DELETE FROM `id_card_requests`')) {
    const id = parseInt(params[0]);
    const idx = mockDb.id_card_requests.findIndex(r => r.id === id);
    if (idx !== -1) {
      mockDb.id_card_requests.splice(idx, 1);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // 4. Visiting Card Requests Queries
  if (cleanSql.includes('FROM visiting_card_requests') || cleanSql.includes('FROM `visiting_card_requests`')) {
    if (cleanSql.startsWith('SELECT')) {
      return mockDb.visiting_card_requests.map(req => {
        const emp = mockDb.employees.find(e => e.id === req.employee_id);
        const branch = emp ? mockDb.branches.find(b => b.id === emp.branch_id) : null;
        return {
          ...req,
          employee_name: emp ? emp.name : 'Unknown',
          employee_code: emp ? emp.employee_code : 'N/A',
          branch_name: branch ? branch.name : 'Unknown',
          branch_id: emp ? emp.branch_id : null
        };
      });
    }
  }

  if (cleanSql.startsWith('INSERT INTO visiting_card_requests') || cleanSql.startsWith('INSERT INTO `visiting_card_requests`')) {
    // Expected params: [employee_id, quantity, request_date, requested_by, remarks, status]
    const nextId = mockDb.visiting_card_requests.length > 0 ? Math.max(...mockDb.visiting_card_requests.map(r => r.id)) + 1 : 1;
    const employee_id = parseInt(params[0]);
    const quantity = parseInt(params[1]);
    const request_date = params[2];
    const requested_by = params[3];
    const remarks = params[4];
    const status = params[5] || 'Pending';

    const newReq = {
      id: nextId,
      employee_id,
      quantity,
      request_date,
      requested_by,
      print_date: null,
      issue_date: null,
      status,
      remarks
    };
    mockDb.visiting_card_requests.push(newReq);
    return { insertId: nextId, affectedRows: 1 };
  }

  if (cleanSql.startsWith('UPDATE visiting_card_requests') || cleanSql.startsWith('UPDATE `visiting_card_requests`')) {
    // Expected params: [employee_id, quantity, status, print_date, issue_date, remarks, id]
    const employee_id = parseInt(params[0]);
    const quantity = parseInt(params[1]);
    const status = params[2];
    const print_date = params[3];
    const issue_date = params[4];
    const remarks = params[5];
    const id = parseInt(params[6]);

    const idx = mockDb.visiting_card_requests.findIndex(r => r.id === id);
    if (idx !== -1) {
      mockDb.visiting_card_requests[idx] = {
        ...mockDb.visiting_card_requests[idx],
        employee_id,
        quantity,
        status,
        print_date,
        issue_date,
        remarks
      };
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (cleanSql.startsWith('DELETE FROM visiting_card_requests') || cleanSql.startsWith('DELETE FROM `visiting_card_requests`')) {
    const id = parseInt(params[0]);
    const idx = mockDb.visiting_card_requests.findIndex(r => r.id === id);
    if (idx !== -1) {
      mockDb.visiting_card_requests.splice(idx, 1);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // 5. Users Queries
  if (cleanSql.startsWith('SELECT * FROM users') || cleanSql.startsWith('SELECT * FROM `users`')) {
    // Match specific login checks: WHERE username = ? AND password_hash = ?
    if (cleanSql.includes('username = ?') && cleanSql.includes('password_hash = ?')) {
      const username = params[0];
      const pass = params[1];
      const matched = mockDb.users.filter(u => u.username === username && u.password_hash === pass);
      return matched;
    }
    return mockDb.users;
  }

  // Default fallback empty array
  return [];
}
