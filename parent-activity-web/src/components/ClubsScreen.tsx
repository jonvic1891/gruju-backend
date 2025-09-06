import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import './ClubsScreen.css';

// Activity types for filtering
const ACTIVITY_TYPES = [
  'Drama',
  'Multi-Sport', 
  'Football',
  'Rugby',
  'Athletics',
  'Netball',
  'Tech',
  'Science',
  'Craft',
  'Cooking',
  'Other'
];

interface Club {
  id: number;
  name: string;
  description: string;
  website_url: string;
  activity_type: string;
  location?: string;
  cost?: number;
  created_at: string;
}

const ClubsScreen: React.FC = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const apiService = ApiService.getInstance();
  
  console.log('🏢 ClubsScreen component rendered', { clubs: clubs.length, loading });

  useEffect(() => {
    loadClubs();
  }, [selectedType, searchTerm]); // Reload when filters change

  const loadClubs = async () => {
    try {
      setLoading(true);
      
      console.log('🏢 Loading clubs via ApiService:', { selectedType, searchTerm });
      
      const response = await apiService.getClubs(selectedType, searchTerm);
      
      if (response.success) {
        setClubs(response.data || []);
        console.log('✅ Loaded', response.data?.length || 0, 'clubs from ApiService');
      } else {
        throw new Error(response.error || 'Failed to load clubs');
      }
      
    } catch (error) {
      console.error('Error loading clubs:', error);
      // Fall back to empty array on error
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

  const openWebsite = (url: string) => {
    if (url && !url.startsWith('http')) {
      url = `https://${url}`;
    }
    window.open(url, '_blank');
  };


  return (
    <div className="clubs-screen">
      <div className="clubs-header">
        <h2>Browse Clubs & Activities</h2>
        <p>Discover local clubs and activities for your children</p>
      </div>

      <div className="clubs-filters">
        <div className="search-filter">
          <input
            type="text"
            placeholder="🔍 Search clubs, activities, locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="type-filter">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="type-select"
          >
            <option value="">All Activity Types</option>
            {ACTIVITY_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="clubs-stats">
        <p>Showing {clubs.length} clubs</p>
      </div>

      <div className="clubs-grid">
        {clubs.length === 0 ? (
          <div className="no-clubs">
            <div className="no-clubs-icon">🔍</div>
            <h3>No clubs found</h3>
            <p>
              {searchTerm || selectedType 
                ? "Try adjusting your search or filter criteria"
                : "No clubs are available at the moment"
              }
            </p>
          </div>
        ) : (
          clubs.map(club => (
            <div key={club.id} className="club-card">
              <div className="club-header">
                <h3 className="club-name">{club.name}</h3>
                <span className="club-type">{club.activity_type}</span>
              </div>
              
              <div className="club-description">
                <p>{club.description}</p>
              </div>
              
              <div className="club-details">
                {club.location && (
                  <div className="club-detail">
                    <span className="detail-label">📍</span>
                    <span className="detail-value">{club.location}</span>
                  </div>
                )}
                
                <div className="club-detail">
                  <span className="detail-label">💰</span>
                  <span className="detail-value">
                    {club.cost ? `£${club.cost.toFixed(2)}` : 'Free'}
                  </span>
                </div>
              </div>
              
              <div className="club-actions">
                <button
                  onClick={() => openWebsite(club.website_url)}
                  className="visit-website-btn"
                >
                  🌐 Visit Website
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClubsScreen;