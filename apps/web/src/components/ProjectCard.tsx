import "./ProjectCard.css";

interface Project {
  name: string;
  description: string;
  image: string;
}
//   const projects = [
//     { name: "Kanban", description: "", image: "" },
//     { name: "Scrum", description: "", image: "" },
//     { name: "Product Roadmap", description: "", image: "" },
//   ];

function ProjectCard({ name, description, image }: Project) {
  return (
    <article className="card">
      <img alt={name} src={image} />
      <section className="card-body">
        <h3 className="name">{name}</h3>
        <p className="description">{description}</p>
      </section>
    </article>
  );
}

export default ProjectCard;
