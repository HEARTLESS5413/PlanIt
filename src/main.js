// ============================================
// PlanIt — Main Application Entry Point
// ============================================

import './style.css';
import {
  isLoggedIn, getUser, clearAuth,
  login, register,
  fetchTodos, createTodo, updateTodo, deleteTodo,
} from './api.js';
import { requestNotificationPermission, checkReminders } from './reminders.js';

// ============================================
// State
// ============================================
let currentView = 'today';
let selectedDate = todayStr();
let weekOffset = 0;
let allTodos = [];
let reminderInterval = null;

// ============================================
// Helpers
// ============================================
function todayStr() {
  return localDateStr(new Date());
}

function localDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLong(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function getGreeting(name) {
  const hour = new Date().getHours();
  let greeting;
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  else greeting = 'Good evening';
  return `${greeting}, ${name} 👋`;
}

// ============================================
// Page Navigation
// ============================================
function showPage(page) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.getElementById(page).classList.add('active');
}

function initApp() {
  if (isLoggedIn()) {
    showPage('app-page');
    const user = getUser();
    document.getElementById('greeting').textContent = getGreeting(user.name);
    document.getElementById('date-display').textContent = formatDateLong(todayStr());
    requestNotificationPermission();
    renderDateBar();
    loadTodos();
    startReminderPolling();
  } else {
    showPage('auth-page');
  }
}

// ============================================
// Auth Handlers
// ============================================
function setupAuth() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegisterLink = document.getElementById('show-register');
  const showLoginLink = document.getElementById('show-login');
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');

  showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
  });

  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
  });

  loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!email || !password) {
      errorEl.textContent = 'Please fill in all fields';
      errorEl.classList.remove('hidden');
      return;
    }

    loginBtn.classList.add('loading');
    loginBtn.textContent = '';
    try {
      await login(email, password);
      initApp();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    } finally {
      loginBtn.classList.remove('loading');
      loginBtn.textContent = 'Sign In';
    }
  });

  registerBtn.addEventListener('click', async () => {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const errorEl = document.getElementById('register-error');

    if (!name || !email || !password) {
      errorEl.textContent = 'Please fill in all fields';
      errorEl.classList.remove('hidden');
      return;
    }

    registerBtn.classList.add('loading');
    registerBtn.textContent = '';
    try {
      await register(name, email, password);
      initApp();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    } finally {
      registerBtn.classList.remove('loading');
      registerBtn.textContent = 'Create Account';
    }
  });

  // Enter key support
  document.getElementById('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });
  document.getElementById('register-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') registerBtn.click();
  });
}

// ============================================
// Logout
// ============================================
function setupLogout() {
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearAuth();
    stopReminderPolling();
    showPage('auth-page');
    // Reset login form
    document.getElementById('login-form').classList.add('active');
    document.getElementById('register-form').classList.remove('active');
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').classList.add('hidden');
  });
}

// ============================================
// Theme Toggle
// ============================================
function setupTheme() {
  const saved = localStorage.getItem('planit_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeLabel(saved);

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('planit_theme', next);
    updateThemeLabel(next);
  });
}

function updateThemeLabel(theme) {
  const label = document.querySelector('.theme-label');
  if (label) label.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
}

// ============================================
// Sidebar Navigation
// ============================================
function setupSidebar() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      navItems.forEach((n) => n.classList.remove('active'));
      item.classList.add('active');
      currentView = item.dataset.view;

      if (currentView === 'today') {
        selectedDate = todayStr();
        weekOffset = 0;
        renderDateBar();
      }

      loadTodos();
    });
  });

  // Mobile menu
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Close sidebar on outside click (mobile)
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('menu-toggle');
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

// ============================================
// Date Bar
// ============================================
function renderDateBar() {
  const container = document.getElementById('date-list');
  container.innerHTML = '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + weekOffset * 7);

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = localDateStr(d);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();

    const isToday = dateStr === todayStr();
    const isActive = dateStr === selectedDate;

    const item = document.createElement('div');
    item.className = `date-item${isActive ? ' active' : ''}${isToday ? ' today' : ''}`;
    item.innerHTML = `<span class="date-day">${dayName}</span><span class="date-num">${dayNum}</span>`;
    item.addEventListener('click', () => {
      selectedDate = dateStr;
      document.getElementById('date-display').textContent = formatDateLong(dateStr);
      renderDateBar();
      loadTodos();
    });

    container.appendChild(item);
  }
}

