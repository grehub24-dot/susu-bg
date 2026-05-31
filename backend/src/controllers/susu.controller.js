const { z } = require("zod");
const SusuService = require("../services/susu.service");

// Validation Schemas
const createGroupSchema = z.object({
    groupName: z.string().min(3),
    targetGroup: z.enum(['MARKET_WOMEN', 'TAXI_DRIVERS', 'OFFICE_WORKERS', 'GENERAL']),
    collectorId: z.string().uuid(),
    maxMembers: z.number().positive().max(50).optional(),
    dailyContribution: z.number().positive().optional(),
    cycleDays: z.number().positive().min(30).max(90).optional()
});

const addMemberSchema = z.object({
    userId: z.string().uuid(),
    tier: z.enum(['SILVER', 'GOLD']).default('SILVER'),
    dailyContribution: z.number().positive().optional(),
    ghanaCardNumber: z.string().min(10),
    ghanaCardType: z.enum(['VOTER_ID', 'DRIVERS_LICENSE', 'PASSPORT', 'NATIONAL_ID']),
    onboardingFee: z.number().positive().optional()
});

const contributionSchema = z.object({
    membershipId: z.string().uuid(),
    amount: z.number().positive(),
    paymentMethod: z.enum(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER']).default('CASH'),
    collectorId: z.string().uuid()
});

const loanApplicationSchema = z.object({
    borrowerId: z.string().uuid(),
    groupId: z.string().uuid(),
    amount: z.number().positive().max(1000), // Max GHS 1000 for micro-loans
    loanTermDays: z.number().positive().min(30).max(90).optional(),
    interestRate: z.number().positive().min(3).max(7).optional(),
    guarantor1Id: z.string().uuid(),
    guarantor2Id: z.string().uuid()
});

const loanApprovalSchema = z.object({
    loanId: z.string().uuid(),
    collectorId: z.string().uuid()
});

class SusuController {
    // Group Management
    static async createGroup(req, res) {
        try {
            const parsed = createGroupSchema.parse(req.body);
            const group = await SusuService.createSusuGroup(parsed);
            
            res.status(201).json({ 
                success: true, 
                data: group,
                message: "Susu group created successfully"
            });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async getGroups(req, res) {
        try {
            const collectorId = req.query.collectorId;
            const targetGroup = req.query.targetGroup;

            let query = supabase.from('susu_groups').select('*');
            
            if (collectorId) query = query.eq('collector_id', collectorId);
            if (targetGroup) query = query.eq('target_group', targetGroup);

            const { data: groups, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            res.json({ success: true, data: groups });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async getGroupSummary(req, res) {
        try {
            const groupId = req.params.groupId;
            const summary = await SusuService.getGroupSummary(groupId);
            
            if (!summary) {
                return res.status(404).json({ success: false, message: "Group not found" });
            }

            res.json({ success: true, data: summary });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Membership Management
    static async addMember(req, res) {
        try {
            const parsed = addMemberSchema.parse(req.body);
            const groupId = req.params.groupId;
            
            const membership = await SusuService.addMemberToGroup(groupId, parsed.userId, parsed);
            
            res.status(201).json({ 
                success: true, 
                data: membership,
                message: "Member added successfully"
            });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async getGroupMembers(req, res) {
        try {
            const groupId = req.params.groupId;
            const { data: members, error } = await supabase
                .from('susu_memberships')
                .select(`
                    *,
                    users (full_name, phone_number, email),
                    susu_groups (group_name, daily_contribution)
                `)
                .eq('group_id', groupId)
                .order('joined_at', { ascending: false });

            if (error) throw error;

            res.json({ success: true, data: members });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Daily Contributions
    static async recordContribution(req, res) {
        try {
            const parsed = contributionSchema.parse(req.body);
            const result = await SusuService.recordDailyContribution(
                parsed.membershipId,
                parsed.amount,
                parsed.paymentMethod,
                parsed.collectorId
            );

            res.json({ success: true, ...result });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async getDailyContributions(req, res) {
        try {
            const groupId = req.params.groupId;
            const date = req.query.date || new Date().toISOString().split('T')[0];

            const { data: contributions, error } = await supabase
                .from('susu_contributions')
                .select(`
                    *,
                    susu_memberships (
                        users (full_name, phone_number),
                        membership_number
                    )
                `)
                .eq('group_id', groupId)
                .eq('contribution_date', date)
                .order('created_at', { ascending: false });

            if (error) throw error;

            res.json({ success: true, data: contributions });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Loan Management
    static async applyForLoan(req, res) {
        try {
            const parsed = loanApplicationSchema.parse(req.body);
            const loan = await SusuService.applyForLoan(parsed);
            
            res.status(201).json({ 
                success: true, 
                data: loan,
                message: "Loan application submitted successfully"
            });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async approveLoan(req, res) {
        try {
            const parsed = loanApprovalSchema.parse(req.body);
            const result = await SusuService.approveLoan(parsed.loanId, parsed.collectorId);
            
            res.json({ success: true, ...result });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async disburseLoan(req, res) {
        try {
            const { loanId, collectorId } = req.body;
            const result = await SusuService.disburseLoan(loanId, collectorId);
            
            res.json({ success: true, ...result });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async getGroupLoans(req, res) {
        try {
            const groupId = req.params.groupId;
            const status = req.query.status;

            let query = supabase
                .from('susu_loans')
                .select(`
                    *,
                    susu_memberships (
                        users (full_name, phone_number),
                        membership_number
                    )
                `)
                .eq('group_id', groupId);

            if (status) query = query.eq('status', status);

            const { data: loans, error } = await query.order('application_date', { ascending: false });

            if (error) throw error;

            res.json({ success: true, data: loans });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Monthly Payouts
    static async processMonthlyPayouts(req, res) {
        try {
            const groupId = req.params.groupId;
            const payouts = await SusuService.processMonthlyPayouts(groupId);
            
            res.json({ 
                success: true, 
                data: payouts,
                message: `Processed ${payouts.length} monthly payouts`
            });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async getPayoutHistory(req, res) {
        try {
            const groupId = req.params.groupId;
            const { data: payouts, error } = await supabase
                .from('susu_payouts')
                .select(`
                    *,
                    susu_memberships (
                        users (full_name, phone_number),
                        membership_number
                    )
                `)
                .eq('group_id', groupId)
                .order('payout_date', { ascending: false })
                .limit(50);

            if (error) throw error;

            res.json({ success: true, data: payouts });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Revenue Reporting
    static async getRevenueSummary(req, res) {
        try {
            const groupId = req.params.groupId;
            const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const endDate = req.query.endDate || new Date().toISOString().split('T')[0];

            const summary = await SusuService.getRevenueSummary(groupId, startDate, endDate);
            
            res.json({ success: true, data: summary });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async getLiquidityStatus(req, res) {
        try {
            const groupId = req.params.groupId;
            const { data: liquidity, error } = await supabase
                .from('susu_liquidity')
                .select('*')
                .eq('group_id', groupId)
                .single();

            if (error) throw error;

            res.json({ success: true, data: liquidity });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Fee Management
    static async chargeSMSFee(req, res) {
        try {
            const { membershipId } = req.body;
            await SusuService.chargeSMSFee(membershipId);
            
            res.json({ 
                success: true, 
                message: "SMS fee charged successfully"
            });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async chargePrematureWithdrawalFee(req, res) {
        try {
            const { membershipId, withdrawalAmount } = req.body;
            const feeAmount = await SusuService.chargePrematureWithdrawalFee(membershipId, withdrawalAmount);
            
            res.json({ 
                success: true, 
                feeAmount,
                message: "Premature withdrawal fee charged successfully"
            });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Compliance and Reporting
    static async getMemberCompliance(req, res) {
        try {
            const groupId = req.params.groupId;
            const { data: members, error } = await supabase
                .from('susu_memberships')
                .select(`
                    *,
                    users (full_name, phone_number, email),
                    susu_groups (group_name)
                `)
                .eq('group_id', groupId)
                .eq('status', 'ACTIVE');

            if (error) throw error;

            // Check compliance status
            const compliantMembers = members.filter(member => 
                member.ghana_card_number && member.ghana_card_type
            );

            const compliance = {
                totalMembers: members.length,
                compliantMembers: compliantMembers.length,
                complianceRate: members.length > 0 ? (compliantMembers.length / members.length) * 100 : 0,
                nonCompliantMembers: members.filter(member => 
                    !member.ghana_card_number || !member.ghana_card_type
                )
            };

            res.json({ success: true, data: compliance });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async getSMSLogs(req, res) {
        try {
            const groupId = req.params.groupId;
            const startDate = req.query.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const endDate = req.query.endDate || new Date().toISOString().split('T')[0];

            const { data: logs, error } = await supabase
                .from('susu_sms_logs')
                .select(`
                    *,
                    susu_memberships (
                        users (full_name, phone_number),
                        membership_number
                    )
                `)
                .eq('group_id', groupId)
                .gte('sent_at', `${startDate}T00:00:00Z`)
                .lte('sent_at', `${endDate}T23:59:59Z`)
                .order('sent_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            res.json({ success: true, data: logs });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // USSD Integration Support
    static async checkBalance(req, res) {
        try {
            const { phoneNumber, membershipNumber } = req.query;

            const { data: membership, error } = await supabase
                .from('susu_memberships')
                .select(`
                    *,
                    users (full_name, phone_number),
                    susu_groups (group_name)
                `)
                .eq('membership_number', membershipNumber)
                .eq('users.phone_number', phoneNumber)
                .eq('status', 'ACTIVE')
                .single();

            if (error || !membership) {
                return res.status(404).json({ success: false, message: "Membership not found" });
            }

            // Get current cycle contributions
            const { data: contributions } = await supabase
                .from('susu_contributions')
                .select('amount')
                .eq('membership_id', membership.id)
                .gte('contribution_date', membership.cycle_start_date)
                .lte('contribution_date', membership.cycle_end_date);

            const totalContributions = contributions?.reduce((sum, c) => sum + c.amount, 0) || 0;

            res.json({ 
                success: true, 
                data: {
                    memberName: membership.users.full_name,
                    groupName: membership.susu_groups.group_name,
                    membershipNumber: membership.membership_number,
                    tier: membership.tier,
                    totalContributions,
                    dailyContribution: membership.daily_contribution,
                    cycleStart: membership.cycle_start_date,
                    cycleEnd: membership.cycle_end_date
                }
            });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = SusuController;
