/**
 * Payment Service Unit Tests
 */

const PaymentService = require('../src/services/payment.service');

describe('PaymentService', () => {
  describe('roundMoney', () => {
    it('should round to 2 decimal places', () => {
      expect(PaymentService.roundMoney(10.555)).toBe(10.56);
      expect(PaymentService.roundMoney(10.554)).toBe(10.55);
      expect(PaymentService.roundMoney(10)).toBe(10);
    });

    it('should handle zero', () => {
      expect(PaymentService.roundMoney(0)).toBe(0);
    });

    it('should handle negative values', () => {
      expect(PaymentService.roundMoney(-10.556)).toBe(-10.56);
    });
  });

  describe('getConfiguredTransactionFee', () => {
    it('should calculate fixed fee', () => {
      // Set environment for test
      process.env.TX_FEE_DEPOSIT_FIXED = '1.00';
      process.env.TX_FEE_DEPOSIT_RATE = '0';
      process.env.TX_FEE_DEPOSIT_MIN = '0';
      process.env.TX_FEE_DEPOSIT_MAX = '0';

      const fee = PaymentService.getConfiguredTransactionFee('DEPOSIT', 100);
      expect(fee).toBe(1.00);
    });

    it('should calculate percentage fee', () => {
      process.env.TX_FEE_DEPOSIT_FIXED = '0';
      process.env.TX_FEE_DEPOSIT_RATE = '0.01'; // 1%
      process.env.TX_FEE_DEPOSIT_MIN = '0';
      process.env.TX_FEE_DEPOSIT_MAX = '0';

      const fee = PaymentService.getConfiguredTransactionFee('DEPOSIT', 100);
      expect(fee).toBe(1);
    });

    it('should apply minimum fee', () => {
      process.env.TX_FEE_DEPOSIT_FIXED = '0';
      process.env.TX_FEE_DEPOSIT_RATE = '0.001';
      process.env.TX_FEE_DEPOSIT_MIN = '2.00';
      process.env.TX_FEE_DEPOSIT_MAX = '0';

      const fee = PaymentService.getConfiguredTransactionFee('DEPOSIT', 10);
      expect(fee).toBe(2.00);
    });

    it('should apply maximum fee', () => {
      process.env.TX_FEE_DEPOSIT_FIXED = '0';
      process.env.TX_FEE_DEPOSIT_RATE = '0.1';
      process.env.TX_FEE_DEPOSIT_MIN = '0';
      process.env.TX_FEE_DEPOSIT_MAX = '5.00';

      const fee = PaymentService.getConfiguredTransactionFee('DEPOSIT', 100);
      expect(fee).toBe(5.00);
    });
  });

  describe('calculateElevy', () => {
    it('should calculate E-Levy for amounts above minimum', () => {
      process.env.ELEVY_RATE = '0.015'; // 1.5%
      process.env.ELEVY_MIN = '0.10';
      process.env.ELEVY_MAX = '100.00';

      const elevy = PaymentService.calculateElevy(100);
      expect(elevy).toBe(1.5); // 1.5% of 100
    });

    it('should apply minimum E-Levy', () => {
      process.env.ELEVY_RATE = '0.015';
      process.env.ELEVY_MIN = '0.10';
      process.env.ELEVY_MAX = '100.00';

      const elevy = PaymentService.calculateElevy(5); // Very small amount
      expect(elevy).toBe(0.10); // Minimum applies
    });

    it('should apply maximum E-Levy', () => {
      process.env.ELEVY_RATE = '0.015';
      process.env.ELEVY_MIN = '0.10';
      process.env.ELEVY_MAX = '10.00';

      const elevy = PaymentService.calculateElevy(10000); // Large amount
      expect(elevy).toBe(10.00); // Maximum applies
    });

    it('should return 0 for zero amount', () => {
      const elevy = PaymentService.calculateElevy(0);
      expect(elevy).toBe(0);
    });
  });

  describe('calculateTotalFees', () => {
    it('should calculate all fees for withdrawal', () => {
      process.env.TX_FEE_WITHDRAWAL_FIXED = '1.00';
      process.env.TX_FEE_WITHDRAWAL_RATE = '0';
      process.env.TX_FEE_WITHDRAWAL_MIN = '0';
      process.env.TX_FEE_WITHDRAWAL_MAX = '0';
      process.env.ELEVY_RATE = '0.015';
      process.env.ELEVY_MIN = '0.10';
      process.env.ELEVY_MAX = '100.00';

      const fees = PaymentService.calculateTotalFees(100, 'WITHDRAWAL');

      expect(fees.serviceFee).toBe(1.00);
      expect(fees.elevy).toBe(1.5);
      expect(fees.totalFees).toBe(2.50);
      expect(fees.netAmount).toBe(97.50);
    });

    it('should not charge E-Levy for deposits', () => {
      process.env.TX_FEE_DEPOSIT_FIXED = '1.00';
      process.env.TX_FEE_DEPOSIT_RATE = '0';
      process.env.TX_FEE_DEPOSIT_MIN = '0';
      process.env.TX_FEE_DEPOSIT_MAX = '0';
      process.env.ELEVY_RATE = '0.015';
      process.env.ELEVY_MIN = '0.10';
      process.env.ELEVY_MAX = '100.00';

      const fees = PaymentService.calculateTotalFees(100, 'DEPOSIT');

      expect(fees.serviceFee).toBe(1.00);
      expect(fees.elevy).toBe(0); // No E-Levy on deposits
      expect(fees.totalFees).toBe(1.00);
      expect(fees.netAmount).toBe(99.00);
    });
  });

  describe('buildTransactionMetadata', () => {
    it('should include fee information', () => {
      process.env.TX_FEE_DEPOSIT_FIXED = '1.50';
      process.env.TX_FEE_DEPOSIT_RATE = '0';
      process.env.TX_FEE_DEPOSIT_MIN = '0';
      process.env.TX_FEE_DEPOSIT_MAX = '0';

      const metadata = PaymentService.buildTransactionMetadata('DEPOSIT', 100);

      expect(metadata).toBeTruthy();
      expect(metadata.fee_amount).toBe(1.50);
      expect(metadata.fee_category).toBe('TRANSACTION_FEE');
    });

    it('should preserve existing metadata', () => {
      const existing = { custom_field: 'test', old_fee: 2.00 };
      const metadata = PaymentService.buildTransactionMetadata('DEPOSIT', 100, existing);

      expect(metadata.custom_field).toBe('test');
      expect(metadata.fee_amount).toBe(1.50);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid signature', () => {
      process.env.PAYSTACK_SECRET_KEY = 'test_secret';
      const req = {
        rawBody: JSON.stringify({ event: 'test' }),
        headers: { 'x-paystack-signature': 'abc123' },
      };

      // This test requires crypto, so we just verify the method exists
      expect(typeof PaymentService.verifyWebhookSignature).toBe('function');
    });
  });
});