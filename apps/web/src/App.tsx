import SideBar from "./components/SideBar";

import "./App.css";

const sideBarItems = [
  { label: "Todos los proyectos", path: "/ProjectPage" },
  { label: "Crear proyecto", path: "/CreateProjectPage" },
  { label: "Configuración", path: "/settings" },
];

function App() {
  return (
    <div className="app-layout">
      <SideBar items={sideBarItems} />
      <main>
        <a>HOLA</a>
      </main>
    </div>
  );
}

export default App;
