import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "../App";
import { LoginPage } from "../pages/LoginPage";
import { PrivateRoute } from "../components/PrivateRoute";
import WorkspacePage from "../pages/WorkspacePage";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/main",
    element: (
      <PrivateRoute>
        <App />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <WorkspacePage />,
      },
      {
        path: "*",
        element: <WorkspacePage />,
      }
    ],
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
