import styles from '@/entities/example/ui/StoryCard.module.css';
import type { ReactNode } from 'react';
import { SurfaceCard } from '@/shared/ui/SurfaceCard';
import { ViewCodeButton } from '@/shared/ui/ViewCodeButton/ViewCodeButton';

type StoryCardProps = {
  readonly title: string;
  readonly description?: string | undefined;
  readonly codeKey?: string | undefined;
  readonly children: ReactNode;
};

export const StoryCard = ({ title, description, codeKey, children }: StoryCardProps) => {
  return (
    <SurfaceCard>
      <div className={styles['content']}>
        <div className={styles['titleRow']}>
          <h3 className={styles['title']}>{title}</h3>
          {codeKey && <ViewCodeButton codeKey={codeKey} />}
        </div>

        {description && <p className={styles['description']}>{description}</p>}

        <div className={styles['harness']}>{children}</div>
      </div>
    </SurfaceCard>
  );
};
