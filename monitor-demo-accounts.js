#!/usr/bin/env node

/**
 * Demo Account Monitoring Script
 * 
 * This script can be run as a cron job to continuously monitor demo accounts
 * and alert if any issues are detected.
 * 
 * Usage:
 *   node monitor-demo-accounts.js [--slack-webhook=URL] [--email=address]
 * 
 * Setup as cron job (check every 30 minutes):
 *   */30 * * * * /usr/bin/node /path/to/monitor-demo-accounts.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class DemoAccountMonitor {
    constructor() {
        this.args = process.argv.slice(2);
        this.slackWebhook = this.getArgValue('--slack-webhook');
        this.email = this.getArgValue('--email');
        this.logFile = 'demo-account-monitor.log';
        this.alertFile = 'demo-account-alerts.json';
    }

    getArgValue(arg) {
        const found = this.args.find(a => a.startsWith(arg));
        return found ? found.split('=')[1] : null;
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        
        // Append to log file
        fs.appendFileSync(this.logFile, logMessage + '\n');
    }

    async runTest() {
        return new Promise((resolve, reject) => {
            const testScript = path.join(__dirname, 'test-demo-accounts-comprehensive.js');
            
            exec(`node ${testScript} --quick`, (error, stdout, stderr) => {
                if (error) {
                    resolve({
                        success: false,
                        exitCode: error.code,
                        output: stdout,
                        error: stderr
                    });
                } else {
                    resolve({
                        success: true,
                        exitCode: 0,
                        output: stdout,
                        error: stderr
                    });
                }
            });
        });
    }

    async sendAlert(message, details) {
        this.log(`🚨 ALERT: ${message}`);
        
        // Save alert to file
        const alert = {
            timestamp: new Date().toISOString(),
            message,
            details,
            resolved: false
        };

        let alerts = [];
        if (fs.existsSync(this.alertFile)) {
            alerts = JSON.parse(fs.readFileSync(this.alertFile, 'utf8'));
        }
        alerts.push(alert);
        fs.writeFileSync(this.alertFile, JSON.stringify(alerts, null, 2));

        // Send Slack notification if configured
        if (this.slackWebhook) {
            try {
                const axios = require('axios');
                await axios.post(this.slackWebhook, {
                    text: `🚨 Demo Account Alert: ${message}`,
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `*Demo Account System Alert*\n\n*Issue:* ${message}\n*Time:* ${alert.timestamp}\n*Details:* ${details}`
                            }
                        }
                    ]
                });
                this.log('✅ Slack alert sent successfully');
            } catch (error) {
                this.log(`❌ Failed to send Slack alert: ${error.message}`);
            }
        }

        // Send email if configured
        if (this.email) {
            this.log(`📧 Email alert would be sent to: ${this.email}`);
            // Note: Email implementation would require additional setup (nodemailer, etc.)
        }
    }

    async monitor() {
        this.log('🔍 Starting demo account monitoring check...');
        
        try {
            const result = await this.runTest();
            
            if (result.success) {
                this.log('✅ All demo accounts are working correctly');
                
                // Check if there were previous unresolved alerts
                if (fs.existsSync(this.alertFile)) {
                    const alerts = JSON.parse(fs.readFileSync(this.alertFile, 'utf8'));
                    const unresolved = alerts.filter(a => !a.resolved);
                    
                    if (unresolved.length > 0) {
                        // Mark alerts as resolved
                        alerts.forEach(alert => alert.resolved = true);
                        fs.writeFileSync(this.alertFile, JSON.stringify(alerts, null, 2));
                        
                        this.log('✅ Previous issues have been resolved');
                        if (this.slackWebhook) {
                            try {
                                const axios = require('axios');
                                await axios.post(this.slackWebhook, {
                                    text: '✅ Demo Account Issues Resolved',
                                    blocks: [
                                        {
                                            type: "section",
                                            text: {
                                                type: "mrkdwn",
                                                text: `*Demo Account System Recovery*\n\n✅ All demo accounts are now working correctly\n*Time:* ${new Date().toISOString()}`
                                            }
                                        }
                                    ]            
                                });
                            } catch (error) {
                                this.log(`❌ Failed to send resolution alert: ${error.message}`);
                            }
                        }
                    }
                }
            } else {
                const errorMessage = 'Demo account tests failed';
                const details = `Exit code: ${result.exitCode}\nOutput: ${result.output}\nError: ${result.error}`;
                
                await this.sendAlert(errorMessage, details);
            }
        } catch (error) {
            const errorMessage = 'Monitoring script error';
            const details = error.message;
            
            await this.sendAlert(errorMessage, details);
        }
        
        this.log('🏁 Monitoring check completed');
    }
}

// Help message
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Demo Account Monitoring Script

Usage:
  node monitor-demo-accounts.js [options]

Options:
  --slack-webhook=URL    Send alerts to Slack webhook URL
  --email=address        Send alerts to email address
  --help                 Show this help message

Examples:
  node monitor-demo-accounts.js
  node monitor-demo-accounts.js --slack-webhook=https://hooks.slack.com/...
  
Setup as cron job (every 30 minutes):
  */30 * * * * /usr/bin/node /path/to/monitor-demo-accounts.js
`);
    process.exit(0);
}

// Run monitoring
const monitor = new DemoAccountMonitor();
monitor.monitor().catch(error => {
    console.error('💥 Monitoring failed:', error);
    process.exit(1);
});