function setupDateNav() {
  document.getElementById('date-prev').addEventListener('click', () => {
    weekOffset--;
    renderDateBar();
  });
  document.getElementById('date-next').addEventListener('click', () => {
    weekOffset++;
    renderDateBar();
  });
}

// ============================================
// Todo CRUD
// ============================================
async function loadTodos() {
  try {
    if (currentView === 'all') {
      allTodos = await fetchTodos();
    } else {
      allTodos = await fetchTodos(selectedDate);
    }
    renderTodos();
    updateStats();
  } catch (err) {
    console.error('Load todos error:', err);
  }
}

function renderTodos() {
  const list = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');

  list.innerHTML = '';

  if (allTodos.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Group: pending first, then completed
  const pending = allTodos.filter((t) => !t.completed);
  const completed = allTodos.filter((t) => t.completed);

  if (pending.length > 0) {
    if (completed.length > 0) {
      const label = document.createElement('div');
      label.className = 'task-section-label';
      label.textContent = `Pending — ${pending.length} task${pending.length !== 1 ? 's' : ''}`;
      list.appendChild(label);
    }
    pending.forEach((todo) => list.appendChild(createTaskCard(todo)));
  }

  if (completed.length > 0) {
    const label = document.createElement('div');
    label.className = 'task-section-label';
    label.textContent = `Completed — ${completed.length} task${completed.length !== 1 ? 's' : ''}`;
    list.appendChild(label);
    completed.forEach((todo) => list.appendChild(createTaskCard(todo)));
  }
}

function createTaskCard(todo) {
  const card = document.createElement('div');
  card.className = `task-card priority-${todo.priority}${todo.completed ? ' completed' : ''}`;
  card.dataset.id = todo.id;

  const checkSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  let metaHtml = '';
  if (todo.time || todo.priority) {
    metaHtml = '<div class="task-meta">';
    if (todo.time) {
      metaHtml += `<span class="task-time">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${formatTime12(todo.time)}
      </span>`;
    }
    metaHtml += `<span class="task-priority-badge ${todo.priority}">${todo.priority}</span>`;
    if (currentView === 'all' && todo.date) {
      const d = new Date(todo.date + 'T00:00:00');
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      metaHtml += `<span class="task-time">${dateLabel}</span>`;
    }
    metaHtml += '</div>';
  }

  card.innerHTML = `
    <div class="task-checkbox ${todo.completed ? 'checked' : ''}" data-id="${todo.id}">
      ${checkSvg}
    </div>
    <div class="task-info">
      <h4>${escapeHtml(todo.title)}</h4>
      ${todo.description ? `<p>${escapeHtml(todo.description)}</p>` : ''}
      ${metaHtml}
    </div>
    <button class="task-edit-btn" data-id="${todo.id}" title="Edit task">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
  `;

  // Checkbox toggle
  const checkbox = card.querySelector('.task-checkbox');
  checkbox.addEventListener('click', async (e) => {
    e.stopPropagation();
    const newCompleted = todo.completed ? 0 : 1;
    try {
      await updateTodo(todo.id, { ...todo, completed: newCompleted });
      if (newCompleted) {
        card.classList.add('just-completed');
        setTimeout(() => card.classList.remove('just-completed'), 500);
      }
      await loadTodos();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  });

  // Edit button
  const editBtn = card.querySelector('.task-edit-btn');
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openEditModal(todo);
  });

  return card;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function updateStats() {
  const total = allTodos.length;
  const done = allTodos.filter((t) => t.completed).length;
  document.getElementById('stats-done').textContent = done;
  document.getElementById('stats-total').textContent = total;
}

// ============================================
// Add Task Form
// ============================================
function setupAddTask() {
  const addBtn = document.getElementById('add-task-btn');
  const form = document.getElementById('add-task-form');
  const cancelBtn = document.getElementById('cancel-task-btn');
  const saveBtn = document.getElementById('save-task-btn');
  const dateInput = document.getElementById('task-date');

  addBtn.addEventListener('click', () => {
    addBtn.classList.add('hidden');
    form.classList.remove('hidden');
    dateInput.value = selectedDate;
    document.getElementById('task-title').focus();
  });

  cancelBtn.addEventListener('click', () => {
    form.classList.add('hidden');
    addBtn.classList.remove('hidden');
    resetAddForm();
  });

  saveBtn.addEventListener('click', async () => {
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-desc').value.trim();
    const time = document.getElementById('task-time').value;
    const priority = document.getElementById('task-priority').value;
    const date = dateInput.value || selectedDate;

    if (!title) {
      document.getElementById('task-title').focus();
      return;
    }

    saveBtn.classList.add('loading');
    try {
      await createTodo({ title, description, date, time, priority });
      resetAddForm();
      form.classList.add('hidden');
      addBtn.classList.remove('hidden');
      await loadTodos();
    } catch (err) {
      console.error('Create error:', err);
    } finally {
      saveBtn.classList.remove('loading');
    }
  });

  // Enter key in title
  document.getElementById('task-title').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveBtn.click();
    }
  });
}

