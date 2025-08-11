import React, { useState } from 'react';
import './CalendarDatePicker.css';

interface CalendarDatePickerProps {
  selectedDates: string[];
  onChange: (dates: string[]) => void;
  minDate?: string;
  className?: string;
}

const CalendarDatePicker: React.FC<CalendarDatePickerProps> = ({
  selectedDates,
  onChange,
  minDate,
  className = ""
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) { // 6 weeks x 7 days
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return { days, firstDay: firstDay.getDate(), lastDay: lastDay.getDate(), currentMonth: month };
  };

  const formatDate = (date: Date) => {
    // Use local date formatting to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.includes(formatDate(date));
  };

  const isDateDisabled = (date: Date) => {
    if (!minDate) return false;
    return formatDate(date) < minDate;
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;

    const dateStr = formatDate(date);
    const newSelectedDates = isDateSelected(date)
      ? selectedDates.filter(d => d !== dateStr)
      : [...selectedDates, dateStr];
    
    onChange(newSelectedDates.sort());
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const { days, currentMonth: monthIndex } = getDaysInMonth(currentMonth);
  // Get today's date in local time to avoid timezone confusion
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to avoid any time-based issues
  const todayStr = formatDate(today);

  return (
    <div className={`calendar-date-picker ${className}`}>
      <div className="calendar-header">
        <button 
          type="button"
          onClick={() => navigateMonth('prev')}
          className="nav-btn"
        >
          ‹
        </button>
        
        <div className="month-year">
          <h3>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
        </div>
        
        <button 
          type="button"
          onClick={() => navigateMonth('next')}
          className="nav-btn"
        >
          ›
        </button>
      </div>

      <div className="calendar-controls">
        <button 
          type="button"
          onClick={goToToday}
          className="today-btn"
        >
          Today
        </button>
        
        {selectedDates.length > 0 && (
          <button 
            type="button"
            onClick={() => onChange([])}
            className="clear-btn"
          >
            Clear All ({selectedDates.length})
          </button>
        )}
      </div>

      <div className="calendar-grid">
        <div className="day-headers">
          {dayNames.map(day => (
            <div key={day} className="day-header">{day}</div>
          ))}
        </div>
        
        <div className="days-grid">
          {days.map((date, index) => {
            const isCurrentMonth = date.getMonth() === monthIndex;
            const isSelected = isDateSelected(date);
            const isDisabled = isDateDisabled(date);
            const isToday = formatDate(date) === todayStr;
            
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleDateClick(date)}
                disabled={isDisabled}
                className={`
                  day-cell
                  ${isCurrentMonth ? 'current-month' : 'other-month'}
                  ${isSelected ? 'selected' : ''}
                  ${isDisabled ? 'disabled' : ''}
                  ${isToday ? 'today' : ''}
                `}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDates.length > 0 && (
        <div className="selected-dates-summary">
          <strong>Selected Dates ({selectedDates.length}):</strong>
          <div className="date-tags">
            {selectedDates.map(date => {
              // Parse date more reliably to avoid timezone issues
              const [year, month, day] = date.split('-').map(Number);
              const dateObj = new Date(year, month - 1, day); // month is 0-indexed
              const dayName = dayNames[dateObj.getDay()];
              const monthName = monthNames[dateObj.getMonth()];
              const dayNum = dateObj.getDate();
              
              return (
                <span key={date} className="date-tag">
                  {dayName}, {monthName} {dayNum}
                  <button
                    type="button"
                    onClick={() => onChange(selectedDates.filter(d => d !== date))}
                    className="remove-date"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarDatePicker;