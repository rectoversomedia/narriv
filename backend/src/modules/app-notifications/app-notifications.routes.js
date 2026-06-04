import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { getNotifications, markAsRead, markAllAsRead, streamNotifications } from "./app-notifications.controller.js";

const router = express.Router();

// SSE stream must not be blocked by normal rate limiters if they close connections
// We'll apply token verification
router.get("/stream", verifyToken, streamNotifications);

router.use(verifyToken);
router.get("/", getNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

export default router;
