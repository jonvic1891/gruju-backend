// Mock database for demo purposes
// In production, this would be replaced with actual Azure SQL Database

interface MockUser {
  id: number;
  username: string;
  email: string;
  phone: string;
  password_hash: string;
  role: 'user' | 'admin' | 'super_admin';
  is_active: boolean;
  family_name?: string;
  created_at: string;
  updated_at: string;
}

interface MockChild {
  id: number;
  name: string;
  parent_id: number;
  created_at: string;
  updated_at: string;
}

interface MockActivity {
  id: number;
  child_id: number;
  name: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  website_url?: string;
  created_at: string;
  updated_at: string;
}

interface MockConnectionRequest {
  id: number;
  requester_id: number;
  target_parent_id: number;
  child_id: number;
  target_child_id?: number;
  status: string;
  message?: string;
  created_at: string;
  updated_at: string;
}

interface MockConnection {
  id: number;
  child1_id: number;
  child2_id: number;
  status: string;
  created_at: string;
}

class MockDatabase {
  private static instance: MockDatabase;
  
  private users: MockUser[] = [];
  private children: MockChild[] = [];
  private activities: MockActivity[] = [];
  private connectionRequests: MockConnectionRequest[] = [];
  private connections: MockConnection[] = [];
  
  private nextUserId = 1;
  private nextChildId = 1;
  private nextActivityId = 1;
  private nextRequestId = 1;
  private nextConnectionId = 1;

  private constructor() {
    this.seedData();
  }

  public static getInstance(): MockDatabase {
    if (!MockDatabase.instance) {
      MockDatabase.instance = new MockDatabase();
    }
    return MockDatabase.instance;
  }

