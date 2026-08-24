requireAuth();
const form = document.querySelector('#transaction-form');
let editing = null;
const categorySelect = document.querySelector('#category');
const recCategorySelect = document.querySelector('#rec-category');

const expenseCategories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Education', 'Health', 'Other'];
const incomeCategories = ['Salary', 'Freelance', 'Investment', 'Other'];

function populateCategories(selectEl, type, selected) {
  const cats = type === 'income' ? incomeCategories : expenseCategories;
  selectEl.innerHTML = cats.map(x => `<option ${x === selected ? 'selected' : ''}>${x}</option>`).join('');
}

populateCategories(categorySelect, 'expense');
populateCategories(recCategorySelect, 'expense');

document.querySelector('#type').onchange = e => populateCategories(categorySelect, e.target.value);
document.querySelector('#rec-type').onchange = e => populateCategories(recCategorySelect, e.target.value);

// Set default dates
document.querySelector('#date').value = new Date().toISOString().slice(0, 10);
document.querySelector('#rec-start-date').value = new Date().toISOString().slice(0, 10);

async function loadTransactions() {
  const p = new URLSearchParams();
  for (const el of document.querySelectorAll('.filter')) {
    if (el.value) p.set(el.name, el.value);
  }
  try {
    const { transactions } = await request('/transactions?' + p);
    const body = document.querySelector('#transactions-tbody');
    body.innerHTML = transactions.length ? transactions.map(t => `
      <tr>
        <td>${new Date(t.date).toLocaleDateString('en-GB')}</td>
        <td><strong>${escapeHtml(t.description)}</strong></td>
        <td>${t.category}</td>
        <td><span class="badge ${t.type}">${t.type}</span></td>
        <td class="amount ${t.type}">${t.type === 'income' ? '+' : '-'}${money(t.amount)}</td>
        <td>
          <div class="actions">
            <button class="button secondary small" data-edit='${JSON.stringify(t)}'>Edit</button>
            <button class="button danger small" data-delete="${t._id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="6" class="empty">No transactions found matching your filters.</td></tr>';
  } catch (e) {
    showToast(e.message, true);
  }
}

async function loadRecurring() {
  try {
    const { recurring } = await request('/recurring');
    const tbody = document.querySelector('#recurring-tbody');
    tbody.innerHTML = recurring.length ? recurring.map(r => `
      <tr>
        <td><strong>${escapeHtml(r.description)}</strong></td>
        <td>${r.category}</td>
        <td><span class="badge neutral">${r.frequency}</span></td>
        <td class="amount ${r.type}">${money(r.amount)}</td>
        <td>${new Date(r.nextRunDate).toLocaleDateString('en-GB')}</td>
        <td><span class="badge ${r.isActive ? 'active' : 'paused'}">${r.isActive ? 'Active' : 'Paused'}</span></td>
        <td>
          <div class="actions">
            <button class="button secondary small" data-rec-toggle="${r._id}">${r.isActive ? 'Pause' : 'Resume'}</button>
            <button class="button danger small" data-rec-delete="${r._id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="7" class="empty">No recurring transactions configured yet.</td></tr>';
  } catch (err) {
    showToast(err.message, true);
  }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// Transaction CRUD Form
form.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  data.amount = Number(data.amount);
  try {
    await request(editing ? `/transactions/${editing}` : '/transactions', {
      method: editing ? 'PUT' : 'POST',
      body: JSON.stringify(data)
    });
    showToast(editing ? 'Transaction updated successfully.' : 'Transaction recorded.');
    editing = null;
    form.reset();
    document.querySelector('#date').value = new Date().toISOString().slice(0, 10);
    document.querySelector('#form-title').textContent = 'Add Transaction';
    document.querySelector('#save').textContent = 'Save Transaction';
    populateCategories(categorySelect, 'expense');
    loadTransactions();
  } catch (e) {
    showToast(e.message, true);
  }
});

