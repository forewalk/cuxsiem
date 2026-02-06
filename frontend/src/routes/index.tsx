import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "../App";
import { LoginPage } from "../pages/LoginPage";
import { PrivateRoute } from "../components/PrivateRoute";
import AdminRoute from "../components/AdminRoute";
import AdminPage from "../pages/admin/AdminPage";
import DashboardPage from "../pages/dashboard/DashboardPage";

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
        element: <DashboardPage />,
      },
      {
        path: "admin",
        element: (
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        ),
      },
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