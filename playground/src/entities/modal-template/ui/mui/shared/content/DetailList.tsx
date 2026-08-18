import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { type SxProps } from '@mui/material/styles';
import type { ReactNode } from 'react';

export type DetailListProps = {
  readonly items: readonly ReactNode[];
  readonly icon?: ReactNode | undefined;
  readonly dense?: boolean | undefined;
  readonly sx?: SxProps | undefined;
};

export const DetailList = ({ items, icon, dense = true, sx }: DetailListProps) => {
  return (
    <List dense={dense} disablePadding sx={sx}>
      {items.map((item, index) => {
        return (
          <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
            {icon && <ListItemIcon sx={{ minWidth: 32 }}>{icon}</ListItemIcon>}
            <ListItemText
              primary={item}
              slotProps={{ primary: { variant: 'body2', color: 'text.primary' } }}
            />
          </ListItem>
        );
      })}
    </List>
  );
};
