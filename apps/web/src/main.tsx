import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import Layout from "./layout/Layout";
import RequireAuth from "./layout/RequireAuth";
import AuthProvider from "./context/AuthProvider";
import ProjectsProvider from "./context/ProjectsProvider";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import BoardPage from "./pages/BoardPage";
import EpicsPage from "./pages/EpicsPage";
import SprintsPage from "./pages/SprintsPage";
import CreateProjectPage from "./pages/CreateProjectPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import MyTasksPage from "./pages/MyTasksPage";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProjectsProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="/projects" replace />} />

              <Route path="/my-tasks" element={<MyTasksPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/new" element={<CreateProjectPage />} />
              <Route
                path="/projects/archived"
                element={<ProjectsPage archived />}
              />
              <Route
                path="/projects/:projectId"
                element={<ProjectDetailPage />}
              />
              <Route
                path="/projects/:projectId/board"
                element={<BoardPage />}
              />
              <Route
                path="/projects/:projectId/epics"
                element={<EpicsPage />}
              />
              <Route
                path="/projects/:projectId/sprints"
                element={<SprintsPage />}
              />
              <Route
                path="/projects/:projectId/dashboard"
                element={<DashboardPage />}
              />

              <Route path="/settings" element={<div>Configuracion</div>} />
            </Route>
          </Routes>
        </ProjectsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
