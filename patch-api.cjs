const fs = require('fs');
const file = 'C:\\\\MyProject\\\\narriv\\\\frontend\\\\lib\\\\api-service.ts';
let content = fs.readFileSync(file, 'utf8');

const newCode = `
// Notifications API
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  data: AppNotification[];
  meta: {
    page: number;
    limit: number;
    total: number;
    unreadCount: number;
    totalPages: number;
  };
}

export async function getNotifications(page = 1, limit = 20): Promise<NotificationsResponse | null> {
  try {
    return await apiClient<NotificationsResponse>(\`/api/notifications?page=\${page}&limit=\${limit}\`);
  } catch {
    return null;
  }
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    const res = await apiClient<{ success: boolean }>(\`/api/notifications/\${id}/read\`, { method: "PATCH" });
    return res.success;
  } catch {
    return false;
  }
}

export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const res = await apiClient<{ success: boolean }>("/api/notifications/read-all", { method: "PATCH" });
    return res.success;
  } catch {
    return false;
  }
}
`;

content += '\n' + newCode;
fs.writeFileSync(file, content);
console.log('Added exports');