import React from 'react';
import './Skeleton.css';

/** Base Shimmer Box */
export function Skeleton({
  width = '100%',
  height = '16px',
  borderRadius,
  circle = false,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`skeleton-box ${circle ? 'skeleton-box--circle' : ''} ${className}`.trim()}
      style={{
        width,
        height,
        ...(borderRadius ? { borderRadius } : {}),
        ...style,
      }}
    />
  );
}

/** KPI / Stat Card Skeleton */
export function CardSkeleton({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-stat-card" key={i}>
          <Skeleton className="skeleton-stat-card__icon" />
          <div className="skeleton-stat-card__content">
            <Skeleton width="45%" height="12px" />
            <Skeleton width="75%" height="22px" />
          </div>
        </div>
      ))}
    </>
  );
}

/** Grid Card Skeleton (Site Cards, Worker Cards, Admin Cards) */
export function GridCardSkeleton({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-grid-card" key={i}>
          <div className="skeleton-grid-card__header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <Skeleton width="44px" height="44px" borderRadius="12px" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <Skeleton width="70%" height="16px" />
                <Skeleton width="40%" height="12px" />
              </div>
            </div>
            <Skeleton width="50px" height="22px" borderRadius="12px" />
          </div>

          <div className="skeleton-grid-card__body">
            <Skeleton width="100%" height="12px" />
            <Skeleton width="85%" height="12px" />
            <Skeleton width="60%" height="12px" />
          </div>

          <div className="skeleton-grid-card__footer">
            <Skeleton width="30%" height="14px" />
            <Skeleton width="80px" height="32px" borderRadius="8px" />
          </div>
        </div>
      ))}
    </>
  );
}

/** Table Skeleton */
export function TableSkeleton({ rows = 5, columns = 6 }) {
  return (
    <div className="skeleton-table-wrapper">
      <table className="skeleton-table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, j) => (
              <th key={j}>
                <Skeleton width="70%" height="14px" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: columns }).map((_, j) => (
                <td key={j}>
                  <Skeleton width={j === 0 ? '80%' : j === columns - 1 ? '40%' : '60%'} height="14px" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Chart Skeleton (Line or Doughnut) */
export function ChartSkeleton({ type = 'line' }) {
  return (
    <div className="skeleton-chart-card">
      <div className="skeleton-chart-card__header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton width="180px" height="18px" />
          <Skeleton width="120px" height="12px" />
        </div>
        <Skeleton width="100px" height="32px" borderRadius="8px" />
      </div>

      {type === 'doughnut' ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '260px' }}>
          <Skeleton width="200px" height="200px" circle />
        </div>
      ) : (
        <div className="skeleton-chart-card__body">
          {Array.from({ length: 8 }).map((_, i) => {
            const heights = ['40%', '65%', '30%', '85%', '50%', '70%', '45%', '90%'];
            return (
              <Skeleton
                key={i}
                className="skeleton-chart-bar"
                height={heights[i % heights.length]}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Accordion / List Skeleton for Mobile Cards */
export function AccordionSkeleton({ count = 4 }) {
  return (
    <div className="skeleton-accordion-list">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-accordion-card" key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton width="50%" height="16px" />
            <Skeleton width="25%" height="14px" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width="100%" height="12px" />
            <Skeleton width="80%" height="12px" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Form Skeleton */
export function FormSkeleton({ fields = 6 }) {
  return (
    <div className="skeleton-form">
      {Array.from({ length: fields }).map((_, i) => (
        <div className="skeleton-form-field" key={i}>
          <Skeleton width="35%" height="12px" />
          <Skeleton width="100%" height="40px" borderRadius="8px" />
        </div>
      ))}
    </div>
  );
}

/** Profile Page Skeleton */
export function ProfileSkeleton() {
  return (
    <div className="skeleton-profile-container">
      <div className="skeleton-profile-header">
        <Skeleton width="80px" height="80px" circle />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <Skeleton width="220px" height="22px" />
          <Skeleton width="140px" height="14px" />
          <Skeleton width="180px" height="14px" />
        </div>
      </div>
      <FormSkeleton fields={6} />
    </div>
  );
}

export default Skeleton;
