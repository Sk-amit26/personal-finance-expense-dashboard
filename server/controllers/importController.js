const multer = require('multer');
const { parse } = require('csv-parse/sync');
const Transaction = require('../models/Transaction');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'text/plain' ||
      file.originalname.toLowerCase().endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files (.csv) are allowed.'));
    }
  }
});

exports.uploadMiddleware = upload.single('file');

function parseDateFlexible(val) {
  if (!val) return new Date();
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  const str = String(val).trim();

  // Try direct Date parse
  const direct = new Date(str);
  if (!isNaN(direct.getTime()) && direct.getFullYear() >= 2000 && direct.getFullYear() <= 2100) {
    return direct;
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    let year = parseInt(ddmmyyyy[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) return d;
  }

  // Handle YYYY/MM/DD or YYYY.MM.DD
  const yyyymmdd = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (yyyymmdd) {
    const year = parseInt(yyyymmdd[1], 10);
    const month = parseInt(yyyymmdd[2], 10) - 1;
    const day = parseInt(yyyymmdd[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) return d;
  }

  // Handle text dates e.g. 15-Aug-2026
  const textDate = new Date(Date.parse(str.replace(/-/g, ' ')));
  if (!isNaN(textDate.getTime())) return textDate;

  return null;
}

function parseAmountFlexible(val) {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  let cleaned = String(val).replace(/[₹$€£RsINR,\s"'`]/gi, '').trim();

  let isNegative = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    isNegative = true;
    cleaned = cleaned.slice(1, -1);
  } else if (cleaned.startsWith('-')) {
    isNegative = true;
    cleaned = cleaned.slice(1);
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return isNegative ? -num : num;
}

function guessCategory(desc = '', currentCat = '') {
  if (currentCat && Transaction.categories.some(c => c.toLowerCase() === currentCat.toLowerCase())) {
    return Transaction.categories.find(c => c.toLowerCase() === currentCat.toLowerCase());
  }
  const text = (desc + ' ' + currentCat).toLowerCase();
  if (/salary|payroll|stipend|wages|bonus/i.test(text)) return 'Salary';
  if (/freelance|consulting|upwork|fiverr|client/i.test(text)) return 'Freelance';
  if (/sip|mutual fund|stock|zerodha|groww|dividend|invest/i.test(text)) return 'Investment';
  if (/swiggy|zomato|restaurant|cafe|food|grocery|supermarket|dining|mcdonald|starbucks/i.test(text)) return 'Food';
  if (/uber|ola|fuel|petrol|diesel|fastag|metro|flight|train|irctc|bus/i.test(text)) return 'Transport';
  if (/amazon|flipkart|myntra|zara|shopping|apparel|clothing|mall/i.test(text)) return 'Shopping';
  if (/electricity|broadband|wifi|water|recharge|airtel|jio|bill|rent|gas/i.test(text)) return 'Bills';
  if (/netflix|spotify|cinema|movie|bookmyshow|game|steam|youtube|prime/i.test(text)) return 'Entertainment';
  if (/course|udemy|coursera|book|school|college|tuition|education/i.test(text)) return 'Education';
  if (/hospital|pharmacy|medicine|doctor|clinic|health|apollo|1mg/i.test(text)) return 'Health';
  return 'Other';
}

exports.importCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please select a CSV file to upload.' });
    }

    const csvContent = req.file.buffer.toString('utf8');
    let records;
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      });
    } catch (parseErr) {
      return res.status(400).json({ message: 'Invalid CSV format: ' + parseErr.message });
    }

    if (!records || records.length === 0) {
      return res.status(400).json({ message: 'CSV file contains no data rows.' });
    }

    const validRows = [];
    const errors = [];

    records.forEach((row, index) => {
      const rowNum = index + 2;
      const normalized = {};
      Object.keys(row).forEach(k => {
        const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        normalized[cleanKey] = row[k];
      });

      // Find date
      const dateKey = Object.keys(normalized).find(k => /date|time|txn.*dt|posting/i.test(k));
      const rawDate = dateKey ? normalized[dateKey] : normalized.date;
      const parsedDate = parseDateFlexible(rawDate);

      // Find description
      const descKey = Object.keys(normalized).find(k => /desc|particular|narration|memo|remark|detail|name|payee/i.test(k));
      const description = (descKey ? normalized[descKey] : 'Imported transaction') || 'Imported transaction';

      // Find category
      const catKey = Object.keys(normalized).find(k => /cat|tag|group|head/i.test(k));
      const rawCategory = catKey ? normalized[catKey] : '';

      // Check for separate Debit / Credit columns
      const debitKey = Object.keys(normalized).find(k => /debit|withdrawal|dr|paidout/i.test(k));
      const creditKey = Object.keys(normalized).find(k => /credit|deposit|cr|paidin/i.test(k));

      let type = '';
      let amount = 0;

      if (debitKey && normalized[debitKey] && parseAmountFlexible(normalized[debitKey]) > 0) {
        type = 'expense';
        amount = Math.abs(parseAmountFlexible(normalized[debitKey]));
      } else if (creditKey && normalized[creditKey] && parseAmountFlexible(normalized[creditKey]) > 0) {
        type = 'income';
        amount = Math.abs(parseAmountFlexible(normalized[creditKey]));
      } else {
        // Look for generic amount column
        const amtKey = Object.keys(normalized).find(k => /amount|value|amt|net|sum/i.test(k));
        const rawAmt = amtKey ? normalized[amtKey] : null;
        const parsedAmt = parseAmountFlexible(rawAmt);

        if (parsedAmt === null) {
          errors.push(`Row ${rowNum}: Could not determine transaction amount.`);
          return;
        }

        // Check for explicit type column
        const typeKey = Object.keys(normalized).find(k => /^type$|txntype|trxtype/i.test(k));
        const rawType = (typeKey ? normalized[typeKey] : '').toLowerCase().trim();

        if (rawType.includes('inc') || rawType.includes('cr') || rawType.includes('deposit')) {
          type = 'income';
          amount = Math.abs(parsedAmt);
        } else if (rawType.includes('exp') || rawType.includes('dr') || rawType.includes('debit') || rawType.includes('withdr')) {
          type = 'expense';
          amount = Math.abs(parsedAmt);
        } else if (parsedAmt < 0) {
          type = 'expense';
          amount = Math.abs(parsedAmt);
        } else {
          // If category indicates salary/freelance -> income, else expense
          const cat = guessCategory(description, rawCategory);
          type = (cat === 'Salary' || cat === 'Freelance' || cat === 'Investment') ? 'income' : 'expense';
          amount = Math.abs(parsedAmt);
        }
      }

      if (!parsedDate) {
        errors.push(`Row ${rowNum}: Invalid date format "${rawDate}".`);
        return;
      }

      if (isNaN(amount) || amount <= 0) {
        errors.push(`Row ${rowNum}: Amount must be a positive number.`);
        return;
      }

      const finalCategory = guessCategory(description, rawCategory);

      validRows.push({
        userId: req.user.id,
        type,
        amount: Math.round(amount * 100) / 100,
        category: finalCategory,
        description: String(description).trim().slice(0, 140),
        date: parsedDate
      });
    });

    if (validRows.length === 0) {
      return res.status(400).json({
        message: 'No valid transactions could be extracted from this CSV file. Please ensure columns include Date, Amount, and Description. ' + (errors[0] || ''),
        errors: errors.slice(0, 5)
      });
    }

    const inserted = await Transaction.insertMany(validRows);

    res.status(201).json({
      message: `Successfully imported ${inserted.length} transaction${inserted.length === 1 ? '' : 's'}.${errors.length ? ` (${errors.length} rows skipped)` : ''}`,
      importedCount: inserted.length,
      skippedCount: errors.length,
      errors: errors.slice(0, 10)
    });
  } catch (err) {
    next(err);
  }
};

