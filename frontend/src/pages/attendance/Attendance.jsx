import React, { useState, useMemo } from 'react';
import {
  Users,
  DollarSign,
  Calendar,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Briefcase,
  Layers,
  FileSpreadsheet,
  Building2,
  Phone,
  User,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  X,
  XCircle,
} from 'lucide-react';
import Button from '../../components/common/Button';
import DatePickerInput from '../../components/ui/DatePickerInput';
import TimePickerInput from '../../components/ui/TimePickerInput';
import Card from '../../components/ui/Card';
import AccordionCard from '../../components/ui/AccordionCard';
import Drawer from '../../components/drawers/Drawer';
import { ImageThumbnail } from '../../components/common/ImagePreviewModal';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import { useSiteScope } from '../../hooks/useSiteScope';
import { useLookups } from '../../hooks/useLookups';
import {
  useAttendanceList,
  useAttendanceStats,
  useWeeklyAttendanceReport,
  useRecordAttendance,
  useBatchRecordAttendance,
  useUpdateAttendance,
  useDeleteAttendance,
} from '../../hooks/useAttendance';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency, formatDate } from '../../utils/format';
import { reportService } from '../../services/reportService';
import './Attendance.css';

function calculateHours(inTime = '09:00', outTime = '18:00') {
  if (!inTime || !outTime) return 8;
  const [inH, inM] = inTime.split(':').map(Number);
  const [outH, outM] = outTime.split(':').map(Number);
  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 8;
  let inMinutes = inH * 60 + inM;
  let outMinutes = outH * 60 + outM;
  if (outMinutes < inMinutes) outMinutes += 24 * 60;
  return Math.round(((outMinutes - inMinutes) / 60) * 100) / 100;
}

function calculateRowCost(status, wage) {
  const w = Number(wage) || 0;
  if (status === 'halfDay') return Math.round(w * 0.5 * 100) / 100;
  return Math.round(w * 100) / 100;
}

