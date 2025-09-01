import React, { useEffect, useRef, useState } from 'react';
import './TimePickerDropdown.css';

interface TimePickerDropdownProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
  defaultScrollPosition?: 'start' | 'end'; // 'start' = 7am, 'end' = 3pm
}

const TimePickerDropdown: React.FC<TimePickerDropdownProps> = ({ 
  value, 
  onChange, 
  placeholder = "Select time",
  className = "",
  defaultScrollPosition
}) => {
  const hourDropdownRef = useRef<HTMLDivElement>(null);
  const minuteDropdownRef = useRef<HTMLDivElement>(null);
  const [isHourDropdownOpen, setIsHourDropdownOpen] = useState(false);
  const [isMinuteDropdownOpen, setIsMinuteDropdownOpen] = useState(false);

  // Generate hour options in chronological order (12am to 11pm)
  const hours: string[] = [];
  for (let i = 0; i <= 23; i++) {
    hours.push(i.toString().padStart(2, '0'));
  }

  // Generate minute options (every 15 minutes)
  const minutes = [];
  for (let i = 0; i < 60; i += 15) {
    minutes.push(i.toString().padStart(2, '0'));
  }

  // Parse current value (expected format: "HH:MM")
  const parseTime = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return { hour: '', minute: '' };
    
    const [hour, minute] = timeStr.split(':');
    return {
      hour: hour || '',
      minute: minute || ''
    };
  };

  const currentTime = parseTime(value);

  // Auto-scroll hour dropdown when opened
  useEffect(() => {
    if (isHourDropdownOpen && hourDropdownRef.current && defaultScrollPosition) {
      const dropdown = hourDropdownRef.current;
      let targetHour = 0;
      
      if (defaultScrollPosition === 'start') {
        targetHour = 7; // 7am for start times
      } else if (defaultScrollPosition === 'end') {
        targetHour = 15; // 3pm for end times
      }
      
      // Use setTimeout to ensure dropdown is fully rendered
      setTimeout(() => {
        const targetIndex = hours.indexOf(targetHour.toString().padStart(2, '0'));
        if (targetIndex !== -1) {
          // Get the actual heights from DOM
          const placeholder = dropdown.querySelector('.hour-option-placeholder');
          const firstOption = dropdown.querySelector('.hour-option');
          
          const placeholderHeight = placeholder?.getBoundingClientRect().height || 32;
          const itemHeight = firstOption?.getBoundingClientRect().height || 32;
          
          // Scroll so the target hour appears at the top of visible area
          const scrollPosition = (targetIndex * itemHeight);
          dropdown.scrollTop = scrollPosition;
        }
      }, 150); // Increased delay
    }
  }, [isHourDropdownOpen, defaultScrollPosition, hours]);

  // Auto-scroll minute dropdown when opened (scroll to :00)
  useEffect(() => {
    if (isMinuteDropdownOpen && minuteDropdownRef.current) {
      // Use setTimeout to ensure dropdown is fully rendered
      setTimeout(() => {
        const dropdown = minuteDropdownRef.current;
        if (dropdown) {
          // Scroll to :00 (first option after placeholder)
          dropdown.scrollTop = 0;
        }
      }, 50);
    }
  }, [isMinuteDropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (hourDropdownRef.current && !hourDropdownRef.current.contains(event.target as Node)) {
        setIsHourDropdownOpen(false);
      }
      if (minuteDropdownRef.current && !minuteDropdownRef.current.contains(event.target as Node)) {
        setIsMinuteDropdownOpen(false);
      }
    };

    if (isHourDropdownOpen || isMinuteDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isHourDropdownOpen, isMinuteDropdownOpen]);

  const handleTimeChange = (field: 'hour' | 'minute', newValue: string) => {
    const updatedTime = { ...currentTime, [field]: newValue };
    
    // Only call onChange if both hour and minute are selected
    if (updatedTime.hour && updatedTime.minute) {
      onChange(`${updatedTime.hour}:${updatedTime.minute}`);
    } else if (field === 'hour' && newValue) {
      // If setting hour and we don't have minute, default to :00
      onChange(`${newValue}:00`);
    } else if (field === 'minute' && newValue && updatedTime.hour) {
      // If setting minute and we have hour
      onChange(`${updatedTime.hour}:${newValue}`);
    }
  };

  const formatDisplayTime = (hour: string, minute: string) => {
    if (!hour || !minute) return '';
    const hourNum = parseInt(hour);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${displayHour}:${minute} ${period}`;
  };

  const getDisplayHour = (hour: string) => {
    const hourNum = parseInt(hour);
    if (hourNum === 0) {
      return '12 AM';
    } else if (hourNum < 12) {
      return `${hourNum} AM`;
    } else if (hourNum === 12) {
      return '12 PM';
    } else {
      return `${hourNum - 12} PM`;
    }
  };

  return (
    <div className={`time-picker-dropdown ${className}`}>
      <div className="time-selectors">
        <div className="hour-dropdown-container">
          <div 
            className={`time-select hour-select ${isHourDropdownOpen ? 'open' : ''}`}
            onClick={() => setIsHourDropdownOpen(!isHourDropdownOpen)}
          >
            {currentTime.hour ? getDisplayHour(currentTime.hour) : 'Hour'}
          </div>
          
          {isHourDropdownOpen && (
            <div 
              ref={hourDropdownRef}
              className="hour-dropdown-list"
            >
              <div className="hour-option-placeholder">Hour</div>
              {hours.map(hour => (
                <div
                  key={hour}
                  className={`hour-option ${currentTime.hour === hour ? 'selected' : ''}`}
                  onClick={() => {
                    handleTimeChange('hour', hour);
                    setIsHourDropdownOpen(false);
                  }}
                >
                  {getDisplayHour(hour)}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <span className="time-separator">:</span>
        
        <div className="minute-dropdown-container">
          <div 
            className={`time-select minute-select ${isMinuteDropdownOpen ? 'open' : ''}`}
            onClick={() => setIsMinuteDropdownOpen(!isMinuteDropdownOpen)}
          >
            {currentTime.minute || 'Min'}
          </div>
          
          {isMinuteDropdownOpen && (
            <div 
              ref={minuteDropdownRef}
              className="minute-dropdown-list"
            >
              <div className="minute-option-placeholder">Min</div>
              {minutes.map(minute => (
                <div
                  key={minute}
                  className={`minute-option ${currentTime.minute === minute ? 'selected' : ''}`}
                  onClick={() => {
                    handleTimeChange('minute', minute);
                    setIsMinuteDropdownOpen(false);
                  }}
                >
                  {minute}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {currentTime.hour && currentTime.minute && (
        <div className="time-display">
          {formatDisplayTime(currentTime.hour, currentTime.minute)}
        </div>
      )}
    </div>
  );
};

export default TimePickerDropdown;