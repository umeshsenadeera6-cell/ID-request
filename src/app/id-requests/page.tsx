'use client';

import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Printer, 
  CheckCircle,
  Filter,
  FileText,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { useRole } from '@/context/RoleContext';
import styles from './requests.module.css';

interface IDRequest {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  department_id: number;
  department_name: string;
  card_type: string;
  request_date: string;
  requested_by: string;
  print_date: string | null;
  issue_date: string | null;
  status: 'Pending' | 'Printed' | 'Issued';
  remarks: string | null;
}

interface Employee {
  id: number;
  name: string;
  employee_code: string;
  department_name: string;
}

interface Department {
  id: number;
  name: string;
}

export default function IDRequestsPage() {
  const { canWrite, canDelete } = useRole();

  // Data State
  const [requests, setRequests] = useState<IDRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('Create ID Request');
  const [editingRequest, setEditingRequest] = useState<IDRequest | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    employee_id: '',
    card_type: 'Standard',
    request_date: '',
    requested_by: '',
    remarks: '',
    status: 'Pending'
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

      const [reqRes, empRes, deptRes] = await Promise.all([
        fetch('/api/requests/id-cards'),
        fetch('/api/employees'),
        fetch('/api/departments')
      ]);

      const reqJson = await reqRes.json();
      const empJson = await empRes.json();
      const deptJson = await deptRes.json();

      if (reqJson.success && empJson.success && deptJson.success) {
        setRequests(reqJson.data);
        setEmployees(empJson.data);
        setDepartments(deptJson.data);
      } else {
        setError(reqJson.error || empJson.error || deptJson.error || 'Failed to fetch data.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading requests.');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (req: IDRequest) => {
    setEditingRequest(req);
    // Parse ISO dates to YYYY-MM-DD
    const reqDate = req.request_date ? new Date(req.request_date).toISOString().split('T')[0] : '';
    
    setFormData({
      employee_id: req.employee_id.toString(),
      card_type: req.card_type,
      request_date: reqDate,
      requested_by: req.requested_by,
      remarks: req.remarks || '',
      status: req.status
    });
    setFormError(null);
    setModalTitle(`Edit Request #${req.id} (${req.employee_name})`);
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    if (!formData.employee_id) return setFormError('Employee selection is required.');
    if (!formData.card_type) return setFormError('Card Type is required.');
    if (!formData.request_date) return setFormError('Request Date is required.');
    if (!formData.requested_by.trim()) return setFormError('Requested By is required.');

    try {
      const url = editingRequest ? `/api/requests/id-cards/${editingRequest.id}` : '/api/requests/id-cards';
      const method = editingRequest ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        fetchData();
      } else {
        setFormError(json.error || 'Operation failed.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateRequestStatus = async (req: IDRequest, nextStatus: 'Printed' | 'Issued') => {
    try {
      const reqDate = req.request_date ? new Date(req.request_date).toISOString().split('T')[0] : '';
      const updateData = {
        employee_id: req.employee_id,
        card_type: req.card_type,
        status: nextStatus,
        remarks: req.remarks,
        request_date: reqDate
      };

      const res = await fetch(`/api/requests/id-cards/${req.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const json = await res.json();
      if (json.success) {
        fetchData();
      } else {
        alert(json.error || 'Failed to update request status.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
    }
  };

  const handleDeleteRequest = async (id: number) => {
    if (!confirm('Are you sure you want to delete this ID card request?')) {
      return;
    }

    try {
      const res = await fetch(`/api/requests/id-cards/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchData();
      } else {
        alert(json.error || 'Failed to delete request.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  };

  // Client-side filtering logic
  const filteredRequests = requests.filter(req => {
    // 1. Search term filter
    const matchesSearch = 
      req.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      req.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) || 
      req.requested_by.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Department filter
    const matchesDept = selectedDept === '' || req.department_id === parseInt(selectedDept);

    // 3. Status filter
    const matchesStatus = selectedStatus === '' || req.status === selectedStatus;

    // 4. Date range filter
    let matchesDate = true;
    if (startDate || endDate) {
      const reqTime = new Date(req.request_date).getTime();
      if (startDate) {
        const start = new Date(startDate).getTime();
        if (reqTime < start) matchesDate = false;
      }
      if (endDate) {
        // Add 1 day to end date to make it inclusive
        const endLimit = new Date(endDate);
        endLimit.setDate(endLimit.getDate() + 1);
        const end = endLimit.getTime();
        if (reqTime > end) matchesDate = false;
      }
    }

    return matchesSearch && matchesDept && matchesStatus && matchesDate;
  });

  const getCardTypeBadgeClass = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('rfid')) return 'rfid';
    if (t.includes('smart')) return 'smart';
    if (t.includes('temp')) return 'temp';
    return 'standard';
  };

  if (!mounted) return null;

  return (
    <>
      <Header 
        title="ID Card Printing Requests" 
        subtitle="Manage employee ID badge creation, print queues, and collection statuses." 
      />

      <main className="main-content fade-in">
        {error && (
          <div className="badge pending" style={{ padding: '12px 18px', width: '100%' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Search and Filters Section */}
        <section className={styles.filterBar}>
          <div className={styles.filterGrid}>
            <div className={styles.inputGroup}>
              <span className={styles.label}>Search</span>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                <input 
                  type="text" 
                  placeholder="Employee name, code, requestor..." 
                  style={{ paddingLeft: '36px' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <span className={styles.label}>Department</span>
              <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <span className={styles.label}>Status</span>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Printed">Printed</option>
                <option value="Issued">Issued</option>
              </select>
            </div>

            <div className={styles.inputGroup}>
              <span className={styles.label}>Request Date Range</span>
              <div className={styles.dateRangeContainer}>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ padding: '8px 10px' }}
                />
                <span className={styles.dateSeparator}>to</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ padding: '8px 10px' }}
                />
              </div>
            </div>
          </div>

          <div className={styles.filterRow2}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Filter size={15} style={{ color: 'var(--slate-400)' }} />
              <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500 }}>
                Showing <strong>{filteredRequests.length}</strong> matching print requests
              </span>
            </div>
            {canWrite && (
              <Link href="/id-requests/new" className="btn btn-primary">
                <Plus size={16} />
                New Request
              </Link>
            )}
          </div>
        </section>

        {/* Requests Table Wrapper */}
        <section className={styles.tableWrapper}>
          <div className={styles.tableHeaderActions}>
            <span className={styles.tableTitle}>ID Card Printing Pipeline</span>
          </div>

          <div className="table-container">
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--slate-400)' }}>
                Loading request entries...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className={styles.noData}>
                <FileText size={48} strokeWidth={1} style={{ color: 'var(--slate-300)' }} />
                <p>No ID card requests found matching your filter selections.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Req. ID</th>
                    <th>Employee Details</th>
                    <th>Card Type</th>
                    <th>Request Date</th>
                    <th>Requested By</th>
                    <th>Print Date</th>
                    <th>Issue Date</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    {canWrite && <th style={{ textAlign: 'right' }}>Workflow / Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => (
                    <tr key={req.id}>
                      <td style={{ fontWeight: '700', color: 'var(--slate-500)' }}>#{req.id}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600', color: 'var(--slate-900)' }}>{req.employee_name}</span>
                          <span style={{ fontSize: '12px', color: 'var(--slate-400)' }}>
                            {req.employee_code} • {req.department_name}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getCardTypeBadgeClass(req.card_type)}`}>
                          {req.card_type}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} style={{ color: 'var(--slate-400)' }} />
                          {formatDate(req.request_date)}
                        </span>
                      </td>
                      <td>{req.requested_by}</td>
                      <td>{formatDate(req.print_date)}</td>
                      <td>{formatDate(req.issue_date)}</td>
                      <td>
                        <span className={`badge ${req.status.toLowerCase()}`}>
                          {req.status}
                        </span>
                      </td>
                      <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.remarks || ''}>
                        {req.remarks || <span style={{ color: 'var(--slate-300)' }}>N/A</span>}
                      </td>
                      {canWrite && (
                        <td style={{ textAlign: 'right' }}>
                          <div className={styles.actionCell} style={{ justifyContent: 'flex-end' }}>
                            {/* Workflow State Transitions */}
                            {req.status === 'Pending' && (
                              <button 
                                className={`${styles.statusTransitionBtn} ${styles.printTransitionBtn}`}
                                onClick={() => updateRequestStatus(req, 'Printed')}
                                title="Mark card as printed"
                              >
                                <Printer size={13} />
                                Print
                              </button>
                            )}
                            {req.status === 'Printed' && (
                              <button 
                                className={`${styles.statusTransitionBtn} ${styles.issueTransitionBtn}`}
                                onClick={() => updateRequestStatus(req, 'Issued')}
                                title="Mark card as issued to staff"
                              >
                                <CheckCircle size={13} />
                                Issue
                              </button>
                            )}
                            
                            {/* Standard Edit/Delete buttons */}
                            <button 
                              className={styles.iconBtn} 
                              onClick={() => openEditModal(req)}
                              title="Edit Request details"
                            >
                              <Edit2 size={13} />
                            </button>
                            {canDelete && (
                              <button 
                                className={`${styles.iconBtn} ${styles.deleteBtn}`}
                                onClick={() => handleDeleteRequest(req.id)}
                                title="Delete Request"
                              >
                                <Trash2 size={13} />
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

        {/* Request Dialog Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle}>
          <form onSubmit={handleFormSubmit}>
            {formError && (
              <div className="badge pending" style={{ padding: '10px 14px', width: '100%', marginBottom: '16px', border: '1px solid var(--status-pending-border)' }}>
                {formError}
              </div>
            )}

            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="employee_id">Select Employee *</label>
                <select 
                  id="employee_id"
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleInputChange}
                  required
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_code}) - {emp.department_name}
                    </option>
                  ))}
                </select>
              </div>

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
                  <option value="RFID">RFID Card</option>
                  <option value="Smart Card">Smart Card</option>
                  <option value="Temporary">Temporary Card</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="request_date">Request Date *</label>
                <input 
                  id="request_date"
                  type="date" 
                  name="request_date"
                  value={formData.request_date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="requested_by">Requested By *</label>
                <input 
                  id="requested_by"
                  type="text" 
                  name="requested_by"
                  placeholder="HR executive name..."
                  value={formData.requested_by}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {editingRequest && (
                <div className={styles.inputGroup}>
                  <label htmlFor="status">Current Print Status *</label>
                  <select 
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="Pending">Pending Print</option>
                    <option value="Printed">Printed (Ready)</option>
                    <option value="Issued">Issued to Employee</option>
                  </select>
                </div>
              )}

              <div className={styles.inputGroup}>
                <label htmlFor="remarks">Remarks / Notes</label>
                <textarea 
                  id="remarks"
                  name="remarks"
                  rows={3}
                  placeholder="Add access level config notes, smart card chips credentials, etc."
                  value={formData.remarks}
                  onChange={handleInputChange}
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
                {submitting ? 'Saving...' : 'Save Request'}
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </>
  );
}
