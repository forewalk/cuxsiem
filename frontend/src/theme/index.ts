import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#90caf9",
    },
    secondary: {
      main: "#ce93d8",
    },
    background: {
      default: "#0a1929",
      paper: "#132f4c",
    },
  },
  typography: {
    fontFamily: "'Roboto', 'Noto Sans KR', sans-serif",
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        ::-webkit-scrollbar {
          width: 10px !important;
          height: 10px !important;
        }
        ::-webkit-scrollbar-track {
          background: transparent !important;
        }
        ::-webkit-scrollbar-thumb {
          background-color: #5b6b7f !important;
          border-radius: 10px !important;
          border: 2px solid transparent !important;
          background-clip: content-box !important;
        }
        ::-webkit-scrollbar-thumb:hover {
          background-color: #4a5568 !important;
        }
      `,
    },
  },
});

export default theme;
