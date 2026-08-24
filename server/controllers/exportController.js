const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const formatMoney = val => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

exports.exportPDF = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const query = { userId: req.user.id };
    const month = req.query.month;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
      query.date = { $gte: start, $lt: end };
    }

    const transactions = await Transaction.find(query).sort({ date: -1 });

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const savings = totalIncome - totalExpenses;

    const categoryMap = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const filename = `moneywise-financial-report-${month || 'all-time'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Header styling
    doc.rect(0, 0, doc.page.width, 100).fill('#315efb');
    doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('Moneywise Financial Report', 40, 30);
    doc.fontSize(11).font('Helvetica').text(`Prepared for: ${user ? user.name : 'User'} (${user ? user.email : ''})`, 40, 60);
    doc.text(`Period: ${month ? month : 'All Time'} | Generated: ${new Date().toLocaleDateString('en-GB')}`, 40, 75);

    doc.moveDown(3);
    doc.fillColor('#172033');

    // Summary Section
    doc.fontSize(16).font('Helvetica-Bold').text('Financial Summary', 40, 120);
    doc.rect(40, 140, 515, 60).fill('#f5f7fb').stroke('#e6eaf2');
    
    doc.fillColor('#18a67a').fontSize(11).font('Helvetica-Bold').text('Total Income', 55, 150);
    doc.fontSize(16).text(formatMoney(totalIncome), 55, 168);

    doc.fillColor('#e05263').fontSize(11).text('Total Expenses', 185, 150);
    doc.fontSize(16).text(formatMoney(totalExpenses), 185, 168);

    doc.fillColor(savings >= 0 ? '#18a67a' : '#e05263').fontSize(11).text('Net Savings', 315, 150);
    doc.fontSize(16).text(formatMoney(savings), 315, 168);

    doc.fillColor('#677086').fontSize(11).text('Transactions', 445, 150);
    doc.fontSize(16).text(String(transactions.length), 445, 168);

    // Category Breakdown
    let y = 220;
    doc.fillColor('#172033').fontSize(14).font('Helvetica-Bold').text('Expense by Category', 40, y);
    y += 20;

    const catEntries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
    if (catEntries.length > 0) {
      doc.rect(40, y, 515, 20).fill('#edf1ff');
      doc.fillColor('#315efb').fontSize(10).font('Helvetica-Bold').text('Category', 50, y + 5);
      doc.text('Amount', 320, y + 5);
      doc.text('Share of Expenses', 430, y + 5);
      y += 22;

      catEntries.slice(0, 8).forEach(([cat, amt]) => {
        const pct = totalExpenses ? Math.round((amt / totalExpenses) * 100) : 0;
        doc.rect(40, y, 515, 18).fill(y % 36 === 0 ? '#fafbfc' : '#ffffff');
        doc.fillColor('#172033').fontSize(9).font('Helvetica').text(cat, 50, y + 4);
        doc.text(formatMoney(amt), 320, y + 4);
        doc.text(`${pct}%`, 430, y + 4);
        y += 19;
      });
    } else {
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('#677086').text('No expenses recorded for this period.', 40, y);
      y += 20;
    }

    // Transactions Table
    y += 15;
    if (y > 650) { doc.addPage(); y = 40; }
    doc.fillColor('#172033').fontSize(14).font('Helvetica-Bold').text('Recent Transactions', 40, y);
    y += 20;

    doc.rect(40, y, 515, 20).fill('#edf1ff');
    doc.fillColor('#315efb').fontSize(9).font('Helvetica-Bold');
    doc.text('Date', 50, y + 5);
    doc.text('Description', 130, y + 5);
    doc.text('Category', 300, y + 5);
    doc.text('Type', 400, y + 5);
    doc.text('Amount', 470, y + 5);
    y += 22;

    transactions.slice(0, 30).forEach((t) => {
      if (y > 750) {
        doc.addPage();
        y = 40;
      }
      doc.rect(40, y, 515, 18).fill(y % 36 === 0 ? '#fafbfc' : '#ffffff');
      doc.fillColor('#172033').fontSize(8).font('Helvetica');
      doc.text(new Date(t.date).toLocaleDateString('en-GB'), 50, y + 4);
      doc.text(t.description.slice(0, 28), 130, y + 4);
      doc.text(t.category, 300, y + 4);
      doc.fillColor(t.type === 'income' ? '#18a67a' : '#e05263').text(t.type.toUpperCase(), 400, y + 4);
      doc.text(formatMoney(t.amount), 470, y + 4);
      y += 19;
    });

    // Footer
    doc.fontSize(8).fillColor('#9ca4b5').text('Generated by Moneywise Personal Finance Dashboard', 40, 790, { align: 'center', width: 515 });

    doc.end();
  } catch (err) {
    next(err);
  }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const query = { userId: req.user.id };
    const month = req.query.month;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
      query.date = { $gte: start, $lt: end };
    }

    const transactions = await Transaction.find(query).sort({ date: -1 });

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const savings = totalIncome - totalExpenses;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Moneywise Dashboard';
    workbook.created = new Date();

    // Sheet 1: Summary
    const summarySheet = workbook.addWorksheet('Summary', { properties: { tabColor: { argb: 'FF315EFB' } } });
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 28 },
      { header: 'Value', key: 'value', width: 22 }
    ];

    // Header styling
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF315EFB' } };

    summarySheet.addRows([
      { metric: 'User Name', value: user ? user.name : 'User' },
      { metric: 'User Email', value: user ? user.email : '' },
      { metric: 'Period', value: month || 'All Time' },
      { metric: 'Export Date', value: new Date().toLocaleDateString('en-GB') },
      { metric: 'Total Income (₹)', value: totalIncome },
      { metric: 'Total Expenses (₹)', value: totalExpenses },
      { metric: 'Net Savings (₹)', value: savings },
      { metric: 'Total Transactions', value: transactions.length }
    ]);

    // Sheet 2: Transactions
    const txSheet = workbook.addWorksheet('Transactions', { properties: { tabColor: { argb: 'FF10D7A2' } } });
    txSheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Description', key: 'description', width: 34 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Amount (₹)', key: 'amount', width: 16 }
    ];

    txSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    txSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF315EFB' } };

    transactions.forEach(t => {
      const row = txSheet.addRow({
        date: new Date(t.date).toISOString().slice(0, 10),
        description: t.description,
        category: t.category,
        type: t.type,
        amount: t.amount
      });
      if (t.type === 'income') {
        row.getCell('type').font = { color: { argb: 'FF18A67A' }, bold: true };
      } else {
        row.getCell('type').font = { color: { argb: 'FFE05263' }, bold: true };
      }
    });

    const filename = `moneywise-transactions-${month || 'all-time'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};
