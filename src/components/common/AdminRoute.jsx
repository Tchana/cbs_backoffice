import { Navigate } from "react-router-dom";
import { isAdmin } from "../../lib/auth";

const AdminRoute = ({ children, redirectTo = "/course" }) => {
  if (!isAdmin()) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default AdminRoute;
