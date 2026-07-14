import { useState, useMemo } from 'react';
import { Lightbulb, BarChart2 } from 'lucide-react';
import type { Transaction } from '../utils/storage';
import { formatCurrency } from '../utils/currency';

interface InsightsPanelProps {
  transactions: Transaction[];
}

type Period = 'week' | 'month' | 'year';

export default function InsightsPanel({ transactions }: InsightsPanelProps) {
  const [period, setPeriod] = useState<Period>('month');

  // Filter transactions based on selected period
  const periodTransactions = useMemo(() => {
    const now = new Date();
    let daysToSubtract = 30;
    if (period === 'week') daysToSubtract = 7;
    if (period === 'year') daysToSubtract = 365;

    const cutoffDate = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    return transactions.filter(tx => tx.date >= cutoffStr);
  }, [transactions, period]);

  // Calculations for the selected period
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    const categoryTotals: Record<string, number> = {};

    for (const tx of periodTransactions) {
      if (tx.amountNZD > 0) {
        income += tx.amountNZD;
      } else {
        const absVal = Math.abs(tx.amountNZD);
        expense += absVal;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + absVal;
      }
    }

    // Find top spending category
    let topCategory = 'None';
    let topCategoryVal = 0;
    Object.entries(categoryTotals).forEach(([cat, val]) => {
      if (val > topCategoryVal) {
        topCategory = cat;
        topCategoryVal = val;
      }
    });

    const topCategoryPercent = expense > 0 ? Math.round((topCategoryVal / expense) * 100) : 0;

    // Daily average
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const dailyAverage = expense / days;

    return {
      income,
      expense,
      topCategory,
      topCategoryVal,
      topCategoryPercent,
      dailyAverage,
    };
  }, [periodTransactions, period]);

  // Generate localized NZ advice sage tip
  const sageTip = useMemo(() => {
    if (stats.expense === 0) {
      return "No expenses recorded in this period. The Kauri tree is thriving in pure sunlight! 🌿";
    }

    if (stats.topCategory === 'Groceries' && stats.topCategoryPercent > 30) {
      return `Feeding the Pak'n Save or Countdown beast? Groceries take up ${stats.topCategoryPercent}% of your spend. Consider bulk buying or grabbing odd-bunch veggies! 🛒`;
    }

    if (stats.topCategory === 'Eating Out' && stats.topCategoryPercent > 20) {
      return `Too many Flat Whites or Uber Eats deliveries? Dining out is ${stats.topCategoryPercent}% of your budget. Brewing coffee at home could save you a gold coin! ☕`;
    }

    if (stats.topCategory === 'Transport & Fuel' && stats.topCategoryPercent > 25) {
      return `Fuel prices at BP/Z Energy got you down? Transport is ${stats.topCategoryPercent}% of your period expenses. Check out Gaspy or top up AT Hop wisely! 🚗`;
    }

    if (stats.dailyAverage > 150) {
      return "Daily average spend is quite high. Make sure those Sole Trader tax deductions are flagged if applicable! 📈";
    }

    return "Looking great! Your cash flow control is solid. The Kauri tree is growing strong and steady! 🌿";
  }, [stats]);

  return (
    <div className="insights-card stagger-item">
      {/* Header with period toggle switcher */}
      <div className="insights-header">
        <h3>
          <BarChart2 size={16} style={{ color: 'var(--accent-blue)' }} />
          Insights
        </h3>
        <div className="insights-toggle-group">
          {(['week', 'month', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              className={`insights-toggle-btn pressable ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of stats */}
      <div className="insights-grid">
        <div className="insights-stat">
          <div className="stat-label">Total Out</div>
          <div className="stat-value" style={{ color: stats.expense > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {formatCurrency(-stats.expense, 'NZD')}
          </div>
        </div>
        <div className="insights-stat">
          <div className="stat-label">Daily Avg</div>
          <div className="stat-value">
            {formatCurrency(stats.dailyAverage, 'NZD')}
          </div>
        </div>
      </div>

      {/* Top Spending category progress bar */}
      {stats.expense > 0 && stats.topCategory !== 'None' && (
        <div className="insights-progress-section">
          <div className="insights-progress-header">
            <span className="insights-progress-label">
              Top Sector: {stats.topCategory}
            </span>
            <span className="insights-progress-val">
              {stats.topCategoryPercent}% ({formatCurrency(stats.topCategoryVal, 'NZD')})
            </span>
          </div>
          <div className="insights-progress-track">
            <div
              className="insights-progress-bar"
              style={{ width: `${stats.topCategoryPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Sage advice tip card */}
      <div className="insights-tip-box">
        <Lightbulb size={16} style={{ color: 'var(--accent-amber)', flexShrink: 0, marginTop: '2px' }} />
        <div className="insights-tip-text">
          {sageTip}
        </div>
      </div>
    </div>
  );
}
