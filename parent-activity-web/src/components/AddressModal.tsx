import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './AddressModal.css';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  title?: string;
  description?: string;
  canSkip?: boolean;
}

const AddressModal: React.FC<AddressModalProps> = ({ 
  isOpen, 
  onClose, 
  onSaved, 
  title = "Add Your Address",
  description = "Help us personalize your experience by adding your address information.",
  canSkip = false
}) => {
  const [addressLine1, setAddressLine1] = useState('');
  const [townCity, setTownCity] = useState('');
  const [stateProvinceCountry, setStateProvinceCountry] = useState('');
  const [postCode, setPostCode] = useState('');
  const [saving, setSaving] = useState(false);

  const apiService = ApiService.getInstance();
  const { pendingUserData, user, pendingToken, refreshUser } = useAuth();

  // Debug logging
  console.log('🏠 AddressModal props:', {
    isOpen,
    title,
    description,
    canSkip,
    timestamp: new Date().toISOString()
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🏠 AddressModal opening, resetting form');
      setAddressLine1('');
      setTownCity('');
      setStateProvinceCountry('');
      setPostCode('');
    }
  }, [isOpen]);

  const handleSave = async () => {
    // Validate required fields
    if (!townCity.trim()) {
      alert('Please enter your town/city - this helps us suggest local activities.');
      return;
    }

    setSaving(true);
    try {
      // Get current user data from either pending registration or existing user
      const currentUser = pendingUserData || user;
      if (!currentUser) {
        throw new Error('No user data available');
      }

      console.log('🏠 AddressModal: Saving address for user:', {
        hasUser: !!currentUser,
        currentUser: currentUser,
        pendingUserData: pendingUserData,
        extractedUsername: currentUser.username || currentUser.name || '',
        extractedEmail: currentUser.email || '',
        extractedPhone: currentUser.phone || '',
        hasPendingData: !!pendingUserData,
        hasPendingToken: !!pendingToken,
        allUserKeys: currentUser ? Object.keys(currentUser) : []
      });

      // Ensure API service has the correct token if we're in pending registration
      if (pendingToken && pendingUserData) {
        console.log('🏠 AddressModal: Setting pending token for API service');
        apiService.setToken(pendingToken);
      }

      // Pass the user data from registration along with address fields
      const response = await apiService.updateProfile({
        username: currentUser.username || currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        address_line_1: addressLine1.trim(),
        town_city: townCity.trim(),
        state_province_country: stateProvinceCountry.trim(),
        post_code: postCode.trim()
      });

      console.log('🏠 AddressModal: Update profile response:', response);

      if (response.success) {
        // Refresh user data to include the new address
        if (refreshUser) {
          await refreshUser();
        }
        onSaved();
      } else {
        console.error('❌ AddressModal: Failed to save address:', response.error);
        alert(`Failed to save address: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ AddressModal: Error saving address:', error);
      alert(`Failed to save address: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (canSkip) {
      onSaved(); // Proceed without saving
    }
  };

  if (!isOpen) return null;

  return (
    <div className="address-modal-overlay">
      <div className="address-modal">
        <div className="address-modal-header">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <div className="address-modal-content">
          <div className="form-group">
            <label>Address Line 1</label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className="form-input"
              placeholder="Street address"
            />
          </div>

          <div className="address-row">
            <div className="form-group">
              <label>Town/City *</label>
              <input
                type="text"
                value={townCity}
                onChange={(e) => setTownCity(e.target.value)}
                className="form-input"
                placeholder="Town or city"
                required
              />
            </div>

            <div className="form-group">
              <label>Post Code</label>
              <input
                type="text"
                value={postCode}
                onChange={(e) => setPostCode(e.target.value)}
                className="form-input"
                placeholder="Post code"
              />
            </div>
          </div>

          <div className="form-group">
            <label>State/Province/Country</label>
            <input
              type="text"
              value={stateProvinceCountry}
              onChange={(e) => setStateProvinceCountry(e.target.value)}
              className="form-input"
              placeholder="State, province, or country"
            />
          </div>

          <div className="address-modal-note">
            <p>💡 Your town/city will be used to suggest local activities when you create new events.</p>
          </div>
        </div>

        <div className="address-modal-actions">
          {canSkip && (
            <button
              onClick={handleSkip}
              className="skip-btn"
              disabled={saving}
            >
              Skip for now
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="save-btn"
          >
            {saving ? 'Saving...' : 'Save Address'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressModal;