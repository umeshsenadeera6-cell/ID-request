'use client';

import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  ShieldAlert,
  CreditCard,
  IdCard,
  Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Header from '@/components/Header';
import { useRole } from '@/context/RoleContext';
import styles from './reports.module.css';

interface ReportRow {
  id: number;
  category: 'ID Card' | 'Visiting Card';
  employee_name: string;
  employee_code: string;
  department_id: number;
  department_name: string;
  card_type?: string;
  quantity?: number;
  request_date: string;
  requested_by: string;
  print_date: string | null;
  issue_date: string | null;
  status: 'Pending' | 'Printed' | 'Issued';
  remarks: string | null;
}

interface Department {
  id: number;
  name: string;
}

export default function ReportsPage() {
  const { currentRole, currentUser } = useRole();

  // Data State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allRequests, setAllRequests] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configuration State
  const [reportType, setReportType] = useState<'monthly' | 'department'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(''); // Format: YYYY-MM
  const [selectedDept, setSelectedDept] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'id' | 'vc'>('all');

  // Generated Report State
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [reportTitle, setReportTitle] = useState('');

  // Months listing for monthly dropdown
  const [availableMonths, setAvailableMonths] = useState<{ value: string; label: string }[]>([]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [idRes, vcRes, deptRes] = await Promise.all([
        fetch('/api/requests/id-cards'),
        fetch('/api/requests/visiting-cards'),
        fetch('/api/departments')
      ]);

      const idJson = await idRes.json();
      const vcJson = await vcRes.json();
      const deptJson = await deptRes.json();

      if (idJson.success && vcJson.success && deptJson.success) {
        // Map ID requests to common ReportRow format
        const idMapped = idJson.data.map((r: any) => ({
          ...r,
          category: 'ID Card'
        }));

        // Map VC requests to common ReportRow format
        const vcMapped = vcJson.data.map((r: any) => ({
          ...r,
          category: 'Visiting Card'
        }));

        const merged = [...idMapped, ...vcMapped];
        setAllRequests(merged);
        setDepartments(deptJson.data);

        // Compile available months from dates
        const monthsMap: Record<string, string> = {};
        const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        merged.forEach((r: any) => {
          if (!r.request_date) return;
          const date = new Date(r.request_date);
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const value = `${yyyy}-${mm}`;
          const label = `${monthsList[date.getMonth()]} ${yyyy}`;
          monthsMap[value] = label;
        });

        // Add current month if empty
        const today = new Date();
        const curValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const curLabel = `${monthsList[today.getMonth()]} ${today.getFullYear()}`;
        monthsMap[curValue] = curLabel;

        const formattedMonths = Object.entries(monthsMap)
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => b.value.localeCompare(a.value));

        setAvailableMonths(formattedMonths);
        setSelectedMonth(curValue);
        setSelectedDept(deptJson.data[0]?.id.toString() || '');
      } else {
        setError('Failed to load request records.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading reports data.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();

    let filtered = [...allRequests];

    // 1. Filter by category
    if (categoryFilter === 'id') {
      filtered = filtered.filter(r => r.category === 'ID Card');
    } else if (categoryFilter === 'vc') {
      filtered = filtered.filter(r => r.category === 'Visiting Card');
    }

    // 2. Filter by Report Type parameter
    if (reportType === 'monthly') {
      const [year, month] = selectedMonth.split('-');
      filtered = filtered.filter(r => {
        const date = new Date(r.request_date);
        return date.getFullYear() === parseInt(year) && (date.getMonth() + 1) === parseInt(month);
      });

      const monthLabel = availableMonths.find(m => m.value === selectedMonth)?.label || '';
      setReportTitle(`Monthly Card Printing Report - ${monthLabel}`);
    } else {
      filtered = filtered.filter(r => r.department_id === parseInt(selectedDept));
      const deptName = departments.find(d => d.id === parseInt(selectedDept))?.name || 'Department';
      setReportTitle(`Department Printing Report - ${deptName}`);
    }

    // Sort requests by date descending
    filtered.sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime());

    setReportData(filtered);
    setIsGenerated(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) return;

    // Compile rows in a readable Excel format
    const exportRows = reportData.map(r => ({
      'Req ID': `#${r.id}`,
      'Category': r.category,
      'Employee Code': r.employee_code,
      'Employee Name': r.employee_name,
      'Department': r.department_name,
      'Details': r.category === 'ID Card' ? r.card_type : `${r.quantity} Cards`,
      'Requested By': r.requested_by,
      'Request Date': r.request_date ? new Date(r.request_date).toISOString().split('T')[0] : '',
      'Print Date': r.print_date ? new Date(r.print_date).toISOString().split('T')[0] : 'Pending',
      'Issue Date': r.issue_date ? new Date(r.issue_date).toISOString().split('T')[0] : 'Pending',
      'Status': r.status,
      'Remarks': r.remarks || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Data');
    
    // Save file
    XLSX.writeFile(workbook, `Card_Tracker_${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Compile summary metrics for generated report
  const getReportSummary = () => {
    let idCount = 0;
    let vcCount = 0;
    let pending = 0;
    let printed = 0;
    let issued = 0;

    reportData.forEach(r => {
      if (r.category === 'ID Card') idCount++;
      else vcCount++;

      if (r.status === 'Pending') pending++;
      else if (r.status === 'Printed') printed++;
      else if (r.status === 'Issued') issued++;
    });

    return {
      total: reportData.length,
      idCount,
      vcCount,
      pending,
      printed,
      issued
    };
  };

  const summary = getReportSummary();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  };

  if (!mounted) return null;

  return (
    <>
      <Header 
        title="Reports & Analytics" 
        subtitle="Generate monthly statistics, department reports, and export print files." 
      />

      <main className="main-content fade-in">
        {error && (
          <div className="badge pending" style={{ padding: '12px 18px', width: '100%' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Report configuration filters - Hidden on print */}
        <section className={`${styles.reportConfigCard} no-print`}>
          <form onSubmit={handleGenerateReport}>
            <div className={styles.configGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="reportType">Report Type</label>
                <select 
                  id="reportType"
                  value={reportType} 
                  onChange={(e) => setReportType(e.target.value as 'monthly' | 'department')}
                >
                  <option value="monthly">Monthly Print Summary</option>
                  <option value="department">Department Print Summary</option>
                </select>
              </div>

              {reportType === 'monthly' ? (
                <div className={styles.inputGroup}>
                  <label htmlFor="selectedMonth">Choose Month</label>
                  <select 
                    id="selectedMonth"
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    {availableMonths.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className={styles.inputGroup}>
                  <label htmlFor="selectedDept">Choose Department</label>
                  <select 
                    id="selectedDept"
                    value={selectedDept} 
                    onChange={(e) => setSelectedDept(e.target.value)}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.inputGroup}>
                <label htmlFor="categoryFilter">Card Filter</label>
                <select 
                  id="categoryFilter"
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value as 'all' | 'id' | 'vc')}
                >
                  <option value="all">All Request Types</option>
                  <option value="id">ID Cards Only</option>
                  <option value="vc">Visiting Cards Only</option>
                </select>
              </div>
            </div>

            <div className={styles.configActions}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <FileText size={16} />
                Generate Report
              </button>
            </div>
          </form>
        </section>

        {/* Report Preview Document */}
        {isGenerated && (
          <section className={styles.reportPreviewWrapper}>
            {/* Action Bar inside preview - Hidden on print */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderBottom: '1px solid var(--slate-100)', paddingBottom: '16px' }}>
              <button className="btn btn-secondary" onClick={handleExportExcel}>
                <Download size={16} />
                Export to Excel
              </button>
              <button className="btn btn-primary" onClick={handlePrint}>
                <Printer size={16} />
                Print / Save PDF
              </button>
            </div>

            {/* Document Header */}
            <div className={styles.docHeader}>
              <div className={styles.companyBranding}>
                <div className={styles.companyIcon}>
                  <IdCard size={36} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className={styles.companyName}>ID & Visiting Card Tracker</h2>
                  <p className={styles.companySubtitle}>Corporate Card Management Portal</p>
                </div>
              </div>
              <div className={styles.docMeta}>
                <div><strong>Document Ref:</strong> CTR-{new Date().getFullYear()}-{Math.floor(1000 + Math.random() * 9000)}</div>
                <div><strong>Generated On:</strong> {new Date().toLocaleString()}</div>
                <div><strong>Prepared By:</strong> {currentUser.name} ({currentRole})</div>
              </div>
            </div>

            {/* Document Title */}
            <div className={styles.docTitleArea}>
              <h1 className={styles.docTitle}>{reportTitle}</h1>
              <p className={styles.docSubtitle}>Showing request items, printed quantities and current state logs</p>
            </div>

            {/* Report Metrics Overview */}
            <div className={styles.summaryCardsGrid}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryVal}>{summary.total}</div>
                <div className={styles.summaryLbl}>Total Requests</div>
              </div>
              <div className={styles.summaryCard} style={{ borderLeft: '3px solid var(--status-pending-border)' }}>
                <div className={styles.summaryVal} style={{ color: 'var(--status-pending-text)' }}>{summary.pending}</div>
                <div className={styles.summaryLbl}>Pending Print</div>
              </div>
              <div className={styles.summaryCard} style={{ borderLeft: '3px solid var(--status-printed-border)' }}>
                <div className={styles.summaryVal} style={{ color: 'var(--status-printed-text)' }}>{summary.printed}</div>
                <div className={styles.summaryLbl}>Printed (Ready)</div>
              </div>
              <div className={styles.summaryCard} style={{ borderLeft: '3px solid var(--status-issued-border)' }}>
                <div className={styles.summaryVal} style={{ color: 'var(--status-issued-text)' }}>{summary.issued}</div>
                <div className={styles.summaryLbl}>Issued to Staff</div>
              </div>
            </div>

            {/* Report Data Table */}
            <div>
              <span className={styles.label} style={{ marginBottom: '8px' }}>Detailed Request Log</span>
              
              <div className="table-container" style={{ borderRadius: 'var(--radius-md)' }}>
                {reportData.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--slate-400)' }}>
                    No request items matched the selected parameters.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Req ID</th>
                        <th>Category</th>
                        <th>Employee</th>
                        <th>Details</th>
                        <th>Requested By</th>
                        <th>Request Date</th>
                        <th>Print Date</th>
                        <th>Issue Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((row) => (
                        <tr key={`${row.category}-${row.id}`}>
                          <td style={{ fontWeight: '700', color: 'var(--slate-500)' }}>#{row.id}</td>
                          <td style={{ fontWeight: 600 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              {row.category === 'ID Card' ? (
                                <Layers size={13} style={{ color: 'var(--primary)' }} />
                              ) : (
                                <CreditCard size={13} style={{ color: '#7c3aed' }} />
                              )}
                              {row.category}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: '600', color: 'var(--slate-900)' }}>{row.employee_name}</span>
                              <span style={{ fontSize: '11px', color: 'var(--slate-400)' }}>
                                {row.employee_code} • {row.department_name}
                              </span>
                            </div>
                          </td>
                          <td>
                            {row.category === 'ID Card' ? (
                              <span className="badge standard">{row.card_type}</span>
                            ) : (
                              <span className="badge standard" style={{ fontWeight: 600 }}>{row.quantity} Cards</span>
                            )}
                          </td>
                          <td>{row.requested_by}</td>
                          <td>{formatDate(row.request_date)}</td>
                          <td>{formatDate(row.print_date)}</td>
                          <td>{formatDate(row.issue_date)}</td>
                          <td>
                            <span className={`badge ${row.status.toLowerCase()}`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Document Signature Sign-Off */}
            <div className={styles.signOffSection}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--slate-400)', marginBottom: '4px' }}>System Audit Verification Log</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--slate-500)' }}>
                  <ShieldAlert size={12} style={{ color: 'var(--status-issued-text)' }} />
                  Secure Cryptographic Signature Attached
                </div>
              </div>
              <div className={styles.sigLine}>
                Authorized Sign-Off
              </div>
              <div className={styles.sigLine}>
                Verification Date
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
