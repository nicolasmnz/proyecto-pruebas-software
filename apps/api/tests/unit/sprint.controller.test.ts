import {jest,describe,test,expect,beforeEach} from "@jest/globals";
import {postSprint,patchWorkItemSprint} from "../../src/controllers/sprint.controller.js";

import * as sprintRepository from "../../src/repositories/sprint.repository.js";


jest.mock("../../src/repositories/sprint.repository.js");


const createSprintMock =sprintRepository.createSprint as jest.MockedFunction<typeof sprintRepository.createSprint>;
const findSprintByIdMock =sprintRepository.findSprintById as jest.MockedFunction<typeof sprintRepository.findSprintById>;
const assignWorkItemToSprintMock =sprintRepository.assignWorkItemToSprint as jest.MockedFunction<typeof sprintRepository.assignWorkItemToSprint>;

function createResponse() {

    const res: any = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
}


describe(
    "Sprint Controller",
    () => {
        beforeEach(() => {jest.clearAllMocks();});

        test("crea un sprint válido",async () => {

                const req: any = {
                    params: {id: "project-1"},

                    body: {
                        name: "Sprint 1",
                        goal: "Implementar épicas",
                        startDate: "2026-11-01",
                        endDate: "2026-11-14"
                    }
                };

                const res =createResponse();
                createSprintMock
                    .mockResolvedValue({
                        id: "sprint-1",
                        project_id: "project-1",
                        name: "Sprint 1",
                        goal: "Implementar épicas",
                        status: "PLANNED",
                        start_date: "2026-11-01",
                        end_date: "2026-11-14",
                        created_at: new Date(),
                        updated_at: new Date()
                    });


                await postSprint(req,res);
                expect(res.status).toHaveBeenCalledWith(201);
                expect(createSprintMock).toHaveBeenCalled();
            }
        );


        test("rechaza sprint sin nombre",async () => {
                const req: any = {
                    params: {id: "project-1"},
                    body: {}
                };


                const res =createResponse();
                await postSprint(req,res);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(createSprintMock).not.toHaveBeenCalled();
            }
        );


        test("rechaza fecha de término anterior al inicio",async () => {

                const req: any = {
                    params: {id: "project-1"},

                    body: {
                        name: "Sprint inválido",
                        startDate: "2026-11-14",
                        endDate: "2026-11-01"
                    }
                };


                const res =createResponse();
                await postSprint(req,res);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(createSprintMock).not.toHaveBeenCalled();
            }
        );


        test("asigna Work Item a Sprint del mismo proyecto",async () => {
                const req: any = {

                    params: {
                        id: "project-1",
                        itemId: "item-1"
                    },

                    body: {
                        sprintId: "sprint-1"
                    }
                };

                const res =createResponse();

                findSprintByIdMock
                    .mockResolvedValue({
                        id: "sprint-1",
                        project_id: "project-1",
                        name: "Sprint 1",
                        goal: null,
                        status: "PLANNED",
                        start_date: null,
                        end_date: null,
                        created_at: new Date(),
                        updated_at: new Date()
                    });


                assignWorkItemToSprintMock
                    .mockResolvedValue({
                        id: "item-1",
                        project_id: "project-1",
                        sprint_id: "sprint-1",
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


                await patchWorkItemSprint(req,res);
                expect(res.status).toHaveBeenCalledWith(200);

                expect(
                    findSprintByIdMock
                ).toHaveBeenCalledWith(
                    "project-1",
                    "sprint-1"
                );

                expect(
                    assignWorkItemToSprintMock
                ).toHaveBeenCalledWith(
                    "project-1",
                    "item-1",
                    "sprint-1"
                );
            }
        );


        test("rechaza Sprint perteneciente a otro proyecto",async () => {
                const req: any = {
                    params: {
                        id: "project-1",
                        itemId: "item-1"
                    },

                    body: {
                        sprintId: "sprint-otro"
                    }
                };

                const res = createResponse();
                findSprintByIdMock.mockResolvedValue(undefined);
                await patchWorkItemSprint(req,res);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(assignWorkItemToSprintMock).not.toHaveBeenCalled();
            }
        );
    }
);