import {jest,describe,test,expect,beforeEach} from "@jest/globals";
import {patchWorkItemEpic} from "../../src/controllers/epic.controller.js";
import * as epicRepository from "../../src/repositories/epic.repository.js";

jest.mock("../../src/repositories/epic.repository.js");

const PROJECT_ID = "92000000-0000-0000-0000-000000000001";
const ITEM_ID = "92000000-0000-0000-0000-000000000002";
const EPIC_ID = "92000000-0000-0000-0000-000000000003";
const OTHER_EPIC_ID = "92000000-0000-0000-0000-000000000004";
const MISSING_ITEM_ID = "92000000-0000-0000-0000-000000000005";
const USER_ID = "92000000-0000-0000-0000-000000000006";


const findEpicByIdMock = epicRepository.findEpicById as jest.MockedFunction<typeof epicRepository.findEpicById>;

const assignWorkItemToEpicMock =epicRepository.assignWorkItemToEpic as jest.MockedFunction<typeof epicRepository.assignWorkItemToEpic>;

function createResponse() {
    const res: any = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
}


describe("patchWorkItemEpic",() => {

        beforeEach(() => {jest.clearAllMocks();});


        test("asigna correctamente un Work Item a una épica",async () => {
                const req: any = {
                    params: {
                        id: PROJECT_ID,
                        itemId: ITEM_ID
                    },
                    body: {
                        epicId: EPIC_ID
                    }
                };


                const res =createResponse();

                findEpicByIdMock
                    .mockResolvedValue({
                        id: EPIC_ID,
                        project_id: PROJECT_ID,
                        type: "EPIC",
                        title: "Epic 1",
                        description: null,
                        status: "TODO",
                        priority: "HIGH",
                        estimate: null,
                        position: 0,
                        sprint_id: null,
                        parent_id: null,
                        created_by: USER_ID,
                        assignee_id: null,
                        due_date: null,
                        created_at: new Date(),
                        updated_at: new Date()
                    });


                assignWorkItemToEpicMock
                    .mockResolvedValue({
                        id: ITEM_ID,
                        project_id: PROJECT_ID,
                        sprint_id: null,
                        parent_id: EPIC_ID,
                        created_by: USER_ID,
                        assignee_id: null,
                        type: "TASK",
                        title: "Tarea",
                        description: null,
                        status: "TODO",
                        priority: "MEDIUM",
                        estimate: null,
                        position: 0,
                        due_date: null,
                        created_at: new Date(),
                        updated_at: new Date()
                    });


                await patchWorkItemEpic(req,res);


                expect(
                    findEpicByIdMock
                ).toHaveBeenCalledWith(
                    PROJECT_ID,
                    EPIC_ID
                );


                expect(
                    assignWorkItemToEpicMock
                ).toHaveBeenCalledWith(
                    PROJECT_ID,
                    ITEM_ID,
                    EPIC_ID
                );

                expect(res.status).toHaveBeenCalledWith(200);
            }
        );


        test("retorna 400 si la épica no pertenece al proyecto",async () => {
                const req: any = {
                    params: {
                        id: PROJECT_ID,
                        itemId: ITEM_ID
                    },

                    body: {
                        epicId: OTHER_EPIC_ID
                    }
                };


                const res =createResponse();

                findEpicByIdMock
                    .mockResolvedValue(
                        undefined
                    );


                await patchWorkItemEpic(req,res);


                expect(res.status).toHaveBeenCalledWith(400);


                expect(assignWorkItemToEpicMock).not.toHaveBeenCalled();
            }
        );


        test("permite quitar un Work Item de una épica",async () => {
                const req: any = {
                    params: {
                        id: PROJECT_ID,
                        itemId: ITEM_ID
                    },

                    body: {
                        epicId: null
                    }
                };


                const res = createResponse();


                assignWorkItemToEpicMock
                    .mockResolvedValue({
                        id: ITEM_ID,
                        project_id: PROJECT_ID,
                        sprint_id: null,
                        parent_id: null,
                        created_by: USER_ID,
                        assignee_id: null,
                        type: "TASK",
                        title: "Tarea",
                        description: null,
                        status: "TODO",
                        priority: "MEDIUM",
                        estimate: null,
                        position: 0,
                        due_date: null,
                        created_at: new Date(),
                        updated_at: new Date()
                    });


                await patchWorkItemEpic(req,res);
                expect(findEpicByIdMock).not.toHaveBeenCalled();


                expect(
                    assignWorkItemToEpicMock
                ).toHaveBeenCalledWith(
                    PROJECT_ID,
                    ITEM_ID,
                    null
                );

                expect(res.status).toHaveBeenCalledWith(200);
            }
        );


        test("retorna 404 si el Work Item no existe",async () => {

                const req: any = {
                    params: {
                        id: PROJECT_ID,
                        itemId: MISSING_ITEM_ID
                    },

                    body: {
                        epicId: null
                    }
                };

                const res =createResponse();

                assignWorkItemToEpicMock
                    .mockResolvedValue(
                        undefined
                    );


                await patchWorkItemEpic(req,res);
                expect(res.status).toHaveBeenCalledWith(404);
            }
        );


        test("retorna 400 si epicId no es un UUID",async () => {

                const req: any = {
                    params: {
                        id: PROJECT_ID,
                        itemId: ITEM_ID
                    },

                    body: {
                        epicId: "abc"
                    }
                };

                const res =createResponse();

                await patchWorkItemEpic(req,res);

                expect(res.status).toHaveBeenCalledWith(400);

                expect(findEpicByIdMock).not.toHaveBeenCalled();

                expect(assignWorkItemToEpicMock).not.toHaveBeenCalled();
            }
        );
    }
);
