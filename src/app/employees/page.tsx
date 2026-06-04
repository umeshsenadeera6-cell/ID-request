'use client';

import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Users,
  Mail,
  Phone,
  Briefcase
} from 'lucide-react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { useRole } from '@/context/RoleContext';
import styles from './employees.module.css';

interface Employee {
  id: number;
  employee_code: string;
  name: string;
  branch_id: number;
  branch_name: string;
  designation: string;
  mobile: string;
  email: string;
}

interface Branch {
  id: number;
  name: string;
}

export default function EmployeesPage() {
  const { canWrite, canDelete } = useRole();

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('Add Employee');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    employee_code: '',
    name: '',
    branch_id: '',
    designation: '',
    mobile: '',
    email: ''
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [empRes, branchRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/branches')
      ]);

      const empJson = await empRes.json();
      const branchJson = await branchRes.json();

      if (empJson.success && branchJson.success) {
        setEmployees(empJson.data);
        setBranches(branchJson.data);
      } else {
        setError(empJson.error || branchJson.error || 'Failed to fetch data.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading data.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData({
      employee_code: '',
      name: '',
      branch_id: branches[0]?.id.toString() || '',
      designation: '',
      mobile: '',
      email: ''
    });
    setFormError(null);
    setModalTitle('Add New Employee');
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      employee_code: emp.employee_code,
      name: emp.name,
      branch_id: emp.branch_id.toString(),
      designation: emp.designation,
      mobile: emp.mobile,
      email: emp.email
    });
    setFormError(null);
    setModalTitle(`Edit Employee: ${emp.name}`);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    // Form client-side checks
    if (!formData.employee_code.trim()) return setFormError('Employee Code is required.');
    if (!formData.name.trim()) return setFormError('Employee Name is required.');
    if (!formData.branch_id) return setFormError('Branch selection is required.');
    if (!formData.designation.trim()) return setFormError('Designation is required.');
    if (!formData.mobile.trim()) return setFormError('Mobile Number is required.');
    if (!formData.email.trim()) return setFormError('Email Address is required.');

    try {
      const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : '/api/employees';
      const method = editingEmployee ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        fetchData(); // Reload list
      } else {
        setFormError(json.error || 'Operation failed.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (!confirm('Are you sure you want to delete this employee? This will also remove any active ID or Visiting Card printing requests.')) {
      return;
    }

    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchData(); // Reload list
      } else {
        alert(json.error || 'Failed to delete employee.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred during deletion.');
    }
  };

  // Client side search and branch filtering
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBranch = selectedBranch === '' || emp.branch_id === parseInt(selectedBranch);
    
    return matchesSearch && matchesBranch;
  });

  if (!mounted) return null;

  return (
    <>
      <Header 
        title="Employee Management" 
        subtitle="Manage employee records, branches, designations and contact details." 
      />

      <main className="main-content fade-in">
        {error && (
          <div className="badge pending" style={{ padding: '12px 18px', width: '100%' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Filter Bar */}
        <section className={styles.filterBar}>
          <div className={styles.searchFilters}>
            <div className={styles.inputGroup}>
              <span className={styles.label}>Search</span>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                <input 
                  type="text" 
                  placeholder="Code, Name, Designation..." 
                  style={{ paddingLeft: '36px' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <span className={styles.label}>Branch</span>
              <select 
                value={selectedBranch} 
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <option value="">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
          </div>

          {canWrite && (
            <button className="btn btn-primary" onClick={openAddModal}>
              <Plus size={16} />
              Add Employee
            </button>
          )}
        </section>

        {/* Employees Table Grid */}
        <section className={styles.tableWrapper}>
          <div className={styles.tableHeaderActions}>
            <span className={styles.tableTitle}>Active Employee Directory</span>
            <span className="badge standard">{filteredEmployees.length} Records found</span>
          </div>
          
          <div className="table-container">
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--slate-400)' }}>
                Loading records...
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className={styles.noData}>
                <Users size={48} strokeWidth={1} style={{ color: 'var(--slate-300)' }} />
                <p>No employee records matched your search parameters.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Emp. Code</th>
                    <th>Name</th>
                    <th>Branch</th>
                    <th>Designation</th>
                    <th>Mobile</th>
                    <th>Email Address</th>
                    {canWrite && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: '600', color: 'var(--slate-900)' }}>{emp.employee_code}</td>
                      <td>{emp.name}</td>
                      <td>
                        <span className="badge standard">{emp.branch_name}</span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Briefcase size={13} style={{ color: 'var(--slate-400)' }} />
                          {emp.designation}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={13} style={{ color: 'var(--slate-400)' }} />
                          {emp.mobile}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Mail size={13} style={{ color: 'var(--slate-400)' }} />
                          {emp.email}
                        </span>
                      </td>
                      {canWrite && (
                        <td style={{ textAlign: 'right' }}>
                          <div className={styles.actionCell} style={{ justifyContent: 'flex-end' }}>
                            <button 
                              className={styles.iconBtn} 
                              onClick={() => openEditModal(emp)}
                              title="Edit Employee details"
                            >
                              <Edit2 size={14} />
                            </button>
                            {canDelete && (
                              <button 
                                className={`${styles.iconBtn} ${styles.deleteBtn}`}
                                onClick={() => handleDeleteEmployee(emp.id)}
                                title="Delete Employee"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Add/Edit Modal */}
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title={modalTitle}
        >
          <form onSubmit={handleFormSubmit}>
            {formError && (
              <div className="badge pending" style={{ padding: '10px 14px', width: '100%', marginBottom: '16px', border: '1px solid var(--status-pending-border)' }}>
                {formError}
              </div>
            )}
            
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="employee_code">Employee Code *</label>
                <input 
                  id="employee_code"
                  type="text" 
                  name="employee_code"
                  placeholder="e.g. EMP001"
                  value={formData.employee_code}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="name">Full Name *</label>
                <input 
                  id="name"
                  type="text" 
                  name="name"
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="branch_id">Branch *</label>
                <select 
                  id="branch_id"
                  name="branch_id"
                  value={formData.branch_id}
                  onChange={handleInputChange}
                  required
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="designation">Designation *</label>
                <input 
                  id="designation"
                  type="text" 
                  name="designation"
                  placeholder="e.g. Team Lead"
                  value={formData.designation}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="mobile">Mobile Number *</label>
                <input 
                  id="mobile"
                  type="tel" 
                  name="mobile"
                  placeholder="e.g. +1 555-0100"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="email">Email Address *</label>
                <input 
                  id="email"
                  type="email" 
                  name="email"
                  placeholder="e.g. john@company.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Employee'}
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </>
  );
}