  private seedData() {
    // Add demo admin users
    this.users.push({
      id: this.nextUserId++,
      username: 'admin',
      email: 'admin@parentactivityapp.com',
      phone: '+1555000001',
      password_hash: '$2a$12$dummy.hash.for.demo.purposes',
      role: 'super_admin',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    this.users.push({
      id: this.nextUserId++,
      username: 'manager',
      email: 'manager@parentactivityapp.com',
      phone: '+1555000002',
      password_hash: '$2a$12$dummy.hash.for.demo.purposes',
      role: 'admin',
      is_active: true,
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    });

    // Add demo regular users
    this.users.push({
      id: this.nextUserId++,
      username: 'john_doe',
      email: 'john@example.com',
      phone: '+1234567890',
      password_hash: '$2a$12$dummy.hash.for.demo.purposes',
      role: 'user',
      is_active: true,
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
    });

    this.users.push({
      id: this.nextUserId++,
      username: 'jane_smith',
      email: 'jane@example.com',
      phone: '+1987654321',
      password_hash: '$2a$12$dummy.hash.for.demo.purposes',
      role: 'user',
      is_active: true,
      created_at: '2024-01-04T00:00:00Z',
      updated_at: '2024-01-04T00:00:00Z',
    });

    this.users.push({
      id: this.nextUserId++,
      username: 'parent_mike',
      email: 'mike@example.com',
      phone: '+1555123456',
      password_hash: '$2a$12$dummy.hash.for.demo.purposes',
      role: 'user',
      is_active: true,
      created_at: '2024-01-05T00:00:00Z',
      updated_at: '2024-01-05T00:00:00Z',
    });

    this.users.push({
      id: this.nextUserId++,
      username: 'sarah_wilson',
      email: 'sarah@example.com',
      phone: '+1555987654',
      password_hash: '$2a$12$dummy.hash.for.demo.purposes',
      role: 'user',
      is_active: true,
      created_at: '2024-01-06T00:00:00Z',
      updated_at: '2024-01-06T00:00:00Z',
    });

    this.users.push({
      id: this.nextUserId++,
      username: 'inactive_user',
      email: 'inactive@example.com',
      phone: '+1555555555',
      password_hash: '$2a$12$dummy.hash.for.demo.purposes',
      role: 'user',
      is_active: false,
      created_at: '2024-01-07T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    });

    // Add some demo children for the regular users
    this.children.push({
      id: this.nextChildId++,
      name: 'Emma Doe',
      parent_id: 3, // john_doe's ID
      created_at: '2024-01-10T00:00:00Z',
      updated_at: '2024-01-10T00:00:00Z',
    });

    this.children.push({
      id: this.nextChildId++,
      name: 'Liam Smith',
      parent_id: 4, // jane_smith's ID
      created_at: '2024-01-11T00:00:00Z',
      updated_at: '2024-01-11T00:00:00Z',
    });

    this.children.push({
      id: this.nextChildId++,
      name: 'Olivia Johnson',
      parent_id: 5, // parent_mike's ID
      created_at: '2024-01-12T00:00:00Z',
      updated_at: '2024-01-12T00:00:00Z',
    });

    // Add some demo activities
    this.activities.push({
      id: this.nextActivityId++,
      child_id: 1, // Emma Doe
      name: 'Soccer Practice',
      start_date: '2024-02-01',
      end_date: '2024-02-01',
      start_time: '15:00',
      end_time: '16:30',
      website_url: 'https://example.com/soccer',
      created_at: '2024-01-20T00:00:00Z',
      updated_at: '2024-01-20T00:00:00Z',
    });

    this.activities.push({
      id: this.nextActivityId++,
      child_id: 2, // Liam Smith
      name: 'Piano Lessons',
      start_date: '2024-02-02',
      end_date: '2024-02-02',
      start_time: '14:00',
      end_time: '15:00',
      created_at: '2024-01-21T00:00:00Z',
      updated_at: '2024-01-21T00:00:00Z',
    });

    this.activities.push({
      id: this.nextActivityId++,
      child_id: 3, // Olivia Johnson
      name: 'Art Class',
      start_date: '2024-02-03',
      end_date: '2024-02-03',
      start_time: '10:00',
      end_time: '11:30',
      website_url: 'https://example.com/art',
      created_at: '2024-01-22T00:00:00Z',
      updated_at: '2024-01-22T00:00:00Z',
    });
  }

  // Users
  findUserByEmail(email: string): MockUser | undefined {
    return this.users.find(u => u.email === email);
  }

  findUserByUsername(username: string): MockUser | undefined {
    return this.users.find(u => u.username === username);
  }

  findUserById(id: number): MockUser | undefined {
    return this.users.find(u => u.id === id);
  }

  createUser(userData: Omit<MockUser, 'id' | 'created_at' | 'updated_at'>): MockUser {
    const now = new Date().toISOString();
    const user: MockUser = {
      id: this.nextUserId++,
      ...userData,
      created_at: now,
      updated_at: now,
    };
    this.users.push(user);
    return user;
  }

  updateUser(id: number, updates: Partial<MockUser>): MockUser | null {
    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex === -1) return null;
    
    this.users[userIndex] = {
      ...this.users[userIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return this.users[userIndex];
  }

  searchUsers(query: string, excludeUserId: number): MockUser[] {
    return this.users.filter(u => 
      u.id !== excludeUserId && 
      (u.email.includes(query) || u.phone.includes(query))
    );
  }

  getAllUsers(page: number = 1, limit: number = 50, search: string = ''): {
    users: MockUser[];
    total: number;
    pages: number;
  } {
    let filteredUsers = this.users;
    
    if (search) {
      filteredUsers = this.users.filter(u => 
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.phone.includes(search)
      );
    }

    const total = filteredUsers.length;
    const pages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const users = filteredUsers.slice(offset, offset + limit);

    return { users, total, pages };
  }

  updateUserRole(userId: number, role: 'user' | 'admin' | 'super_admin'): MockUser | null {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return null;
    
    this.users[userIndex] = {
      ...this.users[userIndex],
      role,
      updated_at: new Date().toISOString(),
    };
    return this.users[userIndex];
  }

  updateUserStatus(userId: number, isActive: boolean): MockUser | null {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return null;
    
    this.users[userIndex] = {
      ...this.users[userIndex],
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };
    return this.users[userIndex];
  }

  deleteUser(userId: number): boolean {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return false;
    
    // Delete associated children and activities
    const userChildren = this.children.filter(c => c.parent_id === userId);
    userChildren.forEach(child => {
      this.deleteChild(child.id);
    });
    
    // Delete user
    this.users.splice(userIndex, 1);
    return true;
  }

  getSystemStats(): {
    users: { total: number; active: number; new_users_week: number; admin_users: number };
    activities: { total: number; activities_this_week: number; upcoming_activities: number };
    connections: { total: number; pending_connections: number };
  } {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const userStats = {
      total: this.users.length,
      active: this.users.filter(u => u.is_active).length,
      new_users_week: this.users.filter(u => new Date(u.created_at) >= weekAgo).length,
      admin_users: this.users.filter(u => u.role === 'admin' || u.role === 'super_admin').length
    };

    const activityStats = {
      total: this.activities.length,
      activities_this_week: this.activities.filter(a => new Date(a.created_at) >= weekAgo).length,
      upcoming_activities: this.activities.filter(a => new Date(a.start_date) >= now).length
    };

    const connectionStats = {
      total: this.connections.length,
      pending_connections: this.connectionRequests.filter(cr => cr.status === 'pending').length
    };

    return {
      users: userStats,
      activities: activityStats,
      connections: connectionStats
    };
  }

  // Children
  getChildrenByParentId(parentId: number): MockChild[] {
    return this.children.filter(c => c.parent_id === parentId);
  }

  findChildById(id: number): MockChild | undefined {
    return this.children.find(c => c.id === id);
  }

  createChild(childData: Omit<MockChild, 'id' | 'created_at' | 'updated_at'>): MockChild {
    const now = new Date().toISOString();
    const child: MockChild = {
      id: this.nextChildId++,
      ...childData,
      created_at: now,
      updated_at: now,
    };
    this.children.push(child);
    return child;
  }

  updateChild(id: number, updates: Partial<MockChild>): MockChild | null {
    const childIndex = this.children.findIndex(c => c.id === id);
    if (childIndex === -1) return null;
    
    this.children[childIndex] = {
      ...this.children[childIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return this.children[childIndex];
  }

  deleteChild(id: number): boolean {
    const childIndex = this.children.findIndex(c => c.id === id);
    if (childIndex === -1) return false;
    
    // Delete associated activities
    this.activities = this.activities.filter(a => a.child_id !== id);
    
    // Delete child
    this.children.splice(childIndex, 1);
    return true;
  }

  // Activities
  getActivitiesByChildIds(childIds: number[]): MockActivity[] {
    return this.activities.filter(a => childIds.includes(a.child_id));
  }

  getActivitiesInDateRange(childIds: number[], startDate: string, endDate: string): MockActivity[] {
    return this.activities.filter(a => 
      childIds.includes(a.child_id) &&
      a.start_date <= endDate &&
      a.end_date >= startDate
    );
  }

  createActivity(activityData: Omit<MockActivity, 'id' | 'created_at' | 'updated_at'>): MockActivity {
    const now = new Date().toISOString();
    const activity: MockActivity = {
      id: this.nextActivityId++,
      ...activityData,
      created_at: now,
      updated_at: now,
    };
    this.activities.push(activity);
    return activity;
  }

  // Connection Requests
  getConnectionRequestsByTargetParent(targetParentId: number): MockConnectionRequest[] {
    return this.connectionRequests.filter(cr => 
      cr.target_parent_id === targetParentId && cr.status === 'pending'
    );
  }

  createConnectionRequest(requestData: Omit<MockConnectionRequest, 'id' | 'created_at' | 'updated_at'>): MockConnectionRequest {
    const now = new Date().toISOString();
    const request: MockConnectionRequest = {
      id: this.nextRequestId++,
      ...requestData,
      created_at: now,
      updated_at: now,
    };
    this.connectionRequests.push(request);
    return request;
  }

  updateConnectionRequest(id: number, updates: Partial<MockConnectionRequest>): MockConnectionRequest | null {
    const requestIndex = this.connectionRequests.findIndex(cr => cr.id === id);
    if (requestIndex === -1) return null;
    
    this.connectionRequests[requestIndex] = {
      ...this.connectionRequests[requestIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return this.connectionRequests[requestIndex];
  }

  findConnectionRequestById(id: number): MockConnectionRequest | undefined {
    return this.connectionRequests.find(cr => cr.id === id);
  }

  // Connections
  createConnection(connectionData: Omit<MockConnection, 'id' | 'created_at'>): MockConnection {
    const connection: MockConnection = {
      id: this.nextConnectionId++,
      ...connectionData,
      created_at: new Date().toISOString(),
    };
    this.connections.push(connection);
    return connection;
  }
}

export default MockDatabase;