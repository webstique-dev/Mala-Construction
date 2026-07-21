import React, { useState, useMemo, useCallback } from 'react';
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
  Copy,
  CheckSquare,
  Square,
  UserPlus,
} from 'lucide-react';
import Button from '../../components/common/Button';
import DatePickerInput from '../../components/ui/DatePickerInput';
import TimePickerInput from '../../components/ui/TimePickerInput';
import Card from '../../components/ui/Card';
import Modal from '../../components/modals/Modal';
import { CardSkeleton, TableSkeleton } from '../../components/ui/Skeleton';
import AccordionCard from '../../components/ui/AccordionCard';
import Drawer from '../../components/drawers/Drawer';
import { ImageThumbnail } from '../../components/common/ImagePreviewModal';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import WorkerPickerInput from '../../components/forms/WorkerPickerInput';
import WorkerFormModal from '../../pages/workers/WorkerFormModal';
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
  usePreviousDayWorkers,
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
  const [period, setPeriod] = useState('all');
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
    { id: 1, worker: null, workerName: '', mobileNumber: '', status: 'present' },
    { id: 2, worker: null, workerName: '', mobileNumber: '', status: 'present' },
    { id: 3, worker: null, workerName: '', mobileNumber: '', status: 'present' },
  ]);

  // Copy Previous Day state
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyFetchEnabled, setCopyFetchEnabled] = useState(false);
  const [selectedPrevWorkers, setSelectedPrevWorkers] = useState(new Set());
  const prevDayQuery = usePreviousDayWorkers(
    { siteId: batchHeader.site, date: batchHeader.date },
    copyFetchEnabled
  );

  // Create Worker from Batch Drawer state
  const [isCreateWorkerModalOpen, setIsCreateWorkerModalOpen] = useState(false);

  // Row removal confirmation target
  const [rowToRemoveTarget, setRowToRemoveTarget] = useState(null);

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
    setBatchRows([]); // Starts empty; workers added via Master, Prev Day, or Create Worker
    setCopyFetchEnabled(false);
    setIsBatchOpen(true);
  };

  const handleAddBatchRow = (count = 1) => {
    const newRows = Array.from({ length: count }).map((_, i) => ({
      id: Date.now() + i,
      worker: null,
      workerName: '',
      mobileNumber: '',
      status: 'present',
    }));
    setBatchRows((prev) => [...prev, ...newRows]);
  };

  // Helper: check duplicate worker by Mongo _id, Worker ID code, name, or phone number
  const isWorkerDuplicate = useCallback((candidate, rows = batchRows) => {
    if (!candidate || !Array.isArray(rows) || rows.length === 0) return false;

    const candId = candidate._id?.toString() || (typeof candidate.worker === 'string' ? candidate.worker : candidate.worker?._id?.toString());
    const candCode = candidate.workerId?.toString() || candidate._workerId?.toString() || candidate.worker?.workerId?.toString();
    const candName = (candidate.name || candidate.workerName || candidate.worker?.name || '').trim().toLowerCase();
    const candPhone = (candidate.phone || candidate.mobileNumber || candidate.worker?.phone || '').trim();

    return rows.some((r) => {
      const rId = r.worker?.toString();
      const rCode = r._workerId?.toString();
      const rName = (r.workerName || '').trim().toLowerCase();
      const rPhone = (r.mobileNumber || '').trim();

      if (candId && rId && candId === rId) return true;
      if (candCode && rCode && candCode === rCode) return true;
      if (candName && rName && candName === rName) return true;
      if (candPhone && rPhone && candPhone.length >= 5 && candPhone === rPhone) return true;

      return false;
    });
  }, [batchRows]);

  // Method 1: Add Existing Worker from Worker Master
  const handleAddWorkerFromMaster = useCallback((workerDoc) => {
    if (!workerDoc) return;

    if (isWorkerDuplicate(workerDoc)) {
      toast.warning("This worker has already been added to today's attendance.");
      return;
    }

    const profId = workerDoc.profession?._id || workerDoc.profession;
    const profObj = professions.data?.find((p) => p._id === profId);
    const profName = workerDoc.profession?.name || profObj?.name || '—';

    const newRow = {
      id: Date.now() + Math.random(),
      worker: workerDoc._id,
      workerName: workerDoc.name,
      mobileNumber: workerDoc.phone || '',
      profession: profId || batchHeader.profession,
      professionName: profName,
      dailyWage: workerDoc.dailyWage ?? Number(batchHeader.dailyWage) ?? 750,
      status: 'present',
      _workerId: workerDoc.workerId,
    };

    setBatchRows((prev) => [...prev, newRow]);
    toast.success(`Added "${workerDoc.name}" (${workerDoc.workerId || 'Worker'}) to attendance table.`);
  }, [isWorkerDuplicate, batchHeader.dailyWage, batchHeader.profession, professions.data, toast]);

  // Method 2: Copy Previous Day
  const handleCopyPreviousDay = () => {
    if (!batchHeader.site) {
      toast.error('Please select a project site first.');
      return;
    }
    setCopyFetchEnabled(true);
    setIsCopyModalOpen(true);
    setSelectedPrevWorkers(new Set());
  };

  const handleConfirmCopy = () => {
    const prevWorkers = prevDayQuery.data || [];
    const toAdd = prevWorkers.filter((pw) => selectedPrevWorkers.has(pw._id || pw.worker?._id || pw.workerName));
    if (toAdd.length === 0) {
      toast.warning('No workers selected to copy.');
      return;
    }

    let addedCount = 0;
    let dupCount = 0;
    const newRows = [];

    toAdd.forEach((pw, i) => {
      if (isWorkerDuplicate(pw)) {
        dupCount++;
        return;
      }
      const profId = pw.profession?._id || pw.profession || batchHeader.profession;
      const profObj = professions.data?.find((p) => p._id === profId);
      const profName = pw.professionName || pw.profession?.name || profObj?.name || '—';

      newRows.push({
        id: Date.now() + i + Math.random(),
        worker: pw.worker?._id || null,
        workerName: pw.workerName || pw.worker?.name || '',
        mobileNumber: pw.mobileNumber || pw.worker?.phone || '',
        profession: profId,
        professionName: profName,
        dailyWage: pw.dailyWage || pw.worker?.dailyWage || Number(batchHeader.dailyWage) || 750,
        status: pw.status === 'halfDay' ? 'halfDay' : 'present',
        _workerId: pw.worker?.workerId,
      });
      addedCount++;
    });

    if (newRows.length > 0) {
      setBatchRows((prev) => [...prev, ...newRows]);
    }

    setIsCopyModalOpen(false);
    setCopyFetchEnabled(false);
    if (dupCount > 0 && addedCount > 0) {
      toast.info(`Added ${addedCount} worker(s). ${dupCount} duplicate worker(s) skipped.`);
    } else if (dupCount > 0 && addedCount === 0) {
      toast.warning(`Selected worker(s) are already in today's attendance table.`);
    } else {
      toast.success(`Added ${addedCount} worker(s) from previous day.`);
    }
  };

  // Method 3: Worker Created from Batch Drawer
  const handleWorkerCreatedFromBatch = (newWorker) => {
    setIsCreateWorkerModalOpen(false);
    if (!newWorker) return;

    if (isWorkerDuplicate(newWorker)) {
      toast.warning("This worker has already been added to today's attendance.");
      return;
    }

    const profId = newWorker.profession?._id || newWorker.profession;
    const profObj = professions.data?.find((p) => p._id === profId);
    const profName = newWorker.profession?.name || profObj?.name || '—';

    const newRow = {
      id: Date.now() + Math.random(),
      worker: newWorker._id,
      workerName: newWorker.name,
      mobileNumber: newWorker.phone || '',
      profession: profId || batchHeader.profession,
      professionName: profName,
      dailyWage: newWorker.dailyWage ?? Number(batchHeader.dailyWage) ?? 750,
      status: 'present',
      _workerId: newWorker.workerId,
    };

    setBatchRows((prev) => [...prev, newRow]);
    toast.success(`Worker "${newWorker.name}" created and added to today's attendance table.`);
  };

  // Toggle selection of a previous-day worker in the copy modal
  const togglePrevWorker = (key) => {
    setSelectedPrevWorkers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Set of currently selected worker IDs / names / phones (for duplicate detection in picker)
  const selectedWorkerIds = useMemo(() => {
    const set = new Set();
    batchRows.forEach((r) => {
      if (r.worker) set.add(r.worker.toString());
      if (r._workerId) set.add(r._workerId.toString());
      if (r.workerName) set.add(r.workerName.trim().toLowerCase());
      if (r.mobileNumber && r.mobileNumber.trim().length >= 5) set.add(r.mobileNumber.trim());
    });
    return set;
  }, [batchRows]);

  const handleBatchRowChange = (id, field, value) => {
    setBatchRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Total Crew Daily Cost dynamically calculated strictly from current batchRows
  const batchTotalCost = useMemo(() => {
    return batchRows.reduce((sum, r) => {
      return sum + calculateRowCost(r.status, r.dailyWage);
    }, 0);
  }, [batchRows]);

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    if (!batchHeader.site) return toast.error('Please select a project site.');
    if (batchRows.length === 0) return toast.error('Please add at least one worker to the attendance table.');

    // Frontend duplicate check: same worker in multiple rows
    const workerIdsSeen = new Set();
    for (const r of batchRows) {
      if (r.worker) {
        if (workerIdsSeen.has(r.worker.toString())) {
          return toast.error(`Worker "${r.workerName}" appears more than once in the list.`);
        }
        workerIdsSeen.add(r.worker.toString());
      }
    }

    try {
      const payload = {
        site: batchHeader.site,
        date: batchHeader.date,
        profession: batchHeader.profession || batchRows[0]?.profession || professions.data?.[0]?._id,
        dailyWage: Number(batchHeader.dailyWage) || 0,
        inTime: batchHeader.inTime,
        outTime: batchHeader.outTime,
        workers: batchRows.map((r) => ({
          worker: r.worker || undefined,
          workerName: r.workerName,
          mobileNumber: r.mobileNumber,
          profession: r.profession || undefined,
          dailyWage: Number(r.dailyWage) || 0,
          status: r.status,
        })),
      };

      const result = await recordBatchMutation.mutateAsync(payload);
      const skipped = result?.data?.skippedDuplicates || [];
      if (skipped.length > 0) {
        toast.warning(`Saved. Skipped ${skipped.length} duplicate worker(s): ${skipped.join(', ')}`);
      } else {
        toast.success(`Saved attendance for ${batchRows.length} worker(s).`);
      }
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
    setPeriod('all');
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
          {/* <Button variant="secondary" onClick={handleOpenSingle}>
            <Plus size={16} /> Single Worker Entry
          </Button> */}
          <Button onClick={handleOpenBatch}>
            <Layers size={18} />Crew Batch Entry
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
        {statsQuery.isLoading ? (
          <CardSkeleton count={4} />
        ) : (
          <>
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
          </>
        )}
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
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
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

            {attendanceQuery.isLoading || (attendanceQuery.isFetching && !attendanceList.length) ? (
              <TableSkeleton rows={8} columns={10} />
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
        title="Daily Crew Batch Entry"
        size="lg"
      >
        <form onSubmit={handleBatchSubmit} className="form-drawer-container">
          {/* <div className="batch-entry-header-box">
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
        </div> */}

          <div className="fast-crew-date">
            <span>Date: </span>
            <strong>
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </strong>
          </div>

          {/* 3 Methods to Add Workers Toolbar */}
          <div className="batch-methods-toolbar">
            <div className="batch-methods-toolbar__search">
              <label className="form-field-label-bold" style={{ fontSize: 'var(--font-size-xs)' }}>
                Add Existing Worker from Master
              </label>
              <WorkerPickerInput
                siteId={batchHeader.site}
                onSelect={handleAddWorkerFromMaster}
                existingIds={selectedWorkerIds}
                placeholder="Search by Worker ID, name, or phone..."
                disabled={!batchHeader.site}
              />
            </div>
            <div className="batch-methods-toolbar__actions">
              <div>
                <label className="form-field-label-bold" style={{ fontSize: 'var(--font-size-xs)' }}>
                  Previous Day
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyPreviousDay}
                  disabled={!batchHeader.site}
                  title="Select workers from previous day's attendance"
                  className="copy-prev-btn"
                  style={{ width: '100%', height: '38px' }}
                >
                  <Copy size={14} /> Select from Previous Day
                </Button>
              </div>
              <div>
                <label className="form-field-label-bold" style={{ fontSize: 'var(--font-size-xs)' }}>
                  Create Worker
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCreateWorkerModalOpen(true)}
                  disabled={!batchHeader.site}
                  title="Create a new worker and add to attendance"
                  style={{ width: '100%', height: '38px' }}
                >
                  <UserPlus size={14} /> Create Worker
                </Button>
              </div>
            </div>
          </div>

          {/* Today's Attendance Table */}
          <div className="batch-table-section">
            <div className="batch-table-header">
              <h4 className="batch-list-title">
                Today&apos;s Attendance Table ({batchRows.length} worker{batchRows.length !== 1 ? 's' : ''})
              </h4>
            </div>

            <div className="batch-table-wrapper">
              {batchRows.length === 0 ? (
                <div className="batch-empty-table-state">
                  <Users size={32} style={{ color: 'var(--color-steel-400)', marginBottom: 8 }} />
                  <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
                    No workers added to today&apos;s table yet
                  </p>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Use Master Search, Previous Day selection, or Create Worker above to add workers.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View (>768px) */}
                  <div className="desktop-only">
                    <table className="batch-attendance-table">
                      <thead>
                        <tr>
                          <th>Worker Name</th>
                          <th>Mobile Number</th>
                          <th>Profession</th>
                          <th>Shift Status</th>
                          <th>Daily Wage (₹)</th>
                          <th className="text-right">Daily Cost</th>
                          <th className="text-center">Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchRows.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <div className="batch-worker-name-cell">
                                {row._workerId && <span className="batch-worker-id-badge">{row._workerId}</span>}
                                <span className="batch-worker-name-text">{row.workerName}</span>
                              </div>
                            </td>
                            <td className="read-only-text">{row.mobileNumber || '—'}</td>
                            <td className="read-only-text">{row.professionName || '—'}</td>
                            <td>
                              <select
                                className="form-select form-select--sm"
                                value={row.status}
                                onChange={(e) => handleBatchRowChange(row.id, 'status', e.target.value)}
                              >
                                <option value="present">Full Day</option>
                                <option value="halfDay">Half Day</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                className="form-input form-input--sm wage-input"
                                value={row.dailyWage}
                                onChange={(e) => handleBatchRowChange(row.id, 'dailyWage', e.target.value)}
                              />
                            </td>
                            <td className="text-right font-weight-bold">
                              ₹{calculateRowCost(row.status, row.dailyWage).toLocaleString('en-IN')}
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="row-remove-btn"
                                onClick={() => setRowToRemoveTarget(row)}
                                title="Remove worker from attendance list"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile / Tablet Accordion View (<=768px) */}
                  <div className="mobile-only">
                    <div className="batch-accordion-list">
                      {batchRows.map((row) => (
                        <AccordionCard
                          key={row.id}
                          header={{
                            title: (
                              <div className="batch-worker-name-cell">
                                {row._workerId && <span className="batch-worker-id-badge">{row._workerId}</span>}
                                <span className="batch-worker-name-text">{row.workerName}</span>
                              </div>
                            ),
                            category: row.professionName || '—',
                            secondary: `₹${calculateRowCost(row.status, row.dailyWage).toLocaleString('en-IN')}`,
                            status: (
                              <span className={`status-pill status-pill--${row.status === 'halfDay' ? 'halfDay' : 'present'}`}>
                                {row.status === 'halfDay' ? 'Half Day' : 'Full Day'}
                              </span>
                            ),
                          }}
                          details={[
                            { label: 'Worker Name', value: <span className="read-only-text font-weight-bold">{row.workerName}</span> },
                            { label: 'Mobile Number', value: <span className="read-only-text">{row.mobileNumber || '—'}</span> },
                            { label: 'Profession', value: <span className="read-only-text">{row.professionName || '—'}</span> },
                            {
                              label: 'Shift Status',
                              value: (
                                <select
                                  className="form-select form-select--sm"
                                  value={row.status}
                                  onChange={(e) => handleBatchRowChange(row.id, 'status', e.target.value)}
                                >
                                  <option value="present">Full Day</option>
                                  <option value="halfDay">Half Day</option>
                                </select>
                              ),
                            },
                            {
                              label: 'Daily Wage (₹)',
                              value: (
                                <input
                                  type="number"
                                  min="0"
                                  className="form-input form-input--sm wage-input"
                                  value={row.dailyWage}
                                  onChange={(e) => handleBatchRowChange(row.id, 'dailyWage', e.target.value)}
                                />
                              ),
                            },
                          ]}
                          actions={
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setRowToRemoveTarget(row)}
                              className="btn-danger-text w-full-mobile"
                            >
                              <Trash2 size={14} /> Remove Worker
                            </Button>
                          }
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
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
              <Button type="submit" isLoading={recordBatchMutation.isPending} disabled={recordBatchMutation.isPending || batchRows.length === 0}>
                Save Attendance ({batchRows.length} Worker{batchRows.length !== 1 ? 's' : ''})
              </Button>
            </div>
          </div>
        </form>
      </Drawer>

      {/* COPY PREVIOUS DAY WORKER SELECTION MODAL */}
      <Modal
        isOpen={isCopyModalOpen}
        onClose={() => { setIsCopyModalOpen(false); setCopyFetchEnabled(false); }}
        title="Copy Previous Day Attendance"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setIsCopyModalOpen(false); setCopyFetchEnabled(false); }}>Cancel</Button>
            <Button
              onClick={handleConfirmCopy}
              disabled={selectedPrevWorkers.size === 0}
            >
              Populate {selectedPrevWorkers.size} Worker{selectedPrevWorkers.size !== 1 ? 's' : ''}
            </Button>
          </>
        }
      >
        {prevDayQuery.isLoading ? (
          <div className="prev-day-modal__loading">Fetching previous attendance&hellip;</div>
        ) : !prevDayQuery.data || prevDayQuery.data.length === 0 ? (
          <div className="prev-day-modal__empty">
            No previous attendance records found for this site before the selected date.
          </div>
        ) : (
          <>
            <p className="prev-day-modal__hint">
              Workers from the most recent attendance date ({formatDate(prevDayQuery.data?.[0]?.date)}).
              Select who to copy into today&apos;s form.
            </p>
            <div className="prev-day-modal-actions">
              <button
                type="button"
                className="prev-day-select-all-btn"
                onClick={() => {
                  const selectable = prevDayQuery.data.filter((pw) => !isWorkerDuplicate(pw));
                  setSelectedPrevWorkers(new Set(selectable.map((pw) => pw._id || pw.worker?._id || pw.workerName)));
                }}
              >
                <CheckSquare size={14} /> Select All
              </button>
              <button type="button" className="prev-day-select-all-btn" onClick={() => setSelectedPrevWorkers(new Set())}>
                <Square size={14} /> Deselect All
              </button>
            </div>
            <div className="prev-day-modal-list">
              {prevDayQuery.data.map((pw) => {
                const key = pw._id || pw.worker?._id || pw.workerName;
                const isAlreadyInBatch = isWorkerDuplicate(pw);
                const isChecked = selectedPrevWorkers.has(key) && !isAlreadyInBatch;

                return (
                  <label
                    key={key}
                    className={`prev-day-worker-item ${isAlreadyInBatch ? 'prev-day-worker-item--disabled' : isChecked ? 'prev-day-worker-item--checked' : ''}`}
                    title={isAlreadyInBatch ? "This worker has already been added to today's attendance" : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isAlreadyInBatch}
                      onChange={() => !isAlreadyInBatch && togglePrevWorker(key)}
                      className="prev-day-worker-checkbox"
                    />
                    <div className="prev-day-worker-item__info">
                      <div className="prev-day-worker-item__main">
                        {(pw.worker?.workerId || pw._workerId) && (
                          <span className="prev-day-worker-item__id">{pw.worker?.workerId || pw._workerId}</span>
                        )}
                        <span className="prev-day-worker-item__name">{pw.workerName || pw.worker?.name}</span>
                        {isAlreadyInBatch && (
                          <span className="prev-day-worker-item__added-badge">Already Added</span>
                        )}
                      </div>
                      <div className="prev-day-worker-item__sub">
                        <span>{pw.professionName || pw.profession?.name || '—'}</span>
                        <span>{formatCurrency(pw.dailyWage)}/day</span>
                        {pw.mobileNumber && <span>{pw.mobileNumber}</span>}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        )}
      </Modal>

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

      {/* Row Removal Confirmation Popup */}
      <ConfirmDialog
        isOpen={Boolean(rowToRemoveTarget)}
        onClose={() => setRowToRemoveTarget(null)}
        onConfirm={() => {
          if (rowToRemoveTarget) {
            setBatchRows((prev) => prev.filter((r) => r.id !== rowToRemoveTarget.id));
            toast.success(`Removed "${rowToRemoveTarget.workerName}" from today's attendance table.`);
            setRowToRemoveTarget(null);
          }
        }}
        title="Confirm Worker Removal"
        description={
          rowToRemoveTarget ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                Are you sure you want to remove this worker from today&apos;s attendance list?
              </p>
              <div className="confirm-worker-details-card">
                <div><strong>Worker Name:</strong> {rowToRemoveTarget.workerName}</div>
                <div><strong>Mobile Number:</strong> {rowToRemoveTarget.mobileNumber || 'N/A'}</div>
                <div><strong>Profession:</strong> {rowToRemoveTarget.professionName || 'N/A'}</div>
              </div>
              <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                Note: This only removes the worker from the current unsaved attendance list. Worker Master records and historical attendance are not modified.
              </p>
            </div>
          ) : 'Are you sure you want to remove this worker?'
        }
        confirmLabel="Remove Worker"
        cancelLabel="Cancel"
        danger
      />

      {/* Create Worker Modal from Batch Drawer */}
      <WorkerFormModal
        isOpen={isCreateWorkerModalOpen}
        onClose={() => setIsCreateWorkerModalOpen(false)}
        worker={null}
        defaultSiteId={batchHeader.site || activeSiteId}
        onCreated={handleWorkerCreatedFromBatch}
      />
    </div>
  );
}
