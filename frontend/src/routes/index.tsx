import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "../App";
import { LoginPage } from "../pages/LoginPage";
import { PrivateRoute } from "../components/PrivateRoute";
import AdminRoute from "../components/AdminRoute";
import UserManagementTab from "../pages/admin/tabs/UserManagementTab";
import PasswordPolicyTab from "../pages/admin/tabs/PasswordPolicyTab";

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
        path: "users",
        element: (
          <AdminRoute>
            <UserManagementTab />
          </AdminRoute>
        ),
      },
      {
        path: "password-policy",
        element: (
          <AdminRoute>
            <PasswordPolicyTab />
          </AdminRoute>
        ),
      },
      // /main의 기본 콘텐츠를 위한 index route 추가 (선택 사항)
      // {
      //   index: true,
      //   element: <MainDashboardContent /> // 메인 대시보드 콘텐츠 컴포넌트
      // }
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