import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
    listCases,
    getCase,
    createCase,
    updateCase,
    deleteCase,
} from "./cases.controller.js";
import {
    casesQuerySchema,
    createCaseBodySchema,
    updateCaseParamsSchema,
    updateCaseBodySchema,
    deleteCaseParamsSchema,
} from "./cases.schema.js";

const router = express.Router();
router.use(verifyToken);

router.get("/", validateRequest({ query: casesQuerySchema }), listCases);
router.get("/:id", validateRequest({ params: updateCaseParamsSchema, query: casesQuerySchema }), getCase);
router.post("/", validateRequest({ body: createCaseBodySchema }), createCase);
router.patch(
    "/:id",
    validateRequest({ params: updateCaseParamsSchema, body: updateCaseBodySchema }),
    updateCase
);
router.delete(
    "/:id",
    validateRequest({ params: deleteCaseParamsSchema, query: casesQuerySchema }),
    deleteCase
);

export default router;
