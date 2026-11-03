import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/authContext";

interface RequireAuthProps {
  children: ReactNode;
}

// Sin sesión, manda al login y recuerda la página pedida para volver a ella
function RequireAuth({ children }: RequireAuthProps) {
  const { user } = useAuth();
  const { pathname, search } = useLocation();

  if (!user) {
    const redirect =
      pathname === "/"
        ? ""
        : `?redirect=${encodeURIComponent(`${pathname}${search}`)}`;

    return <Navigate to={`/login${redirect}`} replace />;
  }

  return children;
}

export default RequireAuth;