function resetAddForm() {
  document.getElementById('task-title').value = '';
  document.getElementById('task-desc').value = '';
  document.getElementById('task-time').value = '';
  document.getElementById('task-priority').value = 'medium';
}

// ============================================
// Edit Modal
// ============================================
function setupEditModal() {
  const overlay = document.getElementById('edit-modal');
  const closeBtn = document.getElementById('close-modal');
  const updateBtn = document.getElementById('update-task-btn');
  const deleteBtn = document.getElementById('delete-task-btn');

  closeBtn.addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });

  updateBtn.addEventListener('click', async () => {
    const id = document.getElementById('edit-task-id').value;
    const title = document.getElementById('edit-title').value.trim();
    const description = document.getElementById('edit-desc').value.trim();
    const time = document.getElementById('edit-time').value;
    const priority = document.getElementById('edit-priority').value;
    const date = document.getElementById('edit-date').value;

    if (!title) return;

    updateBtn.classList.add('loading');
    try {
      const todo = allTodos.find((t) => t.id == id);
      await updateTodo(id, { ...todo, title, description, time, priority, date });
      overlay.classList.add('hidden');
      await loadTodos();
    } catch (err) {
      console.error('Update error:', err);
    } finally {
      updateBtn.classList.remove('loading');
    }
  });

  deleteBtn.addEventListener('click', async () => {
    const id = document.getElementById('edit-task-id').value;
    deleteBtn.classList.add('loading');
    try {
      await deleteTodo(id);
      overlay.classList.add('hidden');
      await loadTodos();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      deleteBtn.classList.remove('loading');
    }
  });

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
      overlay.classList.add('hidden');
    }
  });
}

function openEditModal(todo) {
  document.getElementById('edit-task-id').value = todo.id;
  document.getElementById('edit-title').value = todo.title;
  document.getElementById('edit-desc').value = todo.description || '';
  document.getElementById('edit-time').value = todo.time || '';
  document.getElementById('edit-priority').value = todo.priority || 'medium';
  document.getElementById('edit-date').value = todo.date;
  document.getElementById('edit-modal').classList.remove('hidden');
}

// ============================================
// Reminder Polling
// ============================================
function startReminderPolling() {
  stopReminderPolling();
  // Check every 30 seconds
  reminderInterval = setInterval(async () => {
    try {
      const todayTodos = await fetchTodos(todayStr());
      checkReminders(todayTodos);
    } catch (err) {
      // Silently fail
    }
  }, 30000);
}

function stopReminderPolling() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
}

// ============================================
// Boot
// ============================================
// ============================================
// Password Toggle
// ============================================
function setupPasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrapper = btn.closest('.password-wrapper');
      const input = wrapper.querySelector('input');
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.querySelector('.eye-open').style.display = isPassword ? 'none' : 'block';
      btn.querySelector('.eye-closed').style.display = isPassword ? 'block' : 'none';
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupTheme();
  setupAuth();
  setupLogout();
  setupSidebar();
  setupDateNav();
  setupAddTask();
  setupEditModal();
  setupPasswordToggles();
  initApp();
});
