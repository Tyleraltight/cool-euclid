import type { Transaction } from './storage';

// Split a CSV row correctly handling comma inside quotes
const splitCSVRow = (row: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, '').trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, '').trim());
  return result;
};

// Parse date string into YYYY-MM-DD
const parseDate = (dateStr: string): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Handlers for formats: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY etc.
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    let day = parts[0];
    let month = parts[1];
    let year = parts[2];
    
    // Check if the first part is YYYY
    if (day.length === 4) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    }
    
    // Zero pad
    if (day.length === 1) day = '0' + day;
    if (month.length === 1) month = '0' + month;
    
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
};

// Clean raw payee string for cleaner presentation
export const cleanPayeeName = (raw: string): { cleaned: string; category: string } => {
  const upper = raw.toUpperCase();
  
  // Category mapping definitions
  const categories = [
    {
      name: 'Groceries',
      keywords: ['PAK N SAVE', "PAK'N SAVE", 'PAKNSAVE', 'COUNTDOWN', 'WOOLWORTHS', 'NEW WORLD', 'FOUR SQUARE', 'TAIPING', 'SANDRINGHAM SPICE', 'FARRO', 'SUPERMARKET'],
      display: (name: string) => {
        if (name.includes('PAK N SAVE') || name.includes("PAK'N SAVE") || name.includes('PAKNSAVE')) return "Pak'n Save";
        if (name.includes('COUNTDOWN') || name.includes('WOOLWORTHS')) return 'Woolworths';
        if (name.includes('NEW WORLD')) return 'New World';
        if (name.includes('FOUR SQUARE')) return 'Four Square';
        return name;
      }
    },
    {
      name: 'Eating Out',
      keywords: ['MCDONALD', 'KFC', 'DOMINO', 'BURGER KING', 'STARBUCKS', 'CAFE', 'RESTAURANT', 'UBER EATS', 'SUBWAY', 'SUSHI', 'PIZZA', 'NOODLE', 'BAKERY', 'KEBAB', 'NANDO', 'WENDY'],
      display: (name: string) => {
        if (name.includes('MCDONALD')) return 'McDonalds';
        if (name.includes('KFC')) return 'KFC';
        if (name.includes('DOMINO')) return 'Dominos';
        if (name.includes('BURGER KING')) return 'Burger King';
        if (name.includes('STARBUCKS')) return 'Starbucks';
        if (name.includes('UBER EATS') || name.includes('UBER *EATS')) return 'Uber Eats';
        if (name.includes('SUBWAY')) return 'Subway';
        return name;
      }
    },
    {
      name: 'Transport & Fuel',
      keywords: ['AT HOP', 'SNAPPER', 'METROCARD', 'BP ', 'BPCONNECT', 'MOBIL ', 'Z ENERGY', 'GULL ', 'ALLIED ', 'CALTEX', 'GAS ', 'UBER *TRIP', 'PARKING', 'TRANSPORT'],
      display: (name: string) => {
        if (name.includes('AT HOP')) return 'AT Hop Card';
        if (name.includes('SNAPPER')) return 'Snapper Card';
        if (name.includes('BP ')) return 'BP';
        if (name.includes('MOBIL')) return 'Mobil';
        if (name.includes('Z ENERGY')) return 'Z Energy';
        if (name.includes('GULL')) return 'Gull';
        if (name.includes('CALTEX')) return 'Caltex';
        if (name.includes('UBER *TRIP')) return 'Uber';
        return name;
      }
    },
    {
      name: 'Utilities & Bills',
      keywords: ['SPARK', 'ONE NZ', 'VODAFONE', '2DEGREES', 'SKINNY', 'POWERSHOP', 'GENESIS', 'MERCURY', 'CONTACT ENERGY', 'FLICK ELECTRIC', 'CHORUS', 'INSURANCE'],
      display: (name: string) => {
        if (name.includes('SPARK')) return 'Spark';
        if (name.includes('ONE NZ') || name.includes('VODAFONE')) return 'One NZ';
        if (name.includes('2DEGREES')) return '2degrees';
        if (name.includes('SKINNY')) return 'Skinny Mobile';
        if (name.includes('POWERSHOP')) return 'Powershop';
        if (name.includes('GENESIS')) return 'Genesis Energy';
        if (name.includes('MERCURY')) return 'Mercury Energy';
        if (name.includes('CONTACT ENERGY')) return 'Contact Energy';
        return name;
      }
    },
    {
      name: 'Shopping & Home',
      keywords: ['THE WAREHOUSE', 'KMART', 'MITRE 10', 'BUNNINGS', 'BRISCOES', 'JB HI-FI', 'KOSCO', 'TEMU', 'SHEIN', 'AMAZON', 'ASOS', 'ALIEXPRESS', 'APPLE.COM', 'GOOGLE *', 'WAREHOUSE STATIONERY', 'CHEMIST WAREHOUSE'],
      display: (name: string) => {
        if (name.includes('THE WAREHOUSE')) return 'The Warehouse';
        if (name.includes('KMART')) return 'Kmart';
        if (name.includes('MITRE 10')) return 'Mitre 10';
        if (name.includes('BUNNINGS')) return 'Bunnings';
        if (name.includes('BRISCOES')) return 'Briscoes';
        if (name.includes('JB HI-FI')) return 'JB Hi-Fi';
        if (name.includes('TEMU')) return 'Temu';
        if (name.includes('SHEIN')) return 'Shein';
        if (name.includes('AMAZON')) return 'Amazon';
        if (name.includes('CHEMIST WAREHOUSE')) return 'Chemist Warehouse';
        return name;
      }
    },
    {
      name: 'Income',
      keywords: ['SALARY', 'WAGES', 'IRD ', 'INLAND REVENUE', 'INTEREST', 'DIVIDEND', 'TRANSFER IN', 'REFUND'],
      display: (name: string) => {
        if (name.includes('IRD') || name.includes('INLAND REVENUE')) return 'IRD Tax Refund';
        return name;
      }
    }
  ];

  // Try to find a match
  for (const cat of categories) {
    for (const keyword of cat.keywords) {
      if (upper.includes(keyword)) {
        // Run display formatter or clean up generic branch/location suffix
        const prettyName = cat.display(raw);
        let cleaned = prettyName || raw;
        
        // Clean up common location suffixes and transaction codes
        // e.g. "PAK N SAVE ALBANY AUCKLAND" -> "Pak'n Save"
        // Remove trailing dates (e.g. 12/07) or card numbers (e.g. *1234)
        cleaned = cleaned
          .replace(/\b[A-Z]{3,}\b (?:AUCKLAND|WELLINGTON|CHRISTCHURCH|HAMILTON|TAURANGA|DUNEDIN|PALMERSTON NORTH|NAPIER|NELSON|ROTORUA)\b/i, '')
          .replace(/\b(?:ALBANY|NEWMARKET|PONSONBY|MANUKAU|MT ALBERT|SYLVIA PARK|BOTANY|HENDERSON|TAKAPUNA|WRECKER|CITY)\b/i, '')
          .replace(/\d{2}\/\d{2}/g, '') // dates
          .replace(/\*\d{4}/g, '')      // card numbers
          .replace(/\s+/g, ' ')
          .trim();
        
        return { cleaned, category: cat.name };
      }
    }
  }

  // Default: clean generic whitespace, remove card details and assign to 'Others'
  let cleaned = raw
    .replace(/\*\d{4}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return { cleaned: cleaned || 'Unknown Transaction', category: 'Others' };
};

export const parseBankCSV = (csvText: string): { transactions: Omit<Transaction, 'id' | 'amountNZD' | 'rate'>[]; bank: string } => {
  const rows = csvText.split(/\r?\n/).map(row => row.trim()).filter(row => row.length > 0);
  if (rows.length < 2) {
    throw new Error('CSV file is empty or too short');
  }

  // Detect bank type based on column headers
  let bank = 'Unknown';
  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cols = splitCSVRow(rows[i]).map(c => c.toLowerCase());
    
    // ANZ detection: Particulars, Code, Reference
    if (cols.includes('particulars') && cols.includes('code') && cols.includes('reference')) {
      bank = 'ANZ';
      headerIndex = i;
      headers = cols;
      break;
    }
    // ASB detection: Unique Id, Tran Type, Payee, Memo
    if (cols.includes('unique id') && cols.includes('tran type') && cols.includes('payee')) {
      bank = 'ASB';
      headerIndex = i;
      headers = cols;
      break;
    }
    // Westpac detection: Other Party, Particulars, Analysis Code
    if (cols.includes('other party') && cols.includes('analysis code')) {
      bank = 'Westpac';
      headerIndex = i;
      headers = cols;
      break;
    }
    // BNZ detection: Payee, Description, Reference
    if (cols.includes('payee') && cols.includes('description') && cols.includes('reference')) {
      bank = 'BNZ';
      headerIndex = i;
      headers = cols;
      break;
    }
  }

  // Fallback check if headers are not explicitly named but column count matches typical structure
  if (bank === 'Unknown') {
    // Check first row structure
    const firstRowCols = splitCSVRow(rows[0]);
    if (firstRowCols.length >= 7) {
      bank = 'ANZ'; // ANZ has 7-8 columns usually
      headerIndex = 0;
      headers = firstRowCols.map(c => c.toLowerCase());
    } else {
      throw new Error('Unable to identify bank format. Please ensure you are uploading a valid CSV from ANZ, ASB, BNZ, or Westpac.');
    }
  }

  const transactions: Omit<Transaction, 'id' | 'amountNZD' | 'rate'>[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const cols = splitCSVRow(rows[i]);
    if (cols.length < 2 || cols.every(c => c === '')) continue; // Skip empty rows

    let date = '';
    let amount = 0;
    let payee = '';
    let originalPayee = '';

    if (bank === 'ANZ') {
      // Columns: Type, Details, Particulars, Code, Reference, Amount, Date, Foreign Currency Amount
      const dateIdx = headers.indexOf('date');
      const amountIdx = headers.indexOf('amount');
      const detailsIdx = headers.indexOf('details');
      const particularsIdx = headers.indexOf('particulars');
      const referenceIdx = headers.indexOf('reference');

      date = dateIdx !== -1 ? cols[dateIdx] : '';
      const amtStr = amountIdx !== -1 ? cols[amountIdx] : '0';
      amount = parseFloat(amtStr.replace(/[^0-9.\-]/g, '')) || 0;

      const details = detailsIdx !== -1 ? cols[detailsIdx] : '';
      const particulars = particularsIdx !== -1 ? cols[particularsIdx] : '';
      const reference = referenceIdx !== -1 ? cols[referenceIdx] : '';

      originalPayee = [details, particulars, reference].filter(Boolean).join(' ');
    } else if (bank === 'ASB') {
      // Columns: Date, Unique Id, Tran Type, Cheque Number, Payee, Memo, Amount
      const dateIdx = headers.indexOf('date');
      const payeeIdx = headers.indexOf('payee');
      const memoIdx = headers.indexOf('memo');
      const amountIdx = headers.indexOf('amount');

      date = dateIdx !== -1 ? cols[dateIdx] : '';
      const amtStr = amountIdx !== -1 ? cols[amountIdx] : '0';
      amount = parseFloat(amtStr.replace(/[^0-9.\-]/g, '')) || 0;

      const payeeVal = payeeIdx !== -1 ? cols[payeeIdx] : '';
      const memoVal = memoIdx !== -1 ? cols[memoIdx] : '';
      originalPayee = [payeeVal, memoVal].filter(Boolean).join(' ');
    } else if (bank === 'BNZ') {
      // Columns: Date, Amount, Payee, Description, Reference
      const dateIdx = headers.indexOf('date');
      const amountIdx = headers.indexOf('amount');
      const payeeIdx = headers.indexOf('payee');
      const descIdx = headers.indexOf('description');
      const refIdx = headers.indexOf('reference');

      date = dateIdx !== -1 ? cols[dateIdx] : '';
      const amtStr = amountIdx !== -1 ? cols[amountIdx] : '0';
      amount = parseFloat(amtStr.replace(/[^0-9.\-]/g, '')) || 0;

      const payeeVal = payeeIdx !== -1 ? cols[payeeIdx] : '';
      const descVal = descIdx !== -1 ? cols[descIdx] : '';
      const refVal = refIdx !== -1 ? cols[refIdx] : '';
      originalPayee = [payeeVal, descVal, refVal].filter(Boolean).join(' ');
    } else if (bank === 'Westpac') {
      // Columns: Date, Amount, Other Party, Particulars, Analysis Code, Reference, Transaction Type
      const dateIdx = headers.indexOf('date');
      const amountIdx = headers.indexOf('amount');
      const otherPartyIdx = headers.indexOf('other party');
      const particularsIdx = headers.indexOf('particulars');
      const referenceIdx = headers.indexOf('reference');

      date = dateIdx !== -1 ? cols[dateIdx] : '';
      const amtStr = amountIdx !== -1 ? cols[amountIdx] : '0';
      amount = parseFloat(amtStr.replace(/[^0-9.\-]/g, '')) || 0;

      const otherParty = otherPartyIdx !== -1 ? cols[otherPartyIdx] : '';
      const particulars = particularsIdx !== -1 ? cols[particularsIdx] : '';
      const reference = referenceIdx !== -1 ? cols[referenceIdx] : '';
      originalPayee = [otherParty, particulars, reference].filter(Boolean).join(' ');
    }

    // Auto classify and clean
    const { cleaned, category } = cleanPayeeName(originalPayee);
    payee = cleaned;

    // Special category mapping logic override: if amount is positive and category isn't Income, check if it's indeed Income
    let finalCategory = category;
    if (amount > 0 && finalCategory !== 'Income') {
      finalCategory = 'Income';
    }

    transactions.push({
      date: parseDate(date),
      payee,
      originalPayee: originalPayee.trim(),
      amount,
      currency: 'NZD', // Bank exports are always native NZD
      category: finalCategory,
      bank
    });
  }

  return { transactions, bank };
};
