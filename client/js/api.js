const API = '/api';
function token() { return localStorage.getItem('finance_token'); }
function logout() { localStorage.removeItem('finance_token'); localStorage.removeItem('finance_user'); location.href = '/login.html'; }
async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token()) { logout(); throw new Error('Session expired.'); }
  if (!res.ok) throw new Error(data.message || 'Request failed.');
  return data;
}
function requireAuth() { if (!token()) location.href = '/login.html'; }
function money(value) { return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value || 0); }
function showToast(message, isError=false) { const t=document.querySelector('.toast'); if(!t)return; t.textContent=message;t.className=`toast show${isError?' error':''}`;setTimeout(()=>t.className='toast',3000); }
