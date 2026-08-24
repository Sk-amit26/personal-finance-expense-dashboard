requireAuth();

const goalFormPanel = document.querySelector('#goal-form-panel');
const openBtn = document.querySelector('#open-goal-form-btn');
const goalForm = document.querySelector('#goal-form');

openBtn.onclick = () => {
  goalFormPanel.style.display = goalFormPanel.style.display === 'none' ? 'block' : 'none';
  if (goalFormPanel.style.display === 'block') {
    window.scrollTo({ top: goalFormPanel.offsetTop - 90, behavior: 'smooth' });
  }
};

async function loadGoals() {
  try {
    const { goals, monthlyNetSavings } = await request('/goals');
    const container = document.querySelector('#goals-container');

    if (!goals.length) {
      container.innerHTML = `
        <article class="panel" style="grid-column:1/-1;text-align:center;padding:40px">
          <h2>No Savings Goals Active</h2>
          <p style="color:var(--muted);margin-bottom:20px">Create a target fund for an emergency cushion, new laptop, or vacation.</p>
          <button class="button" onclick="document.querySelector('#open-goal-form-btn').click()">+ Create Your First Goal</button>
        </article>
      `;
      return;
    }

    container.innerHTML = goals.map(g => {
      const isCompleted = g.isCompleted;
      const deadlineStr = g.deadline ? new Date(g.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No deadline';
      const estimateText = g.estimatedDate ? `Est. completion: ${new Date(g.estimatedDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} (${g.monthsToGoal} mo)` : (monthlyNetSavings > 0 ? 'Goal pace calculating...' : 'Needs positive monthly savings rate');

      return `

        <article class="goal-card ${isCompleted ? 'completed' : ''}">
          <div>
            <div class="goal-top">
              <div class="goal-identity">
                <div class="goal-icon">${g.icon}</div>
                <div class="goal-title">
                  <h3>${escapeHtml(g.name)}</h3>
                  <small>Deadline: ${deadlineStr}</small>
                </div>
              </div>
              <button class="budget-delete" data-goal-delete="${g._id}" title="Delete goal">×</button>
            </div>

            <div class="goal-amounts">
              <strong>${money(g.savedAmount)}</strong>
              <span>Target: ${money(g.targetAmount)}</span>
            </div>

            <div class="goal-progress">
              <div class="goal-progress-bar" style="width:${g.percent}%"></div>
            </div>

            <div class="goal-meta">
              <span>${g.percent}% reached</span>
              <span>${isCompleted ? '🎉 Goal Completed!' : estimateText.replace('部落', '')}</span>
            </div>
          </div>

          <div class="goal-actions">
            <button class="button small secondary" data-contribute="${g._id}" data-name="${escapeHtml(g.name)}">+ Add Money</button>
          </div>
        </article>
      `;
    }).join('');
  } catch (err) {
    showToast(err.message, true);
  }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// Goal creation
goalForm.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(goalForm));
  try {
    await request('/goals', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    showToast('Savings goal established!');
    goalForm.reset();
    goalFormPanel.style.display = 'none';
    loadGoals();
  } catch (err) {
    showToast(err.message, true);
  }
});

// Contribute / Delete actions
document.querySelector('#goals-container').addEventListener('click', async e => {
  const delId = e.target.dataset.goalDelete;
  const contId = e.target.dataset.contribute;
  const name = e.target.dataset.name;

  if (delId && confirm('Delete this savings goal?')) {
    try {
      await request(`/goals/${delId}`, { method: 'DELETE' });
      showToast('Goal removed.');
      loadGoals();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  if (contId) {
    const input = prompt(`Enter contribution amount to add to "${name}": (₹)`);
    if (!input) return;
    const amount = Number(input);
    if (isNaN(amount) || amount <= 0) {
      return alert('Please enter a valid positive number.');
    }
    try {
      const res = await request(`/goals/${contId}/contribute`, {
        method: 'POST',
        body: JSON.stringify({ amount })
      });
      showToast(res.message);
      loadGoals();
    } catch (err) {
      showToast(err.message, true);
    }
  }
});

loadGoals();
