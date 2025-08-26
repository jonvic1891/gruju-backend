export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
}

export const validatePhoneNumber = (phoneNumber: string): PhoneValidationResult => {
  if (!phoneNumber || !phoneNumber.trim()) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters for validation
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  // Check if it starts with a country code
  if (!phoneNumber.startsWith('+')) {
    return { isValid: false, error: 'Phone number must include country code' };
  }

  // Basic length validation - most international numbers are 7-15 digits
  if (digitsOnly.length < 7) {
    return { isValid: false, error: 'Phone number is too short' };
  }

  if (digitsOnly.length > 15) {
    return { isValid: false, error: 'Phone number is too long' };
  }

  // Country-specific validation
  if (phoneNumber.startsWith('+44')) {
    // UK: After +44, should have 10 digits (mobile) or 10-11 digits (landline)
    const ukNumber = digitsOnly.substring(2);
    if (ukNumber.length < 10 || ukNumber.length > 11) {
      return { isValid: false, error: 'UK phone number should have 10-11 digits after +44' };
    }
  } else if (phoneNumber.startsWith('+1')) {
    // US/Canada: After +1, should have exactly 10 digits
    const northAmericaNumber = digitsOnly.substring(1);
    if (northAmericaNumber.length !== 10) {
      return { isValid: false, error: 'US/Canada phone number should have exactly 10 digits after +1' };
    }
  } else if (phoneNumber.startsWith('+61')) {
    // Australia: After +61, should have 9 digits (mobile) or 8 digits (landline)
    const auNumber = digitsOnly.substring(2);
    if (auNumber.length < 8 || auNumber.length > 9) {
      return { isValid: false, error: 'Australian phone number should have 8-9 digits after +61' };
    }
  }

  return { isValid: true };
};

export const formatPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) return '';

  // Return as-is if it already has country code
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }

  // Remove any leading zero and add UK country code as default
  let cleaned = phoneNumber.replace(/^\+?0?/, '');
  return `+44${cleaned}`;
};

export const parsePhoneNumber = (phoneNumber: string): { countryCode: string; nationalNumber: string } | null => {
  if (!phoneNumber || !phoneNumber.startsWith('+')) {
    return null;
  }

  const countries = [
    { code: '+44', length: 2 },
    { code: '+1', length: 1 },
    { code: '+61', length: 2 },
    { code: '+49', length: 2 },
    { code: '+33', length: 2 },
    { code: '+39', length: 2 },
    { code: '+34', length: 2 },
    { code: '+31', length: 2 },
    { code: '+41', length: 2 },
    { code: '+351', length: 3 },
    { code: '+30', length: 2 },
    { code: '+64', length: 2 },
    { code: '+353', length: 3 },
    { code: '+86', length: 2 },
    { code: '+91', length: 2 },
    { code: '+81', length: 2 },
    { code: '+82', length: 2 },
    { code: '+65', length: 2 },
    { code: '+7', length: 1 },
    { code: '+90', length: 2 },
    { code: '+966', length: 3 },
    { code: '+971', length: 3 },
    { code: '+972', length: 3 },
    { code: '+27', length: 2 },
    { code: '+20', length: 2 },
    { code: '+55', length: 2 },
    { code: '+54', length: 2 },
    { code: '+52', length: 2 },
  ];

  for (const country of countries) {
    if (phoneNumber.startsWith(country.code)) {
      return {
        countryCode: country.code,
        nationalNumber: phoneNumber.substring(country.code.length)
      };
    }
  }

  return null;
};