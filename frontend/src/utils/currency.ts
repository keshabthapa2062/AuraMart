// Centralized currency configuration and helper functions for Aura Commerce
export interface CurrencyInfo {
  symbol: string;
  rate: number;
  code: string;
}

export const getCurrency = (country?: string): CurrencyInfo => {
  return { symbol: '₹', rate: 1, code: 'INR' };
};

export const formatCurrencyVal = (usdVal: number, country?: string): string => {
  const curr = getCurrency(country);
  const localVal = usdVal * curr.rate;
  return `₹${localVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

