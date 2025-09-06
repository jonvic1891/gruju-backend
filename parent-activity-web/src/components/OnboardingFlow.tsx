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
        <h2>👋 Welcome to Gruju!</h2>
        <p>Let's get your family set up in just a few steps.</p>
      </div>

      <div className="step-content">
        <div className="family-setup-card">
          <h3>🏠 Family Account Setup</h3>
          <p>
            {userInfo?.family_name || 'Your family'} account has been created successfully! 
            You can choose to add another parent if you'd like to share account access.
          </p>
          
          <div className="setup-options">
            <div className="option-card">
              <div className="option-header">
                <span className="option-icon">👫</span>
                <span className="option-title">Add Another Parent</span>
              </div>
              <p>If you have a partner, you can invite them to join your family account. You'll both be able to:</p>
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
                Add Another Parent
              </button>
            </div>

            <div className="option-card">
              <div className="option-header">
                <span className="option-icon">🏃</span>
                <span className="option-title">Continue to Set Up Children</span>
              </div>
              <p>Continue with setting up your children and start organizing activities.</p>
              <button 
                className="option-button secondary"
                onClick={handleContinueSolo}
              >
                Continue to Set Up Children
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
          <div className="progress-header">
          <div className="progress-logo">
            <img 
              src="/gruju-logo-white.png" 
              alt="Gruju" 
              className="progress-brand-logo"
              onError={(e) => {
                console.error('Progress logo failed to load:', e);
                e.currentTarget.style.display = 'none';
              }}
            />
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