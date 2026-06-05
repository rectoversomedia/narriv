import { EventEmitter } from "events";

class AppEventEmitter extends EventEmitter {}

export const globalEvents = new AppEventEmitter();
export const notificationEvents = globalEvents;
// Increase limit if many clients connect
globalEvents.setMaxListeners(1000);
