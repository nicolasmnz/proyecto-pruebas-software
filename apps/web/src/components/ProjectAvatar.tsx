import type { CSSProperties } from "react";

import { getAvatarColor, getInitials } from "../utils/format";

import "./ProjectAvatar.css";

interface ProjectAvatarProps {
  id: string;
  name: string;
  size?: "sm" | "md" | "lg";
}

function ProjectAvatar({ id, name, size = "md" }: ProjectAvatarProps) {
  return (
    <span
      className={`project-avatar project-avatar-${size}`}
      // El color del proyecto se pasa como variable: el tema puede reemplazarlo
      style={{ "--avatar-color": getAvatarColor(id) } as CSSProperties}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  );
}

export default ProjectAvatar;
