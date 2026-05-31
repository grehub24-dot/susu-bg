const { v4: uuidv4 } = require("uuid");
const supabase = require("../lib/supabase");

class PaymentSettingsService {
  static isPaystackEnabled() {
    return process.env.PAYSTACK_ENABLED === 'true';
  }

  static isWigalEnabled() {
    return process.env.WIGAL_ENABLED === 'true';
  }

  static isGhanaPayEnabled() {
    return process.env.GHANAPAY_ENABLED !== 'false';
  }

  static isTellerEnabled() {
    return process.env.TELLER_ENABLED !== 'false';
  }

  static isMomoEnabled() {
    return process.env.MOMO_ENABLED === 'true';
  }

  static isAtmEnabled() {
    return process.env.ATM_ENABLED === 'true';
  }

  static isUssdEnabled() {
    return process.env.USSD_ENABLED === 'true';
  }

  static getGhanaPayMerchantNumber() {
    return process.env.GHANAPAY_MERCHANT_NUMBER || '0551234567';
  }

  static getGhanaPayMerchantName() {
    return process.env.GHANAPAY_MERCHANT_NAME || 'SUSU-BG FINTECH LTD';
  }

  static getBankDetails() {
    return {
      bankName: process.env.SETTLEMENT_BANK_NAME || 'GCB Bank',
      accountNumber: process.env.SETTLEMENT_ACCOUNT_NUMBER || '123456789',
      accountName: process.env.SETTLEMENT_ACCOUNT_NAME || 'SUSU-BG FINTECH LTD'
    };
  }

  static getEnabledDepositMethods() {
    const methods = [];
    if (this.isTellerEnabled()) methods.push('TELLER');
    if (this.isGhanaPayEnabled()) methods.push('GHANAPAY');
    if (this.isPaystackEnabled()) methods.push('PAYSTACK');
    if (this.isMomoEnabled()) methods.push('MOMO');
    if (this.isAtmEnabled()) methods.push('ATM');
    return methods;
  }

  static getEnabledWithdrawMethods() {
    const methods = [];
    if (this.isTellerEnabled()) methods.push('TELLER');
    if (this.isGhanaPayEnabled()) methods.push('GHANAPAY');
    if (this.isPaystackEnabled()) methods.push('PAYSTACK');
    if (this.isMomoEnabled()) methods.push('MOMO');
    if (this.isAtmEnabled()) methods.push('ATM');
    return methods;
  }

  static getAllMethods() {
    return {
      deposit: [
        { id: 'TELLER', name: 'Teller (Cash)', enabled: this.isTellerEnabled(), method: 'CASH', type: 'enabled' },
        { id: 'GHANAPAY', name: 'GhanaPay', enabled: this.isGhanaPayEnabled(), method: 'GHANAPAY', type: 'enabled' },
        { id: 'PAYSTACK', name: 'Paystack Card', enabled: this.isPaystackEnabled(), method: 'CARD', type: 'gateway' },
        { id: 'MOMO', name: 'Mobile Money', enabled: this.isMomoEnabled(), method: 'MOMO', type: 'gateway' },
        { id: 'ATM', name: 'ATM Card', enabled: this.isAtmEnabled(), method: 'ATM', type: 'future' },
        { id: 'USSD', name: 'USSD', enabled: this.isUssdEnabled(), method: 'USSD', type: 'future' }
      ],
      withdraw: [
        { id: 'TELLER', name: 'Teller (Cash)', enabled: this.isTellerEnabled(), method: 'CASH', type: 'enabled' },
        { id: 'GHANAPAY', name: 'GhanaPay', enabled: this.isGhanaPayEnabled(), method: 'GHANAPAY', type: 'enabled' },
        { id: 'PAYSTACK', name: 'Bank Transfer', enabled: this.isPaystackEnabled(), method: 'BANK', type: 'gateway' },
        { id: 'MOMO', name: 'Mobile Money', enabled: this.isMomoEnabled(), method: 'MOMO', type: 'gateway' },
        { id: 'ATM', name: 'ATM Card', enabled: this.isAtmEnabled(), method: 'ATM', type: 'future' },
        { id: 'USSD', name: 'USSD', enabled: this.isUssdEnabled(), method: 'USSD', type: 'future' }
      ]
    };
  }
}

module.exports = PaymentSettingsService;