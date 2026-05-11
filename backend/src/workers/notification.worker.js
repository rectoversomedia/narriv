import { Worker } from "bullmq";
import connection from "../lib/redis.js";
import {
    notifyAssignmentChange,
    notifyDeadlineReminder,
    notifyEscalationChange,
    notifyNewHighRiskAlert,
} from "../modules/notifications/notification-dispatch.service.js";

function logStructured(level, event, payload = {}) {
    const entry = {
        level,
        event,
        worker: "notification-worker",
        timestamp: new Date().toISOString(),
        ...payload,
    };
    const line = JSON.stringify(entry);
    if (level === "error") {
        console.error(line);
    } else if (level === "warn") {
        console.warn(line);
    } else {
        console.log(line);
    }
}

async function dispatchByEvent(eventName, payload) {
    switch (eventName) {
        case "new_high_risk_alert":
            return notifyNewHighRiskAlert(payload);
        case "assignment_change":
            return notifyAssignmentChange(payload);
        case "escalation_change":
            return notifyEscalationChange(payload);
        case "deadline_reminder":
            return notifyDeadlineReminder(payload);
        default:
            throw new Error(`Unknown notification event: ${eventName}`);
    }
}

const notificationWorker = new Worker(
    "notifications",
    async (job) => {
        const { eventName, payload } = job.data || {};
        logStructured("info", "notification_job_started", { jobId: job.id, eventName });

        const result = await dispatchByEvent(eventName, payload);

        logStructured("info", "notification_job_completed", {
            jobId: job.id,
            eventName,
            delivered: result?.delivered || false,
            attemptsMade: job.attemptsMade,
        });

        return result;
    },
    {
        connection,
        concurrency: 5,
    }
);

notificationWorker.on("failed", (job, err) => {
    logStructured("error", "notification_job_failed", {
        jobId: job?.id,
        eventName: job?.data?.eventName,
        attemptsMade: job?.attemptsMade,
        error: err.message,
    });
});

notificationWorker.on("error", (err) => {
    if (err.code === "ECONNREFUSED") return;
    logStructured("error", "notification_worker_error", { error: err.message });
});

logStructured("info", "notification_worker_initialized", { queue: "notifications" });

export default notificationWorker;

