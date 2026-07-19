import React, { useMemo } from 'react';
import Select from 'react-select';

const ISO_COUNTRIES = [
  'IN','US','GB','AE','AU','CA','NZ','ZA','SG','MY','ID','PH','BR','DE','FR','ES','IT','NL','SE','NO','DK','BE','CH','JP','CN'
];

function getCountryName(code) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code);
  } catch (e) {
    return code;
  }
}

export default function CountrySelect({ value, onChange, placeholder = 'Select country', isSearchable = true }) {
  const options = useMemo(() => ISO_COUNTRIES.map((c) => ({ value: c, label: `${getCountryName(c)} (${c})` })), []);
  const selected = options.find((o) => o.value === value) || null;

  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: 48,
      borderRadius: 16,
      backgroundColor: 'var(--color-surface)',
      borderColor: state.isFocused ? 'var(--color-primary-500)' : 'var(--color-border)',
      color: 'var(--color-text-primary)',
      boxShadow: state.isFocused ? '0 0 0 4px rgba(30, 111, 255, 0.14)' : 'none',
      transition: 'all var(--duration-fast) var(--ease-standard)',
      '&:hover': {
        borderColor: 'var(--color-primary-300)',
      }
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: '0 16px',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'var(--color-text-primary)',
    }),
    input: (provided) => ({
      ...provided,
      color: 'var(--color-text-primary)',
      margin: 0,
      padding: 0,
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'var(--color-text-secondary)',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      boxShadow: 'var(--shadow-md)',
      zIndex: 9999,
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? 'var(--color-primary-500)' 
        : state.isFocused 
        ? 'var(--color-bg)' 
        : 'transparent',
      color: state.isSelected 
        ? '#ffffff' 
        : 'var(--color-text-primary)',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: 'var(--color-primary-500)',
        color: '#ffffff',
      }
    }),
  };

  return (
    <Select
      options={options}
      value={selected}
      onChange={(opt) => onChange(opt ? opt.value : '')}
      isClearable
      isSearchable={isSearchable}
      placeholder={placeholder}
      styles={customStyles}
    />
  );
}
