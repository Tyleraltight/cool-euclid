export interface Transaction {
  id: string;
  date: string;         // YYYY-MM-DD
  payee: string;        // Cleaned name
  originalPayee: string; // Raw description
  amount: number;       // Negative for expenses, positive for income
  currency: 'NZD' | 'CNY' | 'USD';
  amountNZD: number;    // Calculated NZD amount
  rate: number;         // Conversion rate (rate * amount = amountNZD)
  category: string;     // Groceries, Transport, etc.
  bank?: string;        // ANZ, ASB, BNZ, Westpac, Manual
}

export interface CurrencyRates {
  NZD: number;
  CNY: number;
  USD: number;
  lastUpdated: string;
}

const STORAGE_KEYS = {
  TRANSACTIONS: 'nz_minimalist_finance_transactions',
  RATES: 'nz_minimalist_finance_rates',
};

const DEFAULT_RATES: CurrencyRates = {
  NZD: 1.0,
  CNY: 0.22, // Static approximation: 1 CNY = 0.22 NZD
  USD: 1.62, // Static approximation: 1 USD = 1.62 NZD
  lastUpdated: new Date().toISOString().split('T')[0],
};

export const getStoredTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load transactions from localStorage', error);
    return [];
  }
};

export const saveStoredTransactions = (transactions: Transaction[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (error) {
    console.error('Failed to save transactions to localStorage', error);
  }
};

export const getStoredRates = (): CurrencyRates => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RATES);
    return data ? JSON.parse(data) : DEFAULT_RATES;
  } catch (error) {
    console.error('Failed to load currency rates from localStorage', error);
    return DEFAULT_RATES;
  }
};

export const saveStoredRates = (rates: CurrencyRates): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.RATES, JSON.stringify(rates));
  } catch (error) {
    console.error('Failed to save currency rates to localStorage', error);
  }
};

export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'tx-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
};
