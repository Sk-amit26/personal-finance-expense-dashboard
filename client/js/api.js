const API = '/api';

function token() {
  return localStorage.getItem('finance_token');
}

function user() {
  try {
    return JSON.parse(localStorage.getItem('finance_user')) || {};
  } catch (_) {
    return {};
  }
}

function logout() {
  localStorage.removeItem('finance_token');
  localStorage.removeItem('finance_user');
  location.href = '/login.html';
}

function requireAuth() {
  if (!token()) {
    location.href = '/login.html';
  }
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  
  const res = await fetch(API + path, { ...options, headers });
  
  // If response is a blob/file download
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/pdf') || contentType.includes('spreadsheetml') || contentType.includes('octet-stream')) {
    if (!res.ok) throw new Error('Failed to download file.');
    return res.blob();
  }

  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token()) {
    logout();
    throw new Error('Session expired. Please log in again.');
  }
  if (!res.ok) {
    throw new Error(data.message || 'Request failed.');
  }
  return data;
}

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value || 0);
}

function showToast(message, isError = false) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = message;
  t.className = `toast show${isError ? ' error' : ''}`;
  setTimeout(() => { t.className = 'toast'; }, 3500);
}

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('finance_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('finance_theme', next);
  updateThemeIcon(next);
  if (window.onThemeChange) window.onThemeChange(next);
}

function updateThemeIcon(theme) {
  const btn = document.querySelector('.theme-toggle');
  if (btn) {
    btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }
}

async function deleteAccount() {
  const confirmed = confirm('⚠️ PERMANENT ACCOUNT DELETION\n\nThis will permanently delete your account and all associated transactions, category budgets, savings goals, and recurring transfers.\n\nAre you sure you want to delete your account?');
  if (!confirmed) return;

  try {
    const res = await request('/auth/account', { method: 'DELETE' });
    showToast(res.message || 'Account deleted successfully.');
    localStorage.removeItem('finance_token');
    localStorage.removeItem('finance_user');
    setTimeout(() => {
      location.href = '/register.html';
    }, 1200);
  } catch (err) {
    showToast(err.message, true);
  }
}

// Global Nav setup
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  
  // Theme toggle listener
  const toggleBtn = document.querySelector('.theme-toggle');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);

  // Mobile menu toggle
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  // Logout listener
  const logoutBtn = document.querySelector('#logout');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // Delete account listener
  const deleteBtn = document.querySelector('#delete-account-btn');
  if (deleteBtn) deleteBtn.addEventListener('click', deleteAccount);

  // Set user name if available
  const userNameEl = document.querySelector('#user-name');
  if (userNameEl && user().name) {
    userNameEl.textContent = user().name;
  }
});

