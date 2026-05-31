const { v4: uuidv4 } = require("uuid");
const supabase = require("../lib/supabase");
const PaymentService = require("./payment.service");
const WigalService = require("./wigal.service");
const logger = require("../lib/logger");

class SusuService {
    // Group Management
    static async createSusuGroup(groupData) {
        const groupId = uuidv4();
        const groupCode = this.generateGroupCode(groupData.targetGroup);
        
        const { data: group, error } = await supabase.from('susu_groups').insert({
            id: groupId,
            group_name: groupData.groupName,
            group_code: groupCode,
            target_group: groupData.targetGroup,
            collector_id: groupData.collectorId,
            max_members: groupData.maxMembers || 30,
            daily_contribution: groupData.dailyContribution || 10.00,
            cycle_days: groupData.cycleDays || 30
        }).select().single();

        if (error) throw error;

        // Initialize liquidity tracking
        await supabase.from('susu_liquidity').insert({
            group_id: groupId,
            total_deposits: 0,
            vault_cash: 0,
            loan_portfolio: 0,
            available_for_loans: 0
        });

        // Start first cycle
        await this.startNewCycle(groupId);

        return group;
    }

    static generateGroupCode(targetGroup) {
        const prefixes = {
            'MARKET_WOMEN': 'MKT',
            'TAXI_DRIVERS': 'TAXI',
            'OFFICE_WORKERS': 'OFFC',
            'GENERAL': 'GEN'
        };
        const prefix = prefixes[targetGroup] || 'GEN';
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${prefix}-${random}`;
    }

    static async startNewCycle(groupId) {
        const { data: group } = await supabase.from('susu_groups').select('cycle_days').eq('id', groupId).single();
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + group.cycle_days);

        const { data: lastCycle } = await supabase
            .from('susu_cycles')
            .select('cycle_number')
            .eq('group_id', groupId)
            .order('cycle_number', { ascending: false })
            .limit(1)
            .maybeSingle();

        const cycleNumber = (lastCycle?.cycle_number || 0) + 1;

        return await supabase.from('susu_cycles').insert({
            group_id: groupId,
            cycle_number: cycleNumber,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
        }).select().single();
    }

    // Membership Management
    static async addMemberToGroup(groupId, userId, memberData) {
        const membershipId = uuidv4();
        const membershipNumber = await this.generateMembershipNumber(groupId);

        const { data: membership, error } = await supabase.from('susu_memberships').insert({
            id: membershipId,
            user_id: userId,
            group_id: groupId,
            membership_number: membershipNumber,
            tier: memberData.tier || 'SILVER',
            daily_contribution: memberData.dailyContribution || 10.00,
            ghana_card_number: memberData.ghanaCardNumber,
            ghana_card_type: memberData.ghanaCardType,
            cycle_start_date: new Date().toISOString().split('T')[0],
            cycle_end_date: this.calculateCycleEndDate(groupId)
        }).select().single();

        if (error) throw error;

        // Charge onboarding fee
        await this.chargeOnboardingFee(membershipId, memberData.onboardingFee || 20.00);

        return membership;
    }

    static async generateMembershipNumber(groupId) {
        const { data: group } = await supabase.from('susu_groups').select('group_code').eq('id', groupId).single();
        const { data: count } = await supabase
            .from('susu_memberships')
            .select('id')
            .eq('group_id', groupId);
        
        const memberNumber = (count?.length || 0) + 1;
        return `${group.group_code}-${memberNumber.toString().padStart(3, '0')}`;
    }

    static calculateCycleEndDate(groupId) {
        // This would get the current cycle end date
        // For now, return 30 days from now
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        return endDate.toISOString().split('T')[0];
    }

    // Daily Contributions
    static async recordDailyContribution(membershipId, amount, paymentMethod = 'CASH', collectorId) {
        const contributionId = uuidv4();
        const today = new Date().toISOString().split('T')[0];
        const reference = `SUSU-CONT-${contributionId.substring(0, 8)}-${Date.now()}`;

        // Check if contribution already recorded today
        const { data: existing } = await supabase
            .from('susu_contributions')
            .select('id')
            .eq('membership_id', membershipId)
            .eq('contribution_date', today)
            .maybeSingle();

        if (existing) {
            throw new Error('Contribution already recorded for today');
        }

        // Get membership details
        const { data: membership } = await supabase
            .from('susu_memberships')
            .select('user_id, group_id, daily_contribution')
            .eq('id', membershipId)
            .single();

        // Record contribution
        const { error: contributionError } = await supabase.from('susu_contributions').insert({
            id: contributionId,
            membership_id: membershipId,
            group_id: membership.group_id,
            amount,
            contribution_date: today,
            payment_method: paymentMethod,
            collector_id: collectorId,
            transaction_reference: reference
        });

        if (contributionError) throw contributionError;

        // Update membership totals
        await supabase.rpc('update_membership_totals', {
            p_membership_id: membershipId,
            p_amount: amount
        });

        // Update liquidity
        await this.updateLiquidity(membership.group_id, amount, 'CONTRIBUTION');

        // Send SMS notification
        await this.sendContributionSMS(membershipId, amount, reference);

        return { success: true, reference };
    }

    static async sendContributionSMS(membershipId, amount, reference) {
        const { data: membership } = await supabase
            .from('susu_memberships')
            .select(`
                users (phone_number, full_name),
                susu_groups (group_name)
            `)
            .eq('id', membershipId)
            .single();

        const message = `Susu Alert: Your daily contribution of GHS ${amount.toFixed(2)} has been recorded. Ref: ${reference}. Thank you for saving with ${membership.susu_groups.group_name}.`;
        
        try {
            await WigalService.sendSMS(membership.users.phone_number, message);
            
            // Log SMS
            await supabase.from('susu_sms_logs').insert({
                membership_id: membershipId,
                phone_number: membership.users.phone_number,
                message_type: 'CONTRIBUTION',
                message_content: message
            });
        } catch (error) {
            logger.error('SMS failed:', error);
        }
    }

    // P2P Loan System
    static async applyForLoan(loanData) {
        const loanId = uuidv4();
        const interestRate = loanData.interestRate || 5.0; // 5% monthly default
        const processingFee = loanData.processingFee || 20.00;
        const insuranceFee = loanData.amount * 0.01; // 1% insurance
        const totalRepayment = loanData.amount + (loanData.amount * interestRate / 100) + processingFee + insuranceFee;

        // Verify guarantors
        await this.verifyGuarantors(loanData.borrowerId, loanData.guarantor1Id, loanData.guarantor2Id);

        const { data: loan, error } = await supabase.from('susu_loans').insert({
            id: loanId,
            borrower_id: loanData.borrowerId,
            group_id: loanData.groupId,
            amount: loanData.amount,
            interest_rate: interestRate,
            loan_term_days: loanData.loanTermDays || 30,
            processing_fee: processingFee,
            insurance_fee: insuranceFee,
            total_repayment: totalRepayment,
            guarantor_1_id: loanData.guarantor1Id,
            guarantor_2_id: loanData.guarantor2Id,
            application_date: new Date().toISOString().split('T')[0],
            due_date: this.calculateDueDate(loanData.loanTermDays || 30)
        }).select().single();

        if (error) throw error;

        return loan;
    }

    static async verifyGuarantors(borrowerId, guarantor1Id, guarantor2Id) {
        if (borrowerId === guarantor1Id || borrowerId === guarantor2Id || guarantor1Id === guarantor2Id) {
            throw new Error('Borrower and guarantors must be different people');
        }

        // Check if guarantors are active and in good standing
        const { data: guarantors } = await supabase
            .from('susu_memberships')
            .select('id, status, total_contributions')
            .in('id', [guarantor1Id, guarantor2Id])
            .eq('status', 'ACTIVE');

        if (guarantors?.length !== 2) {
            throw new Error('Both guarantors must be active members');
        }

        // Check minimum contribution history (e.g., at least 30 days of contributions)
        const minContribution = 300; // 30 days * 10 GHS
        for (const guarantor of guarantors) {
            if (guarantor.total_contributions < minContribution) {
                throw new Error('Guarantors must have sufficient contribution history');
            }
        }
    }

    static calculateDueDate(termDays) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + termDays);
        return dueDate.toISOString().split('T')[0];
    }

    static async approveLoan(loanId, collectorId) {
        const { data: loan } = await supabase
            .from('susu_loans')
            .select('*')
            .eq('id', loanId)
            .single();

        if (!loan) throw new Error('Loan not found');

        // Check liquidity (80/20 rule)
        const { data: liquidity } = await supabase
            .from('susu_liquidity')
            .select('available_for_loans')
            .eq('group_id', loan.group_id)
            .single();

        if (liquidity?.available_for_loans < loan.amount) {
            throw new Error('Insufficient funds available for lending');
        }

        // Update loan status
        const { error: updateError } = await supabase.from('susu_loans')
            .update({
                status: 'APPROVED',
                approval_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', loanId);

        if (updateError) throw updateError;

        return { success: true, message: 'Loan approved successfully' };
    }

    static async disburseLoan(loanId, collectorId) {
        const { data: loan } = await supabase
            .from('susu_loans')
            .select('*')
            .eq('id', loanId)
            .eq('status', 'APPROVED')
            .single();

        if (!loan) throw new Error('Loan not found or not approved');

        // Update liquidity
        await this.updateLiquidity(loan.group_id, -loan.amount, 'LOAN_DISBURSEMENT');

        // Update loan status
        const { error: updateError } = await supabase.from('susu_loans')
            .update({
                status: 'DISBURSED',
                disbursement_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', loanId);

        if (updateError) throw updateError;

        // Record revenue (processing fee and insurance)
        await this.recordRevenue(loan.group_id, 'PROCESSING_FEE', loan.processing_fee, loanId, 'loan');
        await this.recordRevenue(loan.group_id, 'INSURANCE_FEE', loan.insurance_fee, loanId, 'loan');

        return { success: true, message: 'Loan disbursed successfully' };
    }

    // 31st Day Revenue Model
    static async processMonthlyPayouts(groupId) {
        const cycleEnd = new Date().toISOString().split('T')[0];
        
        // Get all active members
        const { data: members } = await supabase
            .from('susu_memberships')
            .select('*')
            .eq('group_id', groupId)
            .eq('status', 'ACTIVE');

        const payouts = [];

        for (const member of members) {
            const payout = await this.calculateMemberPayout(member.id, cycleEnd);
            if (payout.netPayout > 0) {
                payouts.push(payout);
                await this.recordPayout(payout);
            }
        }

        // Complete the cycle
        await this.completeCycle(groupId);

        return payouts;
    }

    static async calculateMemberPayout(membershipId, cycleEnd) {
        const { data: member } = await supabase
            .from('susu_memberships')
            .select('*, susu_groups (daily_contribution)')
            .eq('id', membershipId)
            .single();

        // Get total contributions for the cycle
        const { data: contributions } = await supabase
            .from('susu_contributions')
            .select('amount')
            .eq('membership_id', membershipId)
            .gte('contribution_date', member.cycle_start_date)
            .lte('contribution_date', cycleEnd);

        const totalContributions = contributions?.reduce((sum, c) => sum + c.amount, 0) || 0;

        // Calculate commission based on tier
        let commissionDeducted = 0;
        if (member.tier === 'SILVER') {
            // 31st day rule - take one day's contribution
            commissionDeducted = member.daily_contribution;
        } else if (member.tier === 'GOLD') {
            // No commission taken, but monthly maintenance fee
            commissionDeducted = 15.00; // GH¢15 monthly maintenance
        }

        const netPayout = totalContributions - commissionDeducted;

        return {
            membershipId,
            totalContributions,
            commissionDeducted,
            netPayout,
            tier: member.tier
        };
    }

    static async recordPayout(payoutData) {
        const payoutId = uuidv4();
        const reference = `SUSU-PAYOUT-${payoutId.substring(0, 8)}-${Date.now()}`;

        const { error } = await supabase.from('susu_payouts').insert({
            id: payoutId,
            membership_id: payoutData.membershipId,
            cycle_id: await this.getCurrentCycleId(payoutData.membershipId),
            payout_amount: payoutData.totalContributions,
            commission_deducted: payoutData.commissionDeducted,
            net_payout: payoutData.netPayout,
            payout_date: new Date().toISOString().split('T')[0],
            transaction_reference: reference
        });

        if (error) throw error;

        // Record revenue
        await this.recordRevenue(
            await this.getGroupIdFromMembership(payoutData.membershipId),
            'COMMISSION',
            payoutData.commissionDeducted,
            payoutId,
            'payout'
        );
    }

    // Fee Management
    static async chargeOnboardingFee(membershipId, amount) {
        const feeId = uuidv4();
        const reference = `SUSU-ONBOARD-${feeId.substring(0, 8)}-${Date.now()}`;

        const { error } = await supabase.from('susu_fees').insert({
            id: feeId,
            membership_id: membershipId,
            fee_type: 'ONBOARDING',
            amount,
            description: 'One-time onboarding fee',
            charged_date: new Date().toISOString().split('T')[0],
            transaction_reference: reference
        });

        if (error) throw error;

        // Record revenue
        await this.recordRevenue(
            await this.getGroupIdFromMembership(membershipId),
            'PROCESSING_FEE',
            amount,
            feeId,
            'fee'
        );
    }

    static async chargeSMSFee(membershipId) {
        const feeId = uuidv4();
        const amount = 5.00; // GH¢5 monthly SMS fee
        const reference = `SUSU-SMS-${feeId.substring(0, 8)}-${Date.now()}`;

        const { error } = await supabase.from('susu_fees').insert({
            id: feeId,
            membership_id: membershipId,
            fee_type: 'SMS_SUBSCRIPTION',
            amount,
            description: 'Monthly SMS notification fee',
            charged_date: new Date().toISOString().split('T')[0],
            transaction_reference: reference
        });

        if (error) throw error;

        // Record revenue
        await this.recordRevenue(
            await this.getGroupIdFromMembership(membershipId),
            'SMS_FEE',
            amount,
            feeId,
            'fee'
        );
    }

    static async chargePrematureWithdrawalFee(membershipId, withdrawalAmount) {
        const feeId = uuidv4();
        const feeAmount = withdrawalAmount * 0.03; // 3% premature withdrawal fee
        const reference = `SUSU-WD-FEE-${feeId.substring(0, 8)}-${Date.now()}`;

        const { error } = await supabase.from('susu_fees').insert({
            id: feeId,
            membership_id: membershipId,
            fee_type: 'PREMATURE_WITHDRAWAL',
            amount: feeAmount,
            description: '3% premature withdrawal fee',
            charged_date: new Date().toISOString().split('T')[0],
            transaction_reference: reference
        });

        if (error) throw error;

        // Record revenue
        await this.recordRevenue(
            await this.getGroupIdFromMembership(membershipId),
            'WITHDRAWAL_FEE',
            feeAmount,
            feeId,
            'fee'
        );

        return feeAmount;
    }

    // Liquidity Management (80/20 Rule)
    static async updateLiquidity(groupId, amount, type) {
        const { data: liquidity } = await supabase
            .from('susu_liquidity')
            .select('*')
            .eq('group_id', groupId)
            .single();

        if (!liquidity) return;

        let newVaultCash = liquidity.vault_cash;
        let newLoanPortfolio = liquidity.loan_portfolio;
        let newTotalDeposits = liquidity.total_deposits;

        if (type === 'CONTRIBUTION') {
            newTotalDeposits += amount;
            newVaultCash += (amount * 0.2); // 20% to vault
            newLoanPortfolio += (amount * 0.8); // 80% to loan portfolio
        } else if (type === 'LOAN_DISBURSEMENT') {
            newLoanPortfolio -= amount;
        } else if (type === 'LOAN_REPAYMENT') {
            newVaultCash += amount;
        }

        const availableForLoans = newLoanPortfolio;

        await supabase.from('susu_liquidity')
            .update({
                total_deposits: newTotalDeposits,
                vault_cash: newVaultCash,
                loan_portfolio: newLoanPortfolio,
                available_for_loans: availableForLoans,
                last_updated: new Date().toISOString()
            })
            .eq('group_id', groupId);
    }

    // Revenue Tracking
    static async recordRevenue(groupId, revenueType, amount, sourceId, sourceType, description = '') {
        await supabase.from('susu_revenue').insert({
            group_id: groupId,
            revenue_type: revenueType,
            amount,
            source_id: sourceId,
            source_type: sourceType,
            description: description || `${revenueType} revenue`,
            revenue_date: new Date().toISOString().split('T')[0]
        });
    }

    // Helper Functions
    static async getCurrentCycleId(membershipId) {
        const { data: member } = await supabase
            .from('susu_memberships')
            .select('group_id')
            .eq('id', membershipId)
            .single();

        const { data: cycle } = await supabase
            .from('susu_cycles')
            .select('id')
            .eq('group_id', member.group_id)
            .eq('status', 'ACTIVE')
            .single();

        return cycle?.id;
    }

    static async getGroupIdFromMembership(membershipId) {
        const { data: member } = await supabase
            .from('susu_memberships')
            .select('group_id')
            .eq('id', membershipId)
            .single();

        return member?.group_id;
    }

    static async completeCycle(groupId) {
        await supabase.from('susu_cycles')
            .update({ status: 'COMPLETED' })
            .eq('group_id', groupId)
            .eq('status', 'ACTIVE');

        // Start new cycle
        await this.startNewCycle(groupId);

        // Reset member cycle dates
        await supabase.from('susu_memberships')
            .update({
                cycle_start_date: new Date().toISOString().split('T')[0],
                cycle_end_date: this.calculateCycleEndDate(groupId)
            })
            .eq('group_id', groupId)
            .eq('status', 'ACTIVE');
    }

    // Reporting
    static async getGroupSummary(groupId) {
        const { data } = await supabase
            .from('susu_group_summary')
            .select('*')
            .eq('id', groupId)
            .single();

        return data;
    }

    static async getRevenueSummary(groupId, startDate, endDate) {
        const { data } = await supabase
            .from('susu_revenue')
            .select('revenue_type, amount')
            .eq('group_id', groupId)
            .gte('revenue_date', startDate)
            .lte('revenue_date', endDate);

        const summary = {
            totalRevenue: 0,
            commission: 0,
            processingFees: 0,
            interest: 0,
            insuranceFees: 0,
            smsFees: 0,
            maintenanceFees: 0,
            withdrawalFees: 0
        };

        data?.forEach(item => {
            summary.totalRevenue += item.amount;
            switch (item.revenue_type) {
                case 'COMMISSION': summary.commission += item.amount; break;
                case 'PROCESSING_FEE': summary.processingFees += item.amount; break;
                case 'INTEREST': summary.interest += item.amount; break;
                case 'INSURANCE_FEE': summary.insuranceFees += item.amount; break;
                case 'SMS_FEE': summary.smsFees += item.amount; break;
                case 'MAINTENANCE_FEE': summary.maintenanceFees += item.amount; break;
                case 'WITHDRAWAL_FEE': summary.withdrawalFees += item.amount; break;
            }
        });

        return summary;
    }
}

module.exports = SusuService;
