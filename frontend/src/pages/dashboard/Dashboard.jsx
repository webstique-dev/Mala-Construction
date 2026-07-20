import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Building2,
  Users,
  Briefcase,
  Hammer,
  CreditCard,
  DollarSign,
  TrendingUp,
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

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const CHART_COLORS = ['var(--color-primary-500)', '#6d28d9', '#16a34a', '#eab308', '#dc2626', '#64748b'];

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

function StatCard({ label, value, format = 'currency' }) {
  const IconComponent = ICON_MAP[label] || Activity;
  const display = format === 'currency' ? formatCurrency(value) : value ?? 0;

  return (
    <div className="stat-card__content">
      <div className="stat-card__header">
        <span className="stat-card__label">{label}</span>
        <div className="stat-card__icon-wrapper">
          <IconComponent size={18} className="stat-card__icon" />
        </div>
      </div>
      <div className="stat-card__body">
        <h3 className="stat-card__value">{display}</h3>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard dashboard--loading">
      <div className="dashboard-skeleton__header">
        <div className="skeleton-line skeleton-line--title" />
        <div className="skeleton-line skeleton-line--subtitle" />
      </div>
      <div className="dashboard__cards">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="dashboard-skeleton__card" />
        ))}
      </div>
      <div className="dashboard__charts">
        <div className="dashboard-skeleton__chart" />
        <div className="dashboard-skeleton__chart" />
      </div>
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
    const handleResize = () => setIsMobile(window.innerWidth < 768);
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

  const hasActiveFilters = Boolean(
    period !== 'month' ||
    siteFilter ||
    startDate ||
    endDate ||
    categoryFilter ||
    statusFilter ||
    searchFilter,
  );

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
    { label: 'Total Expenses', value: cards.totalExpenses },
  ];

  const siteAdminCards = [
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
    { label: 'Total Expenses', value: cards.totalExpenses },
  ];

  const cardItems = isSuperAdmin ? superAdminCards : siteAdminCards;
  const trendData = charts?.monthlyTrend ?? [];
  const breakdownData = charts?.expenseBreakdown ?? [];
  const sitePerformance = charts?.sitePerformance ?? [];

  return (
    <div className="dashboard">
      <div className="dashboard__header-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div className="dashboard__info-header">
          <h1>{isSuperAdmin ? 'Company Overview' : 'Site Performance'}</h1>
          <p>Real-time construction financial analytics and metrics</p>
        </div>
      </div>

      {/* Advanced Dashboard Filter Bar */}
      {/* <Card className="reports-page__filter-card" style={{ padding: 'var(--space-md)' }}>
        {isMobile ? (
          <div className="dashboard__mobile-filter-row">
            <div className="dashboard__mobile-search">
              <input
                id="mobile-search-input"
                type="text"
                className="form-input"
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Search size={16} />
            </div>
            <Button variant="secondary" onClick={openFilterDrawer}>
              <Filter size={16} /> Filter
            </Button>
          </div>
        ) : (
          <>
            <div className="dashboard__filter-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3xs)' }}>
                <label htmlFor="period-selector" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)' }}>Period Range</label>
                <select
                  id="period-selector"
                  className="form-select"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  style={{ minWidth: 150 }}
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {period === 'custom' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3xs)' }}>
                    <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)' }}>Start Date</label>
                    <DatePickerInput value={startDate} onChange={setStartDate} placeholder="From Date" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3xs)' }}>
                    <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)' }}>End Date</label>
                    <DatePickerInput value={endDate} onChange={setEndDate} placeholder="To Date" />
                  </div>
                </>
              )}

              {isSuperAdmin && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3xs)' }}>
                  <label htmlFor="site-selector" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)' }}>Project Site</label>
                  <select
                    id="site-selector"
                    className="form-select"
                    value={siteFilter}
                    onChange={(e) => setSiteFilter(e.target.value)}
                    style={{ minWidth: 200 }}
                  >
                    <option value="">All Project Sites</option>
                    {activeSites.data?.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3xs)' }}>
                <label htmlFor="category-selector" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)' }}>Category / Profession</label>
                <select
                  id="category-selector"
                  className="form-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{ minWidth: 200 }}
                >
                  <option value="">All Categories</option>
                  <optgroup label="Professions">
                    <option value="Construction Laborers">Construction Laborers</option>
                    <option value="Masons/Bricklayers">Masons/Bricklayers</option>
                    <option value="Carpenters">Carpenters</option>
                    <option value="Electricians">Electricians</option>
                    <option value="Plumbers">Plumbers</option>
                    <option value="Painters">Painters</option>
                    <option value="Tile Workers">Tile Workers</option>
                    <option value="Welders">Welders</option>
                    <option value="Steel Fixers">Steel Fixers</option>
                    <option value="Helpers">Helpers</option>
                  </optgroup>
                  <optgroup label="Material Categories">
                    {materialCategories.data?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </optgroup>
                  <optgroup label="Expense Heads">
                    {expenseCategories.data?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </optgroup>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3xs)' }}>
                <label htmlFor="status-selector" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)' }}>Status</label>
                <select
                  id="status-selector"
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ minWidth: 150 }}
                >
                  <option value="">All Statuses</option>
                  <option value="paid">Paid (Wages)</option>
                  <option value="pending">Pending (Wages)</option>
                  <option value="approved">Approved (Expenses)</option>
                  <option value="rejected">Rejected (Expenses)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3xs)', flex: 1, minWidth: 200 }}>
                <label htmlFor="search-input" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)' }}>Search</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="search-input"
                    type="text"
                    className="form-input"
                    placeholder="Search..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    style={{ paddingRight: 32 }}
                  />
                  <Search size={16} style={{ position: 'absolute', right: 10, top: 12, opacity: 0.4 }} />
                </div>
              </div>

              <div className="dashboard__filter-actions">
                <Button variant="secondary" onClick={() => handleClearFilters()}>
                  Reset Filters
                </Button>
              </div>
            </div>

            <div className="dashboard__filter-meta">
              <span className={`dashboard__status-pill ${isFetching ? 'dashboard__status-pill--loading' : ''}`}>
                {isFetching ? 'Refreshing dashboard…' : 'Live data'}
              </span>
              {hasActiveFilters && <span className="dashboard__status-pill dashboard__status-pill--secondary">Filtered view</span>}
            </div>
          </>
        )}
      </Card> */}

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

          {/* <div className="dashboard__drawer-field">
            <label htmlFor="mobile-category-selector" className="dashboard__drawer-label">Category / Profession</label>
            <select
              id="mobile-category-selector"
              className="form-select"
              value={draftFilters.categoryFilter}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, categoryFilter: e.target.value }))}
            >
              <option value="">All Categories</option>
              <optgroup label="Professions">
                <option value="Construction Laborers">Construction Laborers</option>
                <option value="Masons/Bricklayers">Masons/Bricklayers</option>
                <option value="Carpenters">Carpenters</option>
                <option value="Electricians">Electricians</option>
                <option value="Plumbers">Plumbers</option>
                <option value="Painters">Painters</option>
                <option value="Tile Workers">Tile Workers</option>
                <option value="Welders">Welders</option>
                <option value="Steel Fixers">Steel Fixers</option>
                <option value="Helpers">Helpers</option>
              </optgroup>
              <optgroup label="Material Categories">
                {materialCategories.data?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </optgroup>
              <optgroup label="Expense Heads">
                {expenseCategories.data?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </optgroup>
            </select>
          </div> */}

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

      <div className="dashboard__cards-grid">
        {cardItems.map((c, index) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.3 }}
          >
            <Card className="stat-card">
              <StatCard label={c.label} value={c.value} format={c.format} />
            </Card>
          </motion.div>
        ))}
      </div>

      {isFetching && !isLoading && (
        <div className="dashboard__loading-banner">Updating dashboard results…</div>
      )}

      <div className="dashboard__charts-grid">
        <Card className="chart-panel">
          <div className="chart-panel__header">
            <h3>Expense Trend Analysis</h3>
          </div>
          {trendData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trendData} margin={{ top: 18, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMaterials" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary-500)" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="var(--color-primary-500)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPayments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6d28d9" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="#6d28d9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
                <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ paddingBottom: 15 }} />
                <Area type="monotone" dataKey="materials" name="Materials" stroke="var(--color-primary-500)" strokeWidth={2} fill="url(#colorMaterials)" />
                <Area type="monotone" dataKey="payments" name="Payments" stroke="#6d28d9" strokeWidth={2} fill="url(#colorPayments)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#16a34a" strokeWidth={2} fill="url(#colorExpenses)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="dashboard__empty-state">No trend data available for the selected filters.</div>
          )}
        </Card>

        <Card className="chart-panel">
          <div className="chart-panel__header">
            <h3>Expense Allocation</h3>
          </div>
          {breakdownData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={breakdownData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                >
                  {breakdownData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend verticalAlign="bottom" align="center" iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sitePerformance} margin={{ top: 18, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
                  <Bar dataKey="value" fill="var(--color-primary-500)" radius={[6, 6, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="dashboard__empty-state">No site performance data is available for these filters.</div>
            )}
          </Card>
        )}
      </div>

      <div className="dashboard__activity-layout">
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
                <h3>Recent Wage Payments</h3>
              </div>
              {recent?.payments?.length ? (
                <div className="activity-panel__list">
                  {recent.payments.map((p) => (
                    <div className="activity-panel__item activity-panel__item--row" key={p._id}>
                      <div className="activity-panel__info">
                        <p className="activity-panel__text"><strong>{p.worker?.name}</strong></p>
                        <span className="activity-panel__time">{p.site?.name}</span>
                      </div>
                      <span className="activity-panel__amount activity-panel__amount--success">{formatCurrency(p.netSalary)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="activity-panel__empty">No payments logged.</p>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
