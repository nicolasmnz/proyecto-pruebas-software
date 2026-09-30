import ProjectCard from "../components/ProjectCard";

import "./CreateProjectPage.css";

const projects = [
  { name: "Kanban", description: "", image: "" },
  { name: "Scrum", description: "", image: "" },
  { name: "Product Roadmap", description: "", image: "" },
];

function CreateProjectPage() {
  return (
    <main>
      {projects.map((p) => (
        <ProjectCard
          key={p.name}
          name={p.name}
          description={p.description}
          image={p.image}
        />
      ))}
    </main>
  );
}

export default CreateProjectPage;
