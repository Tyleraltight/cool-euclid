import type { CurrencyRates } from './storage';

export const convertToNZD = (
  amount: number,
  currency: 'NZD' | 'CNY' | 'USD',
  rates: CurrencyRates
): { amountNZD: number; rate: number } => {
  const rate = rates[currency] || 1.0;
  // If currency is CNY: CNY amount * rate = NZD amount.
  // Wait: our DEFAULT_RATES are:
  // CNY: 0.22 (NZD per CNY. 1 CNY = 0.22 NZD)
  // USD: 1.62 (NZD per USD. 1 USD = 1.62 NZD)
  // So amountNZD = amount * rate
  const amountNZD = parseFloat((amount * rate).toFixed(2));
  return { amountNZD, rate };
};

export const formatCurrency = (
  amount: number,
  currency: 'NZD' | 'CNY' | 'USD'
): string => {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  
  switch (currency) {
    case 'CNY':
      return `${sign}¥${absAmount.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'USD':
      return `${sign}US$${absAmount.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'NZD':
    default:
      return `${sign}$${absAmount.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};
