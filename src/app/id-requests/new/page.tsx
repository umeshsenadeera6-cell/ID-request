'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  IdCard, 
  Search, 
  User, 
  Calendar, 
  ChevronLeft, 
  CheckCircle,
  FileText,
  Plus
} from 'lucide-react';
import Header from '@/components/Header';
import { useRole } from '@/context/RoleContext';
import styles from './new-request.module.css';

interface Employee {
  id: number;
  name: string;
  employee_code: string;
  branch_name: string;
  designation: string;
}

export default function NewIDRequestPage() {
  const router = useRouter();
  const { currentUser, canWrite } = useRole();

  // Data Loading
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Selector State
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Form Parameters
  const [formData, setFormData] = useState({
    card_type: 'Standard',
    request_date: '',
    requested_by: '',
    remarks: ''
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchEmployees();
    setFormData(prev => ({
      ...prev,
      request_date: new Date().toISOString().split('T')[0],
      requested_by: currentUser.name || ''
    }));
  }, [currentUser]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employees');
      const json = await res.json();
      if (json.success) {
        setEmployees(json.data);
      } else {
        console.error('Failed to fetch employee list.');
      }
    } catch (err: any) {
      console.error(err.message || 'An error occurred fetching employees.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Autocomplete filtering
  const filteredEmployees = employees.filter(emp => {
    if (!searchQuery.trim()) return false;
    return (
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const selectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setSearchQuery('');
    setShowDropdown(false);
    setFormError(null);
  };

  const removeSelectedEmployee = () => {
    setSelectedEmployee(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!canWrite) {
      return setFormError('You do not have write permissions under your current access role.');
    }
    if (!selectedEmployee) {
      return setFormError('Please search and select an employee first.');
    }
    if (!formData.card_type) return setFormError('ID Card Type is required.');
    if (!formData.request_date) return setFormError('Request Date is required.');
    if (!formData.requested_by.trim()) return setFormError('Requested By is required.');

    try {
      setSubmitting(true);
      const payload = {
        employee_id: selectedEmployee.id,
        ...formData
      };

      const res = await fetch('/api/requests/id-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        setSuccess(true);
      } else {
        setFormError(json.error || 'Failed to submit card request.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSelectedEmployee(null);
    setFormData({
      card_type: 'Standard',
      request_date: new Date().toISOString().split('T')[0],
      requested_by: currentUser.name || '',
      remarks: ''
    });
    setFormError(null);
    setSuccess(false);
  };

  return (
    <>
      <Header 
        title="ID Request Form" 
        subtitle="Standalone employee requisition form for printing new corporate badges." 
      />

      <main className="main-content fade-in">
        <div style={{ marginBottom: '16px' }} className="no-print">
          <Link href="/id-requests" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--slate-500)', fontWeight: 600 }}>
            <ChevronLeft size={16} />
            Back to Request Pipeline
          </Link>
        </div>

        <div className={styles.container}>
          <div className={styles.formCard}>
            
            {/* Form Header */}
            <div className={styles.cardHeader}>
              <div className={styles.headerIcon}>
                <IdCard size={24} />
              </div>
              <div className={styles.titleArea}>
                <h2 className={styles.cardTitle}>ID Badge Requisition</h2>
                <p className={styles.cardSubtitle}>Requisition form for access badges, temporary staff cards, or smart card upgrades.</p>
              </div>
            </div>

            {/* Success State Screen */}
            {success ? (
              <div className={styles.successScreen}>
                <div className={styles.successIcon}>
                  <CheckCircle size={36} />
                </div>
                <h3 className={styles.successTitle}>Request Submitted!</h3>
                <p className={styles.successMsg}>
                  The ID card request for <strong>{selectedEmployee?.name}</strong> has been successfully placed in the HR printing queue.
                </p>
                <div className={styles.successActions}>
                  <button className="btn btn-secondary" onClick={handleResetForm}>
                    <Plus size={16} />
                    Submit Another
                  </button>
                  <Link href="/id-requests" className="btn btn-primary">
                    <FileText size={16} />
                    View Pipeline
                  </Link>
                </div>
              </div>
            ) : (
              /* Actual Form State */
              <form onSubmit={handleFormSubmit} className={styles.formBody}>
                {formError && (
                  <div className="badge pending" style={{ padding: '12px 16px', width: '100%', marginBottom: '20px', border: '1px solid var(--status-pending-border)' }}>
                    <strong>Validation Error:</strong> {formError}
                  </div>
                )}

                {/* Employee Autocomplete Search Bar */}
                {!selectedEmployee ? (
                  <div className={styles.searchWrapper}>
                    <label htmlFor="empSearch">Search Employee *</label>
                    <div className={styles.searchInputWrapper}>
                      <Search size={18} className={styles.searchIcon} />
                      <input
                        id="empSearch"
                        type="text"
                        placeholder="Type employee name or code (e.g. John, EMP001)..."
                        style={{ paddingLeft: '42px' }}
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        disabled={loading}
                        required
                      />
                    </div>

                    {showDropdown && filteredEmployees.length > 0 && (
                      <div className={styles.dropdown}>
                        {filteredEmployees.map((emp) => (
                          <div
                            key={emp.id}
                            className={styles.dropdownItem}
                            onClick={() => selectEmployee(emp)}
                          >
                            <span className={styles.itemName}>{emp.name}</span>
                            <span className={styles.itemMeta}>
                              {emp.employee_code} • {emp.designation} ({emp.branch_name})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {showDropdown && searchQuery.trim() !== '' && filteredEmployees.length === 0 && (
                      <div className={styles.dropdown} style={{ padding: '16px', textAlign: 'center', color: 'var(--slate-400)', fontSize: '13px' }}>
                        No employees found matching &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                ) : (
                  /* Profile Badge of the Selected Employee */
                  <div className={styles.selectedEmployeeCard}>
                    <div className={styles.empDetails}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} style={{ color: 'var(--primary)' }} />
                        <span className={styles.empName}>{selectedEmployee.name}</span>
                      </div>
                      <span className={styles.empMeta}>
                        Code: <strong>{selectedEmployee.employee_code}</strong> • {selectedEmployee.designation}
                      </span>
                      <span className={styles.empMeta} style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
                        Branch: {selectedEmployee.branch_name}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.removeEmpBtn}
                      onClick={removeSelectedEmployee}
                    >
                      Change Employee
                    </button>
                  </div>
                )}

                {/* Form Fields Grid */}
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="card_type">ID Card Type *</label>
                    <select
                      id="card_type"
                      name="card_type"
                      value={formData.card_type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="Standard">Standard Card</option>
                      <option value="RFID">RFID Access Card</option>
                      <option value="Smart Card">Smart Chip Card</option>
                      <option value="Temporary">Temporary Visitor Card</option>
                    </select>
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor="request_date">Requisition Date *</label>
                    <div style={{ position: 'relative' }}>
                      <Calendar size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', pointerEvents: 'none' }} />
                      <input
                        id="request_date"
                        type="date"
                        name="request_date"
                        value={formData.request_date}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className={`${styles.inputGroup} ${styles.formGridFull}`}>
                    <label htmlFor="requested_by">Requested By (User / Manager) *</label>
                    <input
                      id="requested_by"
                      type="text"
                      name="requested_by"
                      placeholder="e.g. Jane Smith"
                      value={formData.requested_by}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className={`${styles.inputGroup} ${styles.formGridFull}`}>
                    <label htmlFor="remarks">Remarks / Special Requirements</label>
                    <textarea
                      id="remarks"
                      name="remarks"
                      rows={3}
                      placeholder="Specify building access levels, barcode numbers, chip configurations, etc."
                      value={formData.remarks}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Submission Actions */}
                <div className={styles.formActions}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => router.push('/id-requests')}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting || !selectedEmployee}
                  >
                    {submitting ? 'Submitting Requisition...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
