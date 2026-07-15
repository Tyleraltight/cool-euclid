import { useState, useMemo, useRef } from 'react';
import { Trash2, ShoppingCart, Coffee, Car, Zap, Home, Package, Banknote, HelpCircle } from 'lucide-react';
import type { Transaction } from '../utils/storage';
import { formatCurrency } from '../utils/currency';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof ShoppingCart; color: string; bg: string }> = {
  'Groceries':        { icon: ShoppingCart, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  'Eating Out':       { icon: Coffee,       color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  'Transport & Fuel': { icon: Car,          color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  'Utilities & Bills':{ icon: Zap,          color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  'Shopping & Home':  { icon: Package,      color: '#f472b6', bg: 'rgba(244, 114, 182, 0.12)' },
  'Income':           { icon: Banknote,     color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  'Others':           { icon: HelpCircle,   color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' },
};

const FLAG_MAP: Record<string, string> = {
  'NZD': '🇳🇿',
  'CNY': '🇨🇳',
  'USD': '🇺🇸',
};

const ALL_CATEGORIES = ['All', ...Object.keys(CATEGORY_CONFIG)];

export default function TransactionList({ transactions, onDelete }: TransactionListProps) {
  const [activeFilter, setActiveFilter] = useState('All');
  
  // Drag to scroll refs for desktop mouse support
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0, rawX: 0 });
  const clickPreventedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
      rawX: e.pageX,
    };
    clickPreventedRef.current = false;
  };

  const handleMouseLeaveOrUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    
    // If moved more than 5px, we consider it a drag and prevent click events on release
    if (Math.abs(e.pageX - dragStart.current.rawX) > 5) {
      clickPreventedRef.current = true;
    }
    
    const x = e.pageX - el.offsetLeft;
    const walk = (x - dragStart.current.x) * 1.5; // Drag speed multiplier
    el.scrollLeft = dragStart.current.scrollLeft - walk;
  };

  const filtered = useMemo(() => {
    const list = activeFilter === 'All'
      ? transactions
      : transactions.filter(tx => tx.category === activeFilter);

    // Sort by date descending
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, activeFilter]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of filtered) {
      const group = map.get(tx.date) || [];
      group.push(tx);
      map.set(tx.date, group);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const formatDateLabel = (dateStr: string): string => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';

    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div>
      {/* Filter bar */}
      <div
        className="filter-bar"
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeaveOrUp}
        onMouseUp={handleMouseLeaveOrUp}
        onMouseMove={handleMouseMove}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`filter-chip ${activeFilter === cat ? 'active' : ''}`}
            onClick={() => {
              if (clickPreventedRef.current) return;
              setActiveFilter(cat);
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
            <Home size={40} strokeWidth={1} />
          </div>
          <div className="title">No transactions yet</div>
          <div className="subtitle">Import a bank CSV or add one manually</div>
        </div>
      ) : (
        grouped.map(([date, txs]) => (
          <div key={date}>
            <div className="section-header">
              <h2>{formatDateLabel(date)}</h2>
              <span className="count">{date}</span>
            </div>
            <div className="card" style={{ margin: '0 var(--space-md) var(--space-md)' }}>
              {txs.map((tx, idx) => {
                const config = CATEGORY_CONFIG[tx.category] || CATEGORY_CONFIG['Others'];
                const Icon = config.icon;
                const isIncome = tx.amount > 0;
                const isMultiCurrency = tx.currency !== 'NZD';

                return (
                  <div className="tx-row stagger-item" key={tx.id} style={{ animationDelay: `${idx * 40}ms` }}>
                    {/* Left icon: flag overlap badge for foreign currency, category icon otherwise */}
                    {isMultiCurrency ? (
                      <div className="flag-overlap-badge" title={`${tx.currency} → NZD`}>
                        <span className="flag-overlap-primary">
                          {FLAG_MAP[tx.currency] || '🏳️'}
                        </span>
                        <span className="flag-overlap-secondary">
                          {FLAG_MAP['NZD']}
                        </span>
                      </div>
                    ) : (
                      <div className="tx-icon" style={{ background: config.bg, color: config.color }}>
                        <Icon size={20} strokeWidth={1.8} />
                      </div>
                    )}

                    <div className="tx-info">
                      <div className="tx-payee">{tx.payee}</div>
                      <div className="tx-meta">
                        <span className={`badge ${isIncome ? 'badge-green' : 'badge-amber'}`}>
                          {tx.category}
                        </span>
                        {tx.bank && tx.bank !== 'Manual' && (
                          <span className="badge badge-blue">{tx.bank}</span>
                        )}
                        {isMultiCurrency && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            (= {formatCurrency(tx.amountNZD, 'NZD')})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`tx-amount ${isIncome ? 'income' : 'expense'}`}>
                      {isIncome ? '+' : ''}{formatCurrency(tx.amount, tx.currency)}
                    </div>
                    <button
                      className="tx-delete pressable"
                      onClick={() => onDelete(tx.id)}
                      aria-label={`Delete ${tx.payee}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