export default function Attendance() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'weekly'
  const [page, setPage] = useState(1);

  // Filters
  const [siteFilter, setSiteFilter] = useState('');
  const [period, setPeriod] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [professionFilter, setProfessionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const { isSuperAdmin, siteId } = useSiteScope(siteFilter || undefined);
  const activeSiteId = isSuperAdmin ? siteFilter || undefined : siteId;

  const { activeSites, professions } = useLookups(activeSiteId);

  // Data Queries
  const statsQuery = useAttendanceStats({ siteId: activeSiteId });
  const attendanceQuery = useAttendanceList({
    page,
    limit: 15,
    siteId: activeSiteId,
    period,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    professionId: professionFilter || undefined,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const weeklyReportQuery = useWeeklyAttendanceReport({
    siteId: activeSiteId,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Mutations
  const recordSingleMutation = useRecordAttendance();
  const recordBatchMutation = useBatchRecordAttendance();
  const updateMutation = useUpdateAttendance();
  const deleteMutation = useDeleteAttendance();

  // Fast Batch Drawer State
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchHeader, setBatchHeader] = useState({
    site: '',
    date: new Date().toISOString().slice(0, 10),
    profession: '',
    dailyWage: 750,
    inTime: '09:00',
    outTime: '18:00',
  });
  const [batchRows, setBatchRows] = useState([
    { id: 1, workerName: '', mobileNumber: '', status: 'present' },
    { id: 2, workerName: '', mobileNumber: '', status: 'present' },
    { id: 3, workerName: '', mobileNumber: '', status: 'present' },
  ]);

  // Single / Edit Drawer State
  const [isSingleOpen, setIsSingleOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [singleForm, setSingleForm] = useState({
    site: '',
    date: new Date().toISOString().slice(0, 10),
    profession: '',
    workerName: '',
    mobileNumber: '',
    inTime: '09:00',
    outTime: '18:00',
    dailyWage: 750,
    status: 'present',
    remarks: '',
  });

  // Confirm Delete & Export State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const availableSites = useMemo(() => {
    if (isSuperAdmin) return activeSites.data || [];
    if (!siteId) return activeSites.data || [];
    return (activeSites.data || []).filter((s) => s._id === siteId);
  }, [isSuperAdmin, siteId, activeSites.data]);

  // Open Batch Drawer
  const handleOpenBatch = () => {
    const defaultSite = siteId || activeSiteId || (availableSites[0]?._id ?? '');
    setBatchHeader({
      site: defaultSite,
      date: new Date().toISOString().slice(0, 10),
      profession: professions.data?.[0]?._id || '',
      dailyWage: 750,
      inTime: '09:00',
      outTime: '18:00',
    });
    setBatchRows([
      { id: Date.now() + 1, workerName: '', mobileNumber: '', status: 'present' },
      { id: Date.now() + 2, workerName: '', mobileNumber: '', status: 'present' },
      { id: Date.now() + 3, workerName: '', mobileNumber: '', status: 'present' },
    ]);
    setIsBatchOpen(true);
  };

  const handleAddBatchRow = (count = 1) => {
    const newRows = Array.from({ length: count }).map((_, i) => ({
      id: Date.now() + i,
      workerName: '',
      mobileNumber: '',
      status: 'present',
    }));
    setBatchRows((prev) => [...prev, ...newRows]);
  };

  const handleRemoveBatchRow = (id) => {
    if (batchRows.length <= 1) {
      toast.warning('At least one worker row is required.');
      return;
    }
    setBatchRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleBatchRowChange = (id, field, value) => {
    setBatchRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const batchTotalCost = useMemo(() => {
    return batchRows.reduce((sum, r) => {
      return sum + calculateRowCost(r.status, batchHeader.dailyWage);
    }, 0);
  }, [batchHeader.dailyWage, batchRows]);

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    if (!batchHeader.site) return toast.error('Please select a project site.');
    if (!batchHeader.profession) return toast.error('Please select a profession.');

    try {
      const payload = {
        site: batchHeader.site,
        date: batchHeader.date,
        profession: batchHeader.profession,
        dailyWage: Number(batchHeader.dailyWage) || 0,
        inTime: batchHeader.inTime,
        outTime: batchHeader.outTime,
        workers: batchRows.map((r) => ({
          workerName: r.workerName,
          mobileNumber: r.mobileNumber,
          status: r.status,
        })),
      };

      await recordBatchMutation.mutateAsync(payload);
      toast.success('Workers added successfully.');
      setIsBatchOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record batch entry.');
    }
  };

  // Open Single Entry Drawer
  const handleOpenSingle = () => {
    setEditingRecord(null);
    const defaultSite = siteId || activeSiteId || (availableSites[0]?._id ?? '');
    setSingleForm({
      site: defaultSite,
      date: new Date().toISOString().slice(0, 10),
      profession: professions.data?.[0]?._id || '',
      workerName: '',
      mobileNumber: '',
      inTime: '09:00',
      outTime: '18:00',
      dailyWage: 750,
      status: 'present',
      remarks: '',
    });
    setIsSingleOpen(true);
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setSingleForm({
      site: record.site?._id || record.site || '',
      date: record.date ? new Date(record.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      profession: record.profession?._id || record.profession || '',
      workerName: record.workerName || '',
      mobileNumber: record.mobileNumber || '',
      inTime: record.inTime || '09:00',
      outTime: record.outTime || '18:00',
      dailyWage: record.dailyWage ?? 750,
      status: record.status || 'present',
      remarks: record.remarks || '',
    });
    setIsSingleOpen(true);
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!singleForm.site) return toast.error('Please select a project site.');
    if (!singleForm.profession) return toast.error('Please select a profession.');

    try {
      if (editingRecord) {
        await updateMutation.mutateAsync({ id: editingRecord._id, payload: singleForm });
        toast.success('Labour attendance record updated successfully.');
      } else {
        await recordSingleMutation.mutateAsync(singleForm);
        toast.success('Workers added successfully.');
      }
      setIsSingleOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance record.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget._id);
      toast.success('Labour attendance record deleted successfully.');
      setDeleteTarget(null);
    } catch (err) {
      toast.error('Failed to delete record.');
    }
  };

  const handleExportReport = async (format = 'excel') => {
    setIsExporting(true);
    try {
      const response = await reportService.generate({
        type: 'worker',
        format,
        siteId: activeSiteId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      const ext = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Labour_Attendance_Report_${new Date().toISOString().slice(0, 10)}.${ext}`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Labour report downloaded successfully.');
    } catch (err) {
      toast.error('Failed to export report.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetFilters = () => {
    setSiteFilter('');
    setPeriod('today');
    setStartDate('');
    setEndDate('');
    setProfessionFilter('');
    setSearch('');
    setStatusFilter('');
    setPage(1);
    toast.success('Filters reset to defaults.');
  };

  const stats = statsQuery.data || {};
  const { items: attendanceList = [], total = 0 } = attendanceQuery.data || {};
  const totalPages = Math.ceil(total / 15) || 1;
  const weeklyData = weeklyReportQuery.data || {};

  return (
    <div className="attendance-page">
      {/* Header */}
      <div className="attendance-page__header-section">
        <div>
          <h1>Labour Attendance Management</h1>
          <p>Log daily workers, compute wages, and monitor labour expenses.</p>
        </div>
        <div className="attendance-page__header-actions">
          <Button variant="secondary" onClick={handleOpenSingle}>
            <Plus size={16} /> Single Worker Entry
          </Button>
          <Button onClick={handleOpenBatch}>
            <Layers size={18} /> Fast Crew Batch Entry
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="attendance-tabs">
        <button
          type="button"
          className={`attendance-tab-btn ${activeTab === 'daily' ? 'attendance-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          <Clock size={16} /> Daily Attendance Registry
        </button>
        <button
          type="button"
          className={`attendance-tab-btn ${activeTab === 'weekly' ? 'attendance-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('weekly')}
        >
          <FileSpreadsheet size={16} /> Labour Cost Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="attendance-page__kpi-grid">
        <div className="attendance-kpi-card">
          <div className="attendance-kpi-card__icon-wrap kpi-icon-blue">
            <Users size={22} />
          </div>
          <div className="attendance-kpi-card__info">
            <span className="attendance-kpi-card__label">Workers Present Today</span>
            <span className="attendance-kpi-card__value">{stats.todayWorkersPresent ?? 0}</span>
          </div>
        </div>

        <div className="attendance-kpi-card">
          <div className="attendance-kpi-card__icon-wrap kpi-icon-green">
            <DollarSign size={22} />
          </div>
          <div className="attendance-kpi-card__info">
            <span className="attendance-kpi-card__label">Today's Labour Expense</span>
            <span className="attendance-kpi-card__value">{formatCurrency(stats.todayLabourExpense || 0)}</span>
          </div>
        </div>

        <div className="attendance-kpi-card">
          <div className="attendance-kpi-card__icon-wrap kpi-icon-amber">
            <Calendar size={22} />
          </div>
          <div className="attendance-kpi-card__info">
            <span className="attendance-kpi-card__label">Weekly Expense</span>
            <span className="attendance-kpi-card__value">{formatCurrency(stats.weeklyLabourExpense || 0)}</span>
          </div>
        </div>

        <div className="attendance-kpi-card">
          <div className="attendance-kpi-card__icon-wrap kpi-icon-purple">
            <Briefcase size={22} />
          </div>
          <div className="attendance-kpi-card__info">
            <span className="attendance-kpi-card__label">Monthly Expense</span>
            <span className="attendance-kpi-card__value">{formatCurrency(stats.monthlyLabourExpense || 0)}</span>
          </div>
        </div>
      </div>

      {activeTab === 'daily' ? (
        <>
          {/* Desktop Filter Toolbar */}
          <div className="desktop-only">
            <Card className="attendance-page__filter-card">
              <div className="attendance-page__filter-row">
                {isSuperAdmin && (
                  <div className="attendance-page__filter-field">
                    <label htmlFor="att-site">Project Site</label>
                    <select
                      id="att-site"
                      className="form-select"
                      value={siteFilter}
                      onChange={(e) => { setSiteFilter(e.target.value); setPage(1); }}
                    >
                      <option value="">All Sites</option>
                      {activeSites.data?.map((s) => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="attendance-page__filter-field">
                  <label htmlFor="att-period">Period Range</label>
                  <select
                    id="att-period"
                    className="form-select"
                    value={period}
                    onChange={(e) => { setPeriod(e.target.value); setPage(1); }}
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="all">All Dates</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {period === 'custom' && (
                  <>
                    <div className="attendance-page__filter-field">
                      <label>From Date</label>
                      <DatePickerInput value={startDate} onChange={(val) => { setStartDate(val); setPage(1); }} placeholder="Start" />
                    </div>
                    <div className="attendance-page__filter-field">
                      <label>To Date</label>
                      <DatePickerInput value={endDate} onChange={(val) => { setEndDate(val); setPage(1); }} placeholder="End" />
                    </div>
                  </>
                )}

                <div className="attendance-page__filter-field">
                  <label htmlFor="att-prof">Profession</label>
                  <select
                    id="att-prof"
                    className="form-select"
                    value={professionFilter}
                    onChange={(e) => { setProfessionFilter(e.target.value); setPage(1); }}
                  >
                    <option value="">All Professions</option>
                    {professions.data?.map((p) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="attendance-page__filter-field">
                  <label htmlFor="att-status">Status</label>
                  <select
                    id="att-status"
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  >
                    <option value="">All Statuses</option>
                    <option value="present">Full Day</option>
                    <option value="halfDay">Half Day</option>
                  </select>
                </div>

                <div className="attendance-page__filter-field attendance-filter-search-field">
                  <label htmlFor="att-search">Search Worker / Mobile</label>
                  <div className="relative-pos-wrap">
                    <input
                      id="att-search"
                      type="text"
                      className="form-input"
                      placeholder="Search name, phone..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                    <Search size={16} className="search-icon-right" />
                  </div>
                </div>

                <div>
                  <Button variant="secondary" onClick={handleResetFilters}>
                    Reset
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Mobile Search & Filter Header Bar */}
          <div className="mobile-only">
            <Card className="attendance-page__filter-card">
              <div className="attendance-mobile-search-row">
                <div className="relative-pos-wrap flex-1">
                  <input
                    type="text"
                    className="form-input search-input-mobile"
                    placeholder="Search name, phone..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                  <Search size={16} className="search-icon-left" />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="search-clear-btn"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
                <Button variant="secondary" onClick={() => setIsFilterDrawerOpen(true)} className="mobile-filter-trigger-btn">
                  <Filter size={16} /> Filters
                </Button>
              </div>
            </Card>
          </div>

          {/* Mobile Filter Slide-out Drawer */}
          <Drawer
            isOpen={isFilterDrawerOpen}
            onClose={() => setIsFilterDrawerOpen(false)}
            title="Filter Parameters"
            size="sm"
            footer={
              <div className="drawer-footer-actions">
                <Button variant="secondary" onClick={() => { handleResetFilters(); setIsFilterDrawerOpen(false); }} className="flex-1">
                  Clear Filters
                </Button>
                <Button onClick={() => setIsFilterDrawerOpen(false)} className="flex-1">
                  Apply Filters
                </Button>
              </div>
            }
          >
            <div className="filter-drawer-body">
              {isSuperAdmin && (
                <div className="attendance-page__filter-field">
                  <label>Project Site</label>
                  <select className="form-select" value={siteFilter} onChange={(e) => { setSiteFilter(e.target.value); setPage(1); }}>
                    <option value="">All Sites</option>
                    {activeSites.data?.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="attendance-page__filter-field">
                <label>Period Range</label>
                <select className="form-select" value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1); }}>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="all">All Dates</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {period === 'custom' && (
                <>
                  <div className="attendance-page__filter-field">
                    <label>From Date</label>
                    <DatePickerInput value={startDate} onChange={(val) => { setStartDate(val); setPage(1); }} placeholder="Start" />
                  </div>
                  <div className="attendance-page__filter-field">
                    <label>To Date</label>
                    <DatePickerInput value={endDate} onChange={(val) => { setEndDate(val); setPage(1); }} placeholder="End" />
                  </div>
                </>
              )}

              <div className="attendance-page__filter-field">
                <label>Profession</label>
                <select className="form-select" value={professionFilter} onChange={(e) => { setProfessionFilter(e.target.value); setPage(1); }}>
                  <option value="">All Professions</option>
                  {professions.data?.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="attendance-page__filter-field">
                <label>Status</label>
                <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                  <option value="">All Statuses</option>
                  <option value="present">Full Day</option>
                  <option value="halfDay">Half Day</option>
                </select>
              </div>
            </div>
          </Drawer>

          {/* Table / Cards Container */}
          <div className="attendance-table-card">
            <div className="attendance-table-card__header">
              <h3>Daily Labour Entries ({total} records)</h3>
              {/* <div className="flex-gap-8">
                <Button variant="secondary" size="sm" onClick={() => handleExportReport('excel')} isLoading={isExporting}>
                  <Download size={14} className="icon-margin-right" /> Export Excel
                </Button>
              </div> */}
            </div>

            {attendanceQuery.isLoading ? (
              <div className="table-empty-pad">Loading labour records...</div>
            ) : attendanceList.length === 0 ? (
              <div className="table-empty-text">
                No daily labour entries found matching criteria. Use "Fast Crew Batch Entry" to quickly log workers.
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="desktop-only">
                  <div className="worker-payments-card__table-wrapper">
                    <table className="worker-payments-card__table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Worker Name</th>
                          <th>Mobile</th>
                          <th>Profession</th>
                          <th>Shift Time</th>
                          <th>Hours</th>
                          <th>Daily Wage</th>
                          <th>Total Amount</th>
                          <th>Status</th>
                          <th>Attachment</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceList.map((row) => (
                          <tr key={row._id}>
                            <td className="cell-nowrap-medium">
                              {formatDate(row.date)}
                            </td>
                            <td>{row.workerName || 'Unnamed Worker'}</td>
                            <td>{row.mobileNumber || 'NA'}</td>
                            <td>{row.profession?.name || row.professionName || 'NA'}</td>
                            <td className="cell-nowrap">
                              <Clock size={13} className="clock-icon-subtle" />
                              {row.inTime} - {row.outTime}
                            </td>
                            <td>{row.workingHours}h</td>
                            <td>₹{row.dailyWage?.toLocaleString('en-IN')}</td>
                            <td className="amount-cell-bold">
                              ₹{(row.totalAmount || row.dailyLabourCost)?.toLocaleString('en-IN')}
                            </td>
                            <td>
                              <span className={`status-pill status-pill--${row.status === 'halfDay' ? 'halfDay' : 'present'}`}>
                                {row.status === 'halfDay' ? 'Half Day' : 'Full Day'}
                              </span>
                            </td>
                            <td>
                              <ImageThumbnail
                                imageUrl={row.attachment?.url}
                                title={`Attendance Attachment - ${row.workerName || 'Worker'}`}
                                label="Voucher"
                              />
                            </td>
                            <td className="text-right">
                              <div className="row-actions-end">
                                <Button variant="secondary" size="sm" onClick={() => handleEditRecord(row)} title="Edit Record">
                                  <Pencil size={14} />
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(row)} title="Delete Record" className="btn-danger-text">
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards / Accordion View */}
                <div className="mobile-only">
                  {attendanceList.map((row) => (
                    <AccordionCard
                      key={row._id}
                      header={{
                        title: row.workerName || 'Unnamed Worker',
                        category: row.profession?.name || row.professionName || 'Trade',
                        secondary: `₹${(row.totalAmount || row.dailyLabourCost)?.toLocaleString('en-IN')}`,
                        status: (
                          <span className={`status-pill status-pill--${row.status === 'halfDay' ? 'halfDay' : 'present'}`}>
                            {row.status === 'halfDay' ? 'Half Day' : 'Full Day'}
                          </span>
                        ),
                      }}
                      details={[
                        { label: 'Attendance Date', value: formatDate(row.date) },
                        { label: 'Project Site', value: row.site?.name || '—' },
                        { label: 'Trade / Profession', value: row.profession?.name || row.professionName || '—' },
                        { label: 'Mobile Number', value: row.mobileNumber || '—' },
                        { label: 'Shift Time', value: `${row.inTime} - ${row.outTime} (${row.workingHours}h)` },
                        { label: 'Daily Wage', value: `₹${row.dailyWage?.toLocaleString('en-IN')}` },
                        { label: 'Total Amount', value: `₹${(row.totalAmount || row.dailyLabourCost)?.toLocaleString('en-IN')}` },
                        { label: 'Remarks / Notes', value: row.remarks || '—' },
                      ]}
                      actions={
                        <>
                          <Button variant="secondary" onClick={() => handleEditRecord(row)}>
                            <Pencil size={14} /> Edit
                          </Button>
                          <Button variant="secondary" onClick={() => setDeleteTarget(row)} className="btn-danger-text">
                            <Trash2 size={14} /> Delete
                          </Button>
                        </>
                      }
                    />
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-bar">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft size={16} /> Previous
                </Button>
                <span className="pagination-label">
                  Page {page} of {totalPages}
                </span>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Labour Cost Report Tab */
        <div className="report-tab-container">
          <Card className="attendance-page__filter-card">
            <div className="attendance-page__filter-row">
              {isSuperAdmin && (
                <div className="attendance-page__filter-field">
                  <label>Project Site</label>
                  <select className="form-select" value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
                    <option value="">All Sites</option>
                    {activeSites.data?.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="attendance-page__filter-field">
                <label>From Date</label>
                <DatePickerInput value={startDate} onChange={setStartDate} placeholder="Start Date" />
              </div>
              <div className="attendance-page__filter-field">
                <label>To Date</label>
                <DatePickerInput value={endDate} onChange={setEndDate} placeholder="End Date" />
              </div>
              {/* <Button onClick={() => handleExportReport('pdf')} isLoading={isExporting}>
                <Printer size={16} className="icon-margin-right" /> Print Cost Statement
              </Button> */}
            </div>
          </Card>

          {/* Profession-wise Breakdown Table */}
          <Card className="attendance-table-card">
            <h3 className="section-heading-md">
              Profession-wise Cost Distribution
            </h3>
            <div className="desktop-only">
              <div className="worker-payments-card__table-wrapper">
                <table className="worker-payments-card__table">
                  <thead>
                    <tr>
                      <th>Trade / Profession</th>
                      <th>Total Worker Entries</th>
                      <th>Full Days</th>
                      <th>Half Days</th>
                      <th>Total Expense (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyData.professionBreakdown?.map((p) => (
                      <tr key={p.profession}>
                        <td className="font-weight-bold">{p.profession}</td>
                        <td>{p.totalWorkers}</td>
                        <td>{p.presentDays}</td>
                        <td>{p.halfDays}</td>
                        <td className="total-cost-text">
                          ₹{p.totalCost?.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mobile-only">
              {weeklyData.professionBreakdown?.map((p) => (
                <AccordionCard
                  key={p.profession}
                  header={{
                    title: p.profession,
                    category: `${p.totalWorkers} workers`,
                    secondary: `₹${p.totalCost?.toLocaleString('en-IN')}`,
                  }}
                  details={[
                    { label: 'Full Days', value: `${p.presentDays} days` },
                    { label: 'Half Days', value: `${p.halfDays} days` },
                    { label: 'Total Expense', value: `₹${p.totalCost?.toLocaleString('en-IN')}` },
                  ]}
                />
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* FAST CREW BATCH ENTRY DRAWER */}
      <Drawer
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        title="Fast Daily Crew Batch Entry"
        size="lg"
      >
        <form onSubmit={handleBatchSubmit} className="form-drawer-container">
          <div className="batch-entry-header-box">
            <div>
              <label className="form-field-label-bold">Project Site *</label>
              <select
                className="form-select"
                value={batchHeader.site}
                onChange={(e) => setBatchHeader((prev) => ({ ...prev, site: e.target.value }))}
                required
                disabled={!isSuperAdmin && Boolean(siteId)}
              >
                {isSuperAdmin && <option value="">Select Site</option>}
                {availableSites.map((s) => (
                  <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-field-label-bold">Attendance Date *</label>
              <DatePickerInput
                value={batchHeader.date}
                onChange={(val) => setBatchHeader((prev) => ({ ...prev, date: val }))}
              />
            </div>

            <div>
              <label className="form-field-label-bold">Trade / Profession *</label>
              <select
                className="form-select"
                value={batchHeader.profession}
                onChange={(e) => setBatchHeader((prev) => ({ ...prev, profession: e.target.value }))}
                required
              >
                <option value="">Select Profession</option>
                {professions.data?.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-field-label-bold">Default Daily Wage (₹) *</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={batchHeader.dailyWage}
                onChange={(e) => setBatchHeader((prev) => ({ ...prev, dailyWage: e.target.value }))}
                required
              />
            </div>

            <div className="batch-entry-header-box__shift">
              <label className="form-field-label-bold">Shift Hours</label>
              <div className="shift-hours-flex">
                <TimePickerInput
                  value={batchHeader.inTime}
                  onChange={(e) => setBatchHeader((prev) => ({ ...prev, inTime: e.target.value }))}
                  placeholder="In Time"
                  ariaLabel="Shift In Time"
                />
                <TimePickerInput
                  value={batchHeader.outTime}
                  onChange={(e) => setBatchHeader((prev) => ({ ...prev, outTime: e.target.value }))}
                  placeholder="Out Time"
                  ariaLabel="Shift Out Time"
                  align="right"
                />
              </div>
            </div>
          </div>

          {/* Batch Crew Rows List */}
          <div className="batch-list-header">
            <h4 className="batch-list-title">
              Crew Members ({batchRows.length} workers)
            </h4>
            <div className="flex-gap-8">
              <Button type="button" variant="secondary" size="sm" onClick={() => handleAddBatchRow(1)}>
                <Plus size={14} /> Add Worker
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => handleAddBatchRow(5)}>
                +5 Workers
              </Button>
            </div>
          </div>

          <div className="batch-crew-grid">
            {batchRows.map((row, idx) => (
              <div key={row.id} className="batch-crew-row">
                <input
                  type="text"
                  className="form-input batch-crew-row__full"
                  placeholder={`Worker Name`}
                  value={row.workerName}
                  onChange={(e) => handleBatchRowChange(row.id, 'workerName', e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Mobile"
                  value={row.mobileNumber}
                  onChange={(e) => handleBatchRowChange(row.id, 'mobileNumber', e.target.value)}
                />
                <select
                  className="form-select"
                  value={row.status}
                  onChange={(e) => handleBatchRowChange(row.id, 'status', e.target.value)}
                >
                  <option value="present">Full Day</option>
                  <option value="halfDay">Half Day</option>
                </select>
                <div className="row-cost-preview">
                  ₹{calculateRowCost(row.status, batchHeader.dailyWage)}
                </div>
                <button
                  type="button"
                  className="batch-crew-row__delete-btn delete-row-btn"
                  onClick={() => handleRemoveBatchRow(row.id)}
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>

          <div className="batch-footer-bar">
            <div>
              <span className="batch-cost-label">Total Crew Daily Cost: </span>
              <strong className="batch-cost-amount">
                ₹{batchTotalCost.toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="batch-footer-bar__actions">
              <Button type="button" variant="secondary" onClick={() => setIsBatchOpen(false)} disabled={recordBatchMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" isLoading={recordBatchMutation.isPending} disabled={recordBatchMutation.isPending}>
                Save All {batchRows.length} Workers
              </Button>
            </div>
          </div>
        </form>
      </Drawer>

      {/* SINGLE WORKER ENTRY / EDIT DRAWER */}
      <Drawer
        isOpen={isSingleOpen}
        onClose={() => setIsSingleOpen(false)}
        title={editingRecord ? 'Edit Labour Entry' : 'Add Single Labour Entry'}
        size="md"
      >
        <form onSubmit={handleSingleSubmit} className="single-form-wrapper">
          <div className="attendance-form-row">
            <div>
              <label className="form-field-label-bold">Project Site *</label>
              <select
                className="form-select"
                value={singleForm.site}
                onChange={(e) => setSingleForm((prev) => ({ ...prev, site: e.target.value }))}
                required
                disabled={!isSuperAdmin && Boolean(siteId)}
              >
                {isSuperAdmin && <option value="">Select Site</option>}
                {availableSites.map((s) => (
                  <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-field-label-bold">Date *</label>
              <DatePickerInput value={singleForm.date} onChange={(val) => setSingleForm((prev) => ({ ...prev, date: val }))} />
            </div>
          </div>

          <div className="attendance-form-row">
            <div>
              <label className="form-field-label-bold">Trade / Profession *</label>
              <select
                className="form-select"
                value={singleForm.profession}
                onChange={(e) => setSingleForm((prev) => ({ ...prev, profession: e.target.value }))}
                required
              >
                <option value="">Select Profession</option>
                {professions.data?.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-field-label-bold">Daily Wage (₹) *</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={singleForm.dailyWage}
                onChange={(e) => setSingleForm((prev) => ({ ...prev, dailyWage: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="attendance-form-row">
            <div>
              <label className="form-field-label-bold">Worker Name (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Worker Name"
                value={singleForm.workerName}
                onChange={(e) => setSingleForm((prev) => ({ ...prev, workerName: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-field-label-bold">Mobile Number (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="10-digit mobile"
                value={singleForm.mobileNumber}
                onChange={(e) => setSingleForm((prev) => ({ ...prev, mobileNumber: e.target.value }))}
              />
            </div>
          </div>

          <div className="attendance-form-row">
            <div>
              <label className="form-field-label-bold">Shift In Time</label>
              <TimePickerInput
                value={singleForm.inTime}
                onChange={(e) => setSingleForm((prev) => ({ ...prev, inTime: e.target.value }))}
                placeholder="In Time"
                ariaLabel="Shift In Time"
              />
            </div>
            <div>
              <label className="form-field-label-bold">Shift Out Time</label>
              <TimePickerInput
                value={singleForm.outTime}
                onChange={(e) => setSingleForm((prev) => ({ ...prev, outTime: e.target.value }))}
                placeholder="Out Time"
                ariaLabel="Shift Out Time"
                align="right"
              />
            </div>
          </div>

          <div className="attendance-form-row">
            <div>
              <label className="form-field-label-bold">Attendance Status *</label>
              <select
                className="form-select"
                value={singleForm.status}
                onChange={(e) => setSingleForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="present">Full Day</option>
                <option value="halfDay">Half Day</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-field-label-bold">Remarks / Notes</label>
            <textarea
              className="form-input"
              rows={2}
              value={singleForm.remarks}
              onChange={(e) => setSingleForm((prev) => ({ ...prev, remarks: e.target.value }))}
            />
          </div>

          <div className="form-actions-footer">
            <Button type="button" variant="secondary" onClick={() => setIsSingleOpen(false)} disabled={recordSingleMutation.isPending || updateMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" isLoading={recordSingleMutation.isPending || updateMutation.isPending} disabled={recordSingleMutation.isPending || updateMutation.isPending}>
              {editingRecord ? 'Update Entry' : 'Save Labour Entry'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Delete Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Labour Entry"
        description={deleteTarget ? `Are you sure you want to delete the attendance entry for "${deleteTarget.workerName || 'Worker'}"? This action cannot be undone.` : 'Are you sure you want to delete this record?'}
        confirmLabel="Delete Entry"
        cancelLabel="Cancel"
        isLoading={deleteMutation.isPending}
        danger
      />
    </div>
  );
}
