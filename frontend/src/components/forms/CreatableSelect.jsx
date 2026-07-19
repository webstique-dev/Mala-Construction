import React, { useState } from 'react';
import Creatable from 'react-select/creatable';

export default function CreatableSelect({
  value,
  onChange,
  options = [],
  onCreate,
  placeholder = 'Select or create...',
  isLoading = false,
  isDisabled = false,
}) {
  const [isCreating, setIsCreating] = useState(false);

  const selectOptions = options.map((opt) => ({
    value: opt._id,
    label: opt.name,
  }));

  const selectedOption = selectOptions.find((opt) => opt.value === value) || null;

  const handleCreate = async (inputValue) => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    setIsCreating(true);
    try {
      const res = await onCreate(trimmedValue);
      // Immediately select the newly created option
      if (res && res.data) {
        onChange(res.data._id);
      }
    } catch (err) {
      console.error('Failed to create custom lookup option:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const isValidNewOption = (inputValue, selectValue, selectOptions) => {
    const cleanInput = inputValue.trim().toLowerCase();
    if (!cleanInput) return false;
    const isDuplicate = selectOptions.some(
      (opt) => opt.label.trim().toLowerCase() === cleanInput
    );
    return !isDuplicate;
  };

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
    <Creatable
      options={selectOptions}
      value={selectedOption}
      onChange={(opt) => onChange(opt ? opt.value : '')}
      onCreateOption={handleCreate}
      isValidNewOption={isValidNewOption}
      isClearable
      isDisabled={isDisabled}
      isLoading={isLoading || isCreating}
      placeholder={placeholder}
      styles={customStyles}
      formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
    />
  );
}
