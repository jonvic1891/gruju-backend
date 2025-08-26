import React, { useState, useEffect, useRef } from 'react';
import './PhoneInput.css';

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

interface PhoneInputProps {
  value: string;
  onChange: (fullPhoneNumber: string) => void;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
}

const COUNTRIES: Country[] = [
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { code: 'GR', name: 'Greece', dialCode: '+30', flag: '🇬🇷' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
  { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
];

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  placeholder = "Phone number",
  className = "",
  autoComplete = "tel"
}) => {
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Default to UK
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, left: number, width: number} | null>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  // Debug effect to monitor state changes
  useEffect(() => {
    console.log('PhoneInput state:', { selectedCountry, phoneNumber, showDropdown, value });
  }, [selectedCountry, phoneNumber, showDropdown, value]);

  // Parse the existing phone number on component mount or value change
  useEffect(() => {
    console.log('PhoneInput useEffect - value:', value);
    if (value && value.trim()) {
      // Check if the value already has a country code
      const matchingCountry = COUNTRIES.find(country => value.startsWith(country.dialCode));
      if (matchingCountry) {
        console.log('Found matching country:', matchingCountry);
        setSelectedCountry(matchingCountry);
        // Remove the country code and any leading zeros
        let nationalNumber = value.substring(matchingCountry.dialCode.length);
        if (nationalNumber.startsWith('0')) {
          nationalNumber = nationalNumber.substring(1);
        }
        setPhoneNumber(nationalNumber);
      } else {
        // Assume it's a national number - default to UK for now
        console.log('No country code found, assuming UK national number');
        const ukCountry = COUNTRIES.find(country => country.code === 'GB') || COUNTRIES[0];
        setSelectedCountry(ukCountry);
        let nationalNumber = value;
        if (nationalNumber.startsWith('0')) {
          nationalNumber = nationalNumber.substring(1);
        }
        setPhoneNumber(nationalNumber);
        
        // Update parent with the full international format
        const fullNumber = formatPhoneNumber(ukCountry, nationalNumber);
        if (fullNumber !== value) {
          console.log('Updating parent with full number:', fullNumber);
          onChange(fullNumber);
        }
      }
    } else {
      console.log('No value provided, using defaults');
      setPhoneNumber('');
      setSelectedCountry(COUNTRIES[0]); // Reset to UK
    }
  }, [value]);

  const handleCountryChange = (country: Country) => {
    console.log('Country changed to:', country);
    setSelectedCountry(country);
    setShowDropdown(false);
    
    // Update the full phone number
    const fullNumber = formatPhoneNumber(country, phoneNumber);
    onChange(fullNumber);
  };

  const handleSelectorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Selector clicked, current showDropdown:', showDropdown);
    
    if (!showDropdown && selectorRef.current) {
      const rect = selectorRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
      console.log('Dropdown position calculated:', { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
    }
    
    setShowDropdown(!showDropdown);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Remove any non-digit characters except spaces and hyphens
    inputValue = inputValue.replace(/[^\d\s-]/g, '');
    
    // Remove leading zero if present
    if (inputValue.startsWith('0')) {
      inputValue = inputValue.substring(1);
    }
    
    setPhoneNumber(inputValue);
    
    // Update the full phone number
    const fullNumber = formatPhoneNumber(selectedCountry, inputValue);
    onChange(fullNumber);
  };

  const formatPhoneNumber = (country: Country, nationalNumber: string): string => {
    if (!nationalNumber.trim()) return '';
    return `${country.dialCode}${nationalNumber.replace(/\s/g, '')}`;
  };

  return (
    <div className="phone-input-container">
      <div className={`phone-input-wrapper ${className}`}>
        <div 
          ref={selectorRef}
          className="country-selector"
          onClick={handleSelectorClick}
        >
          <span className="flag">{selectedCountry?.flag || '🇬🇧'}</span>
          <span className="dial-code">{selectedCountry?.dialCode || '+44'}</span>
          <span className="dropdown-arrow">▼</span>
        </div>
        
        <input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          className="phone-number-input"
          autoComplete={autoComplete}
        />
        
      </div>
      
      {/* Fixed position dropdown outside the container to avoid clipping */}
      {showDropdown && dropdownPosition && (
        <div 
          className="country-dropdown-portal"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 99999
          }}
        >
          {COUNTRIES.map((country) => (
            <div
              key={country.code}
              className={`country-option ${selectedCountry.code === country.code ? 'selected' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCountryChange(country);
              }}
            >
              <span className="flag">{country.flag}</span>
              <span className="country-name">{country.name}</span>
              <span className="dial-code">{country.dialCode}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="dropdown-overlay" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default PhoneInput;