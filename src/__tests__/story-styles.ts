/**
 * The interior every story's dialog renders. `minWidth` yields to the dialog rather than
 * outranking it: harnesses size their `<dialog>` deliberately — the stack-priority trio is 260 —
 * and a floor of a flat 280 made three of them overflow their own box by 20px, which shows up on
 * the playground's `/stories` page as a horizontal scrollbar inside the dialog.
 */
export const dialogStyle = {
  background: 'Canvas',
  color: 'CanvasText',
  borderRadius: 8,
  padding: '24px 28px',
  minWidth: 'min(280px, 100%)',
};
