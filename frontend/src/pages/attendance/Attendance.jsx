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
  Edit,
  Trash2,
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
  // Automatically opens with local current/live date
  const [selectedDate, setSelectedDate] = useState(getLocalDateString);
  const [siteFilter, setSiteFilter] = useState('');

  const { isSuperAdmin, siteId } = useSiteScope(siteFilter || undefined);
  const activeSiteId = isSuperAdmin ? siteFilter || undefined : siteId;

  const { activeSites } = useLookups(activeSiteId);
  const selectedSite = activeSites.data?.find((s) => s._id === activeSiteId);

  // Daily Attendance Query & Mutation
  const dailyQuery = useDailyAttendance({ siteId: activeSiteId, date: selectedDate });
  const saveDailyMutation = useSaveDailyAttendance();

  // Local state for editable attendance rows on selected date
  const [rows, setRows] = useState([]);
  const [isDirty, setIsDirty] = useState(false);

  // Right-Side Slide-in Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedLeaderToAdd, setSelectedLeaderToAdd] = useState('');

  // Previous Day Copy query
  const [copyFetchEnabled, setCopyFetchEnabled] = useState(false);
  const prevDayQuery = usePreviousDayWorkers({ siteId: activeSiteId, date: selectedDate }, copyFetchEnabled);

  // Populate local rows when dailyQuery data loads or selectedDate changes
  useEffect(() => {
    if (dailyQuery.data?.leaders) {
      setRows(
        dailyQuery.data.leaders.map((l) => {
          const count = l.workerCount ?? l.defaultWorkerCount ?? 1;
          return {
            worker: l._id,
            name: l.name,
            profession: l.profession,
            photo: l.photo,
            dailyWage: l.dailyWage,
            defaultWorkerCount: l.defaultWorkerCount ?? 1,
            workerCount: count,
            isPresent: count > 0,
            isMarked: l.isMarked,
            attendanceId: l.attendanceId,
            remarks: l.remarks || '',
            inList: l.isMarked || count > 0, // leaders included in today's active list
          };
        })
      );
      setIsDirty(false);
    }
  }, [dailyQuery.data, selectedDate]);

  // Leaders available to be added from dropdown (not currently in the active list)
  const unaddedLeaders = useMemo(() => {
    return rows.filter((r) => !r.inList);
  }, [rows]);

  // Active leaders included in current attendance list
  const activeRows = useMemo(() => {
    return rows.filter((r) => r.inList);
  }, [rows]);

  // Compute summary totals from active rows
  const summaryTotals = useMemo(() => {
    let totalWorkers = 0;
    let totalLabourExpense = 0;
    let presentLeaders = 0;

    activeRows.forEach((r) => {
      if (r.isPresent) {
        presentLeaders++;
        const cnt = Math.max(0, Number(r.workerCount) || 0);
        const wage = Math.max(0, Number(r.dailyWage) || 0);
        totalWorkers += cnt;
        totalLabourExpense += cnt * wage;
      }
    });
    return { totalWorkers, totalLabourExpense, presentLeaders };
  }, [activeRows]);

  // Handle adding a Worker Leader from dropdown list into the panel
  const handleAddLeaderToList = (leaderId) => {
    if (!leaderId) return;
    setRows((prev) =>
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

  // Handle removing a leader row from active attendance list
  const handleRemoveLeaderFromList = (leaderId) => {
    setRows((prev) =>
      prev.map((r) => (r.worker === leaderId ? { ...r, inList: false, isPresent: false, workerCount: 0 } : r))
    );
    setIsDirty(true);
  };

  // Toggle leader presence
  const handleTogglePresence = (workerId) => {
    setRows((prev) =>
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

  // Handle worker count change for a leader
  const handleCountChange = (workerId, newCount) => {
    const val = parseInt(newCount, 10);
    const count = isNaN(val) ? 0 : Math.max(0, val);
    setRows((prev) =>
      prev.map((r) => (r.worker === workerId ? { ...r, workerCount: count, isPresent: count > 0 } : r))
    );
    setIsDirty(true);
  };

  // Reuse previous date's attendance data inside the slide-in panel
  const handleCopyPreviousDay = async () => {
    if (!activeSiteId) {
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
      setRows((prev) =>
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

  // Save attendance for the selected date
  const handleSaveAll = async () => {
    if (!activeSiteId) {
      toast.error('Please select a project site.');
      return;
    }
    if (!selectedDate) {
      toast.error('Please select an attendance date.');
      return;
    }

    try {
      const payload = {
        site: activeSiteId,
        date: selectedDate,
        records: rows.map((r) => ({
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

  return (
    <div className="attendance-page">
      {/* Page Header - Single Primary Action Button */}
      <div className="attendance-page__header-section">
        <div>
          <h1>Labour Attendance</h1>
          <p>Record daily attendance and worker counts for each Worker Leader.</p>
        </div>
        <div className="attendance-page__header-actions">
          <Button onClick={() => setIsPanelOpen(true)}>
            <Layers size={18} /> Record Daily Labour
          </Button>
        </div>
      </div>

      {/* Top Scope & Summary Bar */}
      <Card className="attendance-top-bar" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Attendance Date
              </label>
              <DatePickerInput
                id="attendance-date-picker"
                value={selectedDate}
                onChange={(val) => setSelectedDate(val)}
                style={{ minWidth: 160 }}
              />
            </div>

            {isSuperAdmin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Project Site
                </label>
                <select
                  className="form-select"
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  style={{ minWidth: 200 }}
                >
                  <option value="">Select Site</option>
                  {activeSites.data?.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!isSuperAdmin && selectedSite && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Assigned Site
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, padding: '8px 12px', background: 'var(--color-primary-50)', color: 'var(--color-primary-800)', borderRadius: 6, border: '1px solid var(--color-primary-200)' }}>
                  <Building2 size={16} />
                  <span>{selectedSite.name}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
            <div className="attendance-kpi-pill">
              <span className="attendance-kpi-pill__label">Active Leaders</span>
              <span className="attendance-kpi-pill__value">{summaryTotals.presentLeaders} / {activeRows.length}</span>
            </div>

            <div className="attendance-kpi-pill">
              <span className="attendance-kpi-pill__label">Total Workers Today</span>
              <span className="attendance-kpi-pill__value">{summaryTotals.totalWorkers}</span>
            </div>

            <div className="attendance-kpi-pill attendance-kpi-pill--cost">
              <span className="attendance-kpi-pill__label">Daily Labour Cost</span>
              <span className="attendance-kpi-pill__value">{formatCurrency(summaryTotals.totalLabourExpense)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Overview Table: Daily Attendance for Selected Date */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="attendance-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: 120 }}>Attendance</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Worker Leader</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Profession</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: 180 }}>Workers Working Today</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Daily Wage</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Daily Total</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: 100 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {dailyQuery.isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                    Loading Worker Leaders...
                  </td>
                </tr>
              ) : activeRows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}>
                      <Users size={32} />
                      <p style={{ margin: 0, fontWeight: 500 }}>No attendance recorded for {selectedDate}.</p>
                      <Button onClick={() => setIsPanelOpen(true)} style={{ marginTop: 8 }}>
                        <Layers size={16} /> Record Daily Labour
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                activeRows.map((row) => {
                  const cnt = row.isPresent ? Math.max(0, Number(row.workerCount) || 0) : 0;
                  const wage = Math.max(0, Number(row.dailyWage) || 0);
                  const total = cnt * wage;

                  return (
                    <tr
                      key={row.worker}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: row.isPresent ? 'transparent' : 'var(--color-bg-secondary)',
                        opacity: row.isPresent ? 1 : 0.7,
                      }}
                    >
                      {/* Attendance Status */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleTogglePresence(row.worker)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: 20,
                            border: '1px solid',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            borderColor: row.isPresent ? 'var(--color-success-500)' : 'var(--color-gray-300)',
                            background: row.isPresent ? 'var(--color-success-50)' : 'var(--color-gray-100)',
                            color: row.isPresent ? 'var(--color-success-700)' : 'var(--color-text-tertiary)',
                          }}
                        >
                          {row.isPresent ? <UserCheck size={15} /> : <UserX size={15} />}
                          <span>{row.isPresent ? 'Present' : 'Absent'}</span>
                        </button>
                      </td>

                      {/* Worker Leader Info */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {row.photo?.url ? (
                            <img
                              src={row.photo.url}
                              alt={row.name}
                              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: 'var(--color-primary-100)',
                                color: 'var(--color-primary-700)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: 14,
                              }}
                            >
                              {row.name[0]}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{row.name}</div>
                          </div>
                        </div>
                      </td>

                      {/* Profession */}
                      <td style={{ padding: '14px 16px', color: 'var(--color-text-secondary)' }}>
                        <span style={{ display: 'inline-block', background: 'var(--color-bg-secondary)', padding: '2px 8px', borderRadius: 4, fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>
                          {row.profession?.name || 'Trade'}
                        </span>
                      </td>

                      {/* Workers Working Today */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          disabled={!row.isPresent}
                          value={row.isPresent ? row.workerCount : 0}
                          onChange={(e) => handleCountChange(row.worker, e.target.value)}
                          className="form-input"
                          style={{
                            width: 90,
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: 'var(--font-size-base)',
                            margin: '0 auto',
                            borderColor: row.isPresent && row.workerCount > 0 ? 'var(--color-primary-500)' : undefined,
                            opacity: row.isPresent ? 1 : 0.5,
                          }}
                        />
                      </td>

                      {/* Daily Wage */}
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500 }}>
                        {formatCurrency(wage)}
                      </td>

                      {/* Daily Total */}
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: row.isPresent ? 'var(--color-primary-700)' : 'var(--color-text-tertiary)' }}>
                        {formatCurrency(total)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {row.isMarked && !isDirty ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-success-600)', fontSize: 'var(--font-size-xs)', fontWeight: 600, background: 'var(--color-success-50)', padding: '4px 8px', borderRadius: 12 }}>
                            <CheckCircle2 size={14} /> Saved
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-warning-600)', fontSize: 'var(--font-size-xs)', fontWeight: 600, background: 'var(--color-warning-50)', padding: '4px 8px', borderRadius: 12 }}>
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {activeRows.length > 0 && (
          <div style={{ padding: 'var(--space-md)', background: 'var(--color-bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              {selectedDate} · {summaryTotals.presentLeaders} of {activeRows.length} Leader(s) Present ({summaryTotals.totalWorkers} workers)
            </span>
            <Button onClick={() => setIsPanelOpen(true)}>
              <Edit size={16} /> Edit Attendance Panel
            </Button>
          </div>
        )}
      </Card>

      {/* RIGHT-SIDE SLIDE-IN PANEL (DRAWER) FOR RECORD DAILY LABOUR */}
      <Drawer
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title="Record Daily Labour"
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
          {/* Panel Top Header Bar: Date in Top-Left, Add Data from Previous Date in Top-Right */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            {/* Top-Left Corner: Selected Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Attendance Date
              </label>
              <DatePickerInput
                id="drawer-date-picker"
                value={selectedDate}
                onChange={(val) => setSelectedDate(val)}
                style={{ width: 170 }}
              />
            </div>

            {/* Top-Right Corner: Add Data from Previous Date */}
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button variant="secondary" onClick={handleCopyPreviousDay} isLoading={prevDayQuery.isFetching}>
                <Copy size={16} /> Add Data from Previous Date
              </Button>
            </div>
          </div>

          {/* Clean Worker Leader Selection Dropdown List to add Leaders */}
          {unaddedLeaders.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--color-primary-50)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary-200)' }}>
              <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-primary-800)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Select Worker Leader to Add
              </label>
              <select
                className="form-select"
                value={selectedLeaderToAdd}
                onChange={(e) => handleAddLeaderToList(e.target.value)}
                style={{ background: '#ffffff', fontWeight: 500 }}
              >
                <option value="">+ Select a Worker Leader from available list...</option>
                {unaddedLeaders.map((l) => (
                  <option key={l.worker} value={l.worker}>
                    {l.name} ({l.profession?.name || 'Trade'}) — Default: {l.defaultWorkerCount} workers (@ ₹{l.dailyWage}/day)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selected Worker Leaders List with Editable Worker Counts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                Attendance List for {selectedDate} ({activeRows.length} Leader{activeRows.length !== 1 ? 's' : ''})
              </h4>
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-primary-700)' }}>
                Total Workers: {summaryTotals.totalWorkers} · Cost: {formatCurrency(summaryTotals.totalLabourExpense)}
              </div>
            </div>

            {activeRows.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)' }}>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  No Worker Leaders added for {selectedDate} yet.
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                  Use the dropdown above or click "Add Data from Previous Date" to populate records.
                </p>
              </div>
            ) : (
              activeRows.map((row) => {
                const cnt = row.isPresent ? Math.max(0, Number(row.workerCount) || 0) : 0;
                const wage = Math.max(0, Number(row.dailyWage) || 0);
                const totalCost = cnt * wage;

                return (
                  <div
                    key={row.worker}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      padding: 'var(--space-md)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: row.isPresent ? 'var(--color-primary-200)' : 'var(--color-border)',
                      background: row.isPresent ? 'var(--color-surface)' : 'var(--color-bg-secondary)',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
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
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', background: 'var(--color-bg-secondary)', padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>
                            {row.profession?.name || 'Trade'}
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
                            borderColor: row.isPresent ? 'var(--color-success-500)' : 'var(--color-gray-300)',
                            background: row.isPresent ? 'var(--color-success-50)' : 'var(--color-gray-100)',
                            color: row.isPresent ? 'var(--color-success-700)' : 'var(--color-text-tertiary)',
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)', alignItems: 'center', background: 'var(--color-bg-secondary)', padding: '10px 12px', borderRadius: 8 }}>
                      <div>
                        <label style={{ fontSize: 'var(--font-size-2xs)', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                          Workers Working
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
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
