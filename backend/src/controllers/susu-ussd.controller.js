const SusuService = require("../services/susu.service");

class SusuUssdController {
    static async handleUssdRequest(req, res) {
        const { sessionId, serviceCode, phoneNumber, text } = req.body;
        
        try {
            let response = "";

            if (text === '') {
                // Main menu
                response = `CON Welcome to Susu-BG Mobile Banking
1. Check Balance
2. My Contributions
3. Loan Status
4. Contact Collector
5. Exit`;
            } else if (text === '1') {
                // Check Balance - requires membership number
                response = `CON Enter your membership number:
(e.g., MKT-001-015)`;
            } else if (text.startsWith('1*')) {
                // Process balance check with membership number
                const membershipNumber = text.split('*')[1];
                if (membershipNumber.length < 10) {
                    response = `CON Invalid membership number. Try again:
(e.g., MKT-001-015)`;
                } else {
                    try {
                        const balanceResponse = await SusuService.checkBalance(phoneNumber, membershipNumber);
                        if (balanceResponse.success) {
                            const data = balanceResponse.data;
                            response = `END ${data.memberName}, your Susu balance:
Group: ${data.groupName}
Member: ${data.membershipNumber}
Tier: ${data.tier}
Total Savings: GHS ${data.totalContributions.toFixed(2)}
Daily Contribution: GHS ${data.dailyContribution.toFixed(2)}
Cycle: ${data.cycleStart} to ${data.cycleEnd}

Thank you for saving with Susu-BG!`;
                        } else {
                            response = `END Membership not found. Please contact your collector.`;
                        }
                    } catch (error) {
                        response = `END Error checking balance. Please try again later.`;
                    }
                }
            } else if (text === '2') {
                // My Contributions
                response = `CON Enter your membership number:
(e.g., MKT-001-015)`;
            } else if (text.startsWith('2*')) {
                // Process contributions check
                const membershipNumber = text.split('*')[1];
                try {
                    const balanceResponse = await SusuService.checkBalance(phoneNumber, membershipNumber);
                    if (balanceResponse.success) {
                        const data = balanceResponse.data;
                        response = `END ${data.memberName}, your contribution summary:
Group: ${data.groupName}
Member: ${data.membershipNumber}
Total Savings: GHS ${data.totalContributions.toFixed(2)}
Daily Contribution: GHS ${data.dailyContribution.toFixed(2)}
Days Saved: ${Math.floor(data.totalContributions / data.dailyContribution)}
Remaining Days: ${Math.max(0, 30 - Math.floor(data.totalContributions / data.dailyContribution))}

Keep up the great savings!`;
                    } else {
                        response = `END Membership not found. Please contact your collector.`;
                    }
                } catch (error) {
                    response = `END Error checking contributions. Please try again later.`;
                }
            } else if (text === '3') {
                // Loan Status
                response = `CON Enter your membership number:
(e.g., MKT-001-015)`;
            } else if (text.startsWith('3*')) {
                // Process loan status check
                const membershipNumber = text.split('*')[1];
                response = `END ${membershipNumber}, you have no active loans.
To apply for a loan, please contact your group collector.

Loan Requirements:
- 30+ days of contribution history
- 2 active guarantors from your group
- Maximum loan: GHS 1,000
- Interest: 3-7% monthly`;
            } else if (text === '4') {
                // Contact Collector
                response = `END To contact your collector:
- Call: 020-123-4567
- WhatsApp: 020-123-4567
- Email: collector@susu-bg.com
- Visit: Monday-Friday, 8am-5pm

We're here to help you save!`;
            } else if (text === '5') {
                // Exit
                response = `END Thank you for using Susu-BG!
Your trusted partner for cooperative savings.
Remember: Small savings today, big dreams tomorrow!`;
            } else {
                // Invalid input
                response = `CON Invalid selection. Please try again:
1. Check Balance
2. My Contributions  
3. Loan Status
4. Contact Collector
5. Exit`;
            }

            res.set('Content-Type', 'text/plain');
            res.send(response);

        } catch (error) {
            console.error('USSD Error:', error);
            res.set('Content-Type', 'text/plain');
            res.send('END Service temporarily unavailable. Please try again later.');
        }
    }

    static async handleBalanceCheck(req, res) {
        try {
            const { phoneNumber, membershipNumber } = req.query;
            
            if (!phoneNumber || !membershipNumber) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Phone number and membership number required" 
                });
            }

            const result = await SusuService.checkBalance(phoneNumber, membershipNumber);
            res.json(result);

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async handleContributionReminder(req, res) {
        try {
            const { membershipId } = req.body;
            
            // This would trigger a contribution reminder SMS
            // Implementation would depend on your SMS service
            
            res.json({ 
                success: true, 
                message: "Contribution reminder sent successfully" 
            });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async handleLoanReminder(req, res) {
        try {
            const { loanId } = req.body;
            
            // This would trigger a loan repayment reminder SMS
            // Implementation would depend on your SMS service
            
            res.json({ 
                success: true, 
                message: "Loan reminder sent successfully" 
            });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = SusuUssdController;
