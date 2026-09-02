import express from "express";
import { verifyTokenSSE } from "../../middlewares/auth.middleware.js";
import { getNotifications, markAsRead, markAllAsRead, streamNotifications } from "./app-notifications.controller.js";
import { wrapAsync } from "../../lib/sentry.js";

const router = express.Router();

// SSE stream must not be blocked by normal rate limiters if they close connections
// We'll apply token verification
router.get("/stream", verifyTokenSSE, wrapAsync(streamNotifications));

router.use(verifyToken);
router.get("/", wrapAsync(getNotifications));
router.patch("/read-all", wrapAsync(markAllAsRead));
router.patch("/:id/read", wrapAsync(markAsRead));

export default router;
