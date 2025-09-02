// Test to verify the exact invitation logic flow

// Simulate the frontend invitation logic with the same data structure
function simulateInvitationLogic() {
    console.log('🧪 Simulating invitation logic flow...\n');
    
    // Mock data based on what we know from the debug scripts
    const child = { uuid: 'eff7d1e5-b308-4846-8ff7-6b929b91ce4c', name: 'Mia Wong' }; // Primary host
    const jointHostChildren = ['6795debd-d0cf-4c23-a5a1-a4ce65339fe6']; // Zoe Wong
    
    // Mock connected children (what would be selected in the UI)
    const selectedConnectedChildren = [
        'main-e7b82b67-500f-4fbd-a4bf-6817baf42c48', // Mia Davis from primary host
        'joint-6795debd-d0cf-4c23-a5a1-a4ce65339fe6-1610aa62-a602-42e8-9079-91ffc3aea07c' // Emma Johnson from joint host
    ];
    
    console.log('📊 Input data:');
    console.log('  Primary host:', child.name, child.uuid);
    console.log('  Joint host children:', jointHostChildren);
    console.log('  Selected connected children:', selectedConnectedChildren);
    
    // Simulate the parsing logic
    const invitationsByHost = new Map();
    
    for (const childId of selectedConnectedChildren) {
        console.log(`\n🔍 Processing childId: ${childId}`);
        
        if (typeof childId === 'string' && (childId.includes('pending-child-') || childId.startsWith('pending-child-') || childId.includes('main-pending-child-'))) {
            console.log('⏭️ Skipping pending connection invitation:', childId);
            continue;
        }
        
        let hostChildUuid = child.uuid; // Default to main host
        let actualChildId = childId;
        
        // Parse prefixed IDs for joint hosting
        if (typeof childId === 'string') {
            if (childId.startsWith('main-')) {
                hostChildUuid = child.uuid;
                actualChildId = childId.replace('main-', '');
                console.log(`  📍 Main host invitation: ${actualChildId} → ${hostChildUuid}`);
            } else if (childId.startsWith('joint-')) {
                // NEW PARSING LOGIC - should work correctly now
                const withoutPrefix = childId.substring(6); // Remove 'joint-'
                const uuidParts = withoutPrefix.split('-');
                if (uuidParts.length >= 5) {
                    // Reconstruct the full host child UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
                    hostChildUuid = `${uuidParts[0]}-${uuidParts[1]}-${uuidParts[2]}-${uuidParts[3]}-${uuidParts[4]}`;
                    // The rest is the connected child UUID
                    actualChildId = uuidParts.slice(5).join('-');
                    console.log(`  📍 Joint host invitation: ${actualChildId} → ${hostChildUuid}`);
                } else {
                    console.error(`  ❌ Invalid joint UUID format: ${childId}`);
                }
            }
        }
        
        if (!invitationsByHost.has(hostChildUuid)) {
            invitationsByHost.set(hostChildUuid, []);
        }
        invitationsByHost.get(hostChildUuid).push(actualChildId);
    }
    
    console.log('\n🎯 Final invitations grouped by host:');
    Array.from(invitationsByHost.entries()).forEach(([hostUuid, childIds]) => {
        const hostName = hostUuid === child.uuid ? 'Mia Wong (Primary)' : 'Zoe Wong (Joint)';
        console.log(`  ${hostName} (${hostUuid}): ${childIds.length} invitations`);
        childIds.forEach((childId, index) => {
            const childName = childId === 'e7b82b67-500f-4fbd-a4bf-6817baf42c48' ? 'Mia Davis' : 
                             childId === '1610aa62-a602-42e8-9079-91ffc3aea07c' ? 'Emma Johnson' : 'Unknown';
            console.log(`    ${index + 1}. ${childName} (${childId})`);
        });
    });
    
    // Check if Emma Johnson invitation would be processed
    const zoeWongUuid = '6795debd-d0cf-4c23-a5a1-a4ce65339fe6';
    const emmaJohnsonUuid = '1610aa62-a602-42e8-9079-91ffc3aea07c';
    
    const zoeInvitations = invitationsByHost.get(zoeWongUuid) || [];
    const hasEmmaInvitation = zoeInvitations.includes(emmaJohnsonUuid);
    
    console.log(`\n🎯 Emma Johnson invitation check:`);
    console.log(`  Expected from Zoe Wong: ${hasEmmaInvitation ? '✅ YES' : '❌ NO'}`);
    console.log(`  Zoe's invitations: [${zoeInvitations.join(', ')}]`);
    
    if (hasEmmaInvitation) {
        console.log('\n✅ Logic appears correct - Emma should receive invitation from Zoe');
    } else {
        console.log('\n❌ Logic issue - Emma would NOT receive invitation from Zoe');
    }
}

// Run the simulation
simulateInvitationLogic();