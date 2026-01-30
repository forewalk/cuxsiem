import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "../App";
import { LoginPage } from "../pages/LoginPage";
import { PrivateRoute } from "../components/PrivateRoute";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/dashboard",
    element: (
      <PrivateRoute>
        <App />
      </PrivateRoute>
    ),
  },
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);

export default router;
