import {Router} from "express";

import {getSprints, getSprint, postSprint, putSprint, removeSprint } from "../controllers/sprint.controller.js";

const router = Router({
    mergeParams: true
});

router.get("/",getSprints);
router.get("/:sprintId",getSprint);
router.post("/",postSprint);
router.put("/:sprintId",putSprint);
router.delete("/:sprintId",removeSprint);

export default router;