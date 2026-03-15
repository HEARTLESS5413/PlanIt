// ============================================
// Reminder System — Browser Notifications
// ============================================

let notifiedIds = new Set();

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function checkReminders(todos) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentDate = now.toISOString().split('T')[0];

  todos.forEach((todo) => {
    if (
      todo.time &&
      todo.date === currentDate &&
      todo.time === currentTime &&
      !todo.completed &&
      !notifiedIds.has(todo.id)
    ) {
      notifiedIds.add(todo.id);
      showNotification(todo);
    }
  });
}

function showNotification(todo) {
  const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };

  new Notification(`${priorityEmoji[todo.priority] || '📋'} PlanIt Reminder`, {
    body: `${todo.title}${todo.description ? '\n' + todo.description : ''}`,
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" rx="12" fill="%236366f1"/><path d="M15 24L21 30L33 18" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    tag: `planit-${todo.id}`,
    requireInteraction: true,
  });
}

// Clear old notified IDs at midnight
export function resetNotifications() {
  notifiedIds.clear();
}
