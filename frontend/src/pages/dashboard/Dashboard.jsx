import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Building2,
  Users,
  Briefcase,
  Hammer,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Layers,
  Search,
  Filter,
} from 'lucide-react';
import Drawer from '../../components/drawers/Drawer';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboard } from '../../hooks/useDashboard';
import { useLookups } from '../../hooks/useLookups';
import { ROLES } from '../../constants';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import './Dashboard.css';
import Card from '../../components/ui/Card';
import DatePickerInput from '../../components/ui/DatePickerInput';
import Button from '../../components/common/Button';

// Register Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ICON_MAP = {
  'Total Sites': Building2,
  'Active Sites': Building2,
  'Site Admins': Users,
  'Total Workers': Briefcase,
  'Workers Present Today': Users,
  'Today Labour Expense': DollarSign,
  'Weekly Labour Expense': Calendar,
  'Monthly Labour Expense': Briefcase,
  'Material Cost': Hammer,
  'Worker Payments': CreditCard,
  'Other Expenses': DollarSign,
  'Total Expenses': DollarSign,
  'Monthly Expenses': DollarSign,
  "Today's Purchases": Hammer,
  'Monthly Purchases': DollarSign,
  'Pending Payments': CreditCard,
};

const MOCK_BADGES = ['+2.08%', '+12.4%', '-2.08%', '+12.1%', '+5.34%', '+1.8%', '+2.3%', '-1.04%'];

