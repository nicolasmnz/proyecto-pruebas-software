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
      style={{ background: getAvatarColor(id) }}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  );
}

export default ProjectAvatar;
