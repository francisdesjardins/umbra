import { sectionSlug } from '@/shared/lib/section-slug';
import styles from '@/entities/example/ui/ExampleSection.module.css';
import type { ReactNode } from 'react';

type ExampleSectionProps = {
  readonly title: string;
  /** One line on what the section demonstrates. Omit when the title already says it. */
  readonly description?: string | undefined;
  /** Anchor id for deep links (`#stacking`) and page nav bars; defaults to a slug of the title. */
  readonly id?: string | undefined;
  readonly children: ReactNode;
};

/**
 * One labelled band of examples — every page renders its groups through it, so heading style,
 * vertical rhythm and anchor behaviour are identical rather than re-decided per page.
 */
export const ExampleSection = ({ title, description, id, children }: ExampleSectionProps) => {
  return (
    <section id={id ?? sectionSlug(title)} className={styles['section']}>
      <span className={styles['title']}>{title}</span>
      {description !== undefined && <p className={styles['description']}>{description}</p>}
      <div className={styles['content']}>{children}</div>
    </section>
  );
};
