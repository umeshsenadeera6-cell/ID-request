'use client';

import React, { useEffect, useState } from 'react';
import { 
  IdCard, 
  CreditCard, 
  Clock, 
  Printer, 
  CheckCircle,
  TrendingUp,
  Award
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
import Link from 'next/link';
import Header from '@/components/Header';
import styles from './dashboard.module.css';

interface SummaryData {
  totalIdCards: number;
  totalVisitingCards: number;
  pendingRequests: number;
  printedRequests: number;
  issuedRequests: number;
  totalRequests: number;
}

interface MonthlyStat {
  month: string;
  idCards: number;
  visitingCards: number;
}

interface DepartmentStat {
  department: string;
  idCards: number;
  visitingCards: number;
}

interface RecentRequest {
  id: number;
  category: 'ID Card' | 'Visiting Card';
  employee_name: string;
  employee_code: string;
  department_name: string;
  details: string;
  date: string;
  status: 'Pending' | 'Printed' | 'Issued';
}

interface DashboardState {
  summary: SummaryData;
  monthlyStats: MonthlyStat[];
  departmentStats: DepartmentStat[];
  recentRequests: RecentRequest[];
}

const initialSummary: SummaryData = {
  totalIdCards: 0,
  totalVisitingCards: 0,
  pendingRequests: 0,
  printedRequests: 0,
  issuedRequests: 0,
  totalRequests: 0
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardState>({
    summary: initialSummary,
    monthlyStats: [],
    departmentStats: [],
    recentRequests: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to fetch dashboard data.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Header 
        title="Dashboard" 
        subtitle="ID & Visiting Card requests overview, trends, and department analytics." 
      />

      <main className="main-content fade-in">
        {error && (
          <div className="badge pending" style={{ padding: '12px 18px', width: '100%', marginBottom: '10px' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Stats Summary Cards */}
        <section className={styles.statsGrid}>
          {/* Card 1: ID Card Requests */}
          <div className={styles.card}>
            <div className={`${styles.iconWrapper} ${styles.idColor}`}>
              <IdCard size={22} />
            </div>
            <div className={styles.cardDetails}>
              <span className={styles.cardValue}>{loading ? '...' : data.summary.totalIdCards}</span>
              <span className={styles.cardLabel}>ID Card Requests</span>
            </div>
          </div>

          {/* Card 2: Visiting Card Requests */}
          <div className={styles.card}>
            <div className={`${styles.iconWrapper} ${styles.vcColor}`}>
              <CreditCard size={22} />
            </div>
            <div className={styles.cardDetails}>
              <span className={styles.cardValue}>{loading ? '...' : data.summary.totalVisitingCards}</span>
              <span className={styles.cardLabel}>Visiting Cards</span>
            </div>
          </div>

          {/* Card 3: Pending Requests */}
          <div className={styles.card}>
            <div className={`${styles.iconWrapper} ${styles.pendingColor}`}>
              <Clock size={22} />
            </div>
            <div className={styles.cardDetails}>
              <span className={styles.cardValue}>{loading ? '...' : data.summary.pendingRequests}</span>
              <span className={styles.cardLabel}>Pending Print</span>
            </div>
          </div>

          {/* Card 4: Printed Requests */}
          <div className={styles.card}>
            <div className={`${styles.iconWrapper} ${styles.printedColor}`}>
              <Printer size={22} />
            </div>
            <div className={styles.cardDetails}>
              <span className={styles.cardValue}>{loading ? '...' : data.summary.printedRequests}</span>
              <span className={styles.cardLabel}>Printed Cards</span>
            </div>
          </div>

          {/* Card 5: Issued Requests */}
          <div className={styles.card}>
            <div className={`${styles.iconWrapper} ${styles.issuedColor}`}>
              <CheckCircle size={22} />
            </div>
            <div className={styles.cardDetails}>
              <span className={styles.cardValue}>{loading ? '...' : data.summary.issuedRequests}</span>
              <span className={styles.cardLabel}>Issued to Staff</span>
            </div>
          </div>
        </section>

        {/* Charts Section */}
        <section className={styles.chartsSection}>
          {/* Monthly Request Trends */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>
                <TrendingUp size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom', color: 'var(--primary)' }} />
                Monthly Trends
              </h2>
              <p className={styles.chartSubtitle}>Volume comparison for the last 6 months</p>
            </div>
            <div className={styles.chartBody}>
              {loading ? (
                <div className={styles.chartLoading}>Loading trends...</div>
              ) : data.monthlyStats.length === 0 ? (
                <div className={styles.chartLoading}>No monthly data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.monthlyStats}
                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="idCards" 
                      name="ID Cards" 
                      stroke="#2563eb" 
                      strokeWidth={3} 
                      activeDot={{ r: 6 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="visitingCards" 
                      name="Visiting Cards" 
                      stroke="#7c3aed" 
                      strokeWidth={3} 
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Department breakdown */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>
                <Award size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom', color: '#7c3aed' }} />
                Department Breakdown
              </h2>
              <p className={styles.chartSubtitle}>Card request distribution across departments</p>
            </div>
            <div className={styles.chartBody}>
              {loading ? (
                <div className={styles.chartLoading}>Loading departments...</div>
              ) : data.departmentStats.length === 0 ? (
                <div className={styles.chartLoading}>No department data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.departmentStats}
                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="department" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                    <Bar dataKey="idCards" name="ID Cards" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="visitingCards" name="Visiting Cards" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>
        {/* Recent Requisitions Section */}
        {!loading && data.recentRequests && data.recentRequests.length > 0 && (
          <section className={styles.recentSection}>
            <div className={styles.recentCard}>
              <div className={styles.recentHeader}>
                <h2 className={styles.recentTitle}>
                  <Clock size={18} style={{ color: 'var(--primary)', verticalAlign: 'text-bottom' }} />
                  Recent Requisitions
                </h2>
                <Link href="/id-requests" className="btn btn-secondary btn-sm">
                  View All Requests
                </Link>
              </div>
              <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
                <table style={{ minWidth: '100%' }}>
                  <thead>
                    <tr>
                      <th>Req ID</th>
                      <th>Category</th>
                      <th>Employee Details</th>
                      <th>Card Details</th>
                      <th>Request Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentRequests.map((req) => (
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
                              {req.employee_code} • {req.department_name}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="badge standard">{req.details}</span>
                        </td>
                        <td>
                          {req.date ? new Date(req.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : '-'}
                        </td>
                        <td>
                          <span className={`badge ${req.status.toLowerCase()}`}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
