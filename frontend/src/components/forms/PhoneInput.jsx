import React from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import './PhoneInput.css';

export default function PhoneField({ value, onChange, placeholder = 'Phone number', defaultCountry = 'IN' }) {
  const handleChange = (v) => {
    onChange(v || '');
  };

  return (
    <PhoneInput
      international
      defaultCountry={defaultCountry}
      value={value || ''}
      onChange={handleChange}
      placeholder={placeholder}
    />
  );
}

export function validatePhone(value) {
  if (!value) return false;
  return isValidPhoneNumber(value);
}
