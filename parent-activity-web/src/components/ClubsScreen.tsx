import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  website_title?: string;
  website_description?: string;
  website_favicon?: string;
  metadata_fetched_at?: string;
  created_at: string;
  usage_count?: number;
  first_used_date?: string;
  last_used_date?: string;
  min_child_age?: number;
  max_child_age?: number;
}

const ClubsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  
  // Selection mode for activity creation flow
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionFieldType, setSelectionFieldType] = useState<'location' | 'website_url' | ''>('');
  const [returnUrl, setReturnUrl] = useState<string>('');

  const apiService = ApiService.getInstance();
  
  console.log('🏢 ClubsScreen component rendered', { clubs: clubs.length, loading, isSelectionMode });

  useEffect(() => {
    // Check if we're in selection mode
    const urlParams = new URLSearchParams(window.location.search);
    const selectParam = urlParams.get('select');
    const returnParam = urlParams.get('return');
    
    if (selectParam && returnParam) {
      setIsSelectionMode(true);
      setSelectionFieldType(selectParam as 'location' | 'website_url');
      setReturnUrl(decodeURIComponent(returnParam));
      console.log('🎯 ClubsScreen in selection mode:', { selectParam, returnParam });
    }
    
    loadClubs();
  }, [selectedType, searchTerm, locationFilter]); // Reload when filters change

  const loadClubs = async () => {
    try {
      setLoading(true);
      
      console.log('🏢 Loading clubs via ApiService:', { selectedType, searchTerm });
      
      const response = await apiService.getClubs(selectedType, searchTerm, locationFilter);
      
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

  const handleClubSelection = (club: Club) => {
    if (isSelectionMode && returnUrl) {
      // Prepare club data for return
      const clubData = {
        id: club.id,
        name: club.name,
        location: club.location || '',
        website_url: club.website_url || '',
        activity_type: club.activity_type || ''
      };
      
      console.log('🎯 Selecting club for activity creation:', clubData);
      
      // Return to activity creation with club data using React Router
      const returnUrlWithData = `${returnUrl}?clubData=${encodeURIComponent(JSON.stringify(clubData))}`;
      console.log('🔙 Navigating back to:', returnUrlWithData);
      navigate(returnUrlWithData.replace(window.location.origin, ''));
    } else {
      // Normal browsing mode - open website
      openWebsite(club.website_url);
    }
  };


  return (
    <div className="clubs-screen" data-selection-mode={isSelectionMode}>
      <div className="clubs-header">
        {isSelectionMode ? (
          <>
            <h2>Select Club for Activity</h2>
          </>
        ) : (
          <>
            <h2>Browse Clubs & Activities</h2>
            <p>Discover local clubs and activities for your children</p>
          </>
        )}
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
        
        <div className="location-filter">
          <input
            type="text"
            placeholder="🗺️ Filter by location..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="location-input"
          />
        </div>
      </div>

      <div className="clubs-stats">
        <p>Showing {clubs.length} clubs{(searchTerm || selectedType || locationFilter) && ' matching your filters'}</p>
        {(searchTerm || selectedType || locationFilter) && (
          <p className="active-filters">
            {searchTerm && <span className="filter-tag">Search: "{searchTerm}"</span>}
            {selectedType && <span className="filter-tag">Type: {selectedType}</span>}
            {locationFilter && <span className="filter-tag">Location: "{locationFilter}"</span>}
            <button 
              onClick={() => { setSearchTerm(''); setSelectedType(''); setLocationFilter(''); }}
              className="clear-filters-btn"
            >
              Clear all filters
            </button>
          </p>
        )}
      </div>

      <div className="clubs-grid">
        {clubs.length === 0 ? (
          <div className="no-clubs">
            <div className="no-clubs-icon">🔍</div>
            <h3>No clubs found</h3>
            <p>
              {searchTerm || selectedType || locationFilter
                ? "Try adjusting your search or filter criteria"
                : "No clubs are available at the moment"
              }
            </p>
          </div>
        ) : (
          clubs
            .filter(club => {
              // In selection mode, only show clubs with the required field
              if (isSelectionMode) {
                if (selectionFieldType === 'location' && !club.location) {
                  return false;
                }
                if (selectionFieldType === 'website_url' && !club.website_url) {
                  return false;
                }
              }
              return true;
            })
            .map(club => (
            <div key={club.id} className="club-card" onClick={() => handleClubSelection(club)}>
              <div className="club-favicon">
                {club.website_favicon ? (
                  <img 
                    src={club.website_favicon} 
                    alt="Website favicon" 
                    className="favicon-img"
                    onError={(e) => {
                      // Fallback to globe icon if favicon fails to load
                      e.currentTarget.style.display = 'none';
                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                      if (nextElement) {
                        nextElement.style.display = 'block';
                      }
                    }}
                  />
                ) : null}
                <div className="favicon-fallback">🌐</div>
              </div>
              
              <div className="club-content">
                <div className="club-header">
                  <h3 className="club-title">
                    {club.website_title || club.name}
                  </h3>
                  <span className="club-type">{club.activity_type}</span>
                </div>
                
                <div className="club-url">
                  {club.website_url}
                </div>
                
                <div className="club-description">
                  {club.website_description || club.description || 'No description available'}
                </div>
                
                <div className="club-details">
                  {club.location && (
                    <span className="club-detail">📍 {club.location}</span>
                  )}
                  {club.cost !== undefined && club.cost !== null && (
                    <span className="club-detail">
                      💰 {club.cost > 0 ? `£${club.cost.toFixed(2)}` : 'Free'}
                    </span>
                  )}
                  {club.usage_count && club.usage_count > 0 && (
                    <span className="club-detail">
                      👥 {club.usage_count} {club.usage_count === 1 ? 'booking' : 'bookings'} (6 months)
                    </span>
                  )}
                  {club.min_child_age && club.max_child_age && (
                    <span className="club-detail">
                      🎂 Booked by children ages {club.min_child_age === club.max_child_age ? club.min_child_age : `${club.min_child_age}-${club.max_child_age}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClubsScreen;