import { sectionSlug } from '@/shared/lib/section-slug';
import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type ExampleSectionProps = {
  readonly title: string;
  /** One line on what the section demonstrates. Omit when the title already says it. */
  readonly description?: string | undefined;
  /**
   * Anchor id, so a section can be deep-linked (`#stacking`) and jumped to from a page's
   * navigation bar. Defaults to a slug of the title.
   */
  readonly id?: string | undefined;
  readonly children: ReactNode;
};

/**
 * One labelled band of examples.
 *
 * Every page renders its groups through this component, so the heading style, the vertical
 * rhythm, and the anchor behaviour are identical everywhere rather than re-decided per page.
 */
export const ExampleSection = ({ title, description, id, children }: ExampleSectionProps) => {
  return (
    <Box
      component="section"
      id={id ?? sectionSlug(title)}
      sx={{
        mb: 5,
        // Anchor jumps must clear the fixed 64px top bar.
        scrollMarginTop: 80,
        '&:last-of-type': { mb: 0 },
      }}
    >
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: 'block', lineHeight: 1.4, letterSpacing: '0.1em', fontWeight: 600 }}
      >
        {title}
      </Typography>
      {description !== undefined && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 680 }}>
          {description}
        </Typography>
      )}
      <Box sx={{ mt: 2 }}>{children}</Box>
    </Box>
  );
};
