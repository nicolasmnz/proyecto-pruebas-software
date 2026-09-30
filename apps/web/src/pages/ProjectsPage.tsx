import SideBar from "../components/SideBar";

import "./ProjectPage.css";

const sideBarItems = [
  { label: "Proyecto pruebas de software", path: "./" },
  { label: "FESW - App", path: "./" },
];

function ProjectsPage() {
  return (
    <div className="app-layout">
      <SideBar items={sideBarItems} />
    </div>
  );
}

export default ProjectsPage;
