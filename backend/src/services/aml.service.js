const { v4: uuidv4 } = require("uuid");
const supabase = require("../lib/supabase");
const logger = require("../lib/logger");

/**
 * AML (Anti-Money Laundering) Monitoring Service
 * Implements CTR (Cash Transaction Report) and STR (Suspicious Transaction Report)
 * Based on System upgrade.md BoG compliance requirements
 */
class AMLService {
    // BoG thresholds
    static CTR_THRESHOLD = 20000; // GHS 20,000 for CTR
    static STR_PATTERNS = [
        'RAPID_SMALL_TRANSACTIONS', // Many small transactions in short time
        'ROUND_AMOUNTS', // Suspiciously round amounts
        'HIGH_FREQUENCY', // Unusually high transaction frequency
        'INTERNATIONAL_PATTERN', // Cross-border patterns
        'PEP_INVOLVEMENT' // Politically Exposed Persons
    ];

    /**
     * Monitor transaction for AML compliance
     * Called automatically on transaction completion
     */
    static async monitorTransaction(transactionId) {
        try {
            const { data: transaction, error } = await supabase
                .from('transactions')
                .select(`
                    *,
                    wallets (
                        user_id,
                        users (
                            risk_rating,
                            pep_status,
                            full_name
                        )
                    )
                `)
                .eq('id', transactionId)
                .single();

            if (error || !transaction) {
                throw new Error('Transaction not found');
            }

            const user = transaction.wallets?.users;
            if (!user) return;

            // Check CTR threshold
            if (transaction.amount >= this.CTR_THRESHOLD && transaction.status === 'SUCCESS') {
                await this.createCTR(transaction, user);
            }

            // Check for suspicious patterns
            const suspiciousPatterns = await this.detectSuspiciousPatterns(transaction.wallets.user_id);
            if (suspiciousPatterns.length > 0) {
                await this.createSTR(transaction, user, suspiciousPatterns);
            }

            // Log audit trail
            await this.logAuditTrail(transaction, user);

        } catch (error) {
            logger.error('AML monitoring error:', error.message);
        }
    }

    /**
     * Create Cash Transaction Report (CTR)
     * Required for transactions >= GHS 20,000
     */
    static async createCTR(transaction, user) {
        const { error } = await supabase.from('compliance_flags').insert({
            user_id: transaction.wallets.user_id,
            flag_type: 'CTR',
            description: `Cash transaction of GHS ${transaction.amount} exceeds CTR threshold of GHS ${this.CTR_THRESHOLD}`,
            amount_involved: transaction.amount,
            status: 'OPEN',
            reported_to_bog: false
        });

        if (error) {
            throw new Error(`Failed to create CTR: ${error.message}`);
        }

        // Notify compliance team
        await this.notifyComplianceTeam('CTR', {
            transactionId: transaction.id,
            amount: transaction.amount,
            userId: transaction.wallets.user_id,
            userName: user.full_name
        });
    }

    /**
     * Create Suspicious Transaction Report (STR)
     * Required for suspicious activity patterns
     */
    static async createSTR(transaction, user, patterns) {
        const patternDescriptions = patterns.map(p => this.getPatternDescription(p)).join(', ');

        const { error } = await supabase.from('compliance_flags').insert({
            user_id: transaction.wallets.user_id,
            flag_type: 'STR',
            description: `Suspicious activity detected: ${patternDescriptions}. Transaction: GHS ${transaction.amount}`,
            amount_involved: transaction.amount,
            status: 'OPEN',
            reported_to_bog: false
        });

        if (error) {
            throw new Error(`Failed to create STR: ${error.message}`);
        }

        // Notify compliance team urgently
        await this.notifyComplianceTeam('STR', {
            transactionId: transaction.id,
            amount: transaction.amount,
            userId: transaction.wallets.user_id,
            userName: user.full_name,
            patterns
        });
    }

