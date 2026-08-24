requireAuth();

let projectionChart = null;

async function initTools() {
  try {
    const s = await request('/analytics/summary');
    const monthlyIncome = Math.round(s.totalIncome ? (s.totalIncome / Math.max(1, s.transactionCount / 5)) : 50000);
    const monthlyExpense = Math.round(s.totalExpenses ? (s.totalExpenses / Math.max(1, s.transactionCount / 5)) : 30000);

    document.querySelector('#base-income').value = monthlyIncome || 50000;
    document.querySelector('#base-expense').value = monthlyExpense || 30000;

    runCalculation();
  } catch (_) {
    runCalculation();
  }
}

function runCalculation() {
  const baseIncome = Number(document.querySelector('#base-income').value) || 0;
  const baseExpense = Number(document.querySelector('#base-expense').value) || 0;
  const expenseCut = Number(document.querySelector('#expense-cut').value) || 0;
  const incomeBoost = Number(document.querySelector('#income-boost').value) || 0;
  const annualReturn = (Number(document.querySelector('#investment-rate').value) || 0) / 100;
  const years = Number(document.querySelector('#time-horizon').value) || 3;
  const months = years * 12;

  const monthlyRate = annualReturn / 12;

  const baselineMonthlySave = Math.max(0, baseIncome - baseExpense);
  const simulatedMonthlySave = Math.max(0, (baseIncome + incomeBoost) - Math.max(0, baseExpense - expenseCut));

  const labels = [];
  const baselineData = [];
  const simulatedData = [];

  let currentBase = 0;
  let currentSim = 0;

  for (let m = 1; m <= months; m++) {
    currentBase = (currentBase + baselineMonthlySave) * (1 + monthlyRate);
    currentSim = (currentSim + simulatedMonthlySave) * (1 + monthlyRate);

    if (m % Math.ceil(months / 12) === 0 || m === months) {
      labels.push(`Mo ${m}`);
      baselineData.push(Math.round(currentBase));
      simulatedData.push(Math.round(currentSim));
    }
  }

  document.querySelector('#res-baseline').textContent = money(Math.round(currentBase));
  document.querySelector('#res-simulated').textContent = money(Math.round(currentSim));
  document.querySelector('#res-extra').textContent = '+' + money(Math.round(currentSim - currentBase));

  renderProjectionChart(labels, baselineData, simulatedData);
}

function renderProjectionChart(labels, baseline, simulated) {
  if (projectionChart) projectionChart.destroy();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';

  projectionChart = new Chart(document.querySelector('#projectionChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Baseline Trajectory',
          data: baseline,
          borderColor: '#64748b',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.3
        },
        {
          label: 'Simulated Optimized Wealth',
          data: simulated,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 12 } } }
      },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: {
          ticks: {
            color: textColor,
            callback: v => '₹' + (v >= 100000 ? (v / 100000).toFixed(1) + 'L' : (v / 1000).toFixed(0) + 'k')
          },
          grid: { color: gridColor }
        }
      }
    }
  });
}

document.querySelector('#simulator-form').addEventListener('submit', e => {
  e.preventDefault();
  runCalculation();
});

window.onThemeChange = () => {
  runCalculation();
};

initTools();
