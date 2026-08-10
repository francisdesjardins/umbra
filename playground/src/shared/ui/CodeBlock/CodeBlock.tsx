import { readableSyntaxStyle } from '@/shared/lib/readable-syntax';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Box, IconButton, useTheme } from '@mui/material';
import { useCallback, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * The surface code is painted on — named once, because two things depend on it agreeing.
 *
 * The block paints it, and `readableSyntaxStyle` measures every token colour against it. A
 * literal in each place is a pair that drifts silently: the tokens would be corrected for a
 * background the code is no longer on, and the report would still come back green.
 */
const CODE_SURFACE = { light: '#ffffff', dark: '#1a1a1a' } as const;

type CodeBlockProps = {
  code: string;
  language?: string;
  /**
   * Wrap long lines instead of scrolling them.
   *
   * For a sample embedded in prose — the API reference — a horizontal scrollbar hides the end
   * of the line the reader is on and there is no scrollbar in view to suggest it. The code
   * viewer keeps scrolling, where the pane is wide and the file is real source.
   */
  wrap?: boolean | undefined;
};

export const CodeBlock = ({ code, language = 'tsx', wrap = false }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const surface = CODE_SURFACE[theme.palette.mode];

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }, [code]);

  return (
    <Box
      sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}
    >
      {/* Floating Copy Button */}
      <IconButton
        size="small"
        onClick={handleCopy}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1,
          bgcolor: (theme) => {
            return theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
          },
          backdropFilter: 'blur(8px)',
          border: 1,
          borderColor: 'divider',
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            bgcolor: (theme) => {
              return theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
            },
            transform: 'scale(1.05)',
          },
        }}
      >
        {copied ? (
          <CheckIcon fontSize="small" color="success" />
        ) : (
          <ContentCopyIcon fontSize="small" />
        )}
      </IconButton>

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          bgcolor: surface,
          '& pre': {
            margin: '0 !important',
            background: 'transparent !important',
            padding: '0 !important',
            borderRadius: '0 !important',
            overflowX: wrap ? 'visible !important' : 'auto !important',
          },
          '& code': {
            display: 'block !important',
            padding: '24px !important',
            paddingTop: '24px !important',
            borderRadius: '0 !important',
            // The highlighter theme paints its own background on the <code>, a different grey
            // from this box's — and a background on a scroll container stays put while the
            // content moves, so scrolling a long line sideways slid the code off its own colour
            // onto ours. One surface, painted once, by the box that is actually scrolled.
            background: 'transparent !important',
            // Without this the block is only as wide as the viewport, so the background stops
            // where the visible area does and the scrolled-in region has none at all.
            minWidth: 'max-content',
          },
          // Wrapping has to be declared here — the highlighter puts `white-space: pre` inline
          // on the <pre> and wins otherwise. Only on `pre`/`code`: the same rule on the token
          // spans lets each token wrap on its own and the line comes apart into columns.
          ...(wrap && { '& pre, & code': { whiteSpace: 'pre-wrap !important' } }),
        }}
      >
        <SyntaxHighlighter
          language={language}
          style={readableSyntaxStyle(isDarkMode ? oneDark : oneLight, surface)}
          customStyle={{
            fontSize: '0.9rem',
            lineHeight: 1.8,
            background: 'transparent',
            margin: 0,
            padding: 0,
            fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
          }}
          // Both off when wrapping: they wrap each line into a flex row whose items are
          // tokens, which is what scrambles a wrapped line. Numbers on a five-line sample in
          // the middle of prose earn little anyway.
          showLineNumbers={!wrap}
          wrapLines={!wrap}
          lineNumberStyle={{
            minWidth: '3.5em',
            paddingRight: '1.5em',
            // A line number is text a reader is expected to use — to point at a line in a
            // review, to match an error. `#cbd5e0` on white measured 1.49:1, which is a
            // decoration pretending to be a number.
            color: isDarkMode ? '#8b94a7' : '#6b7280',
            userSelect: 'none',
            textAlign: 'right',
            fontSize: '0.85rem',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </Box>
    </Box>
  );
};
