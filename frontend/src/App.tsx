import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import { useAuth } from "./hooks/useAuth";
import { useNavigate } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";

function App() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <Typography variant="h4">로그인이 필요합니다</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            cruxSIEM
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.name} ({user?.role})
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            로그아웃
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          대시보드
        </Typography>
        <Typography variant="body1" color="textSecondary">
          반갑습니다, {user?.name}님! 로그인 기능이 성공적으로 구현되었습니다.
        </Typography>
      </Box>
    </Box>
  );
}

export default App;
