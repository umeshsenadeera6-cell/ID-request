'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  IdCard, 
  CreditCard, 
  Clock, 
  Printer, 
  CheckCircle,
  TrendingUp,
  Award,
  UploadCloud,
  X,
  Sparkles,
  Download,
  User,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  Eye,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  Lock,
  Unlock,
  Check,
  Search,
  Plus,
  FileText
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import * as XLSX from 'xlsx';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { useRole } from '@/context/RoleContext';
import styles from './dashboard.module.css';

// Types
interface Employee {
  id: number;
  name: string;
  employee_code: string;
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

interface ConsolidatedRequest {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  branch_id: number;
  branch_name: string;
  category: 'ID Card' | 'Visiting Card';
  details: string; // card_type for ID, quantity + ' Cards' for Visiting
  request_date: string;
  requested_by: string;
  print_date: string | null;
  issue_date: string | null;
  status: 'Pending' | 'Printed' | 'Issued';
  remarks: string | null; // Will store JSON metadata
}

interface BulkRow {
  id: number;
  employee_code: string;
  name: string;
  designation: string;
  branch_name: string;
  mobile: string;
  email: string;
  card_type: string;
  quantity: number;
}

interface SummaryData {
  totalIdCards: number;
  totalVisitingCards: number;
  pendingRequests: number;
  printedRequests: number;
  issuedRequests: number;
  totalRequests: number;
}

export default function DashboardPage() {
  const { currentUser, canWrite, canDelete, isAdmin } = useRole();

  // Navigation state
  const [activeTab, setActiveTab] = useState<'request' | 'pipeline' | 'analytics'>('request');

  useEffect(() => {
    if (!isAdmin) {
      setActiveTab('request');
    }
  }, [isAdmin]);
  
  // Requisition settings
  const [reqCategory, setReqCategory] = useState<'id_card' | 'visiting_card' | 'both'>('id_card');
  const [entryMode, setEntryMode] = useState<'single' | 'bulk'>('single');

  // Master Data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [requests, setRequests] = useState<ConsolidatedRequest[]>([]);
  const [stats, setStats] = useState<SummaryData>({
    totalIdCards: 0,
    totalVisitingCards: 0,
    pendingRequests: 0,
    printedRequests: 0,
    issuedRequests: 0,
    totalRequests: 0
  });
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [branchStats, setBranchStats] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  // Individual Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [isDetailsLocked, setIsDetailsLocked] = useState(false);

  const [empForm, setEmpForm] = useState({
    employee_code: '',
    name: '',
    designation: '',
    branch_id: '',
    mobile: '',
    email: ''
  });

  const [cardSpecs, setCardSpecs] = useState({
    card_type: 'Standard',
    quantity: '100',
    remarks: '',
    photo: '', // Base64
    photoName: '',
    logo: '', // Base64
    logoName: '',
    requested_by: '',
    request_date: ''
  });

  // Bulk Upload State
  const [bulkEmployees, setBulkEmployees] = useState<BulkRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Consolidated Pipeline Filters
  const [filterSearch, setFilterSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Modals
  const [viewProofRequest, setViewProofRequest] = useState<ConsolidatedRequest | null>(null);
  const [editingRequest, setEditingRequest] = useState<ConsolidatedRequest | null>(null);
  const [editForm, setEditForm] = useState({
    card_type: 'Standard',
    quantity: 100,
    status: 'Pending' as 'Pending' | 'Printed' | 'Issued',
    remarksText: '',
    requested_by: '',
    request_date: ''
  });

  // Load Initial Data
  useEffect(() => {
    fetchMasterData();
    setCardSpecs(prev => ({
      ...prev,
      requested_by: currentUser.name || '',
      request_date: new Date().toISOString().split('T')[0]
    }));
  }, [currentUser]);

  const fetchMasterData = async () => {
    try {
      setLoading(true);
      const [empRes, branchRes, reqIdRes, reqVcRes, statsRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/branches'),
        fetch('/api/requests/id-cards'),
        fetch('/api/requests/visiting-cards'),
        fetch('/api/dashboard')
      ]);

      const empJson = await empRes.json();
      const branchJson = await branchRes.json();
      const reqIdJson = await reqIdRes.json();
      const reqVcJson = await reqVcRes.json();
      const statsJson = await statsRes.json();

      if (empJson.success) setEmployees(empJson.data);
      if (branchJson.success) setBranches(branchJson.data);

      // Merge and Consolidate requests
      if (reqIdJson.success && reqVcJson.success) {
        const idMapped = reqIdJson.data.map((r: any) => ({
          ...r,
          category: 'ID Card' as const,
          details: r.card_type
        }));
        const vcMapped = reqVcJson.data.map((r: any) => ({
          ...r,
          category: 'Visiting Card' as const,
          details: `${r.quantity} Cards`
        }));
        const combined = [...idMapped, ...vcMapped].sort(
          (a: any, b: any) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime()
        );
        setRequests(combined);
      }

      if (statsJson.success) {
        setStats(statsJson.data.summary);
        setMonthlyStats(statsJson.data.monthlyStats);
        setBranchStats(statsJson.data.branchStats);
      }
    } catch (err) {
      console.error('Error fetching master data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper: parse remarks JSON safely
  const parseRequestRemarks = (remarksStr: string | null) => {
    if (!remarksStr) return { notes: '', photo: '', logo: '' };
    try {
      const parsed = JSON.parse(remarksStr);
      if (parsed && typeof parsed === 'object') {
        return {
          notes: parsed.notes || '',
          photo: parsed.photo || '',
          logo: parsed.logo || ''
        };
      }
    } catch (e) {
      // ignore
    }
    return { notes: remarksStr, photo: '', logo: '' };
  };

  // Handle Autocomplete Suggestions
  const filteredEmployeesSuggestions = employees.filter(emp => {
    if (!searchQuery.trim()) return false;
    return (
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmpId(emp.id);
    setEmpForm({
      employee_code: emp.employee_code,
      name: emp.name,
      designation: emp.designation,
      branch_id: String(emp.branch_id),
      mobile: emp.mobile,
      email: emp.email
    });
    setSearchQuery('');
    setShowDropdown(false);
    setIsDetailsLocked(true);
  };

  const handleClearSelectedEmployee = () => {
    setSelectedEmpId(null);
    setEmpForm({
      employee_code: '',
      name: '',
      designation: '',
      branch_id: branches[0]?.id ? String(branches[0].id) : '',
      mobile: '',
      email: ''
    });
    setIsDetailsLocked(false);
  };

  // Convert File to Base64
  const processImageFile = (file: File, type: 'photo' | 'logo') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setCardSpecs(prev => ({
        ...prev,
        [type]: base64,
        [`${type}Name`]: file.name
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileDrop = (e: React.DragEvent, type: 'photo' | 'logo') => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file, type);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'logo') => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, type);
    }
  };

  // Parse CSV/Excel Bulk Sheet
  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json<any>(worksheet);

        const mapped = rawRows.map((row: any, index: number) => {
          const code = row['Employee Code'] || row['EmployeeCode'] || row['Code'] || row['code'] || row['employee_code'] || '';
          const name = row['Full Name'] || row['FullName'] || row['Name'] || row['name'] || '';
          const designation = row['Designation'] || row['designation'] || row['designation_title'] || '';
          const branchName = row['Branch'] || row['branch'] || row['dept'] || '';
          const mobile = row['Mobile'] || row['mobile'] || row['Phone'] || row['phone'] || '';
          const email = row['Email'] || row['email'] || row['Email Address'] || '';
          const cardType = row['Card Type'] || row['CardType'] || row['card_type'] || 'Standard';
          const qty = parseInt(row['Quantity'] || row['Qty'] || row['quantity'] || '100');

          return {
            id: index + 1,
            employee_code: String(code).trim(),
            name: String(name).trim(),
            designation: String(designation).trim(),
            branch_name: String(branchName).trim(),
            mobile: String(mobile).trim(),
            email: String(email).trim(),
            card_type: String(cardType).trim(),
            quantity: isNaN(qty) ? 100 : qty
          };
        });

        // Filter valid rows
        const filtered = mapped.filter(r => r.name || r.employee_code);
        setBulkEmployees(filtered);
      } catch (err: any) {
        alert('Parsing failed: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadCSVTemplate = () => {
    const headers = 'Employee Code,Full Name,Designation,Branch,Mobile,Email,Card Type (ID),Quantity (VC)\n';
    const sample = 'EMP101,John Doe,Software Architect,Information Technology,+1 555-9999,john.doe@company.com,RFID,200\nEMP102,Alice Smith,HR Analyst,Human Resources,+1 555-8888,alice.s@company.com,Standard,100';
    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'card_request_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Find Branch ID by name match
  const getBranchIdByName = (name: string) => {
    const search = name.toLowerCase().trim();
    if (!search) return branches[0]?.id || 1;
    const found = branches.find(d => 
      d.name.toLowerCase() === search || 
      d.name.toLowerCase().includes(search)
    );
    return found ? found.id : (branches[0]?.id || 1);
  };

  // Submit Requisitions (Individual / Bulk)
  const handleSubmitRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      alert('You do not have write access permissions.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitMessage('Starting requisition submission...');

      const submittedQueue: Array<{
        empData: any;
        idRequest?: any;
        vcRequest?: any;
      }> = [];

      if (entryMode === 'single') {
        if (!empForm.employee_code.trim()) throw new Error('Employee Code is required.');
        if (!empForm.name.trim()) throw new Error('Employee Name is required.');
        if (!empForm.branch_id) throw new Error('Branch is required.');
        if (!empForm.designation.trim()) throw new Error('Designation is required.');

        const empData = {
          id: selectedEmpId,
          ...empForm
        };

        const remarksPayload = JSON.stringify({
          notes: cardSpecs.remarks,
          photo: cardSpecs.photo,
          logo: cardSpecs.logo
        });

        const reqs: any = {};
        if (reqCategory === 'id_card' || reqCategory === 'both') {
          reqs.idRequest = {
            card_type: cardSpecs.card_type,
            request_date: cardSpecs.request_date,
            requested_by: cardSpecs.requested_by,
            remarks: remarksPayload
          };
        }
        if (reqCategory === 'visiting_card' || reqCategory === 'both') {
          reqs.vcRequest = {
            quantity: parseInt(cardSpecs.quantity) || 100,
            request_date: cardSpecs.request_date,
            requested_by: cardSpecs.requested_by,
            remarks: remarksPayload
          };
        }

        submittedQueue.push({ empData, ...reqs });
      } else {
        // Bulk Requisition processing
        if (bulkEmployees.length === 0) {
          throw new Error('Please upload details via CSV/Excel sheet first.');
        }

        bulkEmployees.forEach((emp) => {
          const branchId = getBranchIdByName(emp.branch_name);
          const empData = {
            id: null, // Always attempt matching by employee code first
            employee_code: emp.employee_code,
            name: emp.name,
            designation: emp.designation,
            branch_id: String(branchId),
            mobile: emp.mobile,
            email: emp.email
          };

          const remarksPayload = JSON.stringify({
            notes: 'Bulk uploaded request',
            photo: '',
            logo: ''
          });

          const reqs: any = {};
          if (reqCategory === 'id_card' || reqCategory === 'both') {
            reqs.idRequest = {
              card_type: emp.card_type || 'Standard',
              request_date: cardSpecs.request_date,
              requested_by: cardSpecs.requested_by,
              remarks: remarksPayload
            };
          }
          if (reqCategory === 'visiting_card' || reqCategory === 'both') {
            reqs.vcRequest = {
              quantity: emp.quantity || 100,
              request_date: cardSpecs.request_date,
              requested_by: cardSpecs.requested_by,
              remarks: remarksPayload
            };
          }

          submittedQueue.push({ empData, ...reqs });
        });
      }

      // Execute submissions queue
      let count = 0;
      for (const item of submittedQueue) {
        count++;
        setSubmitMessage(`Processing request ${count} of ${submittedQueue.length}...`);

        let finalEmployeeId = item.empData.id;

        // If employee is new or we don't have ID, check by code first
        if (!finalEmployeeId) {
          const existing = employees.find(e => e.employee_code === item.empData.employee_code);
          if (existing) {
            finalEmployeeId = existing.id;
            // Optionally update existing employee details
            await fetch(`/api/employees/${existing.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.empData)
            });
          } else {
            // Register new employee
            const empRes = await fetch('/api/employees', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.empData)
            });
            const empJson = await empRes.json();
            if (empJson.success) {
              finalEmployeeId = empJson.data.id;
            } else {
              throw new Error(`Failed to create employee ${item.empData.name}: ${empJson.error}`);
            }
          }
        } else {
          // If we had selected ID, ensure details are up-to-date in database
          await fetch(`/api/employees/${finalEmployeeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.empData)
          });
        }

        // Create ID Request
        if (item.idRequest) {
          const res = await fetch('/api/requests/id-cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employee_id: finalEmployeeId,
              ...item.idRequest
            })
          });
          const json = await res.json();
          if (!json.success) throw new Error(`ID Request Failed: ${json.error}`);
        }

        // Create Visiting Request
        if (item.vcRequest) {
          const res = await fetch('/api/requests/visiting-cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employee_id: finalEmployeeId,
              ...item.vcRequest
            })
          });
          const json = await res.json();
          if (!json.success) throw new Error(`Visiting Request Failed: ${json.error}`);
        }
      }

