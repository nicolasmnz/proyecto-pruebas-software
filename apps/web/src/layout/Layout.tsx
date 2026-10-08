import { useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Archive, Settings, FolderClosed, Menu, X } from "lucide-react";

import SideBar from "../components/SideBar";
import Button from "../components/Button";
import { useProjects } from "../context/projectsContext";
import "./Layout.css";

function Layout() {
  const navigate = useNavigate();
  const { projects, archivedProjects } = useProjects();
  // Solo tiene efecto en pantallas pequeñas, donde la barra lateral se oculta
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // La API devuelve los proyectos ordenados del más reciente al más antiguo
  const toLink = (project: { id: string; name: string }) => ({
    label: project.name,
    path: `/projects/${project.id}`,
  });

  const sideBarItems = [
    {
      label: "Proyectos",
      icon: FolderClosed,
      children: projects.map(toLink),
      viewAllLabel: "Ver todos los proyectos",
      viewAllPath: "/projects",
    },
    {
      label: "Archivados",
      icon: Archive,
      children: archivedProjects.map(toLink),
      viewAllLabel: "Ver todos los archivados",
      viewAllPath: "/projects/archived",
      defaultOpen: false,
    },
    {
      label: "Configuración",
      path: "/settings",
      icon: Settings,
    },
  ];

  function closeMenuOnNavigation(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("a")) {
      setIsMenuOpen(false);
    }
  }

  function closeMenuOnEscape(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      setIsMenuOpen(false);
    }
  }

  return (
    <div className="app-layout" onKeyDown={closeMenuOnEscape}>
      <header className="topbar">
        <button
          type="button"
          className="topbar-menu"
          aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isMenuOpen}
          aria-controls="app-sidebar"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? (
            <X size={20} aria-hidden="true" />
          ) : (
            <Menu size={20} aria-hidden="true" />
          )}
        </button>
        <span className="topbar-brand">Mira</span>
      </header>

      <div
        id="app-sidebar"
        className={
          isMenuOpen ? "sidebar-container is-open" : "sidebar-container"
        }
        onClick={closeMenuOnNavigation}
      >
        <SideBar items={sideBarItems}>
          <Button
            content="Nuevo proyecto"
            onClick={() => {
              setIsMenuOpen(false);
              navigate("/projects/new");
            }}
          />
        </SideBar>
      </div>

      {isMenuOpen && (
        <div
          className="sidebar-backdrop"
          aria-hidden="true"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
