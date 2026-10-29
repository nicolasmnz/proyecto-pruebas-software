import { Router } from "express";

import {
    getUsers,
    getUser,
    postUser,
    putUser,
    deleteUser
} from "../controllers/user.controller.js";
import { getAssignedWorkItems } from "../controllers/workitem.controller.js";

const router = Router();

router.get("/", getUsers);

router.get("/:id", getUser);

router.get("/:id/work-items", getAssignedWorkItems);

router.post("/", postUser);

router.put("/:id", putUser);

router.delete("/:id", deleteUser);

export default router;