      setSubmitMessage('Requisition completed successfully!');
      setTimeout(() => {
        setSubmitMessage('');
        // Clean Form
        handleClearSelectedEmployee();
        setCardSpecs(prev => ({
          ...prev,
          remarks: '',
          photo: '',
          photoName: '',
          logo: '',
          logoName: ''
        }));
        setBulkEmployees([]);
        fetchMasterData();
        setActiveTab('pipeline'); // Navigate to history pipeline
      }, 1500);

    } catch (err: any) {
      alert(err.message || 'An error occurred during request submission.');
      setSubmitMessage('');
    } finally {
      setSubmitting(false);
    }
  };

  // Pipeline Workflow Functions
  const handleUpdateStatus = async (req: ConsolidatedRequest, nextStatus: 'Printed' | 'Issued') => {
    try {
      const endpoint = req.category === 'ID Card' ? 'id-cards' : 'visiting-cards';
      const body: any = {
        employee_id: req.employee_id,
        status: nextStatus,
        remarks: req.remarks
      };

      if (req.category === 'ID Card') {
        body.card_type = req.details;
      } else {
        body.quantity = parseInt(req.details) || 100;
      }

      const res = await fetch(`/api/requests/${endpoint}/${req.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (json.success) {
        fetchMasterData();
      } else {
        alert(json.error || 'Failed to update request.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
    }
  };

  const handleDeleteRequest = async (req: ConsolidatedRequest) => {
    if (!confirm(`Are you sure you want to delete this ${req.category} request?`)) return;

    try {
      const endpoint = req.category === 'ID Card' ? 'id-cards' : 'visiting-cards';
      const res = await fetch(`/api/requests/${endpoint}/${req.id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        fetchMasterData();
      } else {
        alert(json.error || 'Failed to delete request.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
    }
  };

  // Edit Request Modal Handling
  const handleOpenEditModal = (req: ConsolidatedRequest) => {
    setEditingRequest(req);
    const parsed = parseRequestRemarks(req.remarks);
    
    setEditForm({
      card_type: req.category === 'ID Card' ? req.details : 'Standard',
      quantity: req.category === 'Visiting Card' ? parseInt(req.details) || 100 : 100,
      status: req.status,
      remarksText: parsed.notes,
      requested_by: req.requested_by,
      request_date: req.request_date ? new Date(req.request_date).toISOString().split('T')[0] : ''
    });
  };

  const handleSaveEditRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;

    try {
      const endpoint = editingRequest.category === 'ID Card' ? 'id-cards' : 'visiting-cards';
      const parsed = parseRequestRemarks(editingRequest.remarks);

      // Recompile remarks JSON preserving images
      const remarksPayload = JSON.stringify({
        notes: editForm.remarksText,
        photo: parsed.photo,
        logo: parsed.logo
      });

      const body: any = {
        employee_id: editingRequest.employee_id,
        status: editForm.status,
        remarks: remarksPayload,
        requested_by: editForm.requested_by,
        request_date: editForm.request_date
      };

      if (editingRequest.category === 'ID Card') {
        body.card_type = editForm.card_type;
      } else {
        body.quantity = editForm.quantity;
      }

      const res = await fetch(`/api/requests/${endpoint}/${editingRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();

      if (json.success) {
        setEditingRequest(null);
        fetchMasterData();
      } else {
        alert(json.error || 'Failed to save request modifications.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
    }
  };

  // Client-side Filters for Consolidated Pipeline List
  const filteredPipelineRequests = requests.filter(req => {
    const matchesSearch = 
      req.employee_name.toLowerCase().includes(filterSearch.toLowerCase()) ||
      req.employee_code.toLowerCase().includes(filterSearch.toLowerCase()) ||
      req.requested_by.toLowerCase().includes(filterSearch.toLowerCase());

    const matchesCategory = filterCategory === '' || req.category === filterCategory;
    const matchesStatus = filterStatus === '' || req.status === filterStatus;
    const matchesBranch = filterBranch === '' || String(req.branch_id) === filterBranch;

    let matchesDate = true;
    if (filterStartDate || filterEndDate) {
      const reqTime = new Date(req.request_date).getTime();
      if (filterStartDate) {
        const start = new Date(filterStartDate).getTime();
        if (reqTime < start) matchesDate = false;
      }
      if (filterEndDate) {
        const endLimit = new Date(filterEndDate);
        endLimit.setDate(endLimit.getDate() + 1);
        if (reqTime > endLimit.getTime()) matchesDate = false;
      }
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesBranch && matchesDate;
  });

  return (
    <>
      <Header 
        title="Card Requisition Portal" 
        subtitle="Request staff ID badges, corporate business cards, manage queues and view printing stats." 
      />

      <main className="main-content fade-in">
        {/* Navigation Tabs */}
        {isAdmin && (
          <div className={styles.tabsContainer}>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'request' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('request')}
            >
              <Sparkles size={16} />
              New Card Request
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'pipeline' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('pipeline')}
            >
              <Clock size={16} />
              Request Pipeline ({stats.pendingRequests} Pending)
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'analytics' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <TrendingUp size={16} />
              Analytics & Trends
            </button>
          </div>
        )}

        {/* LOADING SCREEN */}
        {loading && activeTab !== 'request' && (
          <div style={{ padding: '80px', textAlign: 'center', color: 'var(--slate-400)' }}>
            Loading dashboard database...
          </div>
        )}

        {/* TAB 1: CARD REQUEST FORM & LIVE PROOFING */}
        {!loading && activeTab === 'request' && (
          <div className={styles.portalGrid}>
            
            {/* LEFT SIDE: FORM DETAILS */}
            <form onSubmit={handleSubmitRequisition} className={styles.formPanel}>
              
              {/* Submission status banner */}
              {submitMessage && (
                <div className="badge pending" style={{ padding: '12px 16px', width: '100%', border: '1px solid var(--status-pending-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock className="animate-spin" size={16} />
                  <span>{submitMessage}</span>
                </div>
              )}

              {/* SECTION 1: REQUEST CATEGORY */}
              <div className={styles.formSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionNumber}>1</div>
                  <h3 className={styles.sectionTitle}>Select Requisition Category</h3>
                </div>
                <div className={styles.categoryGrid}>
                  <div 
                    className={`${styles.categoryCard} ${reqCategory === 'id_card' ? styles.categoryCardActive : ''}`}
                    onClick={() => setReqCategory('id_card')}
                  >
                    <div className={styles.categoryIconWrapper}>
                      <IdCard size={20} />
                    </div>
                    <div>
                      <div className={styles.categoryName}>ID Card Only</div>
                      <div className={styles.categoryDesc}>Access control badges & visual IDs</div>
                    </div>
                  </div>

                  <div 
                    className={`${styles.categoryCard} ${reqCategory === 'visiting_card' ? styles.categoryCardActive : ''}`}
                    onClick={() => setReqCategory('visiting_card')}
                  >
                    <div className={styles.categoryIconWrapper}>
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <div className={styles.categoryName}>Visiting Cards</div>
                      <div className={styles.categoryDesc}>Premium business cards for contacts</div>
                    </div>
                  </div>

                  <div 
                    className={`${styles.categoryCard} ${reqCategory === 'both' ? styles.categoryCardActive : ''}`}
                    onClick={() => setReqCategory('both')}
                  >
                    <div className={styles.categoryIconWrapper}>
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <div className={styles.categoryName}>ID & Visiting Cards</div>
                      <div className={styles.categoryDesc}>Order both badges and business cards</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: EMPLOYEE DETAILS */}
              <div className={styles.formSection}>
                <div className={styles.sectionHeader} style={{ justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className={styles.sectionNumber}>2</div>
                    <h3 className={styles.sectionTitle}>Employee Requisition Details</h3>
                  </div>

                  {/* Mode switch */}
                  <div className={styles.modeTabs}>
                    <button 
                      type="button"
                      className={`${styles.modeTabBtn} ${entryMode === 'single' ? styles.modeTabBtnActive : ''}`}
                      onClick={() => setEntryMode('single')}
                    >
                      Single Request
                    </button>
                    <button 
                      type="button"
                      className={`${styles.modeTabBtn} ${entryMode === 'bulk' ? styles.modeTabBtnActive : ''}`}
                      onClick={() => setEntryMode('bulk')}
                    >
                      Bulk (CSV/Excel)
                    </button>
                  </div>
                </div>

                {/* Entry mode: SINGLE EMPLOYEE */}
                {entryMode === 'single' && (
                  <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Autocomplete Search wrapper */}
                    {!selectedEmpId ? (
                      <div className={styles.searchWrapper}>
                        <label htmlFor="empSearch">Lookup Existing Employee (Optional)</label>
                        <div className={styles.searchInputWrapper}>
                          <Search size={18} className={styles.searchIcon} />
                          <input
                            id="empSearch"
                            type="text"
                            placeholder="Type employee name or code..."
                            style={{ paddingLeft: '40px' }}
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                          />
                        </div>

                        {showDropdown && filteredEmployeesSuggestions.length > 0 && (
                          <div className={styles.dropdown}>
                            {filteredEmployeesSuggestions.map((emp) => (
                              <div
                                key={emp.id}
                                className={styles.dropdownItem}
                                onClick={() => handleSelectEmployee(emp)}
                              >
                                <span className={styles.itemName}>{emp.name}</span>
                                <span className={styles.itemMeta}>
                                  {emp.employee_code} • {emp.designation} ({emp.branch_name})
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Display Selected Employee Badge */
                      <div className={styles.selectedEmployeeCard}>
                        <div className={styles.empDetails}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <User size={16} style={{ color: 'var(--primary)' }} />
                            <span className={styles.empName}>{empForm.name}</span>
                          </div>
                          <span className={styles.empMeta}>
                            Code: <strong>{empForm.employee_code}</strong> • {empForm.designation}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className={styles.removeEmpBtn}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setIsDetailsLocked(!isDetailsLocked)}
                          >
                            {isDetailsLocked ? <Unlock size={12} /> : <Lock size={12} />}
                            {isDetailsLocked ? 'Unlock Details' : 'Lock Details'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={handleClearSelectedEmployee}
                          >
                            Reset Selection
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Employee Form Fields */}
                    <div className={styles.formGrid}>
                      <div className={styles.inputGroup}>
                        <label htmlFor="employee_code">Employee Code *</label>
                        <input
                          id="employee_code"
                          type="text"
                          placeholder="e.g. EMP102"
                          value={empForm.employee_code}
                          onChange={(e) => setEmpForm(prev => ({ ...prev, employee_code: e.target.value }))}
                          disabled={isDetailsLocked || submitting}
                          required
                        />
                      </div>

                      <div className={styles.inputGroup}>
                        <label htmlFor="name">Full Name *</label>
                        <input
                          id="name"
                          type="text"
                          placeholder="e.g. Alice Smith"
                          value={empForm.name}
                          onChange={(e) => setEmpForm(prev => ({ ...prev, name: e.target.value }))}
                          disabled={isDetailsLocked || submitting}
                          required
                        />
                      </div>

                      <div className={styles.inputGroup}>
                        <label htmlFor="branch_id">Branch *</label>
                        <select
                          id="branch_id"
                          value={empForm.branch_id}
                          onChange={(e) => setEmpForm(prev => ({ ...prev, branch_id: e.target.value }))}
                          disabled={isDetailsLocked || submitting}
                          required
                        >
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.inputGroup}>
                        <label htmlFor="designation">Designation *</label>
                        <input
                          id="designation"
                          type="text"
                          placeholder="e.g. HR Executive"
                          value={empForm.designation}
                          onChange={(e) => setEmpForm(prev => ({ ...prev, designation: e.target.value }))}
                          disabled={isDetailsLocked || submitting}
                          required
                        />
                      </div>

                      <div className={styles.inputGroup}>
                        <label htmlFor="mobile">Mobile Number *</label>
                        <input
                          id="mobile"
                          type="text"
                          placeholder="e.g. +1 555-8888"
                          value={empForm.mobile}
                          onChange={(e) => setEmpForm(prev => ({ ...prev, mobile: e.target.value }))}
                          disabled={isDetailsLocked || submitting}
                          required
                        />
                      </div>

                      <div className={styles.inputGroup}>
                        <label htmlFor="email">Email Address *</label>
                        <input
                          id="email"
                          type="email"
                          placeholder="e.g. alice@company.com"
                          value={empForm.email}
                          onChange={(e) => setEmpForm(prev => ({ ...prev, email: e.target.value }))}
                          disabled={isDetailsLocked || submitting}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Entry mode: BULK EXCEL/CSV SHEET */}
                {entryMode === 'bulk' && (
                  <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Drag and Drop Dropzone */}
                    <div 
                      className={styles.uploadZone}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add(styles.uploadZoneActive); }}
                      onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove(styles.uploadZoneActive); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove(styles.uploadZoneActive);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          const input = fileInputRef.current;
                          if (input) {
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            input.files = dataTransfer.files;
                            // Trigger native change handler
                            const event = { target: input } as React.ChangeEvent<HTMLInputElement>;
                            handleBulkFileChange(event);
                          }
                        }
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloud size={40} className={styles.uploadZoneIcon} />
                      <div className={styles.uploadZoneText}>
                        Drag & drop employee requisition spreadsheet, or <strong>browse files</strong>
                      </div>
                      <div className={styles.uploadZoneSubtext}>
                        Supports Excel (.xlsx, .xls) and CSV files.
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        style={{ display: 'none' }} 
                        accept=".csv, .xlsx, .xls"
                        onChange={handleBulkFileChange}
                      />
                    </div>

                    {/* Download Template & Table Action */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button 
                        type="button" 
                        className={styles.bulkTemplateBtn}
                        onClick={handleDownloadCSVTemplate}
                      >
                        <Download size={14} />
                        Download Requisition CSV Template
                      </button>

                      {bulkEmployees.length > 0 && (
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm btn-danger"
                          onClick={() => setBulkEmployees([])}
                        >
                          Clear Uploaded Data
                        </button>
                      )}
                    </div>

                    {/* Parsed Employees Table Review */}
                    {bulkEmployees.length > 0 && (
                      <div className={styles.sheetTableContainer}>
                        <div className={styles.sheetTableHeader}>
                          <span className={styles.sheetTableCount}>
                            Parsed Requisition list: {bulkEmployees.length} employees
                          </span>
                        </div>
                        <div className={styles.sheetTableBody}>
                          <table>
                            <thead>
                              <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Designation</th>
                                <th>Branch</th>
                                <th>Mobile</th>
                                <th>Email</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bulkEmployees.map((emp) => (
                                <tr key={emp.id}>
                                  <td style={{ fontWeight: 600 }}>{emp.employee_code}</td>
                                  <td>{emp.name}</td>
                                  <td>{emp.designation}</td>
                                  <td>{emp.branch_name}</td>
                                  <td>{emp.mobile}</td>
                                  <td>{emp.email}</td>
                                  <td className={styles.sheetActionsCell}>
                                    <button 
                                      type="button" 
                                      className={styles.sheetIconBtn}
                                      onClick={() => {
                                        setBulkEmployees(prev => prev.filter(r => r.id !== emp.id));
                                      }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 3: SPECIFICATIONS AND ASSETS UPLOADS */}
              <div className={styles.formSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionNumber}>3</div>
                  <h3 className={styles.sectionTitle}>Card Options & Detail Uploads</h3>
                </div>

                <div className={styles.formGrid}>
                  
                  {/* ID CARD OPTIONS */}
                  {(reqCategory === 'id_card' || reqCategory === 'both') && (
                    <div className={`${styles.inputGroup} ${reqCategory === 'id_card' ? styles.formGridFull : ''}`}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IdCard size={15} style={{ color: 'var(--primary)' }} />
                        ID Card Specifications
                      </h4>
                      
                      <div className={styles.inputGroup} style={{ marginBottom: '12px' }}>
                        <label htmlFor="card_type">ID Card Printing Badge Type *</label>
                        <select 
                          id="card_type" 
                          value={cardSpecs.card_type}
                          onChange={(e) => setCardSpecs(prev => ({ ...prev, card_type: e.target.value }))}
                        >
                          <option value="Standard">Standard Card</option>
                          <option value="RFID">RFID Access Card</option>
                          <option value="Smart Card">Smart Chip Card</option>
                          <option value="Temporary">Temporary Visitor Card</option>
                        </select>
                      </div>

                      {/* Photo Asset Upload Zone */}
                      <div className={styles.inputGroup}>
                        <label>Upload Employee Photo (Individual Request Only)</label>
                        {cardSpecs.photo ? (
                          <div className={styles.uploadPreview}>
                            <img src={cardSpecs.photo} alt="Upload Thumb" className={styles.previewThumb} />
                            <div className={styles.previewInfo}>
                              <span className={styles.previewName}>{cardSpecs.photoName}</span>
                              <span className={styles.previewSize}>Loaded</span>
                            </div>
                            <button 
                              type="button" 
                              className={styles.removeFileBtn}
                              onClick={() => setCardSpecs(prev => ({ ...prev, photo: '', photoName: '' }))}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className={styles.uploadZone} 
                            style={{ padding: '16px 12px' }}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add(styles.uploadZoneActive); }}
                            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove(styles.uploadZoneActive); }}
                            onDrop={(e) => handleFileDrop(e, 'photo')}
                            onClick={() => document.getElementById('photoInput')?.click()}
                          >
                            <UploadCloud size={24} className={styles.uploadZoneIcon} />
                            <span style={{ fontSize: '11px', color: 'var(--slate-600)' }}>
                              Drag/Drop photo, or <strong>browse</strong>
                            </span>
                            <input 
                              type="file" 
                              id="photoInput" 
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handleFileChange(e, 'photo')}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* VISITING CARD OPTIONS */}
                  {(reqCategory === 'visiting_card' || reqCategory === 'both') && (
                    <div className={`${styles.inputGroup} ${reqCategory === 'visiting_card' ? styles.formGridFull : ''}`}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CreditCard size={15} style={{ color: '#7c3aed' }} />
                        Visiting Card Specifications
                      </h4>
                      
                      <div className={styles.inputGroup} style={{ marginBottom: '12px' }}>
                        <label htmlFor="quantity">Card Print Quantity *</label>
                        <select 
                          id="quantity" 
                          value={cardSpecs.quantity}
                          onChange={(e) => setCardSpecs(prev => ({ ...prev, quantity: e.target.value }))}
                        >
                          <option value="100">100 Business Cards</option>
                          <option value="200">200 Business Cards</option>
                          <option value="500">500 Business Cards</option>
                          <option value="1000">1000 Business Cards</option>
                        </select>
                      </div>

                      {/* Logo Asset Upload Zone */}
                      <div className={styles.inputGroup}>
                        <label>Upload Corporate Logo (Individual Request Only)</label>
                        {cardSpecs.logo ? (
                          <div className={styles.uploadPreview}>
                            <img src={cardSpecs.logo} alt="Upload Thumb" className={styles.previewThumb} />
                            <div className={styles.previewInfo}>
                              <span className={styles.previewName}>{cardSpecs.logoName}</span>
                              <span className={styles.previewSize}>Loaded</span>
                            </div>
                            <button 
                              type="button" 
                              className={styles.removeFileBtn}
                              onClick={() => setCardSpecs(prev => ({ ...prev, logo: '', logoName: '' }))}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className={styles.uploadZone} 
                            style={{ padding: '16px 12px' }}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add(styles.uploadZoneActive); }}
                            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove(styles.uploadZoneActive); }}
                            onDrop={(e) => handleFileDrop(e, 'logo')}
                            onClick={() => document.getElementById('logoInput')?.click()}
                          >
                            <UploadCloud size={24} className={styles.uploadZoneIcon} />
                            <span style={{ fontSize: '11px', color: 'var(--slate-600)' }}>
                              Drag/Drop logo, or <strong>browse</strong>
                            </span>
                            <input 
                              type="file" 
                              id="logoInput" 
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handleFileChange(e, 'logo')}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* SECTION 4: REQUISITION AUDIT DATA */}
              <div className={styles.formSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionNumber}>4</div>
                  <h3 className={styles.sectionTitle}>Request Requisition Info</h3>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="requested_by">Requested By *</label>
                    <input 
                      id="requested_by" 
                      type="text" 
                      value={cardSpecs.requested_by}
                      onChange={(e) => setCardSpecs(prev => ({ ...prev, requested_by: e.target.value }))}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor="request_date">Requisition Date *</label>
                    <input 
                      id="request_date" 
                      type="date" 
                      value={cardSpecs.request_date}
                      onChange={(e) => setCardSpecs(prev => ({ ...prev, request_date: e.target.value }))}
                      required
                    />
                  </div>

                  <div className={`${styles.inputGroup} ${styles.formGridFull}`}>
                    <label htmlFor="remarks">Additional Instructions / Remarks</label>
                    <textarea 
                      id="remarks" 
                      rows={3} 
                      placeholder="Specify matte/gloss finishes, building authorization details, custom delivery instructions..."
                      value={cardSpecs.remarks}
                      onChange={(e) => setCardSpecs(prev => ({ ...prev, remarks: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className={styles.formActionsWrapper}>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ minWidth: '160px' }}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting Requests...' : 'Submit Requisition'}
                </button>
              </div>

            </form>

            {/* RIGHT SIDE: LIVE PROOFING MOCKUPS (STICKY) */}
            <aside className={styles.previewPanel}>
              <div className={styles.previewCardContainer}>
                <h3 className={styles.mockupPanelTitle}>Real-time Card Proofing</h3>
                
                <div className={styles.mockupsWrapper}>
                  
                  {/* ID CARD MOCKUP BADGE */}
                  {(reqCategory === 'id_card' || reqCategory === 'both') && (
                    <div className={styles.idMockup}>
                      <div className={styles.idMockupHeader}>
                        <div className={styles.idMockupCorp}>CORPORATE BADGE</div>
                        <div className={styles.idMockupTag}>SECURE IDENTIFICATION</div>
                      </div>
                      <div className={styles.idMockupSlot}></div>
                      
                      <div className={styles.idMockupBody}>
                        {/* Chip hologram */}
                        <div className={styles.hologramChip}></div>

                        <div className={styles.idPhotoWrapper}>
                          {cardSpecs.photo ? (
                            <img src={cardSpecs.photo} alt="Preview Avatar" className={styles.idPhoto} />
                          ) : (
                            <div className={styles.idAvatarFallback}>
                              <User size={48} />
                            </div>
                          )}
                        </div>

                        <div className={styles.idEmpName}>
                          {empForm.name || 'EMPLOYEE NAME'}
                        </div>
                        
                        <div className={styles.idEmpRole}>
                          {empForm.designation || 'DESIGNATION / ROLE'}
                        </div>

                        <div className={styles.idEmpDept}>
                          {branches.find(d => String(d.id) === empForm.branch_id)?.name || 'BRANCH'}
                        </div>
                      </div>

                      <div className={styles.idMockupFooter}>
                        <div className={styles.idCodeGroup}>
                          <span className={styles.idCodeLabel}>CODE</span>
                          <span className={styles.idCodeVal}>{empForm.employee_code || 'EMP000'}</span>
                        </div>

                        {/* Barcode mockup */}
                        <div className={styles.idBarcode}>
                          <div className={styles.barcodeLine} style={{ width: '2px' }}></div>
                          <div className={styles.barcodeLine} style={{ width: '1px' }}></div>
                          <div className={styles.barcodeLine} style={{ width: '3px' }}></div>
                          <div className={styles.barcodeLine} style={{ width: '1px' }}></div>
                          <div className={styles.barcodeLine} style={{ width: '2px' }}></div>
                          <div className={styles.barcodeLine} style={{ width: '4px' }}></div>
                          <div className={styles.barcodeLine} style={{ width: '1px' }}></div>
                          <div className={styles.barcodeLine} style={{ width: '2px' }}></div>
                          <div className={styles.barcodeLine} style={{ width: '3px' }}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VISITING CARD MOCKUP */}
                  {(reqCategory === 'visiting_card' || reqCategory === 'both') && (
                    <div className={styles.visitingMockup}>
                      <div className={styles.visitingCardHeader}>
                        <div className={styles.visitingLogoContainer}>
                          {cardSpecs.logo ? (
                            <img src={cardSpecs.logo} alt="Corporate Logo" className={styles.visitingLogo} />
                          ) : (
                            <span className={styles.visitingLogoFallback}>
                              <Sparkles size={14} />
                              CORP
                            </span>
                          )}
                        </div>
                        <div className={styles.visitingCardType}>BUSINESS CARD</div>
                      </div>

                      <div className={styles.visitingCardBody}>
                        <div className={styles.visitingEmpName}>
                          {empForm.name || 'Employee Full Name'}
                        </div>
                        <div className={styles.visitingEmpTitle}>
                          {empForm.designation || 'Designation / Title'}
                        </div>
                      </div>

                      <div className={styles.visitingCardFooter}>
                        <div className={styles.visitingContactItem}>
                          <Phone size={10} />
                          <span>{empForm.mobile || '+1 555-0000'}</span>
                        </div>
                        <div className={styles.visitingContactItem}>
                          <Mail size={10} />
                          <span>{empForm.email || 'name@company.com'}</span>
                        </div>
                        <div className={styles.visitingContactItem} style={{ gridColumn: 'span 2' }}>
                          <MapPin size={10} />
                          <span>
                            {branches.find(d => String(d.id) === empForm.branch_id)?.name || 'HQ Branch Office'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </aside>

          </div>
        )}

        {/* TAB 2: REQUEST PIPELINE HISTORY */}
        {!loading && activeTab === 'pipeline' && (
          <div className="fade-in">
            
            {/* SEARCH AND FILTERS */}
            <section className={styles.pipelineFilterBar}>
              <div className={styles.pipelineFilterGrid}>
                
                <div className={styles.inputGroup}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-500)' }}>Search Pipeline</span>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                    <input 
                      type="text" 
                      placeholder="Employee name, code, requestor..." 
                      style={{ paddingLeft: '36px' }}
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-500)' }}>Category</span>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                    <option value="">All Categories</option>
                    <option value="ID Card">ID Card Requests</option>
                    <option value="Visiting Card">Visiting Card Requests</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-500)' }}>Status</span>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending Print</option>
                    <option value="Printed">Printed</option>
                    <option value="Issued">Issued</option>
                  </select>
                </div>

                 <div className={styles.inputGroup}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-500)' }}>Branch</span>
                  <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
                    <option value="">All Branches</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Date Filters & Clear Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={14} style={{ color: 'var(--slate-400)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-500)' }}>Request Date Range:</span>
                  <input 
                    type="date" 
                    value={filterStartDate} 
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    style={{ width: '135px', padding: '6px 10px', fontSize: '12px' }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--slate-400)' }}>to</span>
                  <input 
                    type="date" 
                    value={filterEndDate} 
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    style={{ width: '135px', padding: '6px 10px', fontSize: '12px' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--slate-500)', fontWeight: 500 }}>
                    Found <strong>{filteredPipelineRequests.length}</strong> card requisitions
                  </span>
                  {(filterSearch || filterCategory || filterStatus || filterBranch || filterStartDate || filterEndDate) && (
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setFilterSearch('');
                        setFilterCategory('');
                        setFilterStatus('');
                        setFilterBranch('');
                        setFilterStartDate('');
                        setFilterEndDate('');
                      }}
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* CONSOLIDATED PIPELINE LOG TABLE */}
            <section className={styles.pipelineGridWrapper}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className={styles.pipelineTableTitle}>Consolidated Printing Requests Pipeline</h3>
                {canWrite && (
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => setActiveTab('request')}
                  >
                    <Plus size={14} />
                    New Request
                  </button>
                )}
              </div>

              <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
                {filteredPipelineRequests.length === 0 ? (
                  <div className={styles.noData}>
                    <FileText size={48} strokeWidth={1} style={{ color: 'var(--slate-300)' }} />
                    <p>No card requests found matching your current filter settings.</p>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Req ID</th>
                        <th>Category</th>
                        <th>Employee Details</th>
                        <th>Card Details</th>
                        <th>Request Date</th>
                        <th>Requested By</th>
                        <th>Status</th>
                        <th>Assets</th>
                        {canWrite && <th style={{ textAlign: 'right' }}>Workflow / Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPipelineRequests.map((req) => {
                        const parsed = parseRequestRemarks(req.remarks);
                        const hasAssets = parsed.photo || parsed.logo;

                        return (
                          <tr key={`${req.category}-${req.id}`}>
                            <td style={{ fontWeight: '700', color: 'var(--slate-500)' }}>#{req.id}</td>
                            <td style={{ fontWeight: 600 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                {req.category === 'ID Card' ? (
                                  <IdCard size={14} style={{ color: 'var(--primary)' }} />
                                ) : (
                                  <CreditCard size={14} style={{ color: '#7c3aed' }} />
                                )}
                                {req.category}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: '600', color: 'var(--slate-900)' }}>{req.employee_name}</span>
                                <span style={{ fontSize: '11px', color: 'var(--slate-400)' }}>
                                  {req.employee_code} • {req.branch_name}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${req.category === 'ID Card' ? 'standard' : 'temp'}`}>
                                {req.details}
                              </span>
                            </td>
                            <td>
                              {req.request_date ? new Date(req.request_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : '-'}
                            </td>
                            <td>{req.requested_by}</td>
                            <td>
                              <span className={`badge ${req.status.toLowerCase()}`}>
                                {req.status}
                              </span>
                            </td>
                            <td>
                              {hasAssets ? (
                                <span 
                                  className="badge issued" 
                                  style={{ padding: '2px 6px', fontSize: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => setViewProofRequest(req)}
                                >
                                  <Eye size={10} />
                                  Proof Loaded
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', color: 'var(--slate-400)' }}>N/A</span>
                              )}
                            </td>
                            {canWrite && (
                              <td style={{ textAlign: 'right' }}>
                                <div className={styles.pipelineActionCell} style={{ justifyContent: 'flex-end' }}>
                                  
                                  {/* Workflow transition buttons */}
                                  {req.status === 'Pending' && (
                                    <button 
                                      className={`${styles.statusTransitionBtn} ${styles.printTransitionBtn}`}
                                      onClick={() => handleUpdateStatus(req, 'Printed')}
                                      title="Mark card as printed"
                                    >
                                      <Printer size={13} />
                                      Print
                                    </button>
                                  )}
                                  {req.status === 'Printed' && (
                                    <button 
                                      className={`${styles.statusTransitionBtn} ${styles.issueTransitionBtn}`}
                                      onClick={() => handleUpdateStatus(req, 'Issued')}
                                      title="Mark card as issued to staff"
                                    >
                                      <CheckCircle size={13} />
                                      Issue
                                    </button>
                                  )}

                                  <button 
                                    className={styles.iconBtn} 
                                    onClick={() => handleOpenEditModal(req)}
                                    title="Edit metadata"
                                  >
                                    <Edit2 size={13} />
                                  </button>

                                  {canDelete && (
                                    <button 
                                      className={`${styles.iconBtn} ${styles.deleteBtn}`}
                                      onClick={() => handleDeleteRequest(req)}
                                      title="Cancel request"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}

                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: STATS ANALYTICS & TRENDS */}
        {!loading && activeTab === 'analytics' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Quick stats grid counters */}
            <section className={styles.portalGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              
              <div className="card" style={{ cursor: 'default' }}>
                <div className={`${styles.iconWrapper} ${styles.idColor}`}>
                  <IdCard size={20} />
                </div>
                <div className={styles.cardDetails}>
                  <span className={styles.cardValue}>{stats.totalIdCards}</span>
                  <span className={styles.cardLabel}>ID Card Requests</span>
                </div>
              </div>

              <div className="card" style={{ cursor: 'default' }}>
                <div className={`${styles.iconWrapper} ${styles.vcColor}`}>
                  <CreditCard size={20} />
                </div>
                <div className={styles.cardDetails}>
                  <span className={styles.cardValue}>{stats.totalVisitingCards}</span>
                  <span className={styles.cardLabel}>Visiting Card Requests</span>
                </div>
              </div>

              <div className="card" style={{ cursor: 'default' }}>
                <div className={`${styles.iconWrapper} ${styles.pendingColor}`}>
                  <Clock size={20} />
                </div>
                <div className={styles.cardDetails}>
                  <span className={styles.cardValue}>{stats.pendingRequests}</span>
                  <span className={styles.cardLabel}>Pending Print Queue</span>
                </div>
              </div>

              <div className="card" style={{ cursor: 'default' }}>
                <div className={`${styles.iconWrapper} ${styles.printedColor}`}>
                  <Printer size={20} />
                </div>
                <div className={styles.cardDetails}>
                  <span className={styles.cardValue}>{stats.printedRequests}</span>
                  <span className={styles.cardLabel}>Printed Ready Cards</span>
                </div>
              </div>

              <div className="card" style={{ cursor: 'default' }}>
                <div className={`${styles.iconWrapper} ${styles.issuedColor}`}>
                  <CheckCircle size={20} />
                </div>
                <div className={styles.cardDetails}>
                  <span className={styles.cardValue}>{stats.issuedRequests}</span>
                  <span className={styles.cardLabel}>Issued to Employees</span>
                </div>
              </div>

            </section>

            {/* Recharts Analytics Trends */}
            <section className={styles.chartsSection}>
              {/* Line chart monthly stats */}
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <h3 className={styles.chartTitle}>
                    <TrendingUp size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom', color: 'var(--primary)' }} />
                    Card Request Monthly Trends
                  </h3>
                  <p className={styles.chartSubtitle}>Comparison of card requisitions over the last 6 months</p>
                </div>
                <div className={styles.chartBody}>
                  {monthlyStats.length === 0 ? (
                    <div className={styles.chartLoading}>No statistical data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyStats} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }} />
                        <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                        <Line type="monotone" dataKey="idCards" name="ID Cards" stroke="#2563eb" strokeWidth={3} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="visitingCards" name="Visiting Cards" stroke="#7c3aed" strokeWidth={3} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Bar chart branches stats */}
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <h3 className={styles.chartTitle}>
                    <Award size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom', color: '#7c3aed' }} />
                    Branch Distribution
                  </h3>
                  <p className={styles.chartSubtitle}>Total card requisitions categorized by organizational branches</p>
                </div>
                <div className={styles.chartBody}>
                  {branchStats.length === 0 ? (
                    <div className={styles.chartLoading}>No statistical data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={branchStats} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="branch" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }} />
                        <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                        <Bar dataKey="idCards" name="ID Cards" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="visitingCards" name="Visiting Cards" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </section>

          </div>
        )}

        {/* MODAL 1: VIEW PROOF CARD PREVIEW */}
        <Modal 
          isOpen={viewProofRequest !== null} 
          onClose={() => setViewProofRequest(null)} 
          title={`Digital Proof Requisition #${viewProofRequest?.id} (${viewProofRequest?.employee_name})`}
        >
          {viewProofRequest && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.modalProofContainer}>
                
                {/* Render ID badge proof */}
                {viewProofRequest.category === 'ID Card' && (
                  <div className={styles.idMockup}>
                    <div className={styles.idMockupHeader}>
                      <div className={styles.idMockupCorp}>CORPORATE BADGE</div>
                      <div className={styles.idMockupTag}>SECURE IDENTIFICATION</div>
                    </div>
                    <div className={styles.idMockupSlot}></div>
                    
                    <div className={styles.idMockupBody}>
                      <div className={styles.hologramChip}></div>

                      <div className={styles.idPhotoWrapper}>
                        {parseRequestRemarks(viewProofRequest.remarks).photo ? (
                          <img 
                            src={parseRequestRemarks(viewProofRequest.remarks).photo} 
                            alt="Employee photo" 
                            className={styles.idPhoto} 
                          />
                        ) : (
                          <div className={styles.idAvatarFallback}>
                            <User size={48} />
                          </div>
                        )}
                      </div>

                      <div className={styles.idEmpName}>{viewProofRequest.employee_name}</div>
                      <div className={styles.idEmpRole}>ID BADGE PRINT</div>
                      <div className={styles.idEmpDept}>{viewProofRequest.branch_name}</div>
                    </div>

                    <div className={styles.idMockupFooter}>
                      <div className={styles.idCodeGroup}>
                        <span className={styles.idCodeLabel}>CODE</span>
                        <span className={styles.idCodeVal}>{viewProofRequest.employee_code}</span>
                      </div>
                      
                      <div className={styles.idBarcode}>
                        <div className={styles.barcodeLine} style={{ width: '2px' }}></div>
                        <div className={styles.barcodeLine} style={{ width: '1px' }}></div>
                        <div className={styles.barcodeLine} style={{ width: '3px' }}></div>
                        <div className={styles.barcodeLine} style={{ width: '1px' }}></div>
                        <div className={styles.barcodeLine} style={{ width: '2px' }}></div>
                        <div className={styles.barcodeLine} style={{ width: '4px' }}></div>
                        <div className={styles.barcodeLine} style={{ width: '1px' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Render Visiting card business proof */}
                {viewProofRequest.category === 'Visiting Card' && (
                  <div className={styles.visitingMockup}>
                    <div className={styles.visitingCardHeader}>
                      <div className={styles.visitingLogoContainer}>
                        {parseRequestRemarks(viewProofRequest.remarks).logo ? (
                          <img 
                            src={parseRequestRemarks(viewProofRequest.remarks).logo} 
                            alt="Logo" 
                            className={styles.visitingLogo} 
                          />
                        ) : (
                          <span className={styles.visitingLogoFallback}>
                            <Sparkles size={14} />
                            CORP
                          </span>
                        )}
                      </div>
                      <div className={styles.visitingCardType}>BUSINESS CARD</div>
                    </div>

                    <div className={styles.visitingCardBody}>
                      <div className={styles.visitingEmpName}>{viewProofRequest.employee_name}</div>
                      <div className={styles.visitingEmpTitle}>COMPANY EXECUTIVE</div>
                    </div>

                    <div className={styles.visitingCardFooter}>
                      <div className={styles.visitingContactItem}>
                        <Phone size={10} />
                        <span>Corporate Office Contact</span>
                      </div>
                      <div className={styles.visitingContactItem}>
                        <Mail size={10} />
                        <span>Work Email Registered</span>
                      </div>
                      <div className={styles.visitingContactItem} style={{ gridColumn: 'span 2' }}>
                        <MapPin size={10} />
                        <span>{viewProofRequest.branch_name} Branch Office</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Show text comments */}
              <div className={styles.remarksInfo}>
                <strong>Auditor Comments:</strong> {parseRequestRemarks(viewProofRequest.remarks).notes || 'No remarks provided.'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className="btn btn-secondary" onClick={() => setViewProofRequest(null)}>
                  Close Proof
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* MODAL 2: EDIT METADATA FORM */}
        <Modal 
          isOpen={editingRequest !== null} 
          onClose={() => setEditingRequest(null)} 
          title={`Edit Card Request Requisition Metadata (#${editingRequest?.id})`}
        >
          {editingRequest && (
            <form onSubmit={handleSaveEditRequest}>
              <div className={styles.formGrid}>
                {editingRequest.category === 'ID Card' ? (
                  <div className={styles.inputGroup}>
                    <label htmlFor="edit_card_type">ID Card Badge Type *</label>
                    <select 
                      id="edit_card_type" 
                      value={editForm.card_type}
                      onChange={(e) => setEditForm(prev => ({ ...prev, card_type: e.target.value }))}
                      required
                    >
                      <option value="Standard">Standard Card</option>
                      <option value="RFID">RFID Access Card</option>
                      <option value="Smart Card">Smart Chip Card</option>
                      <option value="Temporary">Temporary Visitor Card</option>
                    </select>
                  </div>
                ) : (
                  <div className={styles.inputGroup}>
                    <label htmlFor="edit_quantity">Card Print Quantity *</label>
                    <select 
                      id="edit_quantity" 
                      value={editForm.quantity}
                      onChange={(e) => setEditForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 100 }))}
                      required
                    >
                      <option value="100">100 Business Cards</option>
                      <option value="200">200 Business Cards</option>
                      <option value="500">500 Business Cards</option>
                      <option value="1000">1000 Business Cards</option>
                    </select>
                  </div>
                )}

                <div className={styles.inputGroup}>
                  <label htmlFor="edit_status">Workflow Queue Status *</label>
                  <select 
                    id="edit_status" 
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                    required
                  >
                    <option value="Pending">Pending Print</option>
                    <option value="Printed">Printed</option>
                    <option value="Issued">Issued</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="edit_requested_by">Requested By *</label>
                  <input 
                    id="edit_requested_by" 
                    type="text" 
                    value={editForm.requested_by}
                    onChange={(e) => setEditForm(prev => ({ ...prev, requested_by: e.target.value }))}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="edit_request_date">Requisition Date *</label>
                  <input 
                    id="edit_request_date" 
                    type="date" 
                    value={editForm.request_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, request_date: e.target.value }))}
                    required
                  />
                </div>

                <div className={`${styles.inputGroup} ${styles.formGridFull}`}>
                  <label htmlFor="edit_remarks">Requisition Comments / Notes</label>
                  <textarea 
                    id="edit_remarks" 
                    rows={3} 
                    placeholder="Enter comments..."
                    value={editForm.remarksText}
                    onChange={(e) => setEditForm(prev => ({ ...prev, remarksText: e.target.value }))}
                  />
                </div>
              </div>

              <div className={styles.formActions} style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingRequest(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </Modal>

      </main>
    </>
  );
}
