import { Upload } from 'lucide-react';
import './FileUpload.css';

export default function FileUpload({ label, accept, value, onChange, hint }) {
  return (
    <div className="file-upload">
      {label && <span className="file-upload__label">{label}</span>}
      <label className="file-upload__dropzone">
        <Upload size={18} />
        <span>{value ? value.name : 'Choose file or drag here'}</span>
        <input type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      </label>
      {hint && <span className="file-upload__hint">{hint}</span>}
    </div>
  );
}
