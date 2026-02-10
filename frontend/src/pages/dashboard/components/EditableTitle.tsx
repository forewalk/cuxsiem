import React, { useState } from "react";
import { Box, Typography, TextField, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { useDashboardStore } from "../../../stores/useDashboardStore";

interface EditableTitleProps {
  panelId: string;
  defaultTitle: string;
  variant?: "subtitle2" | "caption" | "h6";
}

const EditableTitle: React.FC<EditableTitleProps> = ({ panelId, defaultTitle, variant = "subtitle2" }) => {
  const { customTitles, setPanelTitle } = useDashboardStore();
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [isHovered, setIsHovered] = useState(false);

  const currentTitle = customTitles[panelId] || defaultTitle;

  const handleStartEdit = () => {
    setTempTitle(currentTitle);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmedTitle = tempTitle.trim();
    if (trimmedTitle !== "") {
      setPanelTitle(panelId, trimmedTitle);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, width: '100%' }}>
        <TextField
          size="small"
          fullWidth
          value={tempTitle}
          onChange={(e) => setTempTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          onBlur={handleSave}
          sx={{ 
            "& .MuiInputBase-input": { 
              py: 0.2, 
              fontSize: variant === 'caption' ? '0.7rem' : '0.8rem',
              fontWeight: 'bold'
            } 
          }}
        />
        <IconButton size="small" onClick={handleSave} color="success" sx={{ p: 0.2 }}><CheckIcon fontSize="inherit" /></IconButton>
        <IconButton size="small" onClick={() => setIsEditing(false)} color="error" sx={{ p: 0.2 }}><CloseIcon fontSize="inherit" /></IconButton>
      </Box>
    );
  }

  return (
    <Box 
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)}
      sx={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: 0.5, 
        cursor: 'pointer',
        maxWidth: '100%',
        mb: 0.5,
        position: 'relative'
      }}
      onClick={handleStartEdit}
    >
      <Typography 
        variant={variant} 
        sx={{ 
          fontWeight: "bold", 
          color: 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.2
        }}
      >
        {currentTitle}
      </Typography>
      
      {/* 아이콘이 나타나도 전체 높이에 영향을 주지 않도록 위치 조정 */}
      <Box sx={{ width: 16, height: 16, display: 'flex', alignItems: 'center' }}>
        {isHovered && (
          <EditIcon sx={{ fontSize: 12, opacity: 0.5, color: 'text.primary' }} />
        )}
      </Box>
    </Box>
  );
};

export default EditableTitle;