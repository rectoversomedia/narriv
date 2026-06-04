import { EventEmitter } from "events";

class NotificationEmitter extends EventEmitter {}

export const notificationEvents = new NotificationEmitter();
// Increase limit if many clients connect
notificationEvents.setMaxListeners(1000);
