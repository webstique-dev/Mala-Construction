import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Image as ImageIcon, FileText } from 'lucide-react';
import Button from './Button';
import './ImagePreviewModal.css';

/**
 * Reusable Responsive Image Preview Modal
 */
export function ImagePreviewModal({ isOpen, onClose, imageUrl, title = 'Document Preview', altText = 'Preview' }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const isPdf = imageUrl.toLowerCase().includes('.pdf') || imageUrl.toLowerCase().includes('/pdf/');

  return createPortal(
    <div className="image-preview-scrim" onClick={onClose} role="dialog" aria-modal="true">
      <div className="image-preview-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="image-preview-dialog__header">
          <span className="image-preview-dialog__title">{title}</span>
          <button type="button" className="image-preview-dialog__close-top" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="image-preview-dialog__body">
          {isPdf ? (
            <iframe src={imageUrl} title={title} className="image-preview-dialog__iframe" />
          ) : (
            <img src={imageUrl} alt={altText} className="image-preview-dialog__img" />
          )}
        </div>

        {/* <div className="image-preview-dialog__footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: 12, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-600)', textDecoration: 'none' }}
          >
            <ExternalLink size={14} /> Open Original
          </a>
        </div> */}
      </div>
    </div>,
    document.body
  );
}

/**
 * Reusable Image Thumbnail Button Component for Tables & Cards
 */
export function ImageThumbnail({ imageUrl, title = 'Attachment Preview', label = 'View' }) {
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  if (!imageUrl) {
    return <span className="no-image-badge">—</span>;
  }

  const isPdf = imageUrl.toLowerCase().includes('.pdf');

  return (
    <>
      <button
        type="button"
        className="image-preview-thumbnail-btn"
        onClick={() => setIsPreviewOpen(true)}
        title="Click to view image preview"
      >
        {isPdf ? (
          <FileText size={15} style={{ color: 'var(--color-danger-500)' }} />
        ) : (
          <ImageIcon size={15} style={{ color: 'var(--color-primary-500)' }} />
        )}
        <span>{label}</span>
      </button>

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={imageUrl}
        title={title}
      />
    </>
  );
}

export default ImagePreviewModal;
