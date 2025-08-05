import React from 'react';
import './TimePickerDropdown.css';

interface TimePickerDropdownProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
}

const TimePickerDropdown: React.FC<TimePickerDropdownProps> = ({ 
  value, 
  onChange, 
  placeholder = "Select time",
  className = ""
}) => {
  // Generate hour options (24-hour format)
  const hours = [];
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

  return (
    <div className={`time-picker-dropdown ${className}`}>
      <div className="time-selectors">
        <select
          value={currentTime.hour}
          onChange={(e) => handleTimeChange('hour', e.target.value)}
          className="time-select hour-select"
        >
          <option value="">Hour</option>
          {hours.map(hour => {
            const hourNum = parseInt(hour);
            const displayHour = hourNum === 0 ? '12 AM' : hourNum <= 12 ? `${hourNum} ${hourNum === 12 ? 'PM' : 'AM'}` : `${hourNum - 12} PM`;
            return (
              <option key={hour} value={hour}>{displayHour}</option>
            );
          })}
        </select>
        
        <span className="time-separator">:</span>
        
        <select
          value={currentTime.minute}
          onChange={(e) => handleTimeChange('minute', e.target.value)}
          className="time-select minute-select"
        >
          <option value="">Min</option>
          {minutes.map(minute => (
            <option key={minute} value={minute}>{minute}</option>
          ))}
        </select>
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