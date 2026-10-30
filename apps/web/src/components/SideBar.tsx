import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

import SideBarDropdown from "./SideBarDropdown";
import "./SideBar.css";

interface SideBarLink {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface SideBarGroup {
  label: string;
  icon: LucideIcon;
  children: { label: string; path: string }[];
  viewAllLabel: string;
  viewAllPath: string;
  defaultOpen?: boolean;
}

type SideBarItem = SideBarLink | SideBarGroup;

interface SideBarProps {
  items: SideBarItem[];
  children?: ReactNode;
  // Contenido al pie de la barra (usuario conectado y cierre de sesión)
  footer?: ReactNode;
}

function SideBar({ items, children, footer }: SideBarProps) {
  return (
    <aside className="sidebar">
      {children && <div className="sidebar-action">{children}</div>}
      <nav aria-label="Navegación principal">
        <ul>
          {items.map((item) =>
            "children" in item ? (
              <SideBarDropdown
                key={item.label}
                label={item.label}
                icon={item.icon}
                items={item.children}
                viewAllLabel={item.viewAllLabel}
                viewAllPath={item.viewAllPath}
                defaultOpen={item.defaultOpen}
              />
            ) : (
              <li key={item.path}>
                <NavLink to={item.path}>
                  <item.icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ),
          )}
        </ul>
      </nav>
      {footer && <div className="sidebar-footer">{footer}</div>}
    </aside>
  );
}

export default SideBar;
