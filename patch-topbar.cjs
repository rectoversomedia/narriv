const fs = require('fs');
const file = 'C:\\\\MyProject\\\\narriv\\\\frontend\\\\components\\\\layout\\\\Topbar.tsx';

let content = fs.readFileSync(file, 'utf8');

// 1. Add imports
content = content.replace(
  'import { logoutSession } from "@/lib/api-service";',
  `import { logoutSession, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, type AppNotification } from "@/lib/api-service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";`
);

// 2. Add EventSource and Queries inside Topbar
const newLogic = `
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(1, 50),
    staleTime: 60 * 1000,
  });

  const markAllRead = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  useEffect(() => {
    if (!token) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const sse = new EventSource(\`\${baseUrl}/api/notifications/stream?token=\${token}\`);
    
    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_notification") {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      } catch (e) {}
    };

    return () => {
      sse.close();
    };
  }, [token, queryClient]);

  const notifData = notificationsQuery.data?.data || [];
  const unreadCount = notificationsQuery.data?.meta?.unreadCount || 0;
`;

content = content.replace('const notifications = alerts.slice(0, 3);', newLogic);

// 3. Update the Bell trigger count
content = content.replace('{notifications.length}</span>\n            </PopoverTrigger>', '{unreadCount > 0 ? unreadCount : ""}</span>\n            </PopoverTrigger>');

// 4. Update the PopoverHeader texts
content = content.replace('{notifications.length} alert terbaru membutuhkan perhatian.', '{unreadCount} notifikasi baru.');

// Add "Tandai semua dibaca" button
content = content.replace(
  '<Badge variant="purple" className="rounded-full px-2.5 py-1 text-[11px] font-black">Live</Badge>',
  '<button onClick={() => markAllRead.mutate()} className="text-[11px] font-bold text-[#465FFF] hover:underline">Tandai semua dibaca</button>'
);

// 5. Update the mapping
const mapReplacement = `
                {notifData.length === 0 ? (
                  <div className="py-8 text-center text-sm font-semibold text-slate-400">Belum ada notifikasi</div>
                ) : notifData.map((notification: AppNotification) => {
                  const tone = notification.type === "alert_created" ? "red" : notification.type === "report_ready" ? "green" : "blue";
                  const badgeText = notification.type === "alert_created" ? "Alert" : "Info";
                  return (
                  <Link
                    key={notification.id}
                    href={notification.link || "#"}
                    onClick={() => {
                      if (!notification.isRead) markRead.mutate(notification.id);
                      setNotificationsOpen(false);
                    }}
                    className={\`group grid grid-cols-[10px_1fr_auto] gap-3 rounded-[14px] p-3 transition hover:bg-slate-50 \${notification.isRead ? 'opacity-60' : ''}\`}
                  >
                    <span className={\`mt-2 h-2.5 w-2.5 rounded-full \${notificationToneClass[tone as keyof typeof notificationToneClass]}\`} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-950 group-hover:text-[#465FFF]">{notification.title}</span>
                      <span className="mt-1 block text-xs font-semibold text-slate-500 line-clamp-2">{notification.message}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <Badge variant={tone as any} className="rounded-full text-[10px] font-black">
                        {badgeText}
                      </Badge>
                      <span className="mt-2 block text-[11px] font-bold text-slate-400">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: language === "id" ? idLocale : undefined })}
                      </span>
                    </span>
                  </Link>
                )})}
`;

// Replace the old map loop
content = content.replace(/\{notifications\.map\(\(notification\) => \([\s\S]*?\)\)\}/, mapReplacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Topbar patched successfully');
