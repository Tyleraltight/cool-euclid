import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Upload, TrendingUp, TrendingDown, Search, X, Database, Download } from 'lucide-react';
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
  
  // New States for Search and Backup popover
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showBackupPopover, setShowBackupPopover] = useState(false);

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

  // Export local state to JSON backup file
  const handleExportData = useCallback(() => {
    try {
      const data = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        transactions: transactions,
      };
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute('download', `kauri_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      showToast('Backup file downloaded');
      setShowBackupPopover(false);
    } catch (error) {
      showToast('Failed to export data');
    }
  }, [transactions, showToast]);

  // Import JSON backup data and deduplicate against existing local storage
  const handleImportData = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') return;
        const parsed = JSON.parse(result);

        if (parsed && Array.isArray(parsed.transactions)) {
          const importedTxs = parsed.transactions as Transaction[];
          
          setTransactions(prev => {
            const existingKeys = new Set(
              prev.map(t => `${t.date}|${t.amount}|${t.originalPayee}`)
            );
            const unique = importedTxs.filter(
              t => !existingKeys.has(`${t.date}|${t.amount}|${t.originalPayee}`)
            );
            
            showToast(`Restored: ${unique.length} new items added`);
            return [...prev, ...unique];
          });
        } else {
          showToast('Invalid backup file structure');
        }
      } catch (error) {
        showToast('Error reading backup file');
      }
      setShowBackupPopover(false);
      e.target.value = ''; // Reset input
    };

    fileReader.readAsText(files[0]);
  }, [showToast]);

  // Compute filtered display transactions for list
  const displayTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const query = searchQuery.toLowerCase().trim();
    return transactions.filter(tx => 
      tx.payee.toLowerCase().includes(query) || 
      tx.category.toLowerCase().includes(query) ||
      (tx.bank && tx.bank.toLowerCase().includes(query)) ||
      tx.amount.toString().includes(query) ||
      tx.amountNZD.toString().includes(query)
    );
  }, [transactions, searchQuery]);

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
          <h1 style={{ fontSize: '1.1rem', margin: 0 }}>🌿 Kauri</h1>
          <span style={{
            fontSize: '0.7rem',
            color: 'var(--text-tertiary)',
            fontWeight: 500,
          }}>
            Budget
          </span>
        </div>
      </header>

      {/* Balance hero */}
      <div className="balance-hero" style={{ paddingTop: '62px' }}>
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
      <div className={`action-bar ${isSearching ? 'searching' : ''}`}>
        {/* Left Actions */}
        <div className="action-left-group">
          <button
            className="action-btn primary pressable"
            onClick={() => setShowAddModal(true)}
            id="open-add-modal"
          >
            <Plus size={14} />
            <span>Add</span>
          </button>
          <button
            className="action-btn icon-only pressable"
            onClick={() => setShowImporter(!showImporter)}
            id="toggle-importer"
            title="Import bank CSV"
          >
            <Upload size={14} />
          </button>
        </div>

        {/* Right Tools (Search & Backup) */}
        <div className="action-right-group">
          {/* Search tool */}
          <div className="search-container">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Search merchant, tag, amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                id="tx-search-input"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              className={`tool-btn pressable ${isSearching ? 'active' : ''}`}
              onClick={() => {
                if (isSearching) {
                  setSearchQuery('');
                  setIsSearching(false);
                } else {
                  setIsSearching(true);
                  setTimeout(() => {
                    document.getElementById('tx-search-input')?.focus();
                  }, 50);
                }
              }}
              title="Search transactions"
            >
              {isSearching ? <X size={14} /> : <Search size={14} />}
            </button>
          </div>

          {/* Backup Database Popover */}
          <div style={{ position: 'relative' }}>
            <button
              className={`tool-btn pressable ${showBackupPopover ? 'active' : ''}`}
              onClick={() => setShowBackupPopover(!showBackupPopover)}
              title="Backup & Restore data"
            >
              <Database size={14} />
            </button>

            {showBackupPopover && (
              <div className="backup-popover">
                <button className="popover-item" onClick={handleExportData}>
                  <Download size={12} />
                  <span>Export Backup (.json)</span>
                </button>
                <button
                  className="popover-item"
                  onClick={() => document.getElementById('backup-file-input')?.click()}
                >
                  <Upload size={12} />
                  <span>Restore Backup (.json)</span>
                </button>
                <input
                  type="file"
                  id="backup-file-input"
                  accept=".json"
                  onChange={handleImportData}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>
        </div>
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
        <span className="count">
          {displayTransactions.length !== transactions.length 
            ? `${displayTransactions.length} of ${transactions.length}`
            : `${transactions.length}`} total
        </span>
      </div>
      <TransactionList transactions={displayTransactions} onDelete={handleDelete} />

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
