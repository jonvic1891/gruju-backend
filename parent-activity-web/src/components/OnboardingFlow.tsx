import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './OnboardingFlow.css';

interface OnboardingFlowProps {
  onComplete: () => void;
  onNavigateToProfile: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onNavigateToProfile }) => {
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    // Get current user info for personalization
    const userData = localStorage.getItem('userData');
    if (userData) {
      setUserInfo(JSON.parse(userData));
    }
  }, []);

  const handleAddParent = () => {
    // Navigate to profile screen and trigger add parent modal
    onNavigateToProfile();
  };

  const handleContinueSolo = () => {
    // Complete onboarding without adding parent
    onComplete();
  };

  const renderStep1 = () => (
    <div className="onboarding-step">
      <div className="step-header">
        <h2>👋 Welcome to Parent Activity App!</h2>
        <p>Let's get your family set up in just a few steps.</p>
      </div>

      <div className="step-content">
        <div className="family-setup-card">
          <h3>🏠 Family Account Setup</h3>
          <p>
            {userInfo?.family_name || 'Your family'} account has been created successfully! 
            Many families use this app with both parents to better coordinate activities.
          </p>
          
          <div className="setup-options">
            <div className="option-card recommended">
              <div className="option-header">
                <span className="option-icon">👫</span>
                <span className="option-title">Add Second Parent</span>
                <span className="recommended-badge">Recommended</span>
              </div>
              <p>Invite your partner to join your family account. You'll both be able to:</p>
              <ul>
                <li>Create and manage activities for your children</li>
                <li>Receive notifications about activity responses</li>
                <li>Connect with other families</li>
                <li>View the same calendar and children</li>
              </ul>
              <button 
                className="option-button primary"
                onClick={handleAddParent}
              >
                Add Second Parent
              </button>
            </div>

            <div className="option-card">
              <div className="option-header">
                <span className="option-icon">👤</span>
                <span className="option-title">Continue Solo</span>
              </div>
              <p>Set up your family account with just yourself for now. You can always add a second parent later from your profile settings.</p>
              <button 
                className="option-button secondary"
                onClick={handleContinueSolo}
              >
                Continue Solo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );


  return (
    <div className="onboarding-overlay">
      <div className="onboarding-container">
        <div className="progress-bar">
          <div className="progress-steps">
            <div className="progress-step active">
              <div className="step-number">1</div>
              <div className="step-label">Welcome</div>
            </div>
          </div>
        </div>

        <div className="onboarding-content">
          {renderStep1()}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;