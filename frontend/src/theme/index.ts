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

export function createPixelTheme() {
  return createTheme({
    typography: {
      htmlFontSize: 14.4,
      fontFamily: "'DotGothic16', 'Courier New', monospace",
    },
    spacing: 7.2,
    palette: {
      mode: "dark",
      primary: { main: "#00FF9C" },
      secondary: { main: "#FF6B00" },
      error: { main: "#FF00CC" },
      warning: { main: "#FF6B00" },
      info: { main: "#00CCFF" },
      success: { main: "#00FF9C" },
      background: {
        default: "#0D0E1A",
        paper: "#13141F",
      },
      text: {
        primary: "#E0FFE0",
        secondary: "#00CC7A",
        disabled: "#4A6A5A",
      },
      divider: "#00FF9C33",
      action: {
        hover: "#00FF9C15",
        selected: "#00FF9C22",
        focus: "#00FF9C30",
      },
    },
    shape: { borderRadius: 0 },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            border: "2px solid #00FF9C",
            backgroundImage: "none",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: "2px solid #00FF9C",
            backgroundImage: "none",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            border: "2px solid currentColor",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            transition: "transform 0.05s, box-shadow 0.05s",
            "&:active": {
              transform: "translate(2px, 2px)",
            },
          },
          contained: {
            boxShadow: "4px 4px 0px #005533",
            "&:active": {
              boxShadow: "none",
              transform: "translate(4px, 4px)",
            },
            "&:hover": {
              boxShadow: "4px 4px 0px #007744",
            },
          },
          outlined: {
            borderWidth: "2px",
            "&:hover": {
              borderWidth: "2px",
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            transition: "transform 0.05s",
            "&:active": {
              transform: "translate(1px, 1px)",
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 0,
              "& fieldset": {
                borderColor: "#00FF9C",
                borderWidth: "2px",
              },
              "&:hover fieldset": {
                borderColor: "#00FF9C",
                borderWidth: "2px",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#00FF9C",
                borderWidth: "2px",
              },
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#00FF9C",
              borderWidth: "2px",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#00FF9C",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#00FF9C",
              borderWidth: "2px",
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            borderBottom: "2px solid #00FF9C",
            backgroundImage: "none",
            backgroundColor: "#13141F",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: "2px solid #00FF9C33",
            backgroundImage: "none",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontSize: "0.75rem",
            borderBottom: "2px solid #00FF9C",
            color: "#00FF9C",
            backgroundColor: "#13141F",
          },
          body: {
            borderBottom: "1px solid #00FF9C22",
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:hover": {
              backgroundColor: "#00FF9C10 !important",
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 0,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            backgroundColor: "#00FF9C22",
          },
          bar: {
            backgroundColor: "#00FF9C",
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            "& .MuiSwitch-track": {
              borderRadius: 0,
              backgroundColor: "#004422",
            },
            "& .MuiSwitch-thumb": {
              borderRadius: 0,
            },
            "&.Mui-checked .MuiSwitch-track": {
              backgroundColor: "#00AA66",
            },
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: "#00FF9C33",
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            "&.Mui-selected": {
              color: "#00FF9C",
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: "#00FF9C",
            height: "3px",
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: `
          html { font-size: 90% !important; }
          /* 스크롤바 — 폰트는 App.tsx에서 동적 주입 */
          ::-webkit-scrollbar { width: 8px !important; height: 8px !important; }
          ::-webkit-scrollbar-track { background: #0D0E1A !important; }
          ::-webkit-scrollbar-thumb {
            background-color: #00FF9C !important;
            border-radius: 0 !important;
            border: none !important;
          }
          ::-webkit-scrollbar-thumb:hover { background-color: #00CC7A !important; }
          * { scrollbar-color: #00FF9C #0D0E1A; scrollbar-width: thin; }
        `,
      },
    },
  });
}

export default theme;
