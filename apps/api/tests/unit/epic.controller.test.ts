import {jest,describe,test,expect,beforeEach} from "@jest/globals";
import {patchWorkItemEpic} from "../../src/controllers/epic.controller.js";
import * as epicRepository from "../../src/repositories/epic.repository.js";

jest.mock("../../src/repositories/epic.repository.js");


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
                        id: "project-1",
                        itemId: "item-1"
                    },
                    body: {
                        epicId: "epic-1"
                    }
                };


                const res =createResponse();

                findEpicByIdMock
                    .mockResolvedValue({
                        id: "epic-1",
                        project_id: "project-1",
                        type: "EPIC",
                        title: "Epic 1",
                        description: null,
                        status: "TODO",
                        priority: "HIGH",
                        estimate: null,
                        position: 0,
                        sprint_id: null,
                        parent_id: null,
                        created_by: "user-1",
                        assignee_id: null,
                        due_date: null,
                        created_at: new Date(),
                        updated_at: new Date()
                    });


                assignWorkItemToEpicMock
                    .mockResolvedValue({
                        id: "item-1",
                        project_id: "project-1",
                        sprint_id: null,
                        parent_id: "epic-1",
                        created_by: "user-1",
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
                    "project-1",
                    "epic-1"
                );


                expect(
                    assignWorkItemToEpicMock
                ).toHaveBeenCalledWith(
                    "project-1",
                    "item-1",
                    "epic-1"
                );

                expect(res.status).toHaveBeenCalledWith(200);
            }
        );


        test("retorna 400 si la épica no pertenece al proyecto",async () => {
                const req: any = {
                    params: {
                        id: "project-1",
                        itemId: "item-1"
                    },

                    body: {
                        epicId: "epic-invalida"
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
                        id: "project-1",
                        itemId: "item-1"
                    },

                    body: {
                        epicId: null
                    }
                };


                const res = createResponse();


                assignWorkItemToEpicMock
                    .mockResolvedValue({
                        id: "item-1",
                        project_id: "project-1",
                        sprint_id: null,
                        parent_id: null,
                        created_by: "user-1",
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
                    "project-1",
                    "item-1",
                    null
                );

                expect(res.status).toHaveBeenCalledWith(200);
            }
        );


        test("retorna 404 si el Work Item no existe",async () => {

                const req: any = {
                    params: {
                        id: "project-1",
                        itemId: "item-inexistente"
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
    }
);