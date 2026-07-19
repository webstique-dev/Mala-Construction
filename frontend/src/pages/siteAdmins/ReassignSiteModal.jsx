import { useState, useEffect } from 'react';
import Modal from '../../components/modals/Modal';
import Button from '../../components/common/Button';
import FormField from '../../components/forms/FormField';
import { useSites } from '../../hooks/useSites';
import { useReassignSiteAdmin } from '../../hooks/useSiteAdmins';
import { useToast } from '../../contexts/ToastContext';

export default function ReassignSiteModal({ isOpen, onClose, admin }) {
  const [siteId, setSiteId] = useState('');
  const { data: sitesData } = useSites({ limit: 100, status: 'active' });
  const reassign = useReassignSiteAdmin();
  const toast = useToast();

  useEffect(() => {
    if (isOpen) setSiteId('');
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!siteId) {
      toast.error('Please select a site.');
      return;
    }
    try {
      await reassign.mutateAsync({ id: admin._id, siteId });
      toast.success(`${admin.name} reassigned.`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reassign site.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reassign ${admin?.name || ''}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={reassign.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={reassign.isPending}>
            Reassign
          </Button>
        </>
      }
    >
      <FormField label="New site" required hint={`Currently assigned to: ${admin?.assignedSite?.name || 'no site'}`}>
        <select className="form-select" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">Select a site...</option>
          {sitesData?.items
            ?.filter((site) => site._id !== admin?.assignedSite?._id)
            .map((site) => (
              <option key={site._id} value={site._id} disabled={!!site.assignedSiteAdmin}>
                {site.name} ({site.code}){site.assignedSiteAdmin ? ' - already has an admin' : ''}
              </option>
            ))}
        </select>
      </FormField>
    </Modal>
  );
}
