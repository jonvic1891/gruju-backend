import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PhoneInput from './PhoneInput';
import AddressModal from './AddressModal';
import { validatePhoneNumber } from '../utils/phoneValidation';
import './LoginScreen.css';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [loginWithPhone, setLoginWithPhone] = useState(false);
  const { login, register, completeRegistration, isLoading, showAddressModal, pendingUserData, pendingToken, setShowAddressModal } = useAuth();
  const navigate = useNavigate();

  // Debug logging for modal state
  console.log('🔍 LoginScreen state:', {
    showAddressModal,
    pendingUserData: !!pendingUserData,
    pendingToken: !!pendingToken,
    isRegisterMode,
    isLoading,
    timestamp: new Date().toISOString()
  });

  // Debug logging for state changes
  useEffect(() => {
    console.log('🔄 showAddressModal changed to:', showAddressModal);
  }, [showAddressModal]);

  useEffect(() => {
    console.log('🔄 isRegisterMode changed to:', isRegisterMode);
  }, [isRegisterMode]);

  const handleAddressModalClose = () => {
    console.log('📍 Address modal closed (skipped)');
    // Complete registration even if address modal is closed without saving
    if (pendingUserData && pendingToken) {
      console.log('✅ Completing registration after address modal close');
      completeRegistration(pendingUserData, pendingToken);
    }
    // Navigate to children page which will show onboarding
    navigate('/children', { replace: true });
  };

  const handleAddressModalSaved = () => {
    console.log('📍 Address modal saved');
    // Complete registration after saving address
    if (pendingUserData && pendingToken) {
      console.log('✅ Completing registration after address save');
      completeRegistration(pendingUserData, pendingToken);
    }
    // Navigate to children page which will show onboarding
    navigate('/children', { replace: true });
  };

  // Clear all form fields when switching between login and register modes
  // BUT don't clear if we're showing the address modal (pending registration)
  useEffect(() => {
    console.log('🔄 isRegisterMode changed:', { isRegisterMode, showAddressModal });
    if (!showAddressModal) { // Only clear fields if we're not showing the address modal
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setConfirmPassword('');
      setPhone('');
      setLoginWithPhone(false);
    }
  }, [isRegisterMode, showAddressModal]);

  const demoAccounts = [
    {
      type: 'Admin Family',
      email: 'admin@parentactivityapp.com',
      password: 'demo123',
      description: 'Admin account with color-coded test activities and Emma Johnson',
      color: '#FF3B30',
      icon: '👑'
    },
    {
      type: 'Johnson Family',
      email: 'johnson@example.com',
      password: 'demo123',
      description: 'Multi-child family with Emma Johnson and Alex Johnson',
      color: '#34C759',
      icon: '👨‍👧‍👦'
    },
    {
      type: 'Davis Family',
      email: 'davis@example.com',
      password: 'demo123',
      description: 'Two-child family with Jake Davis and Mia Davis',
      color: '#007AFF',
      icon: '👨‍👩‍👧‍👦'
    },
    {
      type: 'Wong Family',
      email: 'wong@example.com',
      password: 'demo123',
      description: 'Large family with 3 children: Mia Wong, Ryan Wong, and Zoe Wong',
      color: '#AF52DE',
      icon: '👨‍👩‍👧‍👦'
    },
    {
      type: 'Thompson Family',
      email: 'thompson@example.com',
      password: 'demo123',
      description: 'Two-child family with Sophie Thompson and Oliver Thompson',
      color: '#32D74B',
      icon: '👨‍👩‍👧‍👦'
    },
    {
      type: 'Miller Family',
      email: 'joe@example.com',
      password: 'demo123',
      description: 'Single-child family with Theodore Miller',
      color: '#FF9500',
      icon: '👨‍👧'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const loginIdentifier = loginWithPhone ? phone : email;
    
    if (!loginIdentifier.trim() || !password.trim()) {
      alert('Please fill in all fields');
      return;
    }

    if (isRegisterMode) {
      if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
        alert('Please fill in all fields');
        return;
      }
      
      // Validate phone number
      const phoneValidation = validatePhoneNumber(phone);
      if (!phoneValidation.isValid) {
        alert(`Invalid phone number: ${phoneValidation.error}`);
        return;
      }
      
      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }
      
      const result = await register({ username: `${firstName} ${lastName}`, email, phone, password });
      console.log('🔐 Registration result:', result);
      
      if (result.success && result.user && result.token) {
        console.log('✅ Registration successful, address modal should be showing from AuthContext');
        
        // Force a small delay to check state
        setTimeout(() => {
          console.log('📍 Delayed check - showAddressModal should be true now');
        }, 100);
      } else {
        console.error('❌ Registration failed:', result.error);
        alert(`Registration Failed: ${result.error}`);
      }
    } else {
      // For login, validate phone number if using phone login
      if (loginWithPhone) {
        const phoneValidation = validatePhoneNumber(phone);
        if (!phoneValidation.isValid) {
          alert(`Invalid phone number: ${phoneValidation.error}`);
          return;
        }
      }
      
      const result = await login({ email: loginIdentifier, password });
      if (result.success) {
        navigate('/children', { replace: true });
      } else {
        alert(`Login Failed: ${result.error}`);
      }
    }
  };

  const handleDemoLogin = async (demoAccount: typeof demoAccounts[0]) => {
    setEmail(demoAccount.email);
    setPassword(demoAccount.password);
    
    const result = await login({ 
      email: demoAccount.email, 
      password: demoAccount.password 
    });
    
    if (result.success) {
      navigate('/children', { replace: true });
    } else {
      alert(`Login Failed: ${result.error}`);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo-container">
          <img 
            src="/logo-gruju.png" 
            alt="Gruju" 
            className="app-logo-extra-large"
          />
        </div>

        <form onSubmit={handleSubmit} className="form">
          <h2>{isRegisterMode ? 'Register' : 'Login'}</h2>
          
          {isRegisterMode && (
            <>
              <div className="name-fields">
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input name-input"
                  autoComplete="given-name"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input name-input"
                  autoComplete="family-name"
                />
              </div>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                placeholder="Phone"
                className="input"
                autoComplete="tel"
              />
            </>
          )}
          
          {!isRegisterMode && (
            <div className="login-type-toggle">
              <button
                type="button"
                className={`toggle-button ${!loginWithPhone ? 'active' : ''}`}
                onClick={() => setLoginWithPhone(false)}
              >
                📧 Email
              </button>
              <button
                type="button"
                className={`toggle-button ${loginWithPhone ? 'active' : ''}`}
                onClick={() => setLoginWithPhone(true)}
              >
                📱 Phone
              </button>
            </div>
          )}
          
          {!isRegisterMode && loginWithPhone ? (
            <PhoneInput
              value={phone}
              onChange={setPhone}
              placeholder="Phone Number"
              className="input"
              autoComplete="tel"
            />
          ) : (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              autoComplete={isRegisterMode ? "email" : "username"}
            />
          )}
          
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input password-input"
              autoComplete={isRegisterMode ? "new-password" : "current-password"}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          
          {isRegisterMode && (
            <div className="password-field">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input password-input"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          )}

          <button 
            type="submit" 
            className={`button ${isLoading ? 'button-disabled' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : (isRegisterMode ? 'Register' : 'Login')}
          </button>

          <button 
            type="button"
            className="link-button"
            onClick={() => setIsRegisterMode(!isRegisterMode)}
          >
            {isRegisterMode ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </form>

        {/* Demo Accounts Section */}
        <div className="demo-container">
          <button 
            className="demo-toggle"
            onClick={() => setShowDemoAccounts(!showDemoAccounts)}
          >
            {showDemoAccounts ? 'Hide Demo Accounts' : 'Show Demo Accounts'}
          </button>

          {showDemoAccounts && (
            <div className="demo-accounts">
              <h3>Demo Accounts</h3>
              <p>Click any account below to login instantly</p>
              
              {demoAccounts.map((account, index) => (
                <div
                  key={index}
                  className="demo-account"
                  style={{ borderLeftColor: account.color }}
                  onClick={() => handleDemoLogin(account)}
                >
                  <div className="demo-header">
                    <div className="demo-info">
                      <div className="demo-type">{account.type}</div>
                      <div className="demo-email">{account.email}</div>
                    </div>
                    <div 
                      className="demo-badge" 
                      style={{ backgroundColor: account.color }}
                    >
                      LOGIN
                    </div>
                  </div>
                  <p className="demo-description">{account.description}</p>
                </div>
              ))}
              
              <div className="demo-note">
                All demo accounts use password: demo123
              </div>
            </div>
          )}
        </div>
      </div>

      <AddressModal
        isOpen={showAddressModal}
        onClose={handleAddressModalClose}
        onSaved={handleAddressModalSaved}
        title="Please Provide Your Address"
        description="Please provide your address so we can match you to activities in your area."
        canSkip={true}
      />
    </div>
  );
};

export default LoginScreen;