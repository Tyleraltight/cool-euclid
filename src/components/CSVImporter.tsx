import { useState, useRef, useCallback } from 'react';
import { Upload, FileCheck, AlertCircle } from 'lucide-react';
import { parseBankCSV } from '../utils/csvParser';
import { convertToNZD } from '../utils/currency';
import { getStoredRates, generateId } from '../utils/storage';
import type { Transaction } from '../utils/storage';

interface CSVImporterProps {
  onImport: (transactions: Transaction[]) => void;
}

export default function CSVImporter({ onImport }: CSVImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<{ bank: string; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    setError(null);
    setResult(null);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const { transactions: rawTx, bank } = parseBankCSV(text);
        const rates = getStoredRates();

        // Assign IDs and NZD conversion
        const fullTransactions: Transaction[] = rawTx.map((tx) => {
          const { amountNZD, rate } = convertToNZD(tx.amount, tx.currency, rates);
          return {
            ...tx,
            id: generateId(),
            amountNZD,
            rate,
          };
        });

        onImport(fullTransactions);
        setResult({ bank, count: fullTransactions.length });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
      }
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
  }, [onImport]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset to allow re-uploading the same file
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      <div
        className={`drop-zone ${isDragging ? 'active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        id="csv-drop-zone"
      >
        <div className="icon">
          <Upload size={32} strokeWidth={1.5} />
        </div>
        <div className="title">Drop bank CSV here</div>
        <div className="subtitle">Supports ANZ · ASB · BNZ · Westpac</div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        id="csv-file-input"
      />

      {result && (
        <div className="import-summary stagger-item">
          <div className="bank-name">
            <FileCheck size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            {result.bank} detected
          </div>
          <div className="stats">
            {result.count} transaction{result.count !== 1 ? 's' : ''} imported successfully
          </div>
        </div>
      )}

      {error && (
        <div className="import-summary" style={{
          background: 'var(--accent-red-dim)',
          borderColor: 'rgba(248, 113, 113, 0.2)'
        }}>
          <div className="bank-name" style={{ color: 'var(--accent-red)' }}>
            <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Import Error
          </div>
          <div className="stats">{error}</div>
        </div>
      )}
    </div>
  );
}
