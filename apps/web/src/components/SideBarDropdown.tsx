import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface DropdownLink {
  label: string;
  path: string;
}

interface SideBarDropdownProps {
  label: string;
  icon: LucideIcon;
  items: DropdownLink[];
  viewAllLabel: string;
  viewAllPath: string;
  maxItems?: number;
  defaultOpen?: boolean;
}

function SideBarDropdown({
  label,
  icon: Icon,
  items,
  viewAllLabel,
  viewAllPath,
  maxItems = 3,
  defaultOpen = true,
}: SideBarDropdownProps) {
  const { pathname } = useLocation();
  // null = el usuario aún no la abrió ni cerró a mano
  const [toggledOpen, setToggledOpen] = useState<boolean | null>(null);

  const visibleItems = items.slice(0, maxItems);
  const containsCurrentPage =
    pathname === viewAllPath ||
    visibleItems.some((item) => item.path === pathname);

  // Se abre sola si contiene la página actual, para que se vea el enlace activo
  const open = toggledOpen ?? (defaultOpen || containsCurrentPage);

  return (
    <li>
      <button
        type="button"
        className="sidebar-dropdown-trigger"
        aria-expanded={open}
        onClick={() => setToggledOpen(!open)}
      >
        <Icon size={18} aria-hidden="true" />
        <span>{label}</span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {open && (
        <ul className="sidebar-submenu">
          {visibleItems.map((item) => (
            <li key={item.path}>
              <NavLink to={item.path} end>
                <span className="sidebar-link-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
          <li>
            <NavLink to={viewAllPath} className="view-all" end>
              {viewAllLabel}
            </NavLink>
          </li>
        </ul>
      )}
    </li>
  );
}

export default SideBarDropdown;
