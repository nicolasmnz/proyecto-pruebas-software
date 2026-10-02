import { Plus } from "lucide-react";

import "./Button.css";

interface ButtonProps {
  content: string;
  onClick?: () => void;
}

function Button({ content, onClick }: ButtonProps) {
  return (
    <button className="btn-new" type="button" onClick={onClick}>
      <Plus />
      <span>{content}</span>
    </button>
  );
}

export default Button;
