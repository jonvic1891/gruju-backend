/**
 * ConnectionsScreen Component Tests
 * Tests the complete connection request functionality in the frontend
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConnectionsScreen from '../ConnectionsScreen';
import ApiService from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockApiService = ApiService as jest.Mocked<typeof ApiService>;

// Mock data for testing
const mockConnectionRequests = [
  {
    id: 1,
    requester_id: 3,
    target_parent_id: 5,
    child_id: 1,
    target_child_id: 4,
    status: 'pending',
    message: 'Emma would love to connect with Mia!',
    created_at: '2025-08-05T10:00:00Z',
    updated_at: '2025-08-05T10:00:00Z',
    requester_name: 'johnson',
    requester_email: 'johnson@example.com',
    requester_family_name: 'Johnson Family',
    child_name: 'Emma Johnson',
    child_age: 8,
    child_grade: '3rd',
    child_school: 'Elementary School',
    target_child_name: 'Mia Wong',
    target_child_age: 9,
    target_child_grade: '4th',
    target_child_school: 'Elementary School'
  },
  {
    id: 2,
    requester_id: 4,
    target_parent_id: 5,
    child_id: 3,
    target_child_id: null,
    status: 'pending',
    message: 'Jake is looking for new friends!',
    created_at: '2025-08-05T09:00:00Z',
    updated_at: '2025-08-05T09:00:00Z',
    requester_name: 'davis',
    requester_email: 'davis@example.com',
    requester_family_name: 'Davis Family',
    child_name: 'Jake Davis',
    child_age: 7,
    child_grade: '2nd',
    child_school: 'Elementary School',
    target_child_name: null,
    target_child_age: null,
    target_child_grade: null,
    target_child_school: null
  }
];

const mockSentRequests = [
  {
    id: 3,
    requester_id: 5,
    target_parent_id: 3,
    child_id: 5,
    target_child_id: 2,
    status: 'pending',
    message: 'Ryan would love to play with Alex!',
    created_at: '2025-08-05T08:00:00Z',
    updated_at: '2025-08-05T08:00:00Z',
    target_parent_name: 'johnson',
    target_parent_email: 'johnson@example.com',
    target_family_name: 'Johnson Family',
    child_name: 'Ryan Wong',
    child_age: 10,
    child_grade: '5th',
    child_school: 'Elementary School',
    target_child_name: 'Alex Johnson',
    target_child_age: 6,
    target_child_grade: '1st',
    target_child_school: 'Elementary School'
  }
];

const mockMyChildren = [
  { id: 5, name: 'Ryan Wong', parent_id: 5, age: 10, grade: '5th', school: 'Elementary School' },
  { id: 6, name: 'Mia Wong', parent_id: 5, age: 9, grade: '4th', school: 'Elementary School' }
];

const mockSearchResults = [
  {
    id: 3,
    username: 'johnson',
    email: 'johnson@example.com',
    phone: '123-456-7890',
    children: [
      { id: 1, name: 'Emma Johnson', age: 8, grade: '3rd', school: 'Elementary School' },
      { id: 2, name: 'Alex Johnson', age: 6, grade: '1st', school: 'Elementary School' }
    ]
  }
];

// Mock API service instance
const mockApiServiceInstance = {
  getConnectionRequests: jest.fn(),
  getSentConnectionRequests: jest.fn(),
  getChildren: jest.fn(),
  searchParent: jest.fn(),
  sendConnectionRequest: jest.fn(),
  respondToConnectionRequest: jest.fn()
};

beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Setup API service mock
  mockApiService.getInstance.mockReturnValue(mockApiServiceInstance as any);
  
  // Setup default successful responses
  mockApiServiceInstance.getConnectionRequests.mockResolvedValue({
    success: true,
    data: mockConnectionRequests
  });
  
  mockApiServiceInstance.getSentConnectionRequests.mockResolvedValue({
    success: true,
    data: mockSentRequests
  });
  
  mockApiServiceInstance.getChildren.mockResolvedValue({
    success: true,
    data: mockMyChildren
  });
  
  mockApiServiceInstance.searchParent.mockResolvedValue({
    success: true,
    data: mockSearchResults
  });
  
  mockApiServiceInstance.sendConnectionRequest.mockResolvedValue({
    success: true,
    data: { id: 4, message: 'Connection request sent successfully' }
  });
  
  mockApiServiceInstance.respondToConnectionRequest.mockResolvedValue({
    success: true
  });
});

describe('ConnectionsScreen', () => {
  
  describe('Component Rendering', () => {
    test('renders main sections correctly', async () => {
      render(<ConnectionsScreen />);
      
      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Connections')).toBeInTheDocument();
        expect(screen.getByText('Connect with Parents')).toBeInTheDocument();
        expect(screen.getByText('Pending Requests (2)')).toBeInTheDocument();
        expect(screen.getByText('Sent Requests (1)')).toBeInTheDocument();
      });
    });

    test('displays search form elements', async () => {
      render(<ConnectionsScreen />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter email or phone number')).toBeInTheDocument();
        expect(screen.getByText('Search')).toBeInTheDocument();
      });
    });
  });

  describe('Connection Requests Display', () => {
    test('displays incoming connection requests with detailed child information', async () => {
      render(<ConnectionsScreen />);
      
      await waitFor(() => {
        // Check for requester information
        expect(screen.getByText('Connection Request from johnson')).toBeInTheDocument();
        expect(screen.getByText('Connection Request from davis')).toBeInTheDocument();
        
        // Check for child information
        expect(screen.getByText('Emma Johnson')).toBeInTheDocument();
        expect(screen.getByText('Jake Davis')).toBeInTheDocument();
        
        // Check for detailed child info
        expect(screen.getByText('Age: 8')).toBeInTheDocument();
        expect(screen.getByText('Grade: 3rd')).toBeInTheDocument();
        expect(screen.getByText('School: Elementary School')).toBeInTheDocument();
        
        // Check for target child information
        expect(screen.getByText('Wants to Connect with Your Child:')).toBeInTheDocument();
        expect(screen.getByText('Mia Wong')).toBeInTheDocument();
        
        // Check for messages
        expect(screen.getByText('"Emma would love to connect with Mia!"')).toBeInTheDocument();
        expect(screen.getByText('"Jake is looking for new friends!"')).toBeInTheDocument();
      });
    });

    test('displays sent connection requests with detailed information', async () => {
      render(<ConnectionsScreen />);
      
      await waitFor(() => {
        // Check for sent request information
        expect(screen.getByText('Request to johnson')).toBeInTheDocument();
        
        // Check for child information in sent requests
        expect(screen.getByText('Your Child:')).toBeInTheDocument();
        expect(screen.getByText('Ryan Wong')).toBeInTheDocument();
        expect(screen.getByText('Age: 10')).toBeInTheDocument();
        expect(screen.getByText('Grade: 5th')).toBeInTheDocument();
        
        // Check for target child info
        expect(screen.getByText('Wants to Connect with:')).toBeInTheDocument();
        expect(screen.getByText('Alex Johnson')).toBeInTheDocument();
        expect(screen.getByText('Age: 6')).toBeInTheDocument();
        expect(screen.getByText('Grade: 1st')).toBeInTheDocument();
        
        // Check for status badge
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });
    });

    test('handles empty connection requests gracefully', async () => {
      mockApiServiceInstance.getConnectionRequests.mockResolvedValue({
        success: true,
        data: []
      });
      
      mockApiServiceInstance.getSentConnectionRequests.mockResolvedValue({
        success: true,
        data: []
      });
      
      render(<ConnectionsScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('No pending connection requests')).toBeInTheDocument();
        expect(screen.getByText('No pending sent requests')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    test('performs parent search and displays results', async () => {
      render(<ConnectionsScreen />);
      
      const searchInput = screen.getByPlaceholderText('Enter email or phone number');
      const searchButton = screen.getByText('Search');
      
      // Enter search query
      fireEvent.change(searchInput, { target: { value: 'johnson@example.com' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(mockApiServiceInstance.searchParent).toHaveBeenCalledWith('johnson@example.com');
        expect(screen.getByText('Search Results')).toBeInTheDocument();
        expect(screen.getByText('johnson')).toBeInTheDocument();
        expect(screen.getByText('2 children')).toBeInTheDocument();
        expect(screen.getByText('Connect')).toBeInTheDocument();
      });
    });

    test('validates minimum search length', async () => {
      // Mock alert
      window.alert = jest.fn();
      
      render(<ConnectionsScreen />);
      
      const searchInput = screen.getByPlaceholderText('Enter email or phone number');
      const searchButton = screen.getByText('Search');
      
      // Enter short query
      fireEvent.change(searchInput, { target: { value: 'ab' } });
      fireEvent.click(searchButton);
      
      expect(window.alert).toHaveBeenCalledWith('Please enter at least 3 characters to search');
      expect(mockApiServiceInstance.searchParent).not.toHaveBeenCalled();
    });

    test('displays search loading state', async () => {
      // Make search take longer
      mockApiServiceInstance.searchParent.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 100))
      );
      
      render(<ConnectionsScreen />);
      
      const searchInput = screen.getByPlaceholderText('Enter email or phone number');
      const searchButton = screen.getByText('Search');
      
      fireEvent.change(searchInput, { target: { value: 'test@example.com' } });
      fireEvent.click(searchButton);
      
      // Check for loading state
      expect(screen.getByText('Searching...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Search')).toBeInTheDocument();
      });
    });
  });

  describe('Connection Request Actions', () => {
    test('accepts connection request', async () => {
      // Mock confirm dialog
      window.confirm = jest.fn().mockReturnValue(true);
      window.alert = jest.fn();
      
      render(<ConnectionsScreen />);
      
      await waitFor(() => {
        const acceptButtons = screen.getAllByText('Accept');
        fireEvent.click(acceptButtons[0]);
      });
      
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to accept this connection request?');
      expect(mockApiServiceInstance.respondToConnectionRequest).toHaveBeenCalledWith(1, 'accept');
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Connection request accepted!');
      });
    });

    test('rejects connection request', async () => {
      // Mock confirm dialog
      window.confirm = jest.fn().mockReturnValue(true);
      window.alert = jest.fn();
      
      render(<ConnectionsScreen />);
      
      await waitFor(() => {
        const rejectButtons = screen.getAllByText('Reject');
        fireEvent.click(rejectButtons[0]);
      });
      
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to reject this connection request?');
      expect(mockApiServiceInstance.respondToConnectionRequest).toHaveBeenCalledWith(1, 'reject');
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Connection request rejected');
      });
    });

    test('cancels action when user clicks cancel in confirm dialog', async () => {
      // Mock confirm dialog to return false
      window.confirm = jest.fn().mockReturnValue(false);
      
      render(<ConnectionsScreen />);
      
      await waitFor(() => {
        const acceptButtons = screen.getAllByText('Accept');
        fireEvent.click(acceptButtons[0]);
      });
      
      expect(window.confirm).toHaveBeenCalled();
      expect(mockApiServiceInstance.respondToConnectionRequest).not.toHaveBeenCalled();
    });
  });

  describe('Send Connection Request Modal', () => {
    test('opens connection request modal when Connect button is clicked', async () => {
      render(<ConnectionsScreen />);
      
      // First search for a parent
      const searchInput = screen.getByPlaceholderText('Enter email or phone number');
      fireEvent.change(searchInput, { target: { value: 'johnson@example.com' } });
      fireEvent.click(screen.getByText('Search'));
      
      await waitFor(() => {
        const connectButton = screen.getByText('Connect');
        fireEvent.click(connectButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Send Connection Request')).toBeInTheDocument();
        expect(screen.getByText('Your Child:')).toBeInTheDocument();
        expect(screen.getByText('Their Child (Optional):')).toBeInTheDocument();
        expect(screen.getByText('Message (Optional):')).toBeInTheDocument();
      });
    });

    test('displays my children options in modal', async () => {
      render(<ConnectionsScreen />);
      
      // Open modal
      const searchInput = screen.getByPlaceholderText('Enter email or phone number');
      fireEvent.change(searchInput, { target: { value: 'johnson@example.com' } });
      fireEvent.click(screen.getByText('Search'));
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Connect'));
      });
      
      await waitFor(() => {
        expect(screen.getByText('Ryan Wong')).toBeInTheDocument();
        expect(screen.getByText('Mia Wong')).toBeInTheDocument();
      });
    });

    test('sends connection request with selected options', async () => {
      window.alert = jest.fn();
      
      render(<ConnectionsScreen />);
      
      // Open modal
      const searchInput = screen.getByPlaceholderText('Enter email or phone number');
      fireEvent.change(searchInput, { target: { value: 'johnson@example.com' } });
      fireEvent.click(screen.getByText('Search'));
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Connect'));
      });
      
      await waitFor(() => {
        // Select child and add message
        const messageInput = screen.getByPlaceholderText('Hi! Would love to connect our kids...');
        fireEvent.change(messageInput, { target: { value: 'Test connection message' } });
        
        // Send request
        fireEvent.click(screen.getByText('Send Request'));
      });
      
      expect(mockApiServiceInstance.sendConnectionRequest).toHaveBeenCalledWith({
        target_parent_id: 3,
        child_id: 5, // First child should be pre-selected
        target_child_id: 1, // First target child should be pre-selected
        message: 'Test connection message'
      });
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Connection request sent successfully');
        expect(mockApiServiceInstance.getSentConnectionRequests).toHaveBeenCalledTimes(2); // Initial load + refresh after send
      });
    });

    test('closes modal when Cancel is clicked', async () => {
      render(<ConnectionsScreen />);
      
      // Open modal
      const searchInput = screen.getByPlaceholderText('Enter email or phone number');
      fireEvent.change(searchInput, { target: { value: 'johnson@example.com' } });
      fireEvent.click(screen.getByText('Search'));
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Connect'));
      });
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Cancel'));
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Send Connection Request')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      mockApiServiceInstance.getConnectionRequests.mockResolvedValue({
        success: false,
        error: 'Failed to load connection requests'
      });
      
      window.alert = jest.fn();
      
      render(<ConnectionsScreen />);
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Error: Failed to load connection requests');
      });
    });

    test('handles network errors', async () => {
      mockApiServiceInstance.getConnectionRequests.mockRejectedValue(new Error('Network error'));
      
      window.alert = jest.fn();
      console.error = jest.fn(); // Mock console.error to avoid test noise
      
      render(<ConnectionsScreen />);
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to load connection requests');
      });
    });
  });
});

console.log('[TEST] ConnectionsScreen component test suite loaded');