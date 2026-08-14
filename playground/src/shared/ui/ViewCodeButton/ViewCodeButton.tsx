import CodeIcon from '@mui/icons-material/Code';
import { IconButton } from '@mui/material';
import type { ReactNode } from 'react';
import { useCodePane } from '@/shared/lib/code-pane-context';

type ViewCodeButtonProps = {
  readonly codeKey: string;
  readonly actions?: ReactNode;
};

export function ViewCodeButton({ codeKey, actions }: ViewCodeButtonProps) {
  const { setSelectedExample, setExampleActions, codeModalOpen } = useCodePane();
  const disabled = !codeKey || !codeModalOpen;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) {
      return;
    }
    setSelectedExample(codeKey);
    setExampleActions(actions ?? null);
    codeModalOpen();
  };

  return (
    <IconButton
      size="small"
      color="primary"
      onClick={handleClick}
      disabled={disabled}
      aria-label="View source code"
      aria-haspopup="dialog"
      sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}
    >
      <CodeIcon fontSize="small" />
    </IconButton>
  );
}
