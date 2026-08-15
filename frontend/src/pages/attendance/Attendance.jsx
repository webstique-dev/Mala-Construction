import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  DollarSign,
  Calendar,
  Layers,
  Copy,
  Save,
  Building2,
  CheckCircle2,
  UserCheck,
  UserX,
  Trash2,
  RotateCcw,
  Filter,
  AlertCircle,
  Inbox,
} from 'lucide-react';
import Button from '../../components/common/Button';
import DatePickerInput from '../../components/ui/DatePickerInput';
import Card from '../../components/ui/Card';
import Drawer from '../../components/drawers/Drawer';
import FilterToolbar from '../../components/common/FilterToolbar';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { useSiteScope } from '../../hooks/useSiteScope';
import { useLookups } from '../../hooks/useLookups';
import {
  useDailyAttendance,
  useSaveDailyAttendance,
  usePreviousDayWorkers,
} from '../../hooks/useAttendance';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency, formatDate } from '../../utils/format';
import '../../styles/operational-page.css';
import '../sites/Sites.css';
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

  // Effective site ID for the Mark Attendance drawer popup
  const drawerTargetSiteId = isSuperAdmin ? (drawerSiteId || undefined) : siteId;
  const drawerAttendanceQuery = useDailyAttendance({ siteId: drawerTargetSiteId, date: getLocalDateString() });

  // Local state for drawer attendance rows
  const [drawerRows, setDrawerRows] = useState([]);
  const [isDirty, setIsDirty] = useState(false);

  // Previous Day Copy Query for Drawer
  const [copyFetchEnabled, setCopyFetchEnabled] = useState(false);
  const prevDayQuery = usePreviousDayWorkers({ siteId: drawerTargetSiteId, date: getLocalDateString() }, copyFetchEnabled);

  // Synchronize drawer site selection when drawer opens
  useEffect(() => {
    if (isPanelOpen) {
      if (isSuperAdmin) {
        const defaultSite = siteFilter || activeSites.data?.[0]?._id || '';
        setDrawerSiteId(defaultSite);
      } else {
        setDrawerSiteId(siteId || '');
      }
    }
  }, [isPanelOpen, isSuperAdmin, siteFilter, siteId, activeSites.data]);

  // Populate drawer rows whenever drawer query loads or site changes
  useEffect(() => {
    if (drawerAttendanceQuery.data?.leaders) {
      setDrawerRows(
        drawerAttendanceQuery.data.leaders.map((l) => {
          const count = l.workerCount ?? l.defaultWorkerCount ?? 1;
          const isPresent = l.isMarked ? (l.status === 'present' || (l.status !== 'absent' && count > 0)) : true;
          return {
            worker: l._id,
            name: l.name,
            profession: l.profession,
            site: l.site,
            photo: l.photo,
            dailyWage: l.dailyWage,
            defaultWorkerCount: l.defaultWorkerCount ?? 1,
            workerCount: count,
            isPresent,
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
  }, [drawerAttendanceQuery.data, drawerTargetSiteId]);

  // Main table active rows derived from mainAttendanceQuery
  const mainTableRows = useMemo(() => {
    if (!mainAttendanceQuery.data?.leaders) return [];
    // Strict date filter guard: verify query date matches selectedDate
    if (mainAttendanceQuery.data?.date && mainAttendanceQuery.data.date !== selectedDate) {
      return [];
    }
    return mainAttendanceQuery.data.leaders
      .filter((l) => l.isMarked)
      .map((l) => {
        const count = l.workerCount ?? 0;
        const isPresent = l.status === 'present' || (l.status !== 'absent' && count > 0);
        return {
          worker: l._id,
          name: l.name,
          profession: l.profession,
          site: l.site,
          photo: l.photo,
          dailyWage: l.dailyWage,
          workerCount: count,
          status: l.status || (count > 0 ? 'present' : 'absent'),
          isPresent,
          isMarked: true,
          remarks: l.remarks || '',
        };
      });
  }, [mainAttendanceQuery.data, selectedDate]);

  // Filtered rows for main table view
  const filteredTableRows = useMemo(() => {
    return mainTableRows.filter((r) => {
      // Search filter (Name / Profession / Site)
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = r.name?.toLowerCase().includes(q);
        const matchesProf = (typeof r.profession === 'object' ? r.profession?.name : '')?.toLowerCase().includes(q);
        const matchesSite = r.site?.name?.toLowerCase().includes(q);
        if (!matchesName && !matchesProf && !matchesSite) return false;
      }
      // Profession filter
      if (professionFilter) {
        const profId = typeof r.profession === 'object' ? r.profession?._id?.toString() : r.profession?.toString();
        if (profId !== professionFilter.toString()) return false;
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
      isRecorded: (mainAttendanceQuery.data?.summary?.markedCount ?? 0) > 0,
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
    setSelectedDate(getLocalDateString());
    if (isSuperAdmin) setSiteFilter('');
  };

  // Filter toolbar configuration matching standard application layout
  const filterConfig = [
    {
      key: 'date',
      label: 'Date',
      type: 'date',
      value: selectedDate,
      onChange: (val) => setSelectedDate(val || getLocalDateString()),
    },
    ...(isSuperAdmin ? [{
      key: 'siteId',
      label: 'Site',
      type: 'select',
      value: siteFilter,
      onChange: (val) => setSiteFilter(val),
      options: activeSites.data?.map((s) => ({ value: s._id, label: s.name })) || [],
    }] : []),
    {
      key: 'profession',
      label: 'Profession',
      type: 'select',
      value: professionFilter,
      onChange: (val) => setProfessionFilter(val),
      options: professions.data?.map((p) => ({ value: p._id, label: p.name })) || [],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      value: statusFilter,
      onChange: (val) => setStatusFilter(val),
      options: [
        { value: 'present', label: 'Present Only' },
        { value: 'absent', label: 'Absent Only' },
      ],
    },
  ];

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

    try {
      const payload = {
        site: targetSite,
        date: getLocalDateString(),
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
      toast.success(`Daily attendance saved for today (${formatDate(getLocalDateString())}).`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance.');
    }
  };

  // -------------------------------------------------------------
  // NATIVE APPLICATION ATTENDANCE RECORDS VIEW
  // -------------------------------------------------------------
  return (
    <div className="module-page">
      {/* Module Page Header */}
      <div className="module-page__header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>Attendance Records</h1>
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
          <p>
            {isSuperAdmin && !siteFilter
              ? 'Viewing daily worker attendance across all project sites.'
              : `Daily worker counts and labour expense records for ${selectedSite?.name || 'assigned site'}.`}
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="attendance-page__header-actions">
          <Button onClick={() => setIsPanelOpen(true)}>
            <Layers size={18} /> Mark Attendance
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards Grid */}
      <div className="attendance-kpi-grid">
        <div className="attendance-kpi-card">
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
        </div>

        <div className="attendance-kpi-card">
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
              {summaryTotals.presentLeaders} Leaders Present Today
            </span>
          </div>
        </div>

        <div className="attendance-kpi-card">
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
        </div>

        <div className="attendance-kpi-card">
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
              {summaryTotals.isRecorded ? '● Attendance Recorded' : '● Draft / Not Recorded'}
            </span>
          </div>
        </div>
      </div>

      {/* Native Filter Toolbar Component */}
      <FilterToolbar
        search={search}
        onSearchChange={(v) => setSearch(v)}
        searchPlaceholder="Search worker, trade, or site..."
        filters={filterConfig}
        onReset={handleResetFilters}
        showChips={false}
      />

      {/* Main Roster Table */}
      <Card style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        {/* Table Header Bar */}
        <div style={{ padding: '14px 20px', background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Attendance Roster ({formatDate(selectedDate)})
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

        {mainAttendanceQuery.isLoading ? (
          <TableSkeleton rows={6} columns={isSuperAdmin ? 9 : 8} />
        ) : mainTableRows.length === 0 ? (
          <div className="sites-page__state sites-page__state--empty" style={{ padding: '48px 16px' }}>
            <Inbox size={36} style={{ color: 'var(--color-text-tertiary)' }} />
            <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--color-text-primary)' }}>No attendance records found for this date</h4>
            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', maxWidth: 440 }}>
              Click "Mark Attendance" to select a project site and record today's worker counts.
            </p>
            <Button onClick={() => setIsPanelOpen(true)} style={{ marginTop: 8 }}>
              <Layers size={16} /> Mark Attendance
            </Button>
          </div>
        ) : filteredTableRows.length === 0 ? (
          <div className="sites-page__state sites-page__state--empty" style={{ padding: '40px 16px' }}>
            <Filter size={28} style={{ color: 'var(--color-text-tertiary)' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No worker leaders match the selected filters.</p>
            <Button variant="ghost" onClick={handleResetFilters} style={{ padding: '6px 12px' }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="worker-payments-card__table-wrapper" style={{ border: 'none' }}>
            <table className="worker-payments-card__table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Date</th>
                  {isSuperAdmin && <th style={{ minWidth: 150 }}>Project Site</th>}
                  <th>Worker Leader</th>
                  <th>Profession / Trade</th>
                  <th style={{ textAlign: 'center', width: 120 }}>Status</th>
                  <th style={{ textAlign: 'center', width: 140 }}>Labours Working</th>
                  <th style={{ textAlign: 'right' }}>Daily Wage Rate</th>
                  <th style={{ textAlign: 'right' }}>Total Daily Cost</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredTableRows.map((row) => {
                  const cnt = row.isPresent ? Math.max(0, Number(row.workerCount) || 0) : 0;
                  const wage = Math.max(0, Number(row.dailyWage) || 0);
                  const total = cnt * wage;
                  const profName = row.profession?.name || 'General Trade';
                  const siteName = row.site?.name || selectedSite?.name || 'Assigned Site';

                  return (
                    <tr key={row.worker}>
                      {/* Date */}
                      <td style={{ fontWeight: 500, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                        {formatDate(selectedDate)}
                      </td>

                      {/* Project Site Badge - ONLY VISIBLE TO SUPER ADMIN */}
                      {isSuperAdmin && (
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-primary-800)', background: 'var(--color-primary-50)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--color-primary-200)' }}>
                            <Building2 size={12} /> {siteName}
                          </span>
                        </td>
                      )}

                      {/* Worker Leader Info */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {row.photo?.url ? (
                            <img
                              src={row.photo.url}
                              alt={row.name}
                              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 36,
                                height: 36,
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
                            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                              {row.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Profession */}
                      <td>
                        <span className="attendance-trade-tag">{profName}</span>
                      </td>

                      {/* Presence Status */}
                      <td style={{ textAlign: 'center' }}>
                        {row.isPresent ? (
                          <span className="attendance-status-badge attendance-status-badge--present">
                            <UserCheck size={13} /> Present
                          </span>
                        ) : (
                          <span className="attendance-status-badge attendance-status-badge--absent">
                            <UserX size={13} /> Absent
                          </span>
                        )}
                      </td>

                      {/* Worker Count */}
                      <td style={{ textAlign: 'center' }}>
                        <span className={`attendance-worker-cnt-pill ${row.isPresent ? 'cnt-active' : 'cnt-zero'}`}>
                          {cnt} Labours
                        </span>
                      </td>

                      {/* Daily Wage */}
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        {formatCurrency(wage)} / worker
                      </td>

                      {/* Daily Total */}
                      <td style={{ textAlign: 'right', fontWeight: 700, color: row.isPresent ? 'var(--color-primary-700)' : 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                        {formatCurrency(total)}
                      </td>

                      {/* Remarks */}
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', maxWidth: 160 }}>
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
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer Summary */}
        {filteredTableRows.length > 0 && (
          <div className="attendance-table__footer">
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              {formatDate(selectedDate)} · Total: {summaryTotals.totalWorkers} Labours Working ({summaryTotals.presentLeaders} Leaders Present)
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-primary-800)' }}>
              Total Labour Cost: {formatCurrency(summaryTotals.totalLabourExpense)}
            </div>
          </div>
        )}
      </Card>

      {/* POPUP / DRAWER MODAL FOR MARK ATTENDANCE */}
      <Drawer
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title="Mark Attendance"
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
          {/* Top Section Controls Bar: Project Site, Attendance Date (UI ONLY), Import Previous Day */}
          <div className="attendance-drawer-header-box">
            {/* Project Site Selection */}
            {isSuperAdmin ? (
              <div className="attendance-drawer-field">
                <label className="attendance-drawer-label">SELECT PROJECT SITE *</label>
                <select
                  className="form-select"
                  value={drawerSiteId}
                  onChange={(e) => setDrawerSiteId(e.target.value)}
                  style={{ fontWeight: 600, height: 42 }}
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
              <div className="attendance-drawer-field">
                <label className="attendance-drawer-label">PROJECT SITE</label>
                <div className="attendance-drawer-read-badge">
                  <Building2 size={15} /> {selectedSite?.name || 'Assigned Site'}
                </div>
              </div>
            )}

            {/* Attendance Date (UI ONLY) */}
            <div className="attendance-drawer-field">
              <label className="attendance-drawer-label">Attendance Date</label>
              <div className="attendance-drawer-read-badge">
                <Calendar size={15} /> {formatDate(getLocalDateString())}
              </div>
            </div>

            {/* Import Previous Day Button */}
            <div className="attendance-drawer-action">
              <Button variant="secondary" onClick={handleCopyPreviousDay} isLoading={prevDayQuery.isFetching} className="attendance-drawer-btn">
                <Copy size={15} /> Import Previous Day
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
                  <label className="attendance-add-leader-label">
                    ADD WORKER LEADER TO TODAY'S ATTENDANCE
                  </label>
                  <select
                    className="form-select attendance-add-leader-select"
                    value={selectedLeaderToAdd}
                    onChange={(e) => handleAddLeaderToList(e.target.value)}
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
                <div className="attendance-summary-header">
                  <div className="attendance-summary-title">
                    ATTENDANCE LIST FOR {formatDate(getLocalDateString()).toUpperCase()} ({drawerActiveRows.length} LEADER{drawerActiveRows.length !== 1 ? 'S' : ''})
                  </div>
                  <div className="attendance-summary-stats">
                    <span>Total Labours: <strong>{drawerTotals.totalWorkers}</strong></span>
                    <span className="attendance-summary-divider">•</span>
                    <span>Expense: <strong>{formatCurrency(drawerTotals.totalLabourExpense)}</strong></span>
                  </div>
                </div>

                {drawerAttendanceQuery.isLoading ? (
                  <div style={{ padding: '32px', textAlign: 'center' }}>
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Loading site workers...</p>
                  </div>
                ) : drawerActiveRows.length === 0 ? (
                  <div className="sites-page__state sites-page__state--empty" style={{ padding: '32px' }}>
                    <Inbox size={32} />
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                      No Worker Leaders registered for this site on {formatDate(getLocalDateString())}.
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
                        className={`attendance-worker-card ${row.isPresent ? 'card-present' : 'card-absent'}`}
                      >
                        {/* Top row: Leader info + Present/Absent toggle + Remove button */}
                        <div className="attendance-worker-card__header">
                          <div className="attendance-worker-info">
                            {row.photo?.url ? (
                              <img
                                src={row.photo.url}
                                alt={row.name}
                                className="attendance-worker-avatar"
                              />
                            ) : (
                              <div className="attendance-worker-avatar-initial">
                                {row.name[0]?.toLowerCase()}
                              </div>
                            )}
                            <div>
                              <div className="attendance-worker-name">{row.name}</div>
                              <div className="attendance-worker-role">{row.profession?.name || 'General Helper'}</div>
                            </div>
                          </div>

                          <div className="attendance-worker-actions">
                            <button
                              type="button"
                              onClick={() => handleTogglePresence(row.worker)}
                              className={`attendance-presence-pill ${row.isPresent ? 'presence-pill--present' : 'presence-pill--absent'}`}
                            >
                              {row.isPresent ? <UserCheck size={14} /> : <UserX size={14} />}
                              <span>{row.isPresent ? 'Present' : 'Absent'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveLeaderFromList(row.worker)}
                              className="attendance-worker-delete-btn"
                              title="Remove from today's list"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Inputs Grid: Labours working, wage, total cost */}
                        <div className="attendance-worker-card__grid">
                          <div className="attendance-grid-col">
                            <label className="attendance-grid-label">LABOURS WORKING</label>
                            <input
                              type="number"
                              min="0"
                              disabled={!row.isPresent}
                              value={row.isPresent ? row.workerCount : 0}
                              onChange={(e) => handleCountChange(row.worker, e.target.value)}
                              className="form-input attendance-count-input"
                              style={{
                                borderColor: row.isPresent ? 'var(--color-primary-500)' : undefined,
                              }}
                            />
                          </div>

                          <div className="attendance-grid-col">
                            <label className="attendance-grid-label">DAILY WAGE RATE</label>
                            <div className="attendance-grid-value">
                              {formatCurrency(wage)} / worker
                            </div>
                          </div>

                          <div className="attendance-grid-col attendance-grid-col--right">
                            <label className="attendance-grid-label">LEADER DAILY TOTAL</label>
                            <div className={`attendance-grid-total ${row.isPresent ? 'total-active' : 'total-disabled'}`}>
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
                            className="form-input attendance-remarks-input"
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
