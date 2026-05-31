export interface BankInfo {
  code: string;
  name: string;
}

export const GHANA_BANKS: Record<string, string> = {
  "01": "Standard Chartered Bank Ghana Ltd",
  "02": "Absa Bank Ghana Ltd (formerly Barclays)",
  "03": "GCB Bank Ltd",
  "04": "National Investment Bank Ltd (NIB)",
  "05": "ADB Bank Ltd",
  "07": "Republic Bank (Ghana) Ltd",
  "08": "Universal Merchant Bank Ltd (UMB)",
  "09": "Prudential Bank Ltd",
  "11": "Zenith Bank (Ghana) Ltd",
  "13": "Ecobank Ghana Ltd",
  "14": "CAL Bank Ltd",
  "15": "First Atlantic Bank Ltd",
  "17": "United Bank for Africa (Ghana) Ltd (UBA)",
  "18": "Access Bank (Ghana) Ltd",
  "19": "Consolidated Bank Ghana Ltd (CBG)",
  "20": "First National Bank Ghana Ltd (FNB)",
  "21": "Guaranty Trust Bank (Ghana) Ltd (GTBank)",
  "22": "Fidelity Bank Ghana Ltd",
  "23": "Bank of Africa Ghana Ltd",
  "24": "Stanbic Bank Ghana Ltd",
  "28": "FBNBank Ghana Ltd",
  "30": "Societe Generale Ghana Ltd",
  "33": "OmniBSIC Bank Ghana Ltd",
};

export const getBankBySortCode = (sortCode: string): string | null => {
  if (!sortCode || sortCode.length < 2) return null;
  const bankCode = sortCode.substring(0, 2);
  return GHANA_BANKS[bankCode] || null;
};
