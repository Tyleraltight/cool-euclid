import { useState, useEffect, useRef } from 'react';
import { X, DollarSign } from 'lucide-react';
import { getStoredRates, generateId } from '../utils/storage';
import type { Transaction } from '../utils/storage';
import { convertToNZD } from '../utils/currency';
import { cleanPayeeName } from '../utils/csvParser';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (transaction: Transaction) => void;
}

export default function AddTransactionModal({ isOpen, onClose, onAdd }: AddTransactionModalProps) {
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'NZD' | 'CNY' | 'USD'>('NZD');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isExpense, setIsExpense] = useState(true);
  const [visible, setVisible] = useState(false);

  const payeeRef = useRef<HTMLInputElement>(null);

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      // Wait one frame for the DOM to mount, then trigger transition
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Auto-focus payee input on open
  useEffect(() => {
    if (visible && payeeRef.current) {
      setTimeout(() => payeeRef.current?.focus(), 100);
    }
  }, [visible]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (!payee.trim() || isNaN(numAmount) || numAmount <= 0) return;

    const finalAmount = isExpense ? -Math.abs(numAmount) : Math.abs(numAmount);
    const rates = getStoredRates();
    const { amountNZD, rate } = convertToNZD(finalAmount, currency, rates);
    const { cleaned, category } = cleanPayeeName(payee);

    const tx: Transaction = {
      id: generateId(),
      date,
      payee: cleaned,
      originalPayee: payee,
      amount: finalAmount,
      currency,
      amountNZD,
      rate,
      category: isExpense ? category : 'Income',
      bank: 'Manual',
    };

    onAdd(tx);

    // Reset form
    setPayee('');
    setAmount('');
    setCurrency('NZD');
    setDate(new Date().toISOString().split('T')[0]);
    setIsExpense(true);
    onClose();
  };

  if (!isOpen && !visible) return null;

  return (
    <div
      className={`modal-overlay ${visible ? 'visible' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        {/* Drag handle */}
        <div style={{
          width: 36,
          height: 4,
          borderRadius: 2,
          background: 'var(--text-tertiary)',
          margin: '0 auto var(--space-lg)',
          opacity: 0.5,
        }} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-lg)',
        }}>
          <h2 style={{ fontSize: '1.15rem' }}>Add Transaction</h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }} id="close-add-modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type toggle */}
          <div className="form-group">
            <label>Type</label>
            <div style={{
              display: 'flex',
              gap: 'var(--space-sm)',
            }}>
              <button
                type="button"
                className="filter-chip"
                style={isExpense ? {
                  background: 'var(--accent-red-dim)',
                  color: 'var(--accent-red)',
                  borderColor: 'rgba(248,113,113,0.3)',
                } : {}}
                onClick={() => setIsExpense(true)}
              >
                Expense
              </button>
              <button
                type="button"
                className="filter-chip"
                style={!isExpense ? {
                  background: 'var(--accent-green-dim)',
                  color: 'var(--accent-green)',
                  borderColor: 'rgba(52,211,153,0.3)',
                } : {}}
                onClick={() => setIsExpense(false)}
              >
                Income
              </button>
            </div>
          </div>

          {/* Payee */}
          <div className="form-group">
            <label htmlFor="add-payee">Payee / Description</label>
            <input
              ref={payeeRef}
              id="add-payee"
              type="text"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              placeholder="e.g. Pak'n Save, Uber Eats"
              required
            />
          </div>

          {/* Amount + Currency */}
          <div className="form-group">
            <label>Amount</label>
            <div className="form-row">
              <input
                id="add-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
              <select
                className="currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'NZD' | 'CNY' | 'USD')}
                id="add-currency"
              >
                <option value="NZD">NZD</option>
                <option value="CNY">CNY</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* Date */}
          <div className="form-group">
            <label htmlFor="add-date">Date</label>
            <input
              id="add-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="action-btn primary"
            style={{
              width: '100%',
              marginTop: 'var(--space-sm)',
              padding: 'var(--space-md)',
              fontSize: '1rem',
              fontWeight: 600,
            }}
            id="submit-transaction"
          >
            <DollarSign size={18} />
            Add {isExpense ? 'Expense' : 'Income'}
          </button>
        </form>
      </div>
    </div>
  );
}
