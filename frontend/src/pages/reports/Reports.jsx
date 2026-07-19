import React, { useState, useEffect, useMemo } from 'react';
import {
  Download, Printer, FileText, FileSpreadsheet, Check, Settings, Info,
  ArrowUpDown, ChevronUp, ChevronDown, ShoppingBag, Receipt, CreditCard,
  Layers, Database, Search, Inbox, XCircle, Filter
} from 'lucide-react';
import Select from 'react-select';
import Button from '../../components/common/Button';
import DatePickerInput from '../../components/ui/DatePickerInput';
import { useSiteScope } from '../../hooks/useSiteScope';
import { useLookups } from '../../hooks/useLookups';
import { useWorkers } from '../../hooks/useWorkers';
import { useToast } from '../../contexts/ToastContext';
import { reportService } from '../../services/reportService';
import { formatCurrency, formatDate } from '../../utils/format';
import Card from '../../components/ui/Card';
import AccordionCard from '../../components/ui/AccordionCard';
import Drawer from '../../components/drawers/Drawer';
import './Reports.css';

const REPORT_TYPES = [
  { value: 'monthly', label: 'Monthly Financial Statement' },
  { value: 'daily', label: 'Daily Activity Logs' },
  { value: 'weekly', label: 'Weekly Summary Statement' },
  { value: 'yearly', label: 'Yearly Financial Ledger' },
  { value: 'site', label: 'Project Site Report' },
  { value: 'material', label: 'Material Logistics Report' },
  { value: 'worker', label: 'Worker Attendance Registry' },
  { value: 'payment', label: 'Worker Wages Ledger' },
  { value: 'expense', label: 'Overheads & Expenses Report' },
  { value: 'category', label: 'Category Expenditure Breakdown' },
  { value: 'vendor', label: 'Supplier & Vendor Accounts' },
  { value: 'custom', label: 'Custom Period Breakdown' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'paid', label: 'Paid' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bankTransfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
];

export default function Reports() {
  const [type, setType] = useState('monthly');
  const [siteFilter, setSiteFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [workerFilter, setWorkerFilter] = useState('');
  const [professionFilter, setProfessionFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Sorting state
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination state
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const { isSuperAdmin, siteId } = useSiteScope(siteFilter || undefined);
  const { activeSites, materialCategories, expenseCategories, suppliers, professions } = useLookups(siteId);
  const workers = useWorkers({ limit: 200 });
  const toast = useToast();

  const [reportData, setReportData] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load preview data in real-time as filters or sorting change
  const fetchPreview = async () => {
    setIsLoadingReport(true);
    try {
      const res = await reportService.generate({
        type,
        format: 'json',
        siteId: isSuperAdmin ? siteFilter || undefined : siteId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        paymentMethod: paymentMethodFilter || undefined,
        vendor: vendorFilter || undefined,
        workerId: workerFilter || undefined,
        professionId: professionFilter || undefined,
        search: searchFilter || undefined,
        sortBy,
        sortOrder,
        showDeleted
      });
      setReportData(res);
    } catch (err) {
      toast.error('Failed to update live report metrics preview.');
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchPreview();
    setPage(1); // Reset page on filter adjustments
  }, [
    type, siteFilter, startDate, endDate, categoryFilter, statusFilter,
    paymentMethodFilter, vendorFilter, workerFilter, professionFilter,
    searchFilter, showDeleted, sortBy, sortOrder
  ]);

  // Client side pagination on the same backend data list
  const rows = reportData?.rows || [];
  const totalPages = Math.ceil(rows.length / rowsPerPage);
  const paginatedRows = useMemo(() => {
    return rows.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  }, [rows, page]);

  // React Select Theme Styles integration
  const reactSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: 44,
      borderRadius: 8,
      backgroundColor: 'var(--color-surface)',
      borderColor: state.isFocused ? 'var(--color-primary-500)' : 'var(--color-border)',
      color: 'var(--color-text-primary)',
      fontSize: 'var(--font-size-sm)',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(30, 111, 255, 0.15)' : 'none',
      '&:hover': {
        borderColor: 'var(--color-primary-300)',
      }
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'var(--color-text-primary)',
    }),
    input: (provided) => ({
      ...provided,
      color: 'var(--color-text-primary)',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'var(--color-text-secondary)',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      boxShadow: 'var(--shadow-md)',
      zIndex: 9999,
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? 'var(--color-primary-500)'
        : state.isFocused
          ? 'var(--color-bg)'
          : 'transparent',
      color: state.isSelected
        ? '#ffffff'
        : 'var(--color-text-primary)',
      fontSize: 'var(--font-size-sm)',
      cursor: 'pointer',
    }),
  };

  // Grouped Categories
  const categoryOptions = useMemo(() => {
    return [
      {
        label: 'Material Categories',
        options: materialCategories.data?.map(c => ({ value: c._id, label: `[Material] ${c.name}` })) || []
      },
      {
        label: 'Expense Categories',
        options: expenseCategories.data?.map(c => ({ value: c._id, label: `[Expense] ${c.name}` })) || []
      }
    ];
  }, [materialCategories.data, expenseCategories.data]);

  const siteOptions = activeSites.data?.map(s => ({ value: s._id, label: `${s.name} (${s.code})` })) || [];
  const supplierOptions = suppliers.data?.map(s => ({ value: s._id, label: s.name })) || [];
  const workerOptions = workers.data?.items?.map(w => ({ value: w._id, label: w.name })) || [];
  const professionOptions = professions.data?.map(p => ({ value: p._id, label: p.name })) || [];

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown size={14} style={{ marginLeft: 6, opacity: 0.3 }} />;
    return sortOrder === 'asc'
      ? <ChevronUp size={14} style={{ marginLeft: 6, color: 'var(--color-primary-500)' }} />
      : <ChevronDown size={14} style={{ marginLeft: 6, color: 'var(--color-primary-500)' }} />;
  };

  const handleExport = async (format = 'excel') => {
    if (rows.length === 0) {
      toast.warning('No data available for the selected filters.');
      return;
    }

    setIsExporting(true);
    try {
      const response = await reportService.generate({
        type,
        format,
        siteId: isSuperAdmin ? siteFilter || undefined : siteId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        paymentMethod: paymentMethodFilter || undefined,
        vendor: vendorFilter || undefined,
        workerId: workerFilter || undefined,
        professionId: professionFilter || undefined,
        search: searchFilter || undefined,
        sortBy,
        sortOrder,
        showDeleted
      });

      if (format === 'pdf') {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) printWindow.onload = () => printWindow.print();
        window.URL.revokeObjectURL(url);
        toast.success('PDF report loaded successfully.');
      } else {
        const ext = format === 'excel' ? 'xlsx' : 'csv';
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `${type.charAt(0).toUpperCase() + type.slice(1)}_Report_${dateStr}.${ext}`;

        const blob = new Blob([response.data], { type: response.headers['content-type'] });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);

        toast.success(`${format.toUpperCase()} report exported successfully.`);
      }
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to generate report export.');
    } finally {
      setIsExporting(false);
    }
  };

  const clearAllFilters = () => {
    setSiteFilter('');
    setStartDate('');
    setEndDate('');
    setCategoryFilter('');
    setStatusFilter('');
    setPaymentMethodFilter('');
    setVendorFilter('');
    setWorkerFilter('');
    setProfessionFilter('');
    setSearchFilter('');
    setShowDeleted(false);
    toast.success('Filters cleared.');
  };

  return (
    <div className="reports-page">
      <div className="reports-page__header-section">
        <h1>Audited Financial Reports</h1>
        <p>Analyze company-wide logistics, overhead balances, and employee payouts generated dynamically from MongoDB records.</p>
      </div>

      {/* KPI Summary Cards */}
      <div className="reports-page__summary-cards">
        <div className="reports-page__kpi-card">
          <div className="reports-page__kpi-icon-container"><Layers size={20} /></div>
          <div className="reports-page__kpi-details">
            <span className="reports-page__kpi-label">Filtered Records</span>
            <span className="reports-page__kpi-value">{rows.length}</span>
          </div>
        </div>

        <div className="reports-page__kpi-card">
          <div className="reports-page__kpi-icon-container" style={{ color: 'var(--color-success-500)' }}><ShoppingBag size={20} /></div>
          <div className="reports-page__kpi-details">
            <span className="reports-page__kpi-label">Materials Cost</span>
            <span className="reports-page__kpi-value">{formatCurrency(reportData?.summary?.materialTotal || 0)}</span>
          </div>
        </div>

        <div className="reports-page__kpi-card">
          <div className="reports-page__kpi-icon-container" style={{ color: 'var(--color-warning-500)' }}><CreditCard size={20} /></div>
          <div className="reports-page__kpi-details">
            <span className="reports-page__kpi-label">Wages Paid</span>
            <span className="reports-page__kpi-value">{formatCurrency(reportData?.summary?.paymentTotal || 0)}</span>
          </div>
        </div>

        <div className="reports-page__kpi-card">
          <div className="reports-page__kpi-icon-container" style={{ color: 'var(--color-danger-500)' }}><Receipt size={20} /></div>
          <div className="reports-page__kpi-details">
            <span className="reports-page__kpi-label">Overhead Costs</span>
            <span className="reports-page__kpi-value">{formatCurrency(reportData?.summary?.expenseTotal || 0)}</span>
          </div>
        </div>

        <div className="reports-page__kpi-card" style={{ border: '1px solid var(--color-primary-300)', backgroundColor: 'var(--color-primary-50)' }}>
          <div className="reports-page__kpi-icon-container" style={{ backgroundColor: 'var(--color-primary-500)', color: '#ffffff' }}><Database size={20} /></div>
          <div className="reports-page__kpi-details">
            <span className="reports-page__kpi-label" style={{ color: 'var(--color-primary-700)' }}>Grand Total</span>
            <span className="reports-page__kpi-value" style={{ color: 'var(--color-primary-900)' }}>{formatCurrency(reportData?.summary?.grandTotal || 0)}</span>
          </div>
        </div>
      </div>

      {/* Interactive Filters Panel */}
      {/* Interactive Filters Panel */}
      <Card className="reports-page__filter-card">
        <div className="reports-page__panel-header">
          {/* <Settings size={18} className="reports-page__panel-icon" /> */}
          <h3>Report Query Parameters</h3>
        </div>

        {/* Desktop inline grid */}
        <div className="desktop-only">
          <div className="reports-page__filter-grid">
            <div className="reports-page__field">
              <label htmlFor="rep-search">Search</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="rep-search"
                  type="text"
                  className="form-input"
                  placeholder="Invoice, title, desc..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{ paddingRight: 36, paddingLeft: 36 }}
                />
                <Search size={16} style={{ position: 'absolute', left: 12, opacity: 0.4 }} />
                {searchFilter && (
                  <button
                    type="button"
                    onClick={() => setSearchFilter('')}
                    style={{
                      position: 'absolute',
                      right: 12,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                    aria-label="Clear search"
                  >
                    <XCircle size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="reports-page__field">
              <label>Start Date</label>
              <DatePickerInput value={startDate} onChange={setStartDate} placeholder="From Date" />
            </div>

            <div className="reports-page__field">
              <label>End Date</label>
              <DatePickerInput value={endDate} onChange={setEndDate} placeholder="To Date" />
            </div>

            {isSuperAdmin && (
              <div className="reports-page__field">
                <label>Project Site</label>
                <Select
                  styles={reactSelectStyles}
                  options={siteOptions}
                  value={siteOptions.find(o => o.value === siteFilter) || null}
                  onChange={(opt) => setSiteFilter(opt ? opt.value : '')}
                  isClearable
                  placeholder="All Sites"
                />
              </div>
            )}

            {/* <div className="reports-page__field">
              <label>Category Filter</label>
              <Select
                styles={reactSelectStyles}
                options={categoryOptions}
                value={categoryOptions.flatMap(g => g.options).find(o => o.value === categoryFilter) || null}
                onChange={(opt) => setCategoryFilter(opt ? opt.value : '')}
                isClearable
                placeholder="All Categories"
              />
            </div> */}

            <div className="reports-page__field">
              <label>Status Filter</label>
              <Select
                styles={reactSelectStyles}
                options={STATUS_OPTIONS}
                value={STATUS_OPTIONS.find(o => o.value === statusFilter) || null}
                onChange={(opt) => setStatusFilter(opt ? opt.value : '')}
                isClearable
                placeholder="All Statuses"
              />
            </div>

            <div className="reports-page__field">
              <label htmlFor="rep-type">Report Structure</label>
              <select id="rep-type" className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                {REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="reports-page__field">
              <label>Payment Method</label>
              <Select
                styles={reactSelectStyles}
                options={PAYMENT_METHOD_OPTIONS}
                value={PAYMENT_METHOD_OPTIONS.find(o => o.value === paymentMethodFilter) || null}
                onChange={(opt) => setPaymentMethodFilter(opt ? opt.value : '')}
                isClearable
                placeholder="All Methods"
              />
            </div>

            {/* <div className="reports-page__field">
              <label>Supplier / Vendor</label>
              <Select
                styles={reactSelectStyles}
                options={supplierOptions}
                value={supplierOptions.find(o => o.value === vendorFilter) || null}
                onChange={(opt) => setVendorFilter(opt ? opt.value : '')}
                isClearable
                placeholder="All Suppliers"
              />
            </div> */}

            {/* <div className="reports-page__field">
              <label>Worker / Employee</label>
              <Select
                styles={reactSelectStyles}
                options={workerOptions}
                value={workerOptions.find(o => o.value === workerFilter) || null}
                onChange={(opt) => setWorkerFilter(opt ? opt.value : '')}
                isClearable
                placeholder="All Workers"
              />
            </div> */}

            {/* <div className="reports-page__field">
              <label>Profession</label>
              <Select
                styles={reactSelectStyles}
                options={professionOptions}
                value={professionOptions.find(o => o.value === professionFilter) || null}
                onChange={(opt) => setProfessionFilter(opt ? opt.value : '')}
                isClearable
                placeholder="All Trades"
              />
            </div> */}
          </div>
        </div>

        {/* Mobile simplified header panel */}
        <div className="mobile-only">
          <div className="reports-mobile-search-row">
            <div className="reports-page__field">
              <label htmlFor="rep-search-mobile">Search</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="rep-search-mobile"
                  type="text"
                  className="form-input"
                  placeholder="Invoice, title, desc..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{ paddingRight: 36, paddingLeft: 36 }}
                />
                <Search size={16} style={{ position: 'absolute', left: 12, opacity: 0.4 }} />
                {searchFilter && (
                  <button
                    type="button"
                    onClick={() => setSearchFilter('')}
                    style={{
                      position: 'absolute',
                      right: 12,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                    aria-label="Clear search"
                  >
                    <XCircle size={16} />
                  </button>
                )}
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={() => setIsFilterDrawerOpen(true)}
              style={{ height: 44, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Filter size={16} />
              <span>Filters</span>
            </Button>
          </div>
        </div>

        <div
          className="reports-page__actions"
          style={{
            display: "flex",
            gap: "12px", // Adjust spacing as needed
            alignItems: "center",
            flexWrap: "wrap",
            // marginTop: "var(--space-md)"
          }}
        >
          <Button onClick={() => handleExport('excel')} isLoading={isExporting} disabled={isExporting}>
            <Download size={16} style={{ marginRight: 8 }} />
            Export to Excel
          </Button>

          <Button
            onClick={() => handleExport('pdf')}
            isLoading={isExporting}
            disabled={isExporting}
            variant="secondary"
          >
            <Printer size={16} style={{ marginRight: 8 }} />
            Print PDF View
          </Button>

          <Button
            onClick={clearAllFilters}
            variant="secondary"
            className="clear-filters-btn"
          >
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Mobile Drawer Slide-in */}
      <Drawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title="Filter Parameters"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <Button
              variant="secondary"
              onClick={() => {
                clearAllFilters();
                setIsFilterDrawerOpen(false);
              }}
              style={{ flex: 1 }}
            >
              Clear Filters
            </Button>
            <Button onClick={() => setIsFilterDrawerOpen(false)} style={{ flex: 1 }}>
              Apply Filters
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', padding: 'var(--space-md)' }}>
          <div className="reports-page__field">
            <label>Start Date</label>
            <DatePickerInput value={startDate} onChange={setStartDate} placeholder="From Date" />
          </div>

          <div className="reports-page__field">
            <label>End Date</label>
            <DatePickerInput value={endDate} onChange={setEndDate} placeholder="To Date" />
          </div>

          {isSuperAdmin && (
            <div className="reports-page__field">
              <label>Project Site</label>
              <Select
                styles={reactSelectStyles}
                options={siteOptions}
                value={siteOptions.find(o => o.value === siteFilter) || null}
                onChange={(opt) => setSiteFilter(opt ? opt.value : '')}
                isClearable
                placeholder="All Sites"
              />
            </div>
          )}

          <div className="reports-page__field">
            <label>Category Filter</label>
            <Select
              styles={reactSelectStyles}
              options={categoryOptions}
              value={categoryOptions.flatMap(g => g.options).find(o => o.value === categoryFilter) || null}
              onChange={(opt) => setCategoryFilter(opt ? opt.value : '')}
              isClearable
              placeholder="All Categories"
            />
          </div>

          <div className="reports-page__field">
            <label>Status Filter</label>
            <Select
              styles={reactSelectStyles}
              options={STATUS_OPTIONS}
              value={STATUS_OPTIONS.find(o => o.value === statusFilter) || null}
              onChange={(opt) => setStatusFilter(opt ? opt.value : '')}
              isClearable
              placeholder="All Statuses"
            />
          </div>

          <div className="reports-page__field">
            <label htmlFor="rep-type-drawer">Report Structure</label>
            <select id="rep-type-drawer" className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
              {REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="reports-page__field">
            <label>Payment Method</label>
            <Select
              styles={reactSelectStyles}
              options={PAYMENT_METHOD_OPTIONS}
              value={PAYMENT_METHOD_OPTIONS.find(o => o.value === paymentMethodFilter) || null}
              onChange={(opt) => setPaymentMethodFilter(opt ? opt.value : '')}
              isClearable
              placeholder="All Methods"
            />
          </div>

          {/* <div className="reports-page__field">
            <label>Supplier / Vendor</label>
            <Select
              styles={reactSelectStyles}
              options={supplierOptions}
              value={supplierOptions.find(o => o.value === vendorFilter) || null}
              onChange={(opt) => setVendorFilter(opt ? opt.value : '')}
              isClearable
              placeholder="All Suppliers"
            />
          </div> */}

          {/* <div className="reports-page__field">
            <label>Worker / Employee</label>
            <Select
              styles={reactSelectStyles}
              options={workerOptions}
              value={workerOptions.find(o => o.value === workerFilter) || null}
              onChange={(opt) => setWorkerFilter(opt ? opt.value : '')}
              isClearable
              placeholder="All Workers"
            />
          </div> */}

          {/* <div className="reports-page__field">
            <label>Profession</label>
            <Select
              styles={reactSelectStyles}
              options={professionOptions}
              value={professionOptions.find(o => o.value === professionFilter) || null}
              onChange={(opt) => setProfessionFilter(opt ? opt.value : '')}
              isClearable
              placeholder="All Trades"
            />
          </div> */}
        </div>
      </Drawer>

      {/* Report Live Preview Table */}
      <Card className="reports-page__preview-card">
        <div className="reports-page__preview-header">
          <h2>Live Statement Preview</h2>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Showing {rows.length === 0 ? 0 : (page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, rows.length)} of {rows.length} records
          </span>
        </div>

        {isLoadingReport ? (
          <div className="reports-page__empty-state">
            <p>Loading report preview metrics from database...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="reports-page__empty-state">
            <Inbox size={48} style={{ opacity: 0.2, marginBottom: 8 }} />
            <p>No ledger entries found matching the query criteria.</p>
          </div>
        ) : (
          <>
            <div className="desktop-only">
              <div className="reports-page__table-wrapper">
                <table className="reports-page__table">
                  <thead>
                    <tr>
                      <th className="text-center">S.No.</th>
                      <th className="sortable" onClick={() => handleSort('date')}>
                        Date
                        {/* {renderSortIcon('date')} */}
                      </th>
                      <th className="sortable" onClick={() => handleSort('type')}>
                        Type
                        {/* {renderSortIcon('type')} */}
                      </th>
                      <th className="sortable" onClick={() => handleSort('site')}>
                        Project Site
                        {/* {renderSortIcon('site')} */}
                      </th>
                      <th>Description</th>
                      <th className="sortable" onClick={() => handleSort('category')}>
                        Category
                        {/* {renderSortIcon('category')} */}
                      </th>
                      <th className="sortable" onClick={() => handleSort('vendor')}>
                        Supplier/Vendor
                        {/* {renderSortIcon('vendor')} */}
                      </th>
                      <th className="sortable text-center" onClick={() => handleSort('paymentMethod')}>
                        Payment Method
                        {/* {renderSortIcon('paymentMethod')} */}
                      </th>
                      <th className="sortable text-right" onClick={() => handleSort('amount')}>
                        Amount
                        {/* {renderSortIcon('amount')} */}
                      </th>
                      <th className="sortable text-center" onClick={() => handleSort('status')}>
                        Status
                        {/* {renderSortIcon('status')} */}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((r, i) => (
                      <tr key={r._id || i}>
                        <td className="text-center">{(page - 1) * rowsPerPage + i + 1}</td>
                        <td>{formatDate(r.date)}</td>
                        <td>
                          <span className={`status-badge status-badge--${r.type === 'Material' ? 'paid' : r.type === 'Payment' ? 'pending' : 'inactive'}`}>
                            {r.type}
                          </span>
                        </td>
                        <td>{r.site}</td>
                        <td style={{ whiteSpace: 'normal', minWidth: 200 }}>{r.description}</td>
                        <td>{r.category}</td>
                        <td>{r.vendor}</td>
                        <td className="text-center" style={{ textTransform: 'capitalize' }}>
                          {r.paymentMethod === 'bankTransfer' ? 'Bank Transfer' : r.paymentMethod}
                        </td>
                        <td className="text-right" style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                          {formatCurrency(r.amount)}
                        </td>
                        <td className="text-center">
                          <span className={`status-badge status-badge--${r.status === 'paid' || r.status === 'approved' ? 'paid' : r.status === 'pending' ? 'pending' : 'inactive'}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mobile-only">
              {paginatedRows.map((r, i) => (
                <AccordionCard
                  key={r._id || i}
                  header={{
                    title: `${r.type || 'Ledger'} Entry`,
                    status: (
                      <span className={`status-badge status-badge--${r.status === 'paid' || r.status === 'approved' ? 'paid' : r.status === 'pending' ? 'pending' : 'inactive'}`}>
                        {r.status}
                      </span>
                    ),
                    category: r.category || 'General',
                    secondary: formatCurrency(r.amount)
                  }}
                  details={[
                    { label: 'S.No.', value: String((page - 1) * rowsPerPage + i + 1) },
                    { label: 'Date', value: formatDate(r.date) },
                    { label: 'Project Site', value: r.site || '—' },
                    { label: 'Supplier / Vendor', value: r.vendor || '—' },
                    { label: 'Payment Method', value: r.paymentMethod === 'bankTransfer' ? 'Bank Transfer' : r.paymentMethod || '—' },
                    { label: 'Description', value: r.description || '—' }
                  ]}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="reports-page__pagination">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
