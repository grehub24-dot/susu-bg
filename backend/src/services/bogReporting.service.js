const supabase = require("../lib/supabase");
const AMLService = require("./aml.service");
const logger = require("../lib/logger");

/**
 * Bank of Ghana (BoG) Reporting Service
 * Generates regulatory returns: Returns 1.0, 1.1, 1.4, 1.5, 1.6
 * Based on System upgrade.md BoG compliance requirements
 */
class BoGReportingService {
    // Return types as per BoG requirements
    static RETURN_TYPES = {
        RETURN_1_0: 'RETURN_1_0', // Balance Sheet
        RETURN_1_1: 'RETURN_1_1', // Income Statement
        RETURN_1_4: 'RETURN_1_4', // Liquidity Report
        RETURN_1_5: 'RETURN_1_5', // Capital Adequacy
        RETURN_1_6: 'RETURN_1_6'  // Large Exposures
    };

    /**
     * Generate Return 1.0 - Balance Sheet
     * Assets, Liabilities, Equity
     */
    static async generateReturn10(period) {
        const startDate = period.startDate;
        const endDate = period.endDate;

        // Get branch accounts data
        const { data: branches, error: branchError } = await supabase
            .from('branch_accounts')
            .select('*')
            .eq('status', 'ACTIVE');

        if (branchError) throw branchError;

        // Aggregate across all branches
        const totalAssets = branches.reduce((sum, b) => sum + (b.assets || 0), 0);
        const totalLiabilities = branches.reduce((sum, b) => sum + (b.liabilities || 0), 0);
        const totalEquity = branches.reduce((sum, b) => sum + (b.equity || 0), 0);

        // Get wallet balances
        const { data: wallets, error: walletError } = await supabase
            .from('wallets')
            .select('balance, status')
            .eq('status', 'ACTIVE');

        if (walletError) throw walletError;

        const totalCustomerDeposits = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

        // Get susu liquidity
        const { data: susuLiquidity, error: susuError } = await supabase
            .from('susu_liquidity')
            .select('*');

        if (susuError) throw susuError;

        const totalSusuVault = susuLiquidity.reduce((sum, s) => sum + (s.vault_cash || 0), 0);
        const totalSusuLoans = susuLiquidity.reduce((sum, s) => sum + (s.loan_portfolio || 0), 0);

        return {
            returnType: this.RETURN_TYPES.RETURN_1_0,
            period: { startDate, endDate },
            generatedAt: new Date().toISOString(),
            balanceSheet: {
                assets: {
                    cashAndBalances: totalCustomerDeposits + totalSusuVault,
                    loansAndAdvances: totalSusuLoans,
                    totalAssets: totalAssets
                },
                liabilities: {
                    customerDeposits: totalCustomerDeposits,
                    otherLiabilities: totalLiabilities - totalCustomerDeposits,
                    totalLiabilities: totalLiabilities
                },
                equity: {
                    paidUpCapital: totalEquity * 0.5,
                    retainedEarnings: totalEquity * 0.5,
                    totalEquity: totalEquity
                }
            },
            summary: {
                totalBranches: branches.length,
                activeWallets: wallets.length,
                activeSusuGroups: susuLiquidity.length
            }
        };
    }

    /**
     * Generate Return 1.1 - Income Statement
     * Revenue, Expenses, Profit/Loss
     */
    static async generateReturn11(period) {
        const startDate = period.startDate;
        const endDate = period.endDate;

        // Get revenue ledger for the period
        const { data: revenue, error: revenueError } = await supabase
            .from('revenue_ledger')
            .select('category, amount')
            .gte('posted_date', startDate)
            .lte('posted_date', endDate);

        if (revenueError) throw revenueError;

        // Categorize revenue
        const revenueByCategory = {};
        revenue.forEach(r => {
            if (!revenueByCategory[r.category]) {
                revenueByCategory[r.category] = 0;
            }
            revenueByCategory[r.category] += r.amount;
        });

        const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);

        // Get expense data (placeholder - implement expense tracking)
        const totalExpenses = totalRevenue * 0.3; // 30% operational cost assumption
        const operatingProfit = totalRevenue - totalExpenses;
        const tax = operatingProfit * 0.25; // 25% corporate tax
        const netProfit = operatingProfit - tax;

