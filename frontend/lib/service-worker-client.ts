// Check if service workers are supported
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[SW] Service Worker registered:', registration.scope);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content available
            showUpdateNotification();
          }
        });
      });
    } catch (error) {
      console.error('[SW] Registration failed:', error);
    }
  });

  // Handle controller change (new SW activated)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[SW] Controller changed, reloading...');
    window.location.reload();
  });
}

// Show update notification to user
function showUpdateNotification() {
  // Dispatch custom event that components can listen to
  window.dispatchEvent(
    new CustomEvent('narriv:service-worker-update', {
      detail: {
        message: 'New version available! Refresh to update.',
      },
    })
  );
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('[Notifications] Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Show local notification
export function showNotification(title: string, options?: NotificationOptions) {
  if (Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        ...options,
      });
    });
  }
}