// Edit & Delete handlers
document.querySelector('#transactions-tbody').onclick = async e => {
  const edit = e.target.dataset.edit;
  const del = e.target.dataset.delete;
  if (edit) {
    const t = JSON.parse(edit);
    editing = t._id;
    document.querySelector('#type').value = t.type;
    populateCategories(categorySelect, t.type, t.category);
    document.querySelector('#amount').value = t.amount;
    document.querySelector('#description').value = t.description;
    document.querySelector('#date').value = t.date.slice(0, 10);
    document.querySelector('#form-title').textContent = 'Edit Transaction';
    document.querySelector('#save').textContent = 'Update Transaction';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (del && confirm('Are you sure you want to delete this transaction?')) {
    try {
      await request('/transactions/' + del, { method: 'DELETE' });
      showToast('Transaction removed.');
      loadTransactions();
    } catch (err) {
      showToast(err.message, true);
    }
  }
};

// Recurring Form & Actions
const recContainer = document.querySelector('#recurring-form-container');
document.querySelector('#toggle-recurring-form-btn').onclick = () => {
  recContainer.style.display = recContainer.style.display === 'none' ? 'block' : 'none';
};

document.querySelector('#recurring-form').addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    await request('/recurring', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    showToast('Recurring schedule created.');
    e.target.reset();
    recContainer.style.display = 'none';
    loadRecurring();
  } catch (err) {
    showToast(err.message, true);
  }
});

document.querySelector('#recurring-tbody').onclick = async e => {
  const toggleId = e.target.dataset.recToggle;
  const delId = e.target.dataset.recDelete;
  if (toggleId) {
    try {
      const res = await request(`/recurring/${toggleId}/toggle`, { method: 'PATCH' });
      showToast(res.message);
      loadRecurring();
    } catch (err) {
      showToast(err.message, true);
    }
  }
  if (delId && confirm('Delete this recurring schedule?')) {
    try {
      await request(`/recurring/${delId}`, { method: 'DELETE' });
      showToast('Recurring schedule deleted.');
      loadRecurring();
    } catch (err) {
      showToast(err.message, true);
    }
  }
};

// Download Sample CSV template
const downloadSampleBtn = document.querySelector('#download-sample-btn');
if (downloadSampleBtn) {
  downloadSampleBtn.onclick = () => {
    const sampleCSV = `Date,Type,Amount,Category,Description
2026-08-01,income,85000,Salary,August Monthly Salary
2026-08-03,expense,3200,Food,Nature Basket Supermarket
2026-08-05,expense,1500,Transport,Fuel and Fastag
2026-08-08,expense,4800,Shopping,Zara Apparel
2026-08-10,expense,2100,Bills,Electricity and Broadband
2026-08-12,expense,899,Entertainment,Netflix and Spotify
2026-08-15,income,12000,Freelance,UI Consultation project
2026-08-18,expense,1200,Health,Pharmacy medications
2026-08-20,expense,3400,Food,Dinner with friends
2026-08-22,expense,5000,Investment,Monthly Mutual Fund SIP`;
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Sample CSV downloaded to your device!');
  };
}

// CSV Import Handler
const fileInput = document.querySelector('#csv-file-input');
document.querySelector('#import-btn').onclick = () => fileInput.click();


fileInput.onchange = async () => {
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    showToast('Uploading and parsing CSV...');
    const res = await fetch('/api/import/csv', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Import failed');

    showToast(data.message);
    fileInput.value = '';
    loadTransactions();
  } catch (err) {
    showToast(err.message, true);
    fileInput.value = '';
  }
};

// PDF & Excel Export Handlers
document.querySelector('#export-pdf-btn').onclick = async () => {
  try {
    showToast('Generating PDF Report...');
    const monthFilter = document.querySelector('input[name="month"]').value;
    const blob = await request(`/export/pdf${monthFilter ? '?month=' + monthFilter : ''}`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moneywise-report-${monthFilter || 'all'}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('PDF downloaded successfully.');
  } catch (err) {
    showToast(err.message, true);
  }
};

document.querySelector('#export-excel-btn').onclick = async () => {
  try {
    showToast('Generating Excel Report...');
    const monthFilter = document.querySelector('input[name="month"]').value;
    const blob = await request(`/export/excel${monthFilter ? '?month=' + monthFilter : ''}`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moneywise-report-${monthFilter || 'all'}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('Excel spreadsheet downloaded.');
  } catch (err) {
    showToast(err.message, true);
  }
};

document.querySelectorAll('.filter').forEach(x => x.onchange = loadTransactions);

loadTransactions();
loadRecurring();
