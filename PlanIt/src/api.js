// ============================================
// API Helper & Auth Module
// ============================================

const API = '';

export function getToken() {
  return localStorage.getItem('planit_token');
}

export function getUser() {
  const u = localStorage.getItem('planit_user');
  return u ? JSON.parse(u) : null;
}

export function saveAuth(token, user) {
  localStorage.setItem('planit_token', token);
  localStorage.setItem('planit_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('planit_token');
  localStorage.removeItem('planit_user');
}

export function isLoggedIn() {
  return !!getToken();
}

function headers() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function register(name, email, password) {
  const res = await fetch(`${API}/api/register`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  saveAuth(data.token, data.user);
  return data;
}

export async function login(email, password) {
  const res = await fetch(`${API}/api/login`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  saveAuth(data.token, data.user);
  return data;
}

// ============================================
// Todo API
// ============================================

export async function fetchTodos(date) {
  const query = date ? `?date=${date}` : '';
  const res = await fetch(`${API}/api/todos${query}`, { headers: headers() });
  if (!res.ok) {
    if (res.status === 401) { clearAuth(); window.location.reload(); }
    throw new Error('Failed to fetch todos');
  }
  return res.json();
}

export async function createTodo(todo) {
  const res = await fetch(`${API}/api/todos`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(todo),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create todo');
  return data;
}

export async function updateTodo(id, updates) {
  const res = await fetch(`${API}/api/todos/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update todo');
  return data;
}

export async function deleteTodo(id) {
  const res = await fetch(`${API}/api/todos/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok) throw new Error('Failed to delete todo');
  return res.json();
}
