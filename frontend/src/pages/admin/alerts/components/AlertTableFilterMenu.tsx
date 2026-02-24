/**
 * 알림 테이블 공통 필터 메뉴 컴포넌트
 */
import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  type MenuProps,
} from '@mui/material';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';

interface FilterOption {
  value: string | boolean | null;
  label: string;
}

interface AlertTableFilterMenuProps {
  anchorEl: MenuProps['anchorEl'];
  open: boolean;
  onClose: () => void;
  options: FilterOption[];
  selectedValues: (string | boolean | null)[];
  onToggle: (value: string | boolean | null) => void;
  multiSelect?: boolean;
}

/**
 * 테이블 헤더용 공통 필터 메뉴
 */
export const AlertTableFilterMenu: React.FC<AlertTableFilterMenuProps> = ({
  anchorEl,
  open,
  onClose,
  options,
  selectedValues,
  onToggle,
  multiSelect = true,
}) => {
  const handleItemClick = (value: string | boolean | null) => {
    onToggle(value);
    if (!multiSelect) {
      onClose();
    }
  };

  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      {options.map((option) => {
        const isSelected = selectedValues.includes(option.value);
        return (
          <MenuItem key={String(option.value)} onClick={() => handleItemClick(option.value)}>
            <ListItemIcon>
              {isSelected ? (
                <CheckBoxIcon fontSize="small" color="primary" />
              ) : (
                <CheckBoxOutlineBlankIcon fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText primary={option.label} />
          </MenuItem>
        );
      })}
    </Menu>
  );
};