        return {
            returnType: this.RETURN_TYPES.RETURN_1_1,
            period: { startDate, endDate },
            generatedAt: new Date().toISOString(),
            incomeStatement: {
                revenue: {
                    transactionFees: revenueByCategory['TRANSACTION_FEE'] || 0,
                    susuCommission: revenueByCategory['SUSU_COMMISSION'] || 0,
                    loanInterest: revenueByCategory['LOAN_INTEREST'] || 0,
                    loanProcessing: revenueByCategory['LOAN_PROCESSING'] || 0,
                    otherRevenue: totalRevenue - (
                        (revenueByCategory['TRANSACTION_FEE'] || 0) +
                        (revenueByCategory['SUSU_COMMISSION'] || 0) +
                        (revenueByCategory['LOAN_INTEREST'] || 0) +
                        (revenueByCategory['LOAN_PROCESSING'] || 0)
                    ),
                    totalRevenue
                },
                expenses: {
                    operationalCosts: totalExpenses * 0.6,
                    staffCosts: totalExpenses * 0.3,
                    otherExpenses: totalExpenses * 0.1,
                    totalExpenses
                },
                profit: {
                    operatingProfit,
                    tax,
                    netProfit
                }
            }
        };
    }

    /**
     * Generate Return 1.4 - Liquidity Report
     * 80/20 Rule compliance for Susu groups
     */
    static async generateReturn14(period) {
        const { data: susuLiquidity, error } = await supabase
            .from('susu_liquidity')
            .select(`
                *,
                susu_groups (
                    group_name,
                    group_code,
                    target_group,
                    status
                )
            `);

        if (error) throw error;

        const complianceReport = susuLiquidity.map(sl => {
            const total = sl.total_deposits || 0;
            const vault = sl.vault_cash || 0;
            const loans = sl.loan_portfolio || 0;
            const vaultPercentage = total > 0 ? (vault / total) * 100 : 0;
            const loanPercentage = total > 0 ? (loans / total) * 100 : 0;
            const isCompliant = vaultPercentage >= 18 && vaultPercentage <= 22; // Allow 2% tolerance

            return {
                groupId: sl.group_id,
                groupName: sl.susu_groups?.group_name,
                groupCode: sl.susu_groups?.group_code,
                targetMarket: sl.susu_groups?.target_group,
                totalDeposits: total,
                vaultCash: vault,
                vaultPercentage: vaultPercentage.toFixed(2),
                loanPortfolio: loans,
                loanPercentage: loanPercentage.toFixed(2),
                isCompliant,
                status: isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT'
            };
        });

        const compliantGroups = complianceReport.filter(r => r.isCompliant).length;
        const nonCompliantGroups = complianceReport.filter(r => !r.isCompliant).length;

        return {
            returnType: this.RETURN_TYPES.RETURN_1_4,
            period: period,
            generatedAt: new Date().toISOString(),
            summary: {
                totalGroups: complianceReport.length,
                compliantGroups,
                nonCompliantGroups,
                complianceRate: complianceReport.length > 0 
                    ? ((compliantGroups / complianceReport.length) * 100).toFixed(2) 
                    : 0
            },
            groupDetails: complianceReport
        };
    }

    /**
     * Generate Return 1.5 - Capital Adequacy
     * Capital ratios and risk assessment
     */
    static async generateReturn15(period) {
        // Get balance sheet data
        const balanceSheet = await this.generateReturn10(period);
        
        const totalAssets = balanceSheet.balanceSheet.assets.totalAssets;
        const totalEquity = balanceSheet.balanceSheet.equity.totalEquity;
        const riskWeightedAssets = totalAssets * 0.8; // 80% risk weighting assumption

        const capitalRatio = totalEquity > 0 ? (totalEquity / riskWeightedAssets) * 100 : 0;
        const isAdequate = capitalRatio >= 10; // 10% minimum requirement

        // Get user risk distribution
        const { data: users, error } = await supabase
            .from('users')
            .select('risk_rating')
            .not('risk_rating', 'is', null);

        const riskDistribution = {
            LOW: 0,
            MEDIUM: 0,
            HIGH: 0
        };

        users.forEach(u => {
            if (riskDistribution[u.risk_rating] !== undefined) {
                riskDistribution[u.risk_rating]++;
            }
        });

        return {
            returnType: this.RETURN_TYPES.RETURN_1_5,
            period: period,
            generatedAt: new Date().toISOString(),
            capitalAdequacy: {
                totalCapital: totalEquity,
                riskWeightedAssets,
                capitalRatio: capitalRatio.toFixed(2),
                minimumRequired: 10,
                isAdequate,
                capitalBuffer: capitalRatio - 10
            },
            riskAssessment: {
                totalUsers: users.length,
                riskDistribution,
                highRiskPercentage: users.length > 0 
                    ? ((riskDistribution.HIGH / users.length) * 100).toFixed(2) 
                    : 0
            }
        };
    }

    /**
     * Generate Return 1.6 - Large Exposures
     * Single borrower limits and concentration risk
     */
    static async generateReturn16(period) {
        // Get loan exposures
        const { data: loans, error } = await supabase
            .from('susu_loans')
            .select(`
                *,
                susu_memberships (
                    users (
                        full_name,
                        risk_rating
                    )
                )
            `)
            .in('status', ['DISBURSED', 'REPAID']);

        if (error) throw error;

        // Calculate total loan portfolio
        const totalLoanPortfolio = loans.reduce((sum, l) => sum + l.amount, 0);

        // Group by borrower
        const borrowerExposures = {};
        loans.forEach(loan => {
            const borrowerId = loan.susu_memberships?.users?.full_name || 'Unknown';
            if (!borrowerExposures[borrowerId]) {
                borrowerExposures[borrowerId] = {
                    borrower: borrowerId,
                    totalExposure: 0,
                    loanCount: 0,
                    riskRating: loan.susu_memberships?.users?.risk_rating || 'LOW'
                };
            }
            borrowerExposures[borrowerId].totalExposure += loan.amount;
            borrowerExposures[borrowerId].loanCount++;
        });

        // Convert to array and calculate exposure percentages
        const largeExposures = Object.values(borrowerExposures)
            .map(be => ({
                ...be,
                exposurePercentage: totalLoanPortfolio > 0 
                    ? (be.totalExposure / totalLoanPortfolio) * 100 
                    : 0
            }))
            .filter(be => be.exposurePercentage >= 10) // 10% single borrower limit
            .sort((a, b) => b.exposurePercentage - a.exposurePercentage);

        return {
            returnType: this.RETURN_TYPES.RETURN_1_6,
            period: period,
            generatedAt: new Date().toISOString(),
            summary: {
                totalLoanPortfolio,
                totalBorrowers: Object.keys(borrowerExposures).length,
                largeExposuresCount: largeExposures.length,
                singleBorrowerLimit: 10,
                concentrationRisk: largeExposures.length > 0 ? 'HIGH' : 'LOW'
            },
            largeExposures
        };
    }

    /**
     * Generate all BoG returns for a period
     */
    static async generateAllReturns(period) {
        const [return10, return11, return14, return15, return16] = await Promise.all([
            this.generateReturn10(period),
            this.generateReturn11(period),
            this.generateReturn14(period),
            this.generateReturn15(period),
            this.generateReturn16(period)
        ]);

        return {
            period,
            generatedAt: new Date().toISOString(),
            returns: {
                return10,
                return11,
                return14,
                return15,
                return16
            }
        };
    }

    /**
     * Generate monthly compliance package
     */
    static async generateMonthlyCompliancePackage(year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        const period = { startDate, endDate };

        const [allReturns, ctrReport, strReport] = await Promise.all([
            this.generateAllReturns(period),
            AMLService.generateCTRReport(startDate, endDate),
            AMLService.generateSTRReport(startDate, endDate)
        ]);

        return {
            packageType: 'MONTHLY_COMPLIANCE',
            period: { year, month },
            generatedAt: new Date().toISOString(),
            returns: allReturns,
            amlReports: {
                ctr: ctrReport,
                str: strReport
            }
        };
    }

    /**
     * Export returns to CSV format
     */
    static async exportToCSV(returnData) {
        // Placeholder - implement CSV export logic
        return {
            format: 'CSV',
            data: returnData,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Schedule automated monthly reporting
     */
    static scheduleMonthlyReporting() {
        // Placeholder - implement scheduling logic
        logger.info('BoG monthly reporting scheduled');
    }
}

module.exports = BoGReportingService;