function StatCard({ label, value, format = 'currency', isFeatured = false, badgeIndex = 0 }) {
  const IconComponent = ICON_MAP[label] || Activity;
  const display = format === 'currency' ? formatCurrency(value) : value ?? 0;
  const badgeText = MOCK_BADGES[badgeIndex % MOCK_BADGES.length];
  const isNegative = badgeText.startsWith('-');

  return (
    <div className={`stat-card__content ${isFeatured ? 'stat-card__content--featured' : ''}`}>
      <div className="stat-card__top">
        <div className="stat-card__icon-wrapper">
          <IconComponent size={20} className="stat-card__icon" />
        </div>
        <span className={`stat-card__badge ${isNegative ? 'stat-card__badge--negative' : 'stat-card__badge--positive'}`}>
          {isNegative ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
          {badgeText}
        </span>
      </div>

      <div className="stat-card__body">
        <span className="stat-card__label">{label}</span>
        <h3 className="stat-card__value">{display}</h3>
      </div>
    </div>
  );
}

import { Skeleton, CardSkeleton, ChartSkeleton, TableSkeleton } from '../../components/ui/Skeleton';

function DashboardSkeleton() {
  return (
    <div className="dashboard dashboard--loading">
      <div className="dashboard__info-header" style={{ marginBottom: 24 }}>
        <Skeleton width="220px" height="28px" style={{ marginBottom: 8 }} />
        <Skeleton width="340px" height="14px" />
      </div>
      <div className="dashboard__cards-grid" style={{ marginBottom: 24 }}>
        <CardSkeleton count={8} />
      </div>
      <div className="dashboard__charts-grid" style={{ marginBottom: 24 }}>
        <ChartSkeleton type="line" />
        <ChartSkeleton type="doughnut" />
      </div>
      <TableSkeleton rows={5} columns={5} />
    </div>
  );
}

export default function Dashboard() {
  const { role } = useAuth();
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const [period, setPeriod] = useState('month');
  const [siteFilter, setSiteFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState({
    period: 'month',
    siteFilter: '',
    startDate: '',
    endDate: '',
    categoryFilter: '',
    statusFilter: '',
    searchInput: '',
  });

  const { activeSites, expenseCategories, materialCategories } = useLookups();
  const dashboardParams = useMemo(() => ({
    period,
    siteId: isSuperAdmin ? siteFilter || undefined : undefined,
    startDate: period === 'custom' ? startDate || undefined : undefined,
    endDate: period === 'custom' ? endDate || undefined : undefined,
    category: categoryFilter || undefined,
    status: statusFilter || undefined,
    search: searchFilter || undefined,
  }), [categoryFilter, endDate, isSuperAdmin, period, searchFilter, siteFilter, startDate, statusFilter]);

  const { data, isLoading, isError, isFetching } = useDashboard(dashboardParams);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchFilter(searchInput);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const openFilterDrawer = () => {
    setDraftFilters({
      period,
      siteFilter,
      startDate,
      endDate,
      categoryFilter,
      statusFilter,
      searchInput,
    });
    setIsFilterDrawerOpen(true);
  };

  const handleApplyFilters = () => {
    setPeriod(draftFilters.period);
    setSiteFilter(draftFilters.siteFilter);
    setStartDate(draftFilters.startDate);
    setEndDate(draftFilters.endDate);
    setCategoryFilter(draftFilters.categoryFilter);
    setStatusFilter(draftFilters.statusFilter);
    setSearchInput(draftFilters.searchInput);
    setSearchFilter(draftFilters.searchInput);
    setIsFilterDrawerOpen(false);
  };

  const handleClearFilters = (closeDrawer = false) => {
    setPeriod('month');
    setSiteFilter('');
    setStartDate('');
    setEndDate('');
    setCategoryFilter('');
    setStatusFilter('');
    setSearchInput('');
    setSearchFilter('');
    setDraftFilters({
      period: 'month',
      siteFilter: '',
      startDate: '',
      endDate: '',
      categoryFilter: '',
      statusFilter: '',
      searchInput: '',
    });
    if (closeDrawer) setIsFilterDrawerOpen(false);
  };

  if (isLoading && !data) return <DashboardSkeleton />;
  if (isError) {
    return (
      <div className="dashboard-error-state">
        <div className="dashboard-error-state__content">
          <h2>Failed to load dashboard</h2>
          <p>We ran into a problem loading your operational metrics. Please reload the page.</p>
        </div>
      </div>
    );
  }

  const { cards = {}, charts = {}, recent = {} } = data || {};

  const superAdminCards = [
    { label: 'Total Expenses', value: cards.totalExpenses },
    { label: 'Total Sites', value: cards.totalSites, format: 'number' },
    { label: 'Active Sites', value: cards.activeSites, format: 'number' },
    { label: 'Site Admins', value: cards.siteAdmins, format: 'number' },
    { label: 'Total Workers', value: cards.totalWorkers, format: 'number' },
    { label: 'Workers Present Today', value: cards.todayWorkersPresent, format: 'number' },
    { label: 'Today Labour Expense', value: cards.todayLabourExpense },
    { label: 'Weekly Labour Expense', value: cards.weeklyLabourExpense },
    { label: 'Monthly Labour Expense', value: cards.monthlyLabourExpense },
    { label: 'Material Cost', value: cards.totalMaterialCost },
    { label: 'Worker Payments', value: cards.totalWorkerPayments },
    { label: 'Other Expenses', value: cards.totalOtherExpenses },
  ];

  const siteAdminCards = [
    { label: 'Total Expenses', value: cards.totalExpenses },
    { label: 'Workers Present Today', value: cards.todayWorkersPresent, format: 'number' },
    { label: 'Today Labour Expense', value: cards.todayLabourExpense },
    { label: 'Weekly Labour Expense', value: cards.weeklyLabourExpense },
    { label: 'Monthly Labour Expense', value: cards.monthlyLabourExpense },
    { label: "Today's Purchases", value: cards.todayPurchases },
    { label: 'Monthly Purchases', value: cards.monthlyPurchases },
    { label: 'Total Workers', value: cards.totalWorkers, format: 'number' },
    { label: 'Worker Payments', value: cards.workerPayments },
    { label: 'Other Expenses', value: cards.otherExpenses },
    { label: 'Pending Payments', value: cards.pendingPayments, format: 'number' },
  ];

  const cardItems = isSuperAdmin ? superAdminCards : siteAdminCards;
  const trendData = charts?.monthlyTrend ?? [];
  const breakdownData = charts?.expenseBreakdown ?? [];
  const sitePerformance = charts?.sitePerformance ?? [];

  const isSmallScreen = windowWidth < 375;
  const isUltraSmall = windowWidth < 320;

  // --- Chart.js Data & Responsive Options ---
  const lineChartData = {
    labels: trendData.map((d) => d.month),
    datasets: [
      {
        label: 'Materials',
        data: trendData.map((d) => d.materials),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: isSmallScreen ? 3 : 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Payments',
        data: trendData.map((d) => d.payments),
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: isSmallScreen ? 3 : 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Expenses',
        data: trendData.map((d) => d.expenses),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: isSmallScreen ? 3 : 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: isSmallScreen ? 'bottom' : 'top',
        align: isSmallScreen ? 'center' : 'end',
        labels: {
          usePointStyle: true,
          boxWidth: isSmallScreen ? 6 : 8,
          padding: isSmallScreen ? 8 : 12,
          font: { family: 'Inter', size: isSmallScreen ? 10 : 12 },
        },
      },
      tooltip: {
        padding: 8,
        borderRadius: 8,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: 'Inter', size: isSmallScreen ? 9 : 11 },
          color: '#64748b',
          maxRotation: isSmallScreen ? 45 : 0,
        },
      },
      y: {
        grid: { color: 'rgba(226, 232, 240, 0.6)' },
        ticks: {
          font: { family: 'Inter', size: isSmallScreen ? 9 : 11 },
          color: '#64748b',
          callback: (v) => `₹${(v / 1000).toFixed(0)}k`,
        },
      },
    },
  };

  const doughnutData = {
    labels: breakdownData.map((d) => d.name),
    datasets: [
      {
        data: breakdownData.map((d) => d.value),
        backgroundColor: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#64748B'],
        borderWidth: 2,
        borderColor: '#ffffff',
        borderRadius: 6,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: isUltraSmall ? '58%' : isSmallScreen ? '64%' : '72%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          boxWidth: isSmallScreen ? 6 : 8,
          font: { family: 'Inter', size: isSmallScreen ? 10 : 12 },
          padding: isSmallScreen ? 8 : 16,
        },
      },
      tooltip: {
        padding: 8,
        borderRadius: 8,
        callbacks: {
          label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw)}`,
        },
      },
    },
  };

  const barChartData = {
    labels: sitePerformance.map((d) => d.name),
    datasets: [
      {
        label: 'Expenditure',
        data: sitePerformance.map((d) => d.value),
        backgroundColor: '#3B82F6',
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 28,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        padding: 12,
        borderRadius: 12,
        callbacks: {
          label: (ctx) => formatCurrency(ctx.raw),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' },
      },
      y: {
        grid: { color: 'rgba(226, 232, 240, 0.6)' },
        ticks: {
          font: { family: 'Inter', size: 11 },
          color: '#64748b',
          callback: (v) => `₹${(v / 1000).toFixed(0)}k`,
        },
      },
    },
  };

  return (
    <div className="dashboard">
      <div className="dashboard__header-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div className="dashboard__info-header">
          <h1>{isSuperAdmin ? 'Company Overview' : 'Site Performance'}</h1>
          <p>Real-time construction financial analytics and operational metrics</p>
        </div>
      </div>

      <Drawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title="Dashboard Filters"
        size="sm"
        footer={(
          <div className="dashboard__drawer-actions">
            <Button variant="secondary" onClick={() => handleClearFilters(true)}>
              Clear Filters
            </Button>
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </div>
        )}
      >
        <div className="dashboard__drawer-fields">
          <div className="dashboard__drawer-field">
            <label htmlFor="mobile-period-selector" className="dashboard__drawer-label">Period Range</label>
            <select
              id="mobile-period-selector"
              className="form-select"
              value={draftFilters.period}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, period: e.target.value }))}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {draftFilters.period === 'custom' && (
            <>
              <div className="dashboard__drawer-field">
                <label className="dashboard__drawer-label">Start Date</label>
                <DatePickerInput
                  value={draftFilters.startDate}
                  onChange={(value) => setDraftFilters((prev) => ({ ...prev, startDate: value }))}
                  placeholder="From Date"
                />
              </div>
              <div className="dashboard__drawer-field">
                <label className="dashboard__drawer-label">End Date</label>
                <DatePickerInput
                  value={draftFilters.endDate}
                  onChange={(value) => setDraftFilters((prev) => ({ ...prev, endDate: value }))}
                  placeholder="To Date"
                />
              </div>
            </>
          )}

          {isSuperAdmin && (
            <div className="dashboard__drawer-field">
              <label htmlFor="mobile-site-selector" className="dashboard__drawer-label">Project Site</label>
              <select
                id="mobile-site-selector"
                className="form-select"
                value={draftFilters.siteFilter}
                onChange={(e) => setDraftFilters((prev) => ({ ...prev, siteFilter: e.target.value }))}
              >
                <option value="">All Project Sites</option>
                {activeSites.data?.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="dashboard__drawer-field">
            <label htmlFor="mobile-status-selector" className="dashboard__drawer-label">Status</label>
            <select
              id="mobile-status-selector"
              className="form-select"
              value={draftFilters.statusFilter}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, statusFilter: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="paid">Paid (Wages)</option>
              <option value="pending">Pending (Wages)</option>
              <option value="approved">Approved (Expenses)</option>
              <option value="rejected">Rejected (Expenses)</option>
            </select>
          </div>

          <div className="dashboard__drawer-field">
            <label htmlFor="mobile-search-input" className="dashboard__drawer-label">Search</label>
            <div className="dashboard__drawer-search">
              <input
                id="mobile-search-input"
                type="text"
                className="form-input"
                placeholder="Search..."
                value={draftFilters.searchInput}
                onChange={(e) => setDraftFilters((prev) => ({ ...prev, searchInput: e.target.value }))}
              />
              <Search size={16} />
            </div>
          </div>
        </div>
      </Drawer>

      {/* Stat Cards Grid */}
      <div className="dashboard__cards-grid">
        {cardItems.map((c, index) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.3 }}
          >
            <Card className={`stat-card ${index === 0 ? 'stat-card--featured' : ''}`}>
              <StatCard label={c.label} value={c.value} format={c.format} isFeatured={index === 0} badgeIndex={index} />
            </Card>
          </motion.div>
        ))}
      </div>

      {isFetching && !isLoading && (
        <div className="dashboard__loading-banner">Updating dashboard results…</div>
      )}

      {/* Chart.js Panels Grid */}
      <div className="dashboard__charts-grid">
        <Card className="chart-panel">
          <div className="chart-panel__header">
            <h3>Expense Trend Analysis</h3>
          </div>
          {trendData.length ? (
            <div className="chart-panel__canvas-wrapper">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>
          ) : (
            <div className="dashboard__empty-state">No trend data available for the selected filters.</div>
          )}
        </Card>

        <Card className="chart-panel">
          <div className="chart-panel__header">
            <h3>Expense Allocation</h3>
          </div>
          {breakdownData.length ? (
            <div className="chart-panel__canvas-wrapper">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          ) : (
            <div className="dashboard__empty-state">No expense breakdown data is available for these filters.</div>
          )}
        </Card>

        {isSuperAdmin && (
          <Card className="chart-panel chart-panel--wide">
            <div className="chart-panel__header">
              <h3>Top Projects by Expenditure</h3>
            </div>
            {sitePerformance.length ? (
              <div className="chart-panel__canvas-wrapper">
                <Bar data={barChartData} options={barChartOptions} />
              </div>
            ) : (
              <div className="dashboard__empty-state">No site performance data is available for these filters.</div>
            )}
          </Card>
        )}
      </div>

      {/* Activity Logs Section */}
      <div className="dashboard__activity-layout">
        {isSuperAdmin && (
          <>
            <Card className="activity-panel">
              <div className="activity-panel__header">
                <h3>Latest Material Purchases</h3>
              </div>
              {recent?.purchases?.length ? (
                <div className="activity-panel__list">
                  {recent.purchases.map((m) => (
                    <div className="activity-panel__item activity-panel__item--row" key={m._id}>
                      <div className="activity-panel__info">
                        <p className="activity-panel__text"><strong>{m.materialName}</strong></p>
                        <span className="activity-panel__time">{m.site?.name}</span>
                      </div>
                      <span className="activity-panel__amount">{formatCurrency(m.totalAmount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="activity-panel__empty">No purchases logged.</p>
              )}
            </Card>

            <Card className="activity-panel">
              <div className="activity-panel__header">
                <h3>Recent Overhead Expenses</h3>
              </div>
              {recent?.expenses?.length ? (
                <div className="activity-panel__list">
                  {recent.expenses.map((e) => (
                    <div className="activity-panel__item activity-panel__item--row" key={e._id}>
                      <div className="activity-panel__info">
                        <p className="activity-panel__text"><strong>{e.title || e.category?.name || 'Expense Entry'}</strong></p>
                        <span className="activity-panel__time">{e.site?.name || 'All Sites'}</span>
                      </div>
                      <span className="activity-panel__amount">{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="activity-panel__empty">No expenses logged.</p>
              )}
            </Card>
          </>
        )}
        <Card className="activity-panel">
          <div className="activity-panel__header">
            <h3>Recent Operations Logs</h3>
          </div>
          {recent?.activities?.length ? (
            <div className="activity-panel__list">
              {recent.activities.map((a) => (
                <div className="activity-panel__item" key={a._id}>
                  <div className="activity-panel__bullet" />
                  <div className="activity-panel__info">
                    <p className="activity-panel__text">
                      <strong>{a.actor?.name}</strong> {a.action} {a.entityType}
                    </p>
                    <span className="activity-panel__time">{formatDateTime(a.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="activity-panel__empty">No recent logs found.</p>
          )}
        </Card>


      </div>
    </div>
  );
}
