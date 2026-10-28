import { Router } from "express";
import { getEpics, getEpic, postEpic, putEpic, deleteEpic } from "../controllers/epic.controller.js";

const router = Router({
    mergeParams: true
});

router.get(
    "/",
    getEpics
);

router.get(
    "/:epicId",
    getEpic
);

router.post(
    "/",
    postEpic
);

router.put(
    "/:epicId",
    putEpic
);

router.delete(
    "/:epicId",
    deleteEpic
);

export default router;