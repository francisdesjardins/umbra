import { AppIconButton } from '@/shared/ui/AppButton';
import { CodeIcon } from '@/shared/ui/icons';
import styles from '@/shared/ui/ViewCodeButton/ViewCodeButton.module.css';
import { useCodePane } from '@/shared/lib/code-pane-context';

type ViewCodeButtonProps = {
  readonly codeKey: string;
};

export function ViewCodeButton({ codeKey }: ViewCodeButtonProps) {
  const { setSelectedExample, codeDialogOpen } = useCodePane();
  const disabled = !codeKey || !codeDialogOpen;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) {
      return;
    }
    setSelectedExample(codeKey);
    codeDialogOpen();
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
