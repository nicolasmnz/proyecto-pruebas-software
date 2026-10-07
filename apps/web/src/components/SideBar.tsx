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
}

type SideBarItem = SideBarLink | SideBarGroup;

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
          {items.map((item) =>
            "children" in item ? (
              <SideBarDropdown
                key={item.label}
                label={item.label}
                icon={item.icon}
                items={item.children}
                viewAllLabel={item.viewAllLabel}
                viewAllPath={item.viewAllPath}
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
    </aside>
  );
}

export default SideBar;
