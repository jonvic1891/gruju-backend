// User types
export interface User {
  id: number; // Internal database ID - DEPRECATED: Use UUIDs in frontend
  uuid?: string; // UUID field for secure identification
  username: string;
  email: string;
  phone: string;
  role: 'user' | 'admin' | 'super_admin';
  created_at: string;
  updated_at: string;
}

// Parent types - for multiple parents per account
export interface Parent {
  id: number; // Internal database ID - DEPRECATED: Use UUIDs in frontend
  uuid: string; // UUID field for secure identification - ALWAYS USE THIS
  account_uuid: string; // UUID of the primary parent account - ALWAYS USE THIS
  username: string;
  email: string;
  phone: string;
  is_primary: boolean; // Whether this is the primary account holder
  role: 'parent' | 'guardian' | 'caregiver';
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: number; // Internal database ID - DEPRECATED: Use UUIDs in frontend
  uuid: string; // UUID field for secure identification - ALWAYS USE THIS
  name: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  parent_id: number; // DEPRECATED: Backend only
  parent_uuid?: string; // UUID field for parent - USE THIS
  age?: number;
  grade?: string;
  school?: string;
  interests?: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: number; // Internal database ID - DEPRECATED: Use UUIDs in frontend
  activity_uuid?: string; // UUID field for secure activity identification - ALWAYS USE THIS
  uuid?: string; // Alternative UUID field name for compatibility - ALWAYS USE THIS
  child_id: number; // DEPRECATED: Backend only
  child_uuid?: string; // UUID field for the child who owns this activity - ALWAYS USE THIS
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
  invitation_id?: number; // DEPRECATED: Backend only
  invitation_uuid?: string; // UUID field for invitation - ALWAYS USE THIS
  activity_id?: number; // DEPRECATED: Backend only
  // Additional fields for invitation handling in frontend
  isPendingInvitation?: boolean;
  isAcceptedInvitation?: boolean;
  isDeclinedInvitation?: boolean;
  invitationId?: number; // DEPRECATED: Use invitationUuid
  invitationUuid?: string;
  hostParent?: string;
  message?: string;
  host_child_name?: string;
  host_parent_name?: string;
}

export interface Connection {
  id: number; // Internal database ID - DEPRECATED: Use UUIDs in frontend
  uuid?: string; // UUID field for secure connection identification - ALWAYS USE THIS
  connection_uuid?: string; // Alternative UUID field name - ALWAYS USE THIS
  child1_id: number; // DEPRECATED: Backend only
  child1_uuid?: string; // UUID for child1 - ALWAYS USE THIS
  child2_id: number; // DEPRECATED: Backend only
  child2_uuid?: string; // UUID for child2 - ALWAYS USE THIS
  status: 'active' | 'deleted';
  created_at: string;
  // Extended fields from backend joins
  child1_name?: string;
  child1_parent_name?: string;
  child1_parent_id?: number; // DEPRECATED: Backend only
  child1_parent_uuid?: string; // UUID for child1's parent - ALWAYS USE THIS
  child2_name?: string;
  child2_parent_name?: string;
  child2_parent_id?: number; // DEPRECATED: Backend only
  child2_parent_uuid?: string; // UUID for child2's parent - ALWAYS USE THIS
}

export interface ConnectionRequest {
  id: number; // Internal database ID - DEPRECATED: Use UUIDs in frontend
  request_uuid: string; // UUID field for request - ALWAYS USE THIS
  requester_id: number; // DEPRECATED: Backend only
  requester_uuid?: string; // UUID for requester - ALWAYS USE THIS
  target_parent_id: number; // DEPRECATED: Backend only
  target_parent_uuid?: string; // UUID for target parent - ALWAYS USE THIS
  child_id: number; // DEPRECATED: Backend only
  child_uuid?: string; // UUID for child - ALWAYS USE THIS
  target_child_id?: number; // DEPRECATED: Backend only
  target_child_uuid?: string; // UUID for target child - ALWAYS USE THIS
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
  id: number; // Internal database ID - DEPRECATED: Use UUIDs in frontend
  invitation_uuid?: string; // UUID field for invitation - ALWAYS USE THIS
  activity_id: number; // DEPRECATED: Backend only
  activity_uuid?: string; // UUID for activity - ALWAYS USE THIS
  inviter_parent_id: number; // DEPRECATED: Backend only
  inviter_parent_uuid?: string; // UUID for inviter parent - ALWAYS USE THIS
  invited_parent_id: number; // DEPRECATED: Backend only
  invited_parent_uuid?: string; // UUID for invited parent - ALWAYS USE THIS
  child_id?: number; // DEPRECATED: Backend only
  child_uuid?: string; // UUID for child - ALWAYS USE THIS
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
  id?: number; // DEPRECATED: Backend only
  user_uuid?: string; // UUID field for user - ALWAYS USE THIS
  username: string;
  email?: string;
  phone?: string;
  family_name?: string;
  children: Child[];
}