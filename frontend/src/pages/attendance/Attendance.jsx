import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  DollarSign,
  Calendar,
  Layers,
  Copy,
  Save,
  Check,
  Briefcase,
  Building2,
  CheckCircle2,
  Plus,
  UserCheck,
  UserX,
  Trash2,
  ArrowLeft,
  MapPin,
  ChevronRight,
  Search,
  RotateCcw,
  Filter,
  AlertCircle,
  FileText,
} from 'lucide-react';
import Button from '../../components/common/Button';
import DatePickerInput from '../../components/ui/DatePickerInput';
import Card from '../../components/ui/Card';
import Drawer from '../../components/drawers/Drawer';
import { useSiteScope } from '../../hooks/useSiteScope';
import { useLookups } from '../../hooks/useLookups';
import {
  useDailyAttendance,
  useSaveDailyAttendance,
  usePreviousDayWorkers,
} from '../../hooks/useAttendance';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency, formatDate } from '../../utils/format';
import './Attendance.css';

function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Attendance() {
  const toast = useToast();
  // Live / selected attendance date
  const [selectedDate, setSelectedDate] = useState(getLocalDateString);

  // Main Page Table Filters
  const [siteFilter, setSiteFilter] = useState(''); // '' means All Sites for Super Admin
  const [search, setSearch] = useState('');
  const [professionFilter, setProfessionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // 'present', 'absent', ''

  // Site scope resolution
  const { isSuperAdmin, siteId } = useSiteScope(siteFilter || undefined);
  const activeSiteId = isSuperAdmin ? (siteFilter || undefined) : siteId;

  const { activeSites, professions } = useLookups(activeSiteId);
  const selectedSite = activeSites.data?.find((s) => s._id === activeSiteId);

  // Main Page Daily Attendance Query
  const mainAttendanceQuery = useDailyAttendance({ siteId: activeSiteId, date: selectedDate });
  const saveDailyMutation = useSaveDailyAttendance();

  // Drawer / Popup Modal State
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [drawerSiteId, setDrawerSiteId] = useState('');
  const [selectedLeaderToAdd, setSelectedLeaderToAdd] = useState('');

  // Effective site ID for the Record Daily Labour drawer popup
  const drawerTargetSiteId = isSuperAdmin ? (drawerSiteId || undefined) : siteId;
  const drawerAttendanceQuery = useDailyAttendance({ siteId: drawerTargetSiteId, date: selectedDate });

  // Local state for drawer attendance rows
  const [drawerRows, setDrawerRows] = useState([]);
  const [isDirty, setIsDirty] = useState(false);

  // Previous Day Copy Query for Drawer
  const [copyFetchEnabled, setCopyFetchEnabled] = useState(false);
  const prevDayQuery = usePreviousDayWorkers({ siteId: drawerTargetSiteId, date: selectedDate }, copyFetchEnabled);

  // Synchronize drawer site selection when drawer opens
  useEffect(() => {
    if (isPanelOpen) {
      if (isSuperAdmin) {
        // Pre-select main site filter if set, otherwise default to first available site
        const defaultSite = siteFilter || activeSites.data?.[0]?._id || '';
        setDrawerSiteId(defaultSite);
      } else {
        setDrawerSiteId(siteId || '');
      }
    }
  }, [isPanelOpen, isSuperAdmin, siteFilter, siteId, activeSites.data]);

  // Populate drawer rows whenever drawer query loads or date/site changes
  useEffect(() => {
    if (drawerAttendanceQuery.data?.leaders) {
      setDrawerRows(
        drawerAttendanceQuery.data.leaders.map((l) => {
          const count = l.workerCount ?? l.defaultWorkerCount ?? 1;
          return {
            worker: l._id,
            name: l.name,
            profession: l.profession,
            site: l.site,
            photo: l.photo,
            dailyWage: l.dailyWage,
            defaultWorkerCount: l.defaultWorkerCount ?? 1,
            workerCount: count,
            isPresent: l.isMarked ? count > 0 : true,
            isMarked: l.isMarked,
            attendanceId: l.attendanceId,
            remarks: l.remarks || '',
            inList: l.isMarked || count > 0,
          };
        })
      );
      setIsDirty(false);
    } else {
      setDrawerRows([]);
    }
  }, [drawerAttendanceQuery.data, selectedDate, drawerTargetSiteId]);

  // Main table active rows derived from mainAttendanceQuery
  const mainTableRows = useMemo(() => {
    if (!mainAttendanceQuery.data?.leaders) return [];
    return mainAttendanceQuery.data.leaders.map((l) => {
      const count = l.workerCount ?? l.defaultWorkerCount ?? 1;
      return {
        worker: l._id,
        name: l.name,
        profession: l.profession,
        site: l.site,
        photo: l.photo,
        dailyWage: l.dailyWage,
        workerCount: count,
        isPresent: l.isMarked ? count > 0 : true,
        isMarked: l.isMarked,
        remarks: l.remarks || '',
      };
    });
  }, [mainAttendanceQuery.data]);

  // Filtered rows for main table view
  const filteredTableRows = useMemo(() => {
    return mainTableRows.filter((r) => {
      // Search filter (Name / Profession / Site)
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = r.name?.toLowerCase().includes(q);
        const matchesProf = r.profession?.name?.toLowerCase().includes(q);
        const matchesSite = r.site?.name?.toLowerCase().includes(q);
        if (!matchesName && !matchesProf && !matchesSite) return false;
      }
      // Profession filter
      if (professionFilter) {
        const profId = typeof r.profession === 'object' ? r.profession?._id : r.profession;
        if (profId !== professionFilter) return false;
      }
      // Status filter
      if (statusFilter === 'present' && !r.isPresent) return false;
      if (statusFilter === 'absent' && r.isPresent) return false;

      return true;
    });
  }, [mainTableRows, search, professionFilter, statusFilter]);

  // Compute summary totals for main table view
  const summaryTotals = useMemo(() => {
    let totalWorkers = 0;
    let totalLabourExpense = 0;
    let presentLeaders = 0;

    mainTableRows.forEach((r) => {
      if (r.isPresent) {
        presentLeaders++;
        const cnt = Math.max(0, Number(r.workerCount) || 0);
        const wage = Math.max(0, Number(r.dailyWage) || 0);
        totalWorkers += cnt;
        totalLabourExpense += cnt * wage;
      }
    });

    return {
      totalLeaders: mainTableRows.length,
      presentLeaders,
      totalWorkers,
      totalLabourExpense,
      isRecorded: mainAttendanceQuery.data?.summary?.markedCount > 0,
    };
  }, [mainTableRows, mainAttendanceQuery.data]);

  // Unadded leaders in drawer popup dropdown
  const drawerUnaddedLeaders = useMemo(() => {
    return drawerRows.filter((r) => !r.inList);
  }, [drawerRows]);

  // Active leaders in drawer popup roster
  const drawerActiveRows = useMemo(() => {
    return drawerRows.filter((r) => r.inList);
  }, [drawerRows]);

  // Drawer total calculations
  const drawerTotals = useMemo(() => {
    let totalWorkers = 0;
    let totalLabourExpense = 0;
    drawerActiveRows.forEach((r) => {
      if (r.isPresent) {
        const cnt = Math.max(0, Number(r.workerCount) || 0);
        const wage = Math.max(0, Number(r.dailyWage) || 0);
        totalWorkers += cnt;
        totalLabourExpense += cnt * wage;
      }
    });
    return { totalWorkers, totalLabourExpense };
  }, [drawerActiveRows]);

  // Reset main table filters
  const handleResetFilters = () => {
    setSearch('');
    setProfessionFilter('');
    setStatusFilter('');
    if (isSuperAdmin) setSiteFilter('');
  };

  // Drawer handlers
  const handleAddLeaderToList = (leaderId) => {
    if (!leaderId) return;
    setDrawerRows((prev) =>
      prev.map((r) => {
        if (r.worker === leaderId) {
          const defaultCount = r.defaultWorkerCount || 1;
          return {
            ...r,
            inList: true,
            isPresent: true,
            workerCount: r.workerCount > 0 ? r.workerCount : defaultCount,
          };
        }
        return r;
      })
    );
    setSelectedLeaderToAdd('');
    setIsDirty(true);
  };

  const handleRemoveLeaderFromList = (leaderId) => {
    setDrawerRows((prev) =>
      prev.map((r) => (r.worker === leaderId ? { ...r, inList: false, isPresent: false, workerCount: 0 } : r))
    );
    setIsDirty(true);
  };

  const handleTogglePresence = (workerId) => {
    setDrawerRows((prev) =>
      prev.map((r) => {
        if (r.worker === workerId) {
          const nextIsPresent = !r.isPresent;
          return {
            ...r,
            isPresent: nextIsPresent,
            workerCount: nextIsPresent ? (r.workerCount > 0 ? r.workerCount : r.defaultWorkerCount || 1) : 0,
          };
        }
        return r;
      })
    );
    setIsDirty(true);
  };

  const handleCountChange = (workerId, newCount) => {
    const val = parseInt(newCount, 10);
    const count = isNaN(val) ? 0 : Math.max(0, val);
    setDrawerRows((prev) =>
      prev.map((r) => (r.worker === workerId ? { ...r, workerCount: count, isPresent: count > 0 } : r))
    );
    setIsDirty(true);
  };

  const handleRemarksChange = (workerId, remarksText) => {
    setDrawerRows((prev) =>
      prev.map((r) => (r.worker === workerId ? { ...r, remarks: remarksText } : r))
    );
    setIsDirty(true);
  };

  const handleCopyPreviousDay = async () => {
    if (!drawerTargetSiteId) {
      toast.error('Please select a project site first.');
      return;
    }
    setCopyFetchEnabled(true);
    try {
      const prevData = await prevDayQuery.refetch();
      const prevRecords = prevData?.data;
      if (!prevRecords || prevRecords.length === 0) {
        toast.info('No previous date attendance records found for this site.');
        return;
      }

      const prevMap = new Map();
      prevRecords.forEach((pr) => {
        if (pr.worker) prevMap.set(pr.worker.toString(), pr.workerCount);
      });

      let copiedCount = 0;
      setDrawerRows((prev) =>
        prev.map((r) => {
          if (prevMap.has(r.worker.toString())) {
            const count = prevMap.get(r.worker.toString());
            copiedCount++;
            return {
              ...r,
              inList: true,
              workerCount: count,
              isPresent: count > 0,
            };
          }
          return r;
        })
      );

      setIsDirty(true);
      toast.success(`Imported previous date's worker counts for ${copiedCount} leader(s).`);
    } catch (err) {
      toast.error('Failed to retrieve previous date records.');
    }
  };

  const handleSaveAll = async () => {
    const targetSite = isSuperAdmin ? drawerSiteId : siteId;
    if (!targetSite) {
      toast.error('Please select a project site in the popup modal.');
      return;
    }
    if (!selectedDate) {
      toast.error('Please select an attendance date.');
      return;
    }

    try {
      const payload = {
        site: targetSite,
        date: selectedDate,
        records: drawerRows.map((r) => ({
          worker: r.worker,
          workerCount: r.inList && r.isPresent ? Math.max(0, Number(r.workerCount) || 0) : 0,
          dailyWage: Math.max(0, Number(r.dailyWage) || 0),
          remarks: r.remarks,
        })),
      };

      await saveDailyMutation.mutateAsync(payload);
      setIsDirty(false);
      setIsPanelOpen(false);
      toast.success(`Daily attendance saved for ${selectedDate}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance.');
    }
  };

  // -------------------------------------------------------------
  // UNIFIED LABOUR ATTENDANCE MAIN VIEW
  // -------------------------------------------------------------
  return (
    <div className="attendance-page">
      {/* Page Header */}
      <div className="attendance-page__header-section">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>Labour Attendance</h1>
            {selectedSite ? (
              <span className="attendance-site-badge">
                <Building2 size={13} /> {selectedSite.name}
              </span>
            ) : isSuperAdmin ? (
              <span className="attendance-site-badge" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                <Building2 size={13} /> All Project Sites
              </span>
            ) : null}
          </div>
          <p style={{ margin: 0 }}>
            {isSuperAdmin && !siteFilter
              ? 'Viewing daily worker attendance across all project sites.'
              : `Daily worker counts and labour expense records for ${selectedSite?.name || 'assigned site'}.`}
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="attendance-page__header-actions">
          <Button onClick={() => setIsPanelOpen(true)}>
            <Layers size={18} /> Record Daily Labour
          </Button>
        </div>
      </div>

      {/* Top KPI Summary Cards Grid */}
      <div className="attendance-kpi-grid">
        <Card className="attendance-kpi-card">
          <div className="attendance-kpi-card__top">
            <span className="attendance-kpi-card__label">Project Site</span>
            <div className="attendance-kpi-card__icon-wrap kpi-icon-blue">
              <Building2 size={20} />
            </div>
          </div>
          <div className="attendance-kpi-card__body">
            <div className="attendance-kpi-card__value attendance-kpi-card__value--site">
              {selectedSite?.name || (isSuperAdmin ? 'All Sites' : 'Assigned Site')}
            </div>
            <span className="attendance-kpi-card__sub">
              {selectedSite?.code ? `Site Code: ${selectedSite.code}` : isSuperAdmin ? `All Sites (${activeSites.data?.length || 0})` : 'Active Site View'}
            </span>
          </div>
        </Card>

        <Card className="attendance-kpi-card">
          <div className="attendance-kpi-card__top">
            <span className="attendance-kpi-card__label">Active Leaders</span>
            <div className="attendance-kpi-card__icon-wrap kpi-icon-green">
              <Users size={20} />
            </div>
          </div>
          <div className="attendance-kpi-card__body">
            <div className="attendance-kpi-card__value">
              {summaryTotals.presentLeaders} <span className="attendance-kpi-card__unit">/ {summaryTotals.totalLeaders}</span>
            </div>
            <span className="attendance-kpi-card__sub">
              {summaryTotals.presentLeaders} Present Today
            </span>
          </div>
        </Card>

        <Card className="attendance-kpi-card">
          <div className="attendance-kpi-card__top">
            <span className="attendance-kpi-card__label">Total Labours</span>
            <div className="attendance-kpi-card__icon-wrap kpi-icon-amber">
              <UserCheck size={20} />
            </div>
          </div>
          <div className="attendance-kpi-card__body">
            <div className="attendance-kpi-card__value">
              {summaryTotals.totalWorkers} <span className="attendance-kpi-card__unit">Workers</span>
            </div>
            <span className="attendance-kpi-card__sub">
              Working on site today
            </span>
          </div>
        </Card>

        <Card className="attendance-kpi-card">
          <div className="attendance-kpi-card__top">
            <span className="attendance-kpi-card__label">Daily Labour Cost</span>
            <div className="attendance-kpi-card__icon-wrap kpi-icon-purple">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="attendance-kpi-card__body">
            <div className="attendance-kpi-card__value attendance-kpi-card__value--cost">
              {formatCurrency(summaryTotals.totalLabourExpense)}
            </div>
            <span className="attendance-kpi-card__sub">
              {summaryTotals.isRecorded ? 'Attendance Recorded' : 'Estimated Expense'}
            </span>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar & Date Selector */}
      <Card className="attendance-filter-bar" style={{ padding: 'var(--space-md)' }}>
        <div className="attendance-filter-bar__container">
          {/* Super Admin Site Selector Dropdown */}
          {isSuperAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200, flex: '1 1 200px' }}>
              <label style={{ fontSize: 'var(--font-size-2xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)' }}>
                Project Site
              </label>
              <select
                className="form-select"
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                style={{ fontWeight: 600 }}
              >
                <option value="">-- All Project Sites --</option>
                {activeSites.data?.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Attendance Date Picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
            <label style={{ fontSize: 'var(--font-size-2xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)' }}>
              Attendance Date
            </label>
            <DatePickerInput
              id="attendance-date-picker"
              value={selectedDate}
              onChange={(val) => setSelectedDate(val)}
              style={{ width: '100%' }}
            />
          </div>

          {/* Worker Leader Search Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 220px', minWidth: 200 }}>
            <label style={{ fontSize: 'var(--font-size-2xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)' }}>
              Search Worker
            </label>
            <div className="attendance-search-wrap">
              <Search size={16} className="attendance-search-icon" />
              <input
                type="text"
                placeholder="Search worker, trade, or site..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input attendance-search-input"
              />
            </div>
          </div>

          {/* Profession Filter Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
            <label style={{ fontSize: 'var(--font-size-2xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)' }}>
              Profession Trade
            </label>
            <select
              className="form-select"
              value={professionFilter}
              onChange={(e) => setProfessionFilter(e.target.value)}
            >
              <option value="">All Professions</option>
              {professions.data?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Attendance Status Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
            <label style={{ fontSize: 'var(--font-size-2xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)' }}>
              Presence Status
            </label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="present">Present Only</option>
              <option value="absent">Absent Only</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(search || professionFilter || statusFilter || siteFilter) && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button variant="ghost" onClick={handleResetFilters} style={{ padding: '8px 12px' }}>
                <RotateCcw size={15} /> Reset
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* READ-ONLY LABOUR ATTENDANCE TABLE VIEW */}
      <Card style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        {/* Table Header Bar */}
        <div style={{ padding: '14px 20px', background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Labour Attendance Roster ({formatDate(selectedDate)})
            </h3>
            {summaryTotals.isRecorded ? (
              <span className="attendance-status-pill attendance-status-pill--marked">
                <CheckCircle2 size={13} /> Attendance Recorded
              </span>
            ) : (
              <span className="attendance-status-pill attendance-status-pill--draft">
                <AlertCircle size={13} /> Draft / Not Recorded
              </span>
            )}
          </div>

          <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Showing {filteredTableRows.length} of {mainTableRows.length} Worker Leader(s)
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="attendance-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-tertiary, #f8fafc)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', width: 110 }}>Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', minWidth: 150 }}>Project Site</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Worker Leader</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Profession / Trade</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: 130 }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: 140 }}>Labours Working</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Daily Wage Rate</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Daily Cost</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {mainAttendanceQuery.isLoading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}>
                      <p style={{ margin: 0, fontWeight: 500 }}>Loading worker attendance records...</p>
                    </div>
                  </td>
                </tr>
              ) : mainTableRows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '48px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--color-text-secondary)' }}>
                      <Users size={36} style={{ color: 'var(--color-text-tertiary)' }} />
                      <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--color-text-primary)' }}>No attendance records found for this date</h4>
                      <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', maxWidth: 440 }}>
                        Click "Record Daily Labour" to select a project site and record today's worker counts.
                      </p>
                      <Button onClick={() => setIsPanelOpen(true)} style={{ marginTop: 8 }}>
                        <Layers size={16} /> Record Daily Labour
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : filteredTableRows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}>
                      <Filter size={28} style={{ color: 'var(--color-text-tertiary)' }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>No worker leaders match the selected filters.</p>
                      <Button variant="ghost" onClick={handleResetFilters} style={{ padding: '6px 12px' }}>
                        Clear Filters
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTableRows.map((row) => {
                  const cnt = row.isPresent ? Math.max(0, Number(row.workerCount) || 0) : 0;
                  const wage = Math.max(0, Number(row.dailyWage) || 0);
                  const total = cnt * wage;
                  const profName = row.profession?.name || 'General Trade';
                  const siteName = row.site?.name || selectedSite?.name || 'Assigned Site';

                  return (
                    <tr key={row.worker} className="attendance-table__row">
                      {/* Date */}
                      <td style={{ padding: '14px 16px', fontWeight: 500, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                        {formatDate(selectedDate)}
                      </td>

                      {/* Project Site Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-primary-800)', background: 'var(--color-primary-50, #eep2ff)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--color-primary-200, #c7d2fe)' }}>
                          <Building2 size={12} /> {siteName}
                        </span>
                      </td>

                      {/* Worker Leader Info */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {row.photo?.url ? (
                            <img
                              src={row.photo.url}
                              alt={row.name}
                              style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: '50%',
                                background: 'var(--color-primary-100)',
                                color: 'var(--color-primary-800)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: 14,
                                flexShrink: 0,
                              }}
                            >
                              {row.name[0]}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                              {row.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Profession */}
                      <td style={{ padding: '14px 16px' }}>
                        <span className="attendance-trade-tag">{profName}</span>
                      </td>

                      {/* Presence Status */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {row.isPresent ? (
                          <span className="attendance-status-badge attendance-status-badge--present">
                            <UserCheck size={14} /> Present
                          </span>
                        ) : (
                          <span className="attendance-status-badge attendance-status-badge--absent">
                            <UserX size={14} /> Absent
                          </span>
                        )}
                      </td>

                      {/* Worker Count */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span className={`attendance-worker-cnt-pill ${row.isPresent ? 'cnt-active' : 'cnt-zero'}`}>
                          {cnt} Labours
                        </span>
                      </td>

                      {/* Daily Wage */}
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        {formatCurrency(wage)} / worker
                      </td>

                      {/* Daily Total */}
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: row.isPresent ? 'var(--color-primary-700)' : 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                        {formatCurrency(total)}
                      </td>

                      {/* Remarks */}
                      <td style={{ padding: '14px 16px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', maxWidth: 160 }}>
                        {row.remarks ? (
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                            {row.remarks}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-tertiary)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        {filteredTableRows.length > 0 && (
          <div className="attendance-table__footer">
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              {formatDate(selectedDate)} · Total: {summaryTotals.totalWorkers} Labours Working ({summaryTotals.presentLeaders} Leaders Present)
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: 'var(--color-primary-800)' }}>
              Total Labour Cost: {formatCurrency(summaryTotals.totalLabourExpense)}
            </div>
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* POPUP / DRAWER MODAL FOR RECORD DAILY LABOUR */}
      {/* ------------------------------------------------------------- */}
      <Drawer
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title="Record Daily Labour Attendance"
        size="lg"
        footer={
          <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setIsPanelOpen(false)} disabled={saveDailyMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSaveAll} isLoading={saveDailyMutation.isPending}>
              <Save size={18} /> Save Attendance
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Popup Controls Bar: Site Selector (Super Admin Only), Date Picker, Import Previous Day */}
          <div className="attendance-drawer-header-box">
            {/* Site selector inside popup modal - VISIBLE ONLY TO SUPER ADMIN */}
            {isSuperAdmin ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 220, flex: '1 1 220px' }}>
                <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-primary-800)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Select Project Site *
                </label>
                <select
                  className="form-select"
                  value={drawerSiteId}
                  onChange={(e) => setDrawerSiteId(e.target.value)}
                  style={{ fontWeight: 700, borderColor: 'var(--color-primary-400)' }}
                >
                  <option value="">-- Select Project Site --</option>
                  {activeSites.data?.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Assigned Project Site
                </label>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: 'var(--color-primary-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={16} /> {selectedSite?.name || 'Assigned Site'}
                </div>
              </div>
            )}

            {/* Attendance Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
              <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Attendance Date
              </label>
              <DatePickerInput
                id="drawer-date-picker"
                value={selectedDate}
                onChange={(val) => setSelectedDate(val)}
                style={{ width: '100%' }}
              />
            </div>

            {/* Copy Data from Previous Date Button */}
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button variant="secondary" onClick={handleCopyPreviousDay} isLoading={prevDayQuery.isFetching}>
                <Copy size={16} /> Import Previous Day
              </Button>
            </div>
          </div>

          {/* Prompt if Super Admin hasn't selected a site in popup */}
          {isSuperAdmin && !drawerSiteId ? (
            <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--color-primary-300)', borderRadius: 'var(--radius-md)', background: 'var(--color-primary-50)' }}>
              <Building2 size={32} style={{ color: 'var(--color-primary-600)', marginBottom: 8 }} />
              <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--color-primary-900)' }}>Select a Project Site</h4>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-700)' }}>
                Please select a project site from the dropdown above to load workers and record daily attendance.
              </p>
            </div>
          ) : (
            <>
              {/* Select Worker Leader to Add Dropdown */}
              {drawerUnaddedLeaders.length > 0 && (
                <div className="attendance-add-leader-box">
                  <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-primary-800)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Add Worker Leader to Today's Attendance
                  </label>
                  <select
                    className="form-select"
                    value={selectedLeaderToAdd}
                    onChange={(e) => handleAddLeaderToList(e.target.value)}
                    style={{ background: '#ffffff', fontWeight: 500 }}
                  >
                    <option value="">+ Select a Worker Leader from site list...</option>
                    {drawerUnaddedLeaders.map((l) => (
                      <option key={l.worker} value={l.worker}>
                        {l.name} ({l.profession?.name || 'Trade'}) (@ ₹{l.dailyWage}/day)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Active Worker Leaders Attendance List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                    Attendance List for {formatDate(selectedDate)} ({drawerActiveRows.length} Leader{drawerActiveRows.length !== 1 ? 's' : ''})
                  </h4>
                  <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-primary-700)' }}>
                    Total Labours: {drawerTotals.totalWorkers} · Expense: {formatCurrency(drawerTotals.totalLabourExpense)}
                  </div>
                </div>

                {drawerAttendanceQuery.isLoading ? (
                  <div style={{ padding: '32px', textAlign: 'center' }}>
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Loading site workers...</p>
                  </div>
                ) : drawerActiveRows.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)' }}>
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                      No Worker Leaders registered for this site on {formatDate(selectedDate)}.
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                      New active workers added to this site will automatically appear here.
                    </p>
                  </div>
                ) : (
                  drawerActiveRows.map((row) => {
                    const cnt = row.isPresent ? Math.max(0, Number(row.workerCount) || 0) : 0;
                    const wage = Math.max(0, Number(row.dailyWage) || 0);
                    const totalCost = cnt * wage;

                    return (
                      <div
                        key={row.worker}
                        className={`attendance-drawer-card ${row.isPresent ? 'card-present' : 'card-absent'}`}
                      >
                        {/* Top row: Leader info + Present/Absent toggle + Remove button */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {row.photo?.url ? (
                              <img
                                src={row.photo.url}
                                alt={row.name}
                                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: '50%',
                                  background: 'var(--color-primary-100)',
                                  color: 'var(--color-primary-700)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: 16,
                                }}
                              >
                                {row.name[0]}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}>{row.name}</div>
                              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', background: 'var(--color-bg-secondary)', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>
                                {row.profession?.name || 'General Trade'}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => handleTogglePresence(row.worker)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 14px',
                                borderRadius: 20,
                                border: '1px solid',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                borderColor: row.isPresent ? 'var(--color-success-500, #22c55e)' : 'var(--color-gray-300)',
                                background: row.isPresent ? 'var(--color-success-50, #f0fdf4)' : 'var(--color-gray-100)',
                                color: row.isPresent ? 'var(--color-success-700, #15803d)' : 'var(--color-text-tertiary)',
                              }}
                            >
                              {row.isPresent ? <UserCheck size={15} /> : <UserX size={15} />}
                              <span>{row.isPresent ? 'Present' : 'Absent'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveLeaderFromList(row.worker)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-text-tertiary)',
                                cursor: 'pointer',
                                padding: 6,
                                borderRadius: 4,
                              }}
                              title="Remove from today's list"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Inputs Grid: Labours working, wage, total cost */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 'var(--space-md)', alignItems: 'center', background: 'var(--color-bg-secondary)', padding: '12px 14px', borderRadius: 8 }}>
                          <div>
                            <label style={{ fontSize: 'var(--font-size-2xs)', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                              Labours Working
                            </label>
                            <input
                              type="number"
                              min="0"
                              disabled={!row.isPresent}
                              value={row.isPresent ? row.workerCount : 0}
                              onChange={(e) => handleCountChange(row.worker, e.target.value)}
                              className="form-input"
                              style={{
                                fontWeight: 700,
                                fontSize: 'var(--font-size-md)',
                                textAlign: 'center',
                                borderColor: row.isPresent ? 'var(--color-primary-500)' : undefined,
                                background: row.isPresent ? '#ffffff' : undefined,
                              }}
                            />
                          </div>

                          <div>
                            <span style={{ fontSize: 'var(--font-size-2xs)', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                              Daily Wage Rate
                            </span>
                            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', paddingTop: 6 }}>
                              {formatCurrency(wage)} / worker
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: 'var(--font-size-2xs)', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                              Leader Daily Total
                            </span>
                            <div style={{ fontWeight: 800, fontSize: 'var(--font-size-md)', color: row.isPresent ? 'var(--color-primary-700)' : 'var(--color-text-tertiary)', paddingTop: 4 }}>
                              {formatCurrency(totalCost)}
                            </div>
                          </div>
                        </div>

                        {/* Remarks input */}
                        <div>
                          <input
                            type="text"
                            placeholder="Add remarks / note (optional)..."
                            value={row.remarks || ''}
                            onChange={(e) => handleRemarksChange(row.worker, e.target.value)}
                            className="form-input"
                            style={{ fontSize: 'var(--font-size-xs)' }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </Drawer>
    </div>
  );
}
