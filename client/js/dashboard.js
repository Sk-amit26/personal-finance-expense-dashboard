requireAuth();
let charts = [];
const currentMonth = new Date().toISOString().slice(0, 7);

const card = (label, value, text, tone = '') =>
  `<article class="insight ${tone}"><label>${label}</label><strong>${value}</strong><p>${text}</p></article>`;

function animateValue(element, start, end, duration = 600, isCurrency = true) {
  if (!element) return;
  const range = end - start;
  if (range === 0) {
    element.textContent = isCurrency ? money(end) : end;
    return;
  }
  let current = start;
  const increment = end > start ? 1 : -1;
  const stepTime = Math.abs(Math.floor(duration / 30));
  const timer = setInterval(() => {
    current += (end - current) * 0.2;
    if (Math.abs(end - current) < 1) {
      current = end;
      clearInterval(timer);
    }
    element.textContent = isCurrency ? money(Math.round(current)) : Math.round(current);
  }, stepTime);
}

async function loadBudgets() {
  try {
    const { budgets } = await request(`/budgets?month=${currentMonth}`);
    const container = document.querySelector('#budgets');
    container.innerHTML = budgets.length ? budgets.map(b => {
      const percent = Math.min(100, Math.round((b.spent / b.limit) * 100));
      const state = percent >= 100 ? 'over' : percent >= 80 ? 'warning' : '';
      return `
        <article class="budget-item">
          <div>
            <strong>${b.category}</strong>
            <span>${money(b.spent)} of ${money(b.limit)}</span>
          </div>
          <button class="budget-delete" data-id="${b._id}" title="Remove budget">×</button>
          <div class="progress"><i class="${state}" style="width:${percent}%"></i></div>
          <small class="${state}">${percent}% used</small>
        </article>
      `;
    }).join('') : '<p class="empty" style="grid-column:1/-1;text-align:center;padding:20px">No active budgets for this month. Set one above.</p>';
  } catch (err) {
    showToast(err.message, true);
  }
}

async function loadDashboard() {
  try {
    const [s, c, m, i] = await Promise.all([
      request('/analytics/summary'),
      request('/analytics/category'),
      request('/analytics/monthly'),
      request('/analytics/insights')
    ]);

    animateValue(document.querySelector('#income'), 0, s.totalIncome);
    animateValue(document.querySelector('#expenses'), 0, s.totalExpenses);
    animateValue(document.querySelector('#savings'), 0, s.savings);
    animateValue(document.querySelector('#count'), 0, s.transactionCount, 600, false);
    animateValue(document.querySelector('#forecast'), 0, i.monthForecast || 0);

    const savingsRate = s.totalIncome ? Math.round((s.savings / s.totalIncome) * 100) : 0;
    const rateEl = document.querySelector('#savings-rate-label');
    if (rateEl) rateEl.textContent = `${savingsRate}% overall savings rate`;

    document.querySelector('#pulse-title').textContent = i.score ?
      `Financial Health Score: ${i.score}/100` : 'Start Building Your Financial Profile';
    document.querySelector('#pulse-text').textContent = i.score ?
      `${i.savingsRate}% lifetime savings rate based on your cashflow velocity.` :
      'Add income and expenses to unlock predictive signals and pacing.';

    document.querySelector('#insights').innerHTML = [
      card('FINANCIAL HEALTH', i.score ? `${i.score}/100` : '—', i.score ? `${i.savingsRate}% savings rate` : 'Needs transaction data'),
      card('MONTH-END FORECAST', money(i.monthForecast), 'Projected monthly total'),
      card('TOP SPENDING AREA', i.topCategory ? i.topCategory.category : '—', i.topCategory ? `${money(i.topCategory.total)} this month` : 'No expenses recorded'),
      card('UNUSUAL EXPENSE ALERT', i.unusualExpense ? money(i.unusualExpense.amount) : 'All clear', i.unusualExpense ? `${i.unusualExpense.description} is unusually high` : 'No anomalies detected', i.unusualExpense ? 'alert' : '')
    ].join('');

    renderCharts(m, c);
    await loadBudgets();
  } catch (e) {
    showToast(e.message, true);
  }
}

function renderCharts(m, c) {
  charts.forEach(x => x.destroy());
  charts = [];

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';

  const hasMonthlyData = m && m.months && m.months.length > 0;
  const hasCategoryData = c && c.categories && c.categories.length > 0;

  const currentMonthLabel = new Date().toLocaleString('en', { month: 'short', year: '2-digit' });
  const labels = hasMonthlyData
    ? m.months.map(x => new Date(x.month + '-01').toLocaleString('en', { month: 'short', year: '2-digit' }))
    : [currentMonthLabel];

  const incomeData = hasMonthlyData ? m.months.map(x => x.income) : [0];
  const expenseData = hasMonthlyData ? m.months.map(x => x.expenses) : [0];

  const base = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 12 } } }
    },
    scales: {
      x: { ticks: { color: textColor }, grid: { color: gridColor } },
      y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true }
    }
  };

  const incomeCanvas = document.querySelector('#incomeChart');
  const catCanvas = document.querySelector('#categoryChart');
  const trendCanvas = document.querySelector('#trendChart');

  if (incomeCanvas) {
    charts.push(new Chart(incomeCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Income', data: incomeData, backgroundColor: '#3b82f6', borderRadius: 6 },
          { label: 'Expenses', data: expenseData, backgroundColor: '#ef4444', borderRadius: 6 }
        ]
      },
      options: base
    }));
  }

  if (catCanvas) {
    const catLabels = hasCategoryData ? c.categories.map(x => x.category) : ['No Expenses Logged Yet'];
    const catValues = hasCategoryData ? c.categories.map(x => x.total) : [1];
    const catColors = hasCategoryData
      ? ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#64748b']
      : [isDark ? '#1e293b' : '#e2e8f0'];

    charts.push(new Chart(catCanvas, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catValues,
          backgroundColor: catColors
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 11 } } },
          tooltip: { enabled: hasCategoryData }
        }
      }
    }));
  }

  if (trendCanvas) {
    charts.push(new Chart(trendCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Monthly expenses',
          data: expenseData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          fill: true,
          tension: 0.35
        }]
      },
      options: base
    }));
  }
}


window.onThemeChange = () => {
  loadDashboard();
};

document.querySelector('#budget-form').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await request('/budgets', {
      method: 'POST',
      body: JSON.stringify({
        category: document.querySelector('#budget-category').value,
        limit: Number(document.querySelector('#budget-limit').value),
        month: currentMonth
      })
    });
    e.target.reset();
    showToast('Budget guard activated.');
    loadBudgets();
  } catch (err) {
    showToast(err.message, true);
  }
});

document.querySelector('#budgets').addEventListener('click', async e => {
  if (!e.target.dataset.id) return;
  try {
    await request(`/budgets/${e.target.dataset.id}`, { method: 'DELETE' });
    loadBudgets();
    showToast('Budget removed.');
  } catch (err) {
    showToast(err.message, true);
  }
});

loadDashboard();
