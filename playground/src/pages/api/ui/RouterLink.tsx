import styles from '@/pages/api/ui/RouterLink.module.css';
import { Link } from '@tanstack/react-router';
import type { ComponentProps } from 'react';

type RouterLinkProps = ComponentProps<typeof Link>;

/**
 * A TanStack `Link` wearing the reference's link reset, for every navigation here. Wrapping
 * erases the generics typing `params`, so links are plain paths; callers compose their own
 * module class on top via `className`.
 */
export const RouterLink = ({ className, ...rest }: RouterLinkProps) => {
  const classes = [styles['link'], className ?? ''].filter(Boolean).join(' ');
  return <Link {...rest} className={classes} />;
};
