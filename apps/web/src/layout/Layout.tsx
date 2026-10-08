import { Outlet, useNavigate } from "react-router-dom";
import { Settings, FolderClosed } from "lucide-react";

import SideBar from "../components/SideBar";
import Button from "../components/Button";
import "./Layout.css";

const recentProjects = [
  { label: "Kanban", path: "/projects/1" },
  { label: "Scrum", path: "/projects/2" },
  { label: "Product Roadmap", path: "/projects/3" },
];

const sideBarItems = [
  {
    label: "Proyectos",
    icon: FolderClosed,
    children: recentProjects,
    viewAllLabel: "Ver todos los proyectos",
    viewAllPath: "/projects",
  },
  {
    label: "Configuración",
    path: "/settings",
    icon: Settings,
  },
];

function Layout() {
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <SideBar items={sideBarItems}>
        <Button
          content="Nuevo proyecto"
          onClick={() => navigate("/projects/new")}
        />
      </SideBar>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
