import {jest,describe,test,expect,beforeEach} from "@jest/globals";
import {postSprint,patchWorkItemSprint} from "../../src/controllers/sprint.controller.js";

import * as sprintRepository from "../../src/repositories/sprint.repository.js";
import * as projectRepository from "../../src/repositories/project.repository.js";


jest.mock("../../src/repositories/sprint.repository.js");
jest.mock("../../src/repositories/project.repository.js");

const PROJECT_ID = "93000000-0000-0000-0000-000000000001";
const ITEM_ID = "93000000-0000-0000-0000-000000000002";
const SPRINT_ID = "93000000-0000-0000-0000-000000000003";
const OTHER_SPRINT_ID = "93000000-0000-0000-0000-000000000004";
const USER_ID = "93000000-0000-0000-0000-000000000005";


const findProjectByIdMock = projectRepository.findProjectById as jest.MockedFunction<typeof projectRepository.findProjectById>;
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
                    params: {id: PROJECT_ID},

                    body: {
                        name: "Sprint 1",
                        goal: "Implementar épicas",
                        startDate: "2026-11-01",
                        endDate: "2026-11-14"
                    }
                };

                const res =createResponse();
                findProjectByIdMock
                    .mockResolvedValue({
                        id: PROJECT_ID,
                        name: "Proyecto",
                        description: null,
                        created_by: USER_ID,
                        is_archived: false,
                        created_at: new Date(),
                        updated_at: new Date()
                    });
                createSprintMock
                    .mockResolvedValue({
                        id: SPRINT_ID,
                        project_id: PROJECT_ID,
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
                    params: {id: PROJECT_ID},
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
                    params: {id: PROJECT_ID},

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
                        id: PROJECT_ID,
                        itemId: ITEM_ID
                    },

                    body: {
                        sprintId: SPRINT_ID
                    }
                };

                const res =createResponse();

                findSprintByIdMock
                    .mockResolvedValue({
                        id: SPRINT_ID,
                        project_id: PROJECT_ID,
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
                        id: ITEM_ID,
                        project_id: PROJECT_ID,
                        sprint_id: SPRINT_ID,
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


                await patchWorkItemSprint(req,res);
                expect(res.status).toHaveBeenCalledWith(200);

                expect(
                    findSprintByIdMock
                ).toHaveBeenCalledWith(
                    PROJECT_ID,
                    SPRINT_ID
                );

                expect(
                    assignWorkItemToSprintMock
                ).toHaveBeenCalledWith(
                    PROJECT_ID,
                    ITEM_ID,
                    SPRINT_ID
                );
            }
        );


        test("rechaza Sprint perteneciente a otro proyecto",async () => {
                const req: any = {
                    params: {
                        id: PROJECT_ID,
                        itemId: ITEM_ID
                    },

                    body: {
                        sprintId: OTHER_SPRINT_ID
                    }
                };

                const res = createResponse();
                findSprintByIdMock.mockResolvedValue(undefined);
                await patchWorkItemSprint(req,res);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(assignWorkItemToSprintMock).not.toHaveBeenCalled();
            }
        );


        test("rechaza un sprintId que no es UUID sin consultar la base",async () => {
                const req: any = {
                    params: {
                        id: PROJECT_ID,
                        itemId: ITEM_ID
                    },

                    body: {
                        sprintId: "abc"
                    }
                };

                const res = createResponse();
                await patchWorkItemSprint(req,res);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(findSprintByIdMock).not.toHaveBeenCalled();
                expect(assignWorkItemToSprintMock).not.toHaveBeenCalled();
            }
        );
    }
);
