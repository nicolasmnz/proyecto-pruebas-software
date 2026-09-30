import { Link } from "react-router-dom";

import "./SideBar.css";

interface SideBarItem {
  label: string;
  path: string;
}

interface SideBarProps {
  items: SideBarItem[];
}

function SideBar({ items }: SideBarProps) {
  return (
    <aside className="sidebar">
      <ul>
        {items.map((item) => (
          <li key={item.path}>
            <Link to={item.path}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default SideBar;
