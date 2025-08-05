const request = require('supertest');
const { Pool } = require('pg');
const { startTestServer, stopTestServer, clearTestDatabase, createTestUsers } = require('../../helpers/testHelpers');

describe('Connection Request Flow', () => {
    let app;
    let server;
    let pool;
    let johnsonToken, wongToken;
    let johnsonUser, wongUser, emmaChild, miaChild;

    beforeAll(async () => {
        // Start test server
        const serverInfo = await startTestServer();
        app = serverInfo.app;
        server = serverInfo.server;
        
        // Setup database connection
        pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/gruju_test',
            ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
        });
    });

    afterAll(async () => {
        if (pool) await pool.end();
        await stopTestServer(server);
    });

    beforeEach(async () => {
        // Clear and setup test data
        await clearTestDatabase(pool);
        
        // Create test users and get tokens
        const users = await createTestUsers(pool);
        johnsonUser = users.find(u => u.email === 'johnson@example.com');
        wongUser = users.find(u => u.email === 'wong@example.com');

        // Login to get tokens
        const johnsonLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: 'johnson@example.com', password: 'demo123' });
        johnsonToken = johnsonLogin.body.token;

        const wongLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: 'wong@example.com', password: 'demo123' });
        wongToken = wongLogin.body.token;

        // Create children
        const emmaResponse = await request(app)
            .post('/api/children')
            .set('Authorization', `Bearer ${johnsonToken}`)
            .send({ name: 'Emma Johnson' });
        emmaChild = emmaResponse.body.data;

        const miaResponse = await request(app)
            .post('/api/children')
            .set('Authorization', `Bearer ${wongToken}`)
            .send({ name: 'Mia Wong' });
        miaChild = miaResponse.body.data;
    });

    describe('Connection Request Lifecycle', () => {
        test('should send, receive, and accept connection request successfully', async () => {
            // 1. Send connection request from Johnson to Wong
            const sendResponse = await request(app)
                .post('/api/connections/request')
                .set('Authorization', `Bearer ${johnsonToken}`)
                .send({
                    target_parent_id: wongUser.id,
                    child_id: emmaChild.id,
                    target_child_id: miaChild.id,
                    message: 'Emma wants to connect with Mia'
                });

            expect(sendResponse.status).toBe(200);
            expect(sendResponse.body.success).toBe(true);
            const requestId = sendResponse.body.data.id;

            // 2. Verify request appears in Wong's pending requests
            const pendingResponse = await request(app)
                .get('/api/connections/requests')
                .set('Authorization', `Bearer ${wongToken}`);

            expect(pendingResponse.status).toBe(200);
            expect(pendingResponse.body.success).toBe(true);
            expect(pendingResponse.body.data).toHaveLength(1);
            
            const pendingRequest = pendingResponse.body.data[0];
            expect(pendingRequest.id).toBe(requestId);
            expect(pendingRequest.status).toBe('pending');
            expect(pendingRequest.child_name).toBe('Emma Johnson');
            expect(pendingRequest.target_child_name).toBe('Mia Wong');

            // 3. Accept the connection request
            const acceptResponse = await request(app)
                .post(`/api/connections/respond/${requestId}`)
                .set('Authorization', `Bearer ${wongToken}`)
                .send({ action: 'accept' });

            expect(acceptResponse.status).toBe(200);
            expect(acceptResponse.body.success).toBe(true);

            // 4. Verify request is no longer in pending list
            const afterAcceptResponse = await request(app)
                .get('/api/connections/requests')
                .set('Authorization', `Bearer ${wongToken}`);

            expect(afterAcceptResponse.status).toBe(200);
            expect(afterAcceptResponse.body.data).toHaveLength(0);

            // 5. Verify active connection was created
            const connectionsResponse = await request(app)
                .get('/api/connections')
                .set('Authorization', `Bearer ${johnsonToken}`);

            expect(connectionsResponse.status).toBe(200);
            expect(connectionsResponse.body.success).toBe(true);
            expect(connectionsResponse.body.data).toHaveLength(1);
            
            const connection = connectionsResponse.body.data[0];
            expect(connection.status).toBe('active');
            expect([connection.child1_name, connection.child2_name]).toContain('Emma Johnson');
            expect([connection.child1_name, connection.child2_name]).toContain('Mia Wong');

            // 6. Verify connection appears for both families
            const wongConnectionsResponse = await request(app)
                .get('/api/connections')
                .set('Authorization', `Bearer ${wongToken}`);

            expect(wongConnectionsResponse.status).toBe(200);
            expect(wongConnectionsResponse.body.data).toHaveLength(1);
        });

        test('should send and reject connection request successfully', async () => {
            // 1. Send connection request
            const sendResponse = await request(app)
                .post('/api/connections/request')
                .set('Authorization', `Bearer ${johnsonToken}`)
                .send({
                    target_parent_id: wongUser.id,
                    child_id: emmaChild.id,
                    target_child_id: miaChild.id
                });

            expect(sendResponse.status).toBe(200);
            const requestId = sendResponse.body.data.id;

            // 2. Reject the connection request
            const rejectResponse = await request(app)
                .post(`/api/connections/respond/${requestId}`)
                .set('Authorization', `Bearer ${wongToken}`)
                .send({ action: 'reject' });

            expect(rejectResponse.status).toBe(200);
            expect(rejectResponse.body.success).toBe(true);

            // 3. Verify request is no longer in pending list
            const afterRejectResponse = await request(app)
                .get('/api/connections/requests')
                .set('Authorization', `Bearer ${wongToken}`);

            expect(afterRejectResponse.status).toBe(200);
            expect(afterRejectResponse.body.data).toHaveLength(0);

            // 4. Verify no connection was created
            const connectionsResponse = await request(app)
                .get('/api/connections')
                .set('Authorization', `Bearer ${johnsonToken}`);

            expect(connectionsResponse.status).toBe(200);
            expect(connectionsResponse.body.data).toHaveLength(0);

            // 5. Verify request status in database is 'declined'
            const dbResult = await pool.query(
                'SELECT status FROM connection_requests WHERE id = $1',
                [requestId]
            );
            expect(dbResult.rows[0].status).toBe('declined');
        });

        test('should show sent requests with pending status', async () => {
            // 1. Send connection request
            const sendResponse = await request(app)
                .post('/api/connections/request')
                .set('Authorization', `Bearer ${johnsonToken}`)
                .send({
                    target_parent_id: wongUser.id,
                    child_id: emmaChild.id,
                    target_child_id: miaChild.id
                });

            expect(sendResponse.status).toBe(200);
            const requestId = sendResponse.body.data.id;

            // 2. Verify request appears in Johnson's sent requests
            const sentResponse = await request(app)
                .get('/api/connections/sent-requests')
                .set('Authorization', `Bearer ${johnsonToken}`);

            expect(sentResponse.status).toBe(200);
            expect(sentResponse.body.success).toBe(true);
            expect(sentResponse.body.data).toHaveLength(1);
            
            const sentRequest = sentResponse.body.data[0];
            expect(sentRequest.id).toBe(requestId);
            expect(sentRequest.status).toBe('pending');
            expect(sentRequest.child_name).toBe('Emma Johnson');
            expect(sentRequest.target_child_name).toBe('Mia Wong');
        });

        test('should prevent duplicate connection requests', async () => {
            // 1. Send first connection request
            const firstResponse = await request(app)
                .post('/api/connections/request')
                .set('Authorization', `Bearer ${johnsonToken}`)
                .send({
                    target_parent_id: wongUser.id,
                    child_id: emmaChild.id,
                    target_child_id: miaChild.id
                });

            expect(firstResponse.status).toBe(200);

            // 2. Try to send duplicate request
            const duplicateResponse = await request(app)
                .post('/api/connections/request')
                .set('Authorization', `Bearer ${johnsonToken}`)
                .send({
                    target_parent_id: wongUser.id,
                    child_id: emmaChild.id,
                    target_child_id: miaChild.id
                });

            expect(duplicateResponse.status).toBe(400);
            expect(duplicateResponse.body.success).toBe(false);
            expect(duplicateResponse.body.error).toContain('already exists');
        });
    });

    describe('Connection Integration with Activities', () => {
        test('should make connected children available for activity invitations', async () => {
            // 1. Create and accept connection
            const sendResponse = await request(app)
                .post('/api/connections/request')
                .set('Authorization', `Bearer ${johnsonToken}`)
                .send({
                    target_parent_id: wongUser.id,
                    child_id: emmaChild.id,
                    target_child_id: miaChild.id
                });

            const requestId = sendResponse.body.data.id;

            await request(app)
                .post(`/api/connections/respond/${requestId}`)
                .set('Authorization', `Bearer ${wongToken}`)
                .send({ action: 'accept' });

            // 2. Create activity for Emma
            const activityResponse = await request(app)
                .post(`/api/activities/${emmaChild.id}`)
                .set('Authorization', `Bearer ${johnsonToken}`)
                .send({
                    name: 'Soccer Practice',
                    start_date: '2025-08-10',
                    start_time: '16:00',
                    end_time: '17:30'
                });

            expect(activityResponse.status).toBe(200);
            const activityId = activityResponse.body.data.id;

            // 3. Verify connections are available for activity
            const connectionsResponse = await request(app)
                .get('/api/connections')
                .set('Authorization', `Bearer ${johnsonToken}`);

            expect(connectionsResponse.status).toBe(200);
            expect(connectionsResponse.body.data).toHaveLength(1);

            // 4. Should be able to invite connected child to activity
            const inviteResponse = await request(app)
                .post(`/api/activities/${activityId}/invite`)
                .set('Authorization', `Bearer ${johnsonToken}`)
                .send({
                    invited_parent_id: wongUser.id,
                    child_id: miaChild.id,
                    message: 'Want to join Emma for soccer?'
                });

            expect(inviteResponse.status).toBe(200);
            expect(inviteResponse.body.success).toBe(true);
        });
    });
});