// Run this in the browser console while creating a multi-host activity

// Hook into console.log to capture all debug messages
const originalConsoleLog = console.log;
const debugMessages = [];

console.log = function(...args) {
    debugMessages.push({ timestamp: new Date().toISOString(), args });
    return originalConsoleLog.apply(console, arguments);
};

// Function to check current state
function checkMultiHostState() {
    console.log('\n🔍 === MULTI-HOST DEBUG STATE ===');
    
    // Try to access React component state through DOM
    const componentDiv = document.querySelector('[data-testid="child-activity-screen"]') || document.querySelector('.child-activity-content') || document.querySelector('.activity-form');
    
    if (!componentDiv) {
        console.log('❌ Could not find component div');
        return;
    }
    
    // Look for React fiber to access component state
    const reactFiber = componentDiv._reactInternalFiber || componentDiv._reactInternalInstance;
    if (reactFiber) {
        console.log('⚠️ Using legacy React fiber access');
        // This might work in older React versions
    }
    
    // Alternative: Check for any global state or debug variables
    if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
        console.log('🔍 React DevTools might be available');
    }
    
    // Check for form data by looking at form elements
    const jointHostCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    console.log(`📊 Found ${jointHostCheckboxes.length} checkboxes on page`);
    
    // Look for specific patterns in checkbox values or names
    const jointHostPatterns = [];
    const selectedCheckboxes = [];
    
    jointHostCheckboxes.forEach((checkbox, index) => {
        if (checkbox.checked) {
            selectedCheckboxes.push({
                index,
                value: checkbox.value,
                name: checkbox.name,
                parentLabel: checkbox.closest('label')?.textContent || 'Unknown'
            });
        }
        
        // Look for joint-* patterns
        if (checkbox.value && checkbox.value.includes('joint-')) {
            jointHostPatterns.push({
                value: checkbox.value,
                checked: checkbox.checked,
                label: checkbox.closest('label')?.textContent || 'Unknown'
            });
        }
    });
    
    console.log('✅ Selected checkboxes:', selectedCheckboxes);
    console.log('🎯 Joint host patterns found:', jointHostPatterns);
    
    // Look for any elements containing "Emma Johnson"
    const emmaElements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent && el.textContent.includes('Emma Johnson')
    );
    console.log(`👤 Found ${emmaElements.length} elements mentioning Emma Johnson`);
    
    // Look for any elements containing "Zoe Wong"
    const zoeElements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent && el.textContent.includes('Zoe Wong')
    );
    console.log(`👤 Found ${zoeElements.length} elements mentioning Zoe Wong`);
    
    console.log('=== END DEBUG STATE ===\n');
}

// Function to show filtered console messages
function showRelevantLogs() {
    console.log('\n📋 === RELEVANT DEBUG MESSAGES ===');
    
    const relevantMessages = debugMessages.filter(msg => {
        const msgStr = msg.args.join(' ').toLowerCase();
        return msgStr.includes('joint') || 
               msgStr.includes('emma') || 
               msgStr.includes('zoe') || 
               msgStr.includes('invitation') ||
               msgStr.includes('connection') ||
               msgStr.includes('multihost') ||
               msgStr.includes('host');
    });
    
    relevantMessages.slice(-20).forEach(msg => {
        console.log(`[${msg.timestamp}]`, ...msg.args);
    });
    
    console.log('=== END RELEVANT MESSAGES ===\n');
}

// Run initial state check
checkMultiHostState();

// Set up periodic monitoring
const monitor = setInterval(() => {
    checkMultiHostState();
}, 10000); // Check every 10 seconds

console.log('🚀 Multi-host debugging enabled!');
console.log('📋 Use checkMultiHostState() to check current state');
console.log('📋 Use showRelevantLogs() to see relevant console messages');
console.log('🛑 Use clearInterval(' + monitor + ') to stop monitoring');

// Export functions to global scope for manual use
window.checkMultiHostState = checkMultiHostState;
window.showRelevantLogs = showRelevantLogs;
window.stopMultiHostMonitoring = () => clearInterval(monitor);