import SideBar from "./components/SideBar";
import { useNavigate } from "react-router-dom";
import { Settings, FolderClosed } from "lucide-react";
import Button from "./components/Button";
import "./App.css";

const sideBarItems = [
  { label: "Proyectos", path: "/ProjectPage", icon: FolderClosed },
  { label: "Configuración", path: "/settings", icon: Settings },
];

function App() {
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <SideBar items={sideBarItems}>
        <Button
          content="Nuevo proyecto"
          onClick={() => navigate("/CreateProjectPage")}
        />
      </SideBar>
      <main>
        <a>HOLA</a>
      </main>
    </div>
  );
}

export default App;
