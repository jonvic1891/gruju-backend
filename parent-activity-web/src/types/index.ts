// User types
export interface User {
  id: number;
  username: string;
  email: string;
  phone: string;
  role: 'user' | 'admin' | 'super_admin';
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: number;
  name: string;
  parent_id: number;
  age?: number;
  grade?: string;
  school?: string;
  interests?: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: number;
  child_id: number;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  website_url?: string;
  cost?: number;
  max_participants?: number;
  created_at: string;
  updated_at: string;
  // Extended fields for activity status/sharing
  is_shared?: boolean;
  invitation_status?: 'none' | 'pending' | 'accepted' | 'rejected';
  is_host?: boolean;
  is_cancelled?: boolean;
}

export interface Connection {
  id: number;
  child1_id: number;
  child2_id: number;
  status: 'active' | 'deleted';
  created_at: string;
}

export interface ConnectionRequest {
  id: number;
  requester_id: number;
  target_parent_id: number;
  child_id: number;
  target_child_id?: number;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityInvitation {
  id: number;
  activity_id: number;
  inviter_parent_id: number;
  invited_parent_id: number;
  child_id?: number;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  created_at: string;
  updated_at: string;
  // Extended fields from join
  activity_name?: string;
  activity_description?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  cost?: number;
  website_url?: string;
  inviter_name?: string;
  inviter_email?: string;
  child_name?: string;
}

// API types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  phone: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SearchResult {
  id: number;
  username: string;
  email: string;
  phone: string;
  children: Child[];
}