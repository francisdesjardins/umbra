import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Box, IconButton, useTheme } from '@mui/material';
import { useCallback, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
          bgcolor: isDarkMode ? '#1a1a1a' : '#ffffff',
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
          },
          // Wrapping has to be declared here — the highlighter puts `white-space: pre` inline
          // on the <pre> and wins otherwise. Only on `pre`/`code`: the same rule on the token
          // spans lets each token wrap on its own and the line comes apart into columns.
          ...(wrap && { '& pre, & code': { whiteSpace: 'pre-wrap !important' } }),
        }}
      >
        <SyntaxHighlighter
          language={language}
          style={isDarkMode ? oneDark : oneLight}
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
            color: isDarkMode ? '#4a5568' : '#cbd5e0',
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
