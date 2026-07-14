import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Upload, TrendingUp, TrendingDown } from 'lucide-react';
import { getStoredTransactions, saveStoredTransactions } from './utils/storage';
import type { Transaction } from './utils/storage';
import { formatCurrency } from './utils/currency';
import CSVImporter from './components/CSVImporter';
import AddTransactionModal from './components/AddTransactionModal';
import TransactionList from './components/TransactionList';
import InsightsPanel from './components/InsightsPanel';

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => getStoredTransactions());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Persist to localStorage on change
  useEffect(() => {
    saveStoredTransactions(transactions);
  }, [transactions]);

  // Toast helper
  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Handlers
  const handleImport = useCallback((newTx: Transaction[]) => {
    setTransactions(prev => {
      const existingKeys = new Set(
        prev.map(t => `${t.date}|${t.amount}|${t.originalPayee}`)
      );
      const unique = newTx.filter(
        t => !existingKeys.has(`${t.date}|${t.amount}|${t.originalPayee}`)
      );
      if (unique.length < newTx.length) {
        showToast(`${unique.length} new, ${newTx.length - unique.length} duplicates skipped`);
      } else {
        showToast(`${unique.length} transactions imported`);
      }
      return [...prev, ...unique];
    });
    setShowImporter(false);
  }, [showToast]);

  const handleAddTransaction = useCallback((tx: Transaction) => {
    setTransactions(prev => [...prev, tx]);
    showToast('Transaction added');
  }, [showToast]);

  const handleDelete = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    showToast('Transaction deleted');
  }, [showToast]);

  // Summary calculations
  const { totalBalance, totalIncome, totalExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.amountNZD > 0) income += tx.amountNZD;
      else expense += tx.amountNZD;
    }
    return {
      totalBalance: income + expense,
      totalIncome: income,
      totalExpense: expense,
    };
  }, [transactions]);

  return (
    <>
      {/* Sticky header (Apple: glass material) */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <h1 style={{ fontSize: '1.25rem', margin: 0 }}>🌿 Kauri</h1>
          <span style={{
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)',
            fontWeight: 500,
          }}>
            Budget
          </span>
        </div>
      </header>

      {/* Balance hero */}
      <div className="balance-hero" style={{ paddingTop: '76px' }}>
        <div className="label">Net Balance</div>
        <div className="amount" style={{
          color: totalBalance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
        }}>
          {formatCurrency(totalBalance, 'NZD')}
        </div>
      </div>

      {/* Income / Expense summary cards */}
      <div className="summary-grid" style={{ padding: '0 var(--space-md) var(--space-md)' }}>
        <div className="summary-card income">
          <div className="label">
            <TrendingUp size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Income
          </div>
          <div className="value" style={{ color: 'var(--accent-green)' }}>
            {formatCurrency(totalIncome, 'NZD')}
          </div>
        </div>
        <div className="summary-card expense">
          <div className="label">
            <TrendingDown size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Expenses
          </div>
          <div className="value" style={{ color: 'var(--accent-red)' }}>
            {formatCurrency(totalExpense, 'NZD')}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="action-bar">
        <button
          className="action-btn primary"
          onClick={() => setShowAddModal(true)}
          id="open-add-modal"
        >
          <Plus size={18} />
          Add
        </button>
        <button
          className="action-btn"
          onClick={() => setShowImporter(!showImporter)}
          id="toggle-importer"
        >
          <Upload size={18} />
          Import CSV
        </button>
      </div>

      {/* CSV Importer (collapsible) */}
      {showImporter && (
        <div style={{ padding: '0 var(--space-md) var(--space-md)' }} className="stagger-item">
          <CSVImporter onImport={handleImport} />
        </div>
      )}

      {/* Insights Panel */}
      <InsightsPanel transactions={transactions} />

      {/* Transaction list */}
      <div className="section-header">
        <h2>Transactions</h2>
        <span className="count">{transactions.length} total</span>
      </div>
      <TransactionList transactions={transactions} onDelete={handleDelete} />

      {/* Add transaction modal */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddTransaction}
      />

      {/* Toast notification */}
      <div className={`toast ${toast ? 'visible' : ''}`}>
        {toast}
      </div>
    </>
  );
}

export default App;
