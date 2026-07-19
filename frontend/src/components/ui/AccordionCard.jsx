import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from './Card';
import './AccordionCard.css';

export default function AccordionCard({
  header, // { title, status, category, secondary }
  details = [], // Array of { label, value }
  actions, // Action buttons elements
  isDeleted = false
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className={`accordion-card ${isDeleted ? 'accordion-card--deleted' : ''} ${isExpanded ? 'accordion-card--expanded' : ''}`}>
      {/* Clickable Header */}
      <button
        type="button"
        className="accordion-card__header touch-target"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div className="accordion-card__header-content">
          <div className="accordion-card__header-left">
            <h4 className="accordion-card__title">{header.title}</h4>
            <div className="accordion-card__subtitle">
              {header.category && <span className="accordion-card__category">{header.category}</span>}
              {header.secondary && <span className="accordion-card__secondary">{header.secondary}</span>}
            </div>
          </div>
          <div className="accordion-card__header-right">
            {header.status}
            <ChevronDown
              size={18}
              className={`accordion-card__chevron ${isExpanded ? 'accordion-card__chevron--expanded' : ''}`}
            />
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="accordion-card__collapse-wrapper"
          >
            <div className="accordion-card__body">
              <div className="accordion-card__details-grid">
                {details.map((item, idx) => (
                  <div key={idx} className="accordion-card__detail-item">
                    <span className="accordion-card__detail-label">{item.label}</span>
                    <span className="accordion-card__detail-value">{item.value}</span>
                  </div>
                ))}
              </div>

              {actions && (
                <div className="accordion-card__actions-wrapper">
                  <div className="accordion-card__actions">
                    {actions}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
