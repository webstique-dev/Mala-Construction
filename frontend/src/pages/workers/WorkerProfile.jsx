import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, MapPin, Calendar, DollarSign, Award, ShieldAlert, History } from 'lucide-react';
import { useWorkerProfile } from '../../hooks/useWorkers';
import { formatCurrency, formatDate } from '../../utils/format';
import Card from '../../components/ui/Card';
import AccordionCard from '../../components/ui/AccordionCard';
import '../../styles/operational-page.css';
import './WorkerProfile.css';

import { ProfileSkeleton, TableSkeleton, Skeleton } from '../../components/ui/Skeleton';

export default function WorkerProfile() {
  const { id } = useParams();
  const { data, isLoading, isError } = useWorkerProfile(id);

  if (isLoading) {
    return (
      <div className="worker-profile worker-profile--loading">
        <Skeleton width="120px" height="20px" style={{ marginBottom: 20 }} />
        <ProfileSkeleton />
        <div style={{ marginTop: 24 }}>
          <TableSkeleton rows={5} columns={5} />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="worker-profile__error-state">
        <div className="dashboard-error-state__content">
          <h2>Worker Not Found</h2>
          <p>We couldn't locate this worker file. It might have been deleted or doesn't exist.</p>
          <Link to="/workers" className="worker-profile__back" style={{ marginTop: 'var(--space-md)' }}>
            <ArrowLeft size={16} /> Back to workers registry
          </Link>
        </div>
      </div>
    );
  }

  const { worker, payments, totalPaid } = data;

  return (
    <div className="worker-profile">
      <Link to="/workers" className="worker-profile__back">
        <ArrowLeft size={16} /> Back to workers registry
      </Link>

      <div className="worker-profile__hero-dashboard">
        <div className="worker-profile__hero-card">
          <div className="worker-profile__avatar-container">
            {worker.photo?.url ? (
              <img src={worker.photo.url} alt={worker.name} className="worker-profile__photo-img" />
            ) : (
              <div className="worker-profile__avatar-placeholder">{worker.name[0]}</div>
            )}
          </div>
          <div className="worker-profile__hero-meta">
            <span className={`status-badge worker-profile__badge status-badge--${worker.status === 'active' ? 'active' : 'inactive'}`}>
              {worker.status}
            </span>
            <h1>{worker.name}</h1>
            <p className="worker-profile__profession">
              <Award size={16} style={{ color: 'var(--color-primary-500)', flexShrink: 0 }} />
              <span>{worker.profession?.name || 'Laborer'} · {worker.site?.name || 'Unassigned Site'}</span>
            </p>
          </div>
        </div>

        <div className="worker-profile__kpi-grid">
          <Card className="worker-kpi-card">
            <div className="worker-kpi-card__header">
              <span>Daily Wage Rate</span>
              <DollarSign size={16} className="worker-kpi-card__icon" />
            </div>
            <h3>{formatCurrency(worker.dailyWage)}</h3>
          </Card>
          <Card className="worker-kpi-card">
            <div className="worker-kpi-card__header">
              <span>Total Paid Wages</span>
              <History size={16} className="worker-kpi-card__icon worker-kpi-card__icon--success" />
            </div>
            <h3 className="worker-kpi-card__value--success">{formatCurrency(totalPaid)}</h3>
          </Card>
        </div>
      </div>

      <div className="worker-profile__dashboard-grid">
        <div className="worker-profile__sidebar-col">
          <Card className="worker-info-card">
            <div className="worker-info-card__header">
              <h3>Personal Profile Details</h3>
            </div>
            <div className="worker-info-card__list">
              <div className="worker-info-card__item">
                <span className="worker-info-card__label">Mobile Phone</span>
                <span className="worker-info-card__value">
                  <Phone size={14} style={{ marginRight: 6, color: 'var(--color-steel-400)' }} />
                  {worker.phone}
                </span>
              </div>
              <div className="worker-info-card__item">
                <span className="worker-info-card__label">Home Address</span>
                <span className="worker-info-card__value">
                  <MapPin size={14} style={{ marginRight: 6, color: 'var(--color-steel-400)' }} />
                  {worker.address || 'Not specified'}
                </span>
              </div>
              <div className="worker-info-card__item">
                <span className="worker-info-card__label">Date of Joining</span>
                <span className="worker-info-card__value">
                  <Calendar size={14} style={{ marginRight: 6, color: 'var(--color-steel-400)' }} />
                  {formatDate(worker.joiningDate)}
                </span>
              </div>
            </div>
          </Card>

          <Card className="worker-info-card worker-info-card--emergency">
            <div className="worker-info-card__header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={18} style={{ color: 'var(--color-warning-500)' }} />
                Emergency Contact
              </h3>
            </div>
            {worker.emergencyContact?.name ? (
              <div className="worker-info-card__list">
                <div className="worker-info-card__item">
                  <span className="worker-info-card__label">Contact Name</span>
                  <span className="worker-info-card__value">{worker.emergencyContact.name}</span>
                </div>
                <div className="worker-info-card__item">
                  <span className="worker-info-card__label">Contact Phone</span>
                  <span className="worker-info-card__value">{worker.emergencyContact.phone}</span>
                </div>
              </div>
            ) : (
              <p className="worker-info-card__empty">No emergency contacts saved.</p>
            )}
          </Card>
        </div>

        <div className="worker-profile__main-col">
          <Card className="worker-payments-card">
            <div className="worker-payments-card__header">
              <h3>Wages Invoices & Payment Ledger</h3>
            </div>
            {payments.length === 0 ? (
              <p className="worker-profile__empty">No wage disbursements recorded yet.</p>
            ) : (
              <>
                <div className="desktop-only">
                  <div className="worker-payments-card__table-wrapper">
                    <table className="worker-payments-card__table">
                      <thead>
                        <tr>
                          <th>Paid Date</th>
                          <th>Working Days</th>
                          <th>Net Paid Salary</th>
                          <th>Disbursement Method</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p._id}>
                            <td>{formatDate(p.paidOn)}</td>
                            <td><strong>{p.workingDays} days</strong></td>
                            <td className="worker-payments-card__amount">{formatCurrency(p.netSalary)}</td>
                            <td>{p.paymentMethod}</td>
                            <td>
                              <span className={`status-badge status-badge--${p.status}`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mobile-only">
                  {payments.map((p) => (
                    <AccordionCard
                      key={p._id}
                      header={{
                        title: `Paid on ${formatDate(p.paidOn)}`,
                        status: (
                          <span className={`status-badge status-badge--${p.status}`}>
                            {p.status}
                          </span>
                        ),
                        category: `${p.workingDays} days`,
                        secondary: formatCurrency(p.netSalary)
                      }}
                      details={[
                        { label: 'Disbursement Method', value: p.paymentMethod }
                      ]}
                    />
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
