import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

import "./SideBar.css";

interface SideBarItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface SideBarProps {
  items: SideBarItem[];
  children?: ReactNode;
}

function SideBar({ items, children }: SideBarProps) {
  return (
    <aside className="sidebar">
      {children && <div className="sidebar-action">{children}</div>}
      <nav aria-label="Navegación principal">
        <ul>
          {items.map(({ label, path, icon: Icon }) => (
            <li key={path}>
              <NavLink to={path}>
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default SideBar;
