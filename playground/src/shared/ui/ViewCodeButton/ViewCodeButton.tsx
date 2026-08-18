import { AppIconButton } from '@/shared/ui/AppButton';
import { CodeIcon } from '@/shared/ui/icons';
import styles from '@/shared/ui/ViewCodeButton/ViewCodeButton.module.css';
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
    <AppIconButton
      size="small"
      className={styles['codeButton']}
      onClick={handleClick}
      disabled={disabled}
      aria-label="View source code"
      aria-haspopup="dialog"
    >
      <CodeIcon />
    </AppIconButton>
  );
}
