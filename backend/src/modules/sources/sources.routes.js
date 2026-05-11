import express from "express";
import { createSource, deleteSource, getSources, updateSource } from "./sources.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
    createSourceBodySchema,
    updateSourceBodySchema,
    updateSourceParamsSchema,
} from "./sources.schema.js";

const router = express.Router();

router.get("/", verifyToken, getSources);
router.post("/", verifyToken, validateRequest({ body: createSourceBodySchema }), createSource);
router.patch(
    "/:sourceId",
    verifyToken,
    validateRequest({ params: updateSourceParamsSchema, body: updateSourceBodySchema }),
    updateSource
);
router.delete("/:sourceId", verifyToken, deleteSource);

export default router;
