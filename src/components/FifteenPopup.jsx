import React, { useState } from 'react';

const FifteenPopup = ({ onEndMeeting, onProceed }) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleEndMeeting = () => {
    setIsOpen(false);
    onEndMeeting?.();
  };

  const handleProceed = () => {
    setIsOpen(false);
    onProceed?.();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 9999,
    }}>
      <div style={{
        position: 'relative',
        backgroundColor: 'white',
        borderRadius: '8px',
        maxWidth: '28rem',
        width: '100%',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 10000,
      }}>
        <div style={{
          marginBottom: '24px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}>
            <svg 
              style={{
                width: '24px',
                height: '24px',
                color: '#3B82F6',
              }}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <path 
                strokeWidth="2"
                d="M12 6v6l4 4"
              />
            </svg>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#111827',
              margin: 0,
            }}>
              Time Check
            </h2>
          </div>
          <p style={{
            color: '#4B5563',
            margin: 0,
            fontSize: '14px',
          }}>
            30 minutes have elapsed in this meeting. Would you like to continue or end the meeting?
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
        }}>
          <button
            onClick={handleEndMeeting}
            style={{
              flex: 1,
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#E5E7EB'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#F3F4F6'}
          >
            End Meeting
          </button>
          <button
            onClick={handleProceed}
            style={{
              flex: 1,
              padding: '8px 16px',
              backgroundColor: '#3B82F6',
              color: 'white',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563EB'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3B82F6'}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default FifteenPopup;