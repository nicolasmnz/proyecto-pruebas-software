import { useState } from "react";
import { NavLink } from "react-router-dom";
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
}

function SideBarDropdown({
  label,
  icon: Icon,
  items,
  viewAllLabel,
  viewAllPath,
  maxItems = 3,
}: SideBarDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <li>
      <button
        type="button"
        className="sidebar-dropdown-trigger"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Icon size={18} aria-hidden="true" />
        <span>{label}</span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {open && (
        <ul className="sidebar-submenu">
          {items.slice(0, maxItems).map((item) => (
            <li key={item.path}>
              <NavLink to={item.path}>{item.label}</NavLink>
            </li>
          ))}
          <li>
            <NavLink to={viewAllPath} className="view-all">
              {viewAllLabel}
            </NavLink>
          </li>
        </ul>
      )}
    </li>
  );
}

export default SideBarDropdown;
