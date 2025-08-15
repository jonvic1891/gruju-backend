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
  uuid: string; // UUID field for secure identification
  name: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
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
  activity_uuid?: string; // UUID field for secure activity identification
  uuid?: string; // Alternative UUID field name for compatibility
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
  invitation_status?: 'none' | 'pending' | 'accepted' | 'declined';
  is_host?: boolean;
  is_cancelled?: boolean;
  // Extended fields from backend joins (for connected and invited activities)
  child_name?: string;
  parent_username?: string;
  host_parent_username?: string;
  invitation_message?: string;
  invitation_id?: number; // Backend API field for invitation ID
  activity_id?: number; // Original activity ID for invitations (to load participants)
  // Additional fields for invitation handling in frontend
  isPendingInvitation?: boolean;
  isAcceptedInvitation?: boolean;
  isDeclinedInvitation?: boolean;
  invitationId?: number;
  invitationUuid?: string;
  hostParent?: string;
  message?: string;
  host_child_name?: string;
  host_parent_name?: string;
}

export interface Connection {
  id: number;
  uuid?: string; // UUID field for secure connection identification
  connection_uuid?: string; // Alternative UUID field name
  child1_id: number;
  child1_uuid?: string; // UUID for child1
  child2_id: number;
  child2_uuid?: string; // UUID for child2
  status: 'active' | 'deleted';
  created_at: string;
  // Extended fields from backend joins
  child1_name?: string;
  child1_parent_name?: string;
  child1_parent_id?: number;
  child2_name?: string;
  child2_parent_name?: string;
  child2_parent_id?: number;
}

export interface ConnectionRequest {
  id: number;
  requester_id: number;
  target_parent_id: number;
  child_id: number;
  target_child_id?: number;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  created_at: string;
  updated_at: string;
  // Extended fields from backend joins
  requester_name?: string;
  requester_email?: string;
  requester_family_name?: string;
  target_parent_name?: string;
  target_parent_email?: string;
  target_family_name?: string;
  child_name?: string;
  child_age?: number;
  child_grade?: string;
  child_school?: string;
  target_child_name?: string;
  target_child_age?: number;
  target_child_grade?: string;
  target_child_school?: string;
}

export interface ActivityInvitation {
  id: number;
  activity_id: number;
  inviter_parent_id: number;
  invited_parent_id: number;
  child_id?: number;
  status: 'pending' | 'accepted' | 'declined';
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
  host_child_name?: string;
  host_family_name?: string;
  host_parent_name?: string;
  host_parent_email?: string;
  invited_child_name?: string;
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