    /**
     * Detect suspicious transaction patterns
     */
    static async detectSuspiciousPatterns(userId) {
        const patterns = [];
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Get recent transactions
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('amount, created_at, type')
            .eq('wallets.user_id', userId)
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: true });

        if (error || !transactions) return patterns;

        // Pattern 1: Rapid small transactions (structuring)
        const smallTransactions = transactions.filter(t => t.amount < 5000);
        if (smallTransactions.length > 20) {
            patterns.push('RAPID_SMALL_TRANSACTIONS');
        }

        // Pattern 2: Round amounts
        const roundAmounts = transactions.filter(t => t.amount % 100 === 0 && t.amount > 1000);
        if (roundAmounts.length > 10) {
            patterns.push('ROUND_AMOUNTS');
        }

        // Pattern 3: High frequency
        if (transactions.length > 50) {
            patterns.push('HIGH_FREQUENCY');
        }

        // Check user risk factors
        const { data: user } = await supabase
            .from('users')
            .select('risk_rating, pep_status')
            .eq('id', userId)
            .single();

        if (user) {
            if (user.risk_rating === 'HIGH') {
                patterns.push('HIGH_RISK_USER');
            }
            if (user.pep_status) {
                patterns.push('PEP_INVOLVEMENT');
            }
        }

        return patterns;
    }

    /**
     * Get human-readable pattern description
     */
    static getPatternDescription(pattern) {
        const descriptions = {
            'RAPID_SMALL_TRANSACTIONS': 'Multiple small transactions potentially structuring to avoid thresholds',
            'ROUND_AMOUNTS': 'Suspiciously round amounts indicating potential money laundering',
            'HIGH_FREQUENCY': 'Unusually high transaction frequency',
            'INTERNATIONAL_PATTERN': 'Cross-border transaction patterns',
            'PEP_INVOLVEMENT': 'Politically Exposed Person involvement',
            'HIGH_RISK_USER': 'User classified as high risk'
        };
        return descriptions[pattern] || pattern;
    }

    /**
     * Log audit trail for compliance
     */
    static async logAuditTrail(transaction, user) {
        await supabase.from('audit_logs').insert({
            user_id: transaction.wallets.user_id,
            action: 'TRANSACTION_PROCESSED',
            entity_type: 'TRANSACTION',
            entity_id: transaction.id,
            new_values: {
                amount: transaction.amount,
                type: transaction.type,
                channel: transaction.channel,
                status: transaction.status,
                risk_rating: user.risk_rating,
                pep_status: user.pep_status
            }
        });
    }

    /**
     * Notify compliance team of compliance flags
     */
    static async notifyComplianceTeam(flagType, details) {
        // TODO: Implement notification via email, SMS, or internal messaging
        logger.info(`COMPLIANCE ALERT [${flagType}]:`, details);
    }

    /**
     * Get compliance dashboard data
     */
    static async getComplianceDashboard() {
        const { data: flags, error } = await supabase
            .from('compliance_flags')
            .select(`
                *,
                users (
                    full_name,
                    phone_number,
                    risk_rating
                )
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        const stats = {
            total: flags.length,
            open: flags.filter(f => f.status === 'OPEN').length,
            investigating: flags.filter(f => f.status === 'INVESTIGATING').length,
            closed: flags.filter(f => f.status === 'CLOSED').length,
            ctr: flags.filter(f => f.flag_type === 'CTR').length,
            str: flags.filter(f => f.flag_type === 'STR').length,
            aml: flags.filter(f => f.flag_type === 'AML_ALERT').length,
            reportedToBoG: flags.filter(f => f.reported_to_bog).length,
            totalAmount: flags.reduce((sum, f) => sum + (f.amount_involved || 0), 0)
        };

        return { flags, stats };
    }

    /**
     * Generate BoG CTR report
     */
    static async generateCTRReport(startDate, endDate) {
        const { data: ctrs, error } = await supabase
            .from('compliance_flags')
            .select(`
                *,
                users (
                    full_name,
                    phone_number,
                    ghana_card_number,
                    risk_rating
                ),
                transactions (
                    reference,
                    amount,
                    type,
                    channel,
                    created_at
                )
            `)
            .eq('flag_type', 'CTR')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        if (error) throw error;

        return {
            reportType: 'CTR',
            period: { startDate, endDate },
            totalCTR: ctrs.length,
            totalAmount: ctrs.reduce((sum, c) => sum + (c.amount_involved || 0), 0),
            transactions: ctrs
        };
    }

    /**
     * Generate BoG STR report
     */
    static async generateSTRReport(startDate, endDate) {
        const { data: strs, error } = await supabase
            .from('compliance_flags')
            .select(`
                *,
                users (
                    full_name,
                    phone_number,
                    ghana_card_number,
                    risk_rating
                ),
                transactions (
                    reference,
                    amount,
                    type,
                    channel,
                    created_at
                )
            `)
            .eq('flag_type', 'STR')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        if (error) throw error;

        return {
            reportType: 'STR',
            period: { startDate, endDate },
            totalSTR: strs.length,
            totalAmount: strs.reduce((sum, s) => sum + (s.amount_involved || 0), 0),
            transactions: strs
        };
    }

    /**
     * Mark compliance flag as reported to BoG
     */
    static async markAsReportedToBoG(flagId) {
        const { error } = await supabase
            .from('compliance_flags')
            .update({ 
                reported_to_bog: true,
                status: 'INVESTIGATING'
            })
            .eq('id', flagId);

        if (error) throw new Error(`Failed to mark as reported: ${error.message}`);

        return { success: true };
    }

    /**
     * Resolve compliance flag
     */
    static async resolveFlag(flagId, resolutionNotes) {
        const { error } = await supabase
            .from('compliance_flags')
            .update({ 
                status: 'CLOSED',
                resolved_at: new Date().toISOString()
            })
            .eq('id', flagId);

        if (error) throw new Error(`Failed to resolve flag: ${error.message}`);

        // Log resolution
        await supabase.from('audit_logs').insert({
            user_id: null,
            action: 'COMPLIANCE_FLAG_RESOLVED',
            entity_type: 'COMPLIANCE_FLAG',
            entity_id: flagId,
            new_values: { resolutionNotes }
        });

        return { success: true };
    }

    /**
     * Update user risk rating
     */
    static async updateUserRiskRating(userId, newRating, reason) {
        const { error } = await supabase
            .from('users')
            .update({ risk_rating: newRating })
            .eq('id', userId);

        if (error) throw new Error(`Failed to update risk rating: ${error.message}`);

        // Log audit trail
        await supabase.from('audit_logs').insert({
            user_id: userId,
            action: 'RISK_RATING_CHANGED',
            entity_type: 'USER',
            entity_id: userId,
            old_values: { reason },
            new_values: { newRating }
        });

        return { success: true, newRating };
    }
}

module.exports = AMLService;
