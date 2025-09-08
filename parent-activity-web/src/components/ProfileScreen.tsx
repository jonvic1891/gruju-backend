import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import PhoneInput from './PhoneInput';
import AddressModal from './AddressModal';
import { validatePhoneNumber } from '../utils/phoneValidation';
import { Parent } from '../types';
import './ProfileScreen.css';

const ProfileScreen = () => {
  const { user, logout, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [addressLine1, setAddressLine1] = useState(user?.address_line_1 || '');
  const [townCity, setTownCity] = useState(user?.town_city || '');
  const [stateProvinceCountry, setStateProvinceCountry] = useState(user?.state_province_country || '');
  const [postCode, setPostCode] = useState(user?.post_code || '');
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Parent management state
  const [parents, setParents] = useState<Parent[]>([]);
  const [showAddParentModal, setShowAddParentModal] = useState(false);
  const [newParentFirstName, setNewParentFirstName] = useState('');
  const [newParentLastName, setNewParentLastName] = useState('');
  const [newParentEmail, setNewParentEmail] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [newParentPassword, setNewParentPassword] = useState('');
  const [newParentConfirmPassword, setNewParentConfirmPassword] = useState('');
  const [newParentRole, setNewParentRole] = useState('parent');
  const [showParentPassword, setShowParentPassword] = useState(false);
  const [showParentConfirmPassword, setShowParentConfirmPassword] = useState(false);
  const [addingParent, setAddingParent] = useState(false);
  const [showNewParentAddressModal, setShowNewParentAddressModal] = useState(false);
  const [newParentDetails, setNewParentDetails] = useState<{email: string, name: string} | null>(null);
  
  const apiService = ApiService.getInstance();

  // Sync local state when user data changes (e.g., after login)
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAddressLine1(user.address_line_1 || '');
      setTownCity(user.town_city || '');
      setStateProvinceCountry(user.state_province_country || '');
      setPostCode(user.post_code || '');
    }
  }, [user]);

  // Load parents when component mounts
  useEffect(() => {
    if (user) {
      loadParents();
    }
  }, [user]);

  const loadParents = async () => {
    try {
      const response = await apiService.getParents();
      if (response.success && response.data) {
        setParents(response.data);
      }
    } catch (error) {
      console.error('Failed to load parents:', error);
    }
  };

  const handleEditProfile = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading latest profile data for editing');
      
      // Fetch latest profile data from backend
      const response = await apiService.getProfile();
      if (response.success && response.data) {
        const profileData = response.data;
        console.log('✅ Latest profile data:', profileData);
        
        // Update form fields with latest data
        setUsername(profileData.username || '');
        setEmail(profileData.email || '');
        setPhone(profileData.phone || '');
        setAddressLine1(profileData.address_line_1 || '');
        setTownCity(profileData.town_city || '');
        setStateProvinceCountry(profileData.state_province_country || '');
        setPostCode(profileData.post_code || '');
        
        // Also refresh the user context with latest data
        await refreshUser();
      } else {
        console.error('Failed to load profile data:', response.error);
        alert('Failed to load latest profile data');
      }
      
      setEditing(true);
    } catch (error) {
      console.error('Error loading profile data:', error);
      alert('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddParent = () => {
    setShowAddParentModal(true);
  };

  const handleCreateParent = async () => {
    if (!newParentFirstName.trim() || !newParentLastName.trim() || !newParentEmail.trim() || !newParentPhone.trim() || !newParentPassword.trim()) {
      alert('Please fill in all fields');
      return;
    }

    // Validate password match
    if (newParentPassword !== newParentConfirmPassword) {
      alert('Passwords do not match');
      return;
    }

    // Validate password length
    if (newParentPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    // Validate phone number
    const phoneValidation = validatePhoneNumber(newParentPhone);
    if (!phoneValidation.isValid) {
      alert(`Invalid phone number: ${phoneValidation.error}`);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newParentEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    setAddingParent(true);
    try {
      const response = await apiService.createParent({
        username: `${newParentFirstName.trim()} ${newParentLastName.trim()}`,
        email: newParentEmail.trim(),
        phone: newParentPhone.trim(),
        password: newParentPassword,
        role: newParentRole
      });

      if (response.success) {
        const parentName = `${newParentFirstName.trim()} ${newParentLastName.trim()}`;
        
        // Clear form and close modal
        setNewParentFirstName('');
        setNewParentLastName('');
        setNewParentEmail('');
        setNewParentPhone('');
        setNewParentPassword('');
        setNewParentConfirmPassword('');
        setNewParentRole('parent');
        setShowAddParentModal(false);
        
        // Reload parents list
        loadParents();
        
        // Show address modal for new parent
        setNewParentDetails({
          email: newParentEmail.trim(),
          name: parentName
        });
        setShowNewParentAddressModal(true);
      } else {
        alert(`Failed to add parent: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to add parent');
      console.error('Add parent error:', error);
    } finally {
      setAddingParent(false);
    }
  };

  const handleDeleteParent = async (parentUuid: string, parentName: string) => {
    if (window.confirm(`Are you sure you want to remove ${parentName} from this account? They will no longer have access to manage children and activities.`)) {
      try {
        const response = await apiService.deleteParent(parentUuid);
        if (response.success) {
          alert('Parent removed successfully');
          loadParents(); // Reload the parents list
        } else {
          alert(`Failed to remove parent: ${response.error || 'Unknown error'}`);
        }
      } catch (error) {
        alert('Failed to remove parent');
        console.error('Delete parent error:', error);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!username.trim() || !email.trim() || !phone.trim()) {
      alert('Please fill in all fields');
      return;
    }

    // Validate phone number
    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      alert(`Invalid phone number: ${phoneValidation.error}`);
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.updateProfile({
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address_line_1: addressLine1.trim(),
        town_city: townCity.trim(),
        state_province_country: stateProvinceCountry.trim(),
        post_code: postCode.trim()
      });

      if (response.success && response.data) {
        // Refresh user data in context
        await refreshUser();
        setEditing(false);
        alert('Profile updated successfully');
      } else {
        alert(`Failed to update profile: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to update profile');
      console.error('Update profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      setPhone(user.phone);
      setAddressLine1(user.address_line_1 || '');
      setTownCity(user.town_city || '');
      setStateProvinceCountry(user.state_province_country || '');
      setPostCode(user.post_code || '');
    }
    setEditing(false);
  };

  const handleChangePassword = () => {
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async () => {
    if (!currentPassword.trim()) {
      alert('Please enter your current password');
      return;
    }

    if (!newPassword.trim()) {
      alert('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      alert('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await apiService.changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim()
      });

      if (response.success) {
        alert('Password changed successfully');
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        alert(`Failed to change password: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to change password');
      console.error('Change password error:', error);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const handleNewParentAddressModalClose = () => {
    setShowNewParentAddressModal(false);
    setNewParentDetails(null);
    // Reload parents list even if address wasn't saved
    loadParents();
    alert('Parent added successfully! They can update their address when they first log in.');
  };

  const handleNewParentAddressModalSaved = () => {
    setShowNewParentAddressModal(false);
    const parentName = newParentDetails?.name || 'Parent';
    setNewParentDetails(null);
    // Reload parents list
    loadParents();
    alert(`${parentName} added successfully! Note: The address was saved to your account. They should add their own address when they log in.`);
  };

  if (!user) {
    return (
      <div className="profile-screen">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-screen">
      <div className="profile-header">
        <h2>Profile</h2>
      </div>

      <div className="profile-card">
        {editing ? (
          <div className="edit-form">
            <h3>Edit Profile</h3>
            
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                className="form-input"
                autoComplete="tel"
              />
            </div>

            <div className="address-section">
              <h4>Address Information</h4>
              
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
                  <label>Town/City</label>
                  <input
                    type="text"
                    value={townCity}
                    onChange={(e) => setTownCity(e.target.value)}
                    className="form-input"
                    placeholder="Town or city"
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
            </div>

            <div className="form-actions">
              <button
                onClick={handleCancelEdit}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className={`save-btn ${loading ? 'disabled' : ''}`}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-info">
            <div className="profile-avatar">
              <div className="avatar-circle">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="profile-details">
                <h3>{user.username}</h3>
                <p>Member since {new Date(user.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="info-sections">
              <div className="info-section">
                <label>Username</label>
                <div className="info-value">{user.username}</div>
              </div>

              <div className="info-section">
                <label>Email</label>
                <div className="info-value">{user.email}</div>
              </div>

              <div className="info-section">
                <label>Phone</label>
                <div className="info-value">{user.phone}</div>
              </div>

              {(user.address_line_1 || user.town_city || user.state_province_country || user.post_code) && (
                <div className="address-info">
                  <h4>Address</h4>
                  {user.address_line_1 && (
                    <div className="info-section">
                      <label>Address</label>
                      <div className="info-value">{user.address_line_1}</div>
                    </div>
                  )}
                  {(user.town_city || user.post_code) && (
                    <div className="info-section">
                      <label>Town/City & Post Code</label>
                      <div className="info-value">
                        {user.town_city}{user.town_city && user.post_code && ', '}{user.post_code}
                      </div>
                    </div>
                  )}
                  {user.state_province_country && (
                    <div className="info-section">
                      <label>State/Province/Country</label>
                      <div className="info-value">{user.state_province_country}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="info-section">
                <label>Role</label>
                <div className="info-value">
                  <span className={`role-badge ${user.role}`}>
                    {user.role === 'super_admin' ? 'Super Admin' : 
                     user.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleEditProfile}
              disabled={loading}
              className="edit-btn"
            >
              {loading ? 'Loading...' : 'Edit Profile'}
            </button>
          </div>
        )}
      </div>

      {/* Parents Section */}
      <div className="profile-card">
        <div className="parents-header">
          <h3>Family Members</h3>
          <button onClick={handleAddParent} className="add-btn">
            + Add Parent
          </button>
        </div>
        
        {parents.length === 0 ? (
          <div className="empty-state">
            <p>No additional parents added</p>
            <p>Add another parent to share access to children and activities</p>
          </div>
        ) : (
          <div className="parents-list">
            {parents.map((parent) => (
              <div key={parent.uuid} className="parent-card">
                <div className="parent-info">
                  <div className="parent-avatar">
                    {parent.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="parent-details">
                    <h4>{parent.username}</h4>
                    <p>{parent.email}</p>
                    <p>{parent.phone}</p>
                    <span className={`role-badge ${parent.role}`}>
                      {parent.is_primary ? 'Primary Account' : parent.role.charAt(0).toUpperCase() + parent.role.slice(1)}
                    </span>
                  </div>
                </div>
                {!parent.is_primary && (
                  <button
                    onClick={() => handleDeleteParent(parent.uuid, parent.username)}
                    className="delete-btn"
                    title="Remove parent"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="actions-section">
        <button
          onClick={handleChangePassword}
          className="action-item"
        >
          <span>Change Password</span>
          <span className="arrow">→</span>
        </button>

        <button
          onClick={handleLogout}
          className="action-item logout-action"
        >
          <span>Logout</span>
          <span className="arrow">→</span>
        </button>
      </div>

      <div className="app-info">
        <p>Gruju v1.0.0</p>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={handlePasswordCancel}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Change Password</h3>
            
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="form-input"
                placeholder="Enter your current password"
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input"
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
                placeholder="Confirm new password"
              />
            </div>

            <div className="modal-actions">
              <button
                onClick={handlePasswordCancel}
                className="cancel-btn"
                disabled={passwordLoading}
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={passwordLoading}
                className={`confirm-btn ${passwordLoading ? 'disabled' : ''}`}
              >
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Parent Modal */}
      {showAddParentModal && (
        <div className="modal-overlay" onClick={() => setShowAddParentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Parent to Account</h3>
            
            <div className="name-fields">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={newParentFirstName}
                  onChange={(e) => setNewParentFirstName(e.target.value)}
                  className="form-input"
                  placeholder="First name"
                />
              </div>
              
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={newParentLastName}
                  onChange={(e) => setNewParentLastName(e.target.value)}
                  className="form-input"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={newParentEmail}
                onChange={(e) => setNewParentEmail(e.target.value)}
                className="form-input"
                placeholder="Enter parent's email"
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <PhoneInput
                value={newParentPhone}
                onChange={setNewParentPhone}
                className="form-input"
                placeholder="Enter parent's phone number"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-field">
                <input
                  type={showParentPassword ? "text" : "password"}
                  value={newParentPassword}
                  onChange={(e) => setNewParentPassword(e.target.value)}
                  className="form-input password-input"
                  placeholder="Enter password (min 6 characters)"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowParentPassword(!showParentPassword)}
                >
                  {showParentPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div className="password-field">
                <input
                  type={showParentConfirmPassword ? "text" : "password"}
                  value={newParentConfirmPassword}
                  onChange={(e) => setNewParentConfirmPassword(e.target.value)}
                  className="form-input password-input"
                  placeholder="Confirm password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowParentConfirmPassword(!showParentConfirmPassword)}
                >
                  {showParentConfirmPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Role</label>
              <select
                value={newParentRole}
                onChange={(e) => setNewParentRole(e.target.value)}
                className="form-input"
              >
                <option value="parent">Parent</option>
                <option value="guardian">Guardian</option>
                <option value="caregiver">Caregiver</option>
              </select>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setShowAddParentModal(false)}
                className="cancel-btn"
                disabled={addingParent}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateParent}
                disabled={addingParent}
                className={`confirm-btn ${addingParent ? 'disabled' : ''}`}
              >
                {addingParent ? 'Adding...' : 'Add Parent'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddressModal
        isOpen={showNewParentAddressModal}
        onClose={handleNewParentAddressModalClose}
        onSaved={handleNewParentAddressModalSaved}
        title={`${newParentDetails?.name || 'New Parent'} Added Successfully!`}
        description="Would you like to add their address information now? This helps with local activity suggestions. They can also add this themselves when they first log in."
        canSkip={true}
      />
    </div>
  );
};

export default ProfileScreen;