import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "./App";
import Layout from "./layout/Layout";
import ProjectPage from "./pages/ProjectsPage";
import CreateProjectPage from "./pages/CreateProjectPage";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<App />} />

          <Route path="/projects" element={<ProjectPage />} />
          <Route path="/projects/new" element={<CreateProjectPage />} />
          <Route path="/projects/:projectId" element={<ProjectPage />} />

          <Route path="/settings" element={<div>Configuracion</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
