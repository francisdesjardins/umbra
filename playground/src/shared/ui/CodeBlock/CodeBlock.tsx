import { readableSyntaxStyle } from '@/shared/lib/readable-syntax';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import { useCallback, useState } from 'react';
// Deep paths, not the barrels: `react-syntax-highlighter` re-exports `Prism` (every grammar
// refractor ships) and `styles/prism` re-exports all 47 themes, and Vite serves modules unbundled
// in dev, so a barrel import pulls the whole of it whatever the named import says.
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-light';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark';
import oneLight from 'react-syntax-highlighter/dist/esm/styles/prism/one-light';

// The whole list of grammars this app asks for. An unregistered one renders as plain text and
// raises nothing, so a fifth `language` value is a silent downgrade — register it in the same
// commit. Free: refractor's `tsx` pulls `jsx`, `typescript`, `markup`, `javascript`, `clike`.
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('markup', markup);

// Named once because the block paints it and `readableSyntaxStyle` measures every token colour
// against it; two literals drift silently, correcting tokens for a background they are not on.
const CODE_SURFACE = { light: '#ffffff', dark: '#1a1a1a' } as const;

type CodeBlockProps = {
  code: string;
  language?: string;
  /**
   * Wrap long lines instead of scrolling them: in prose a horizontal scrollbar hides the line's
   * end with none in view to suggest it. The code viewer keeps scrolling — wide pane, real source.
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
            // The theme paints its own background on the <code>, and a background on a scroll
            // container stays put while content moves, sliding the code off its own colour.
            background: 'transparent !important',
            // Otherwise the block is only viewport-wide and the scrolled-in region has none.
            minWidth: 'max-content',
          },
          // Declared here because the highlighter puts `white-space: pre` inline on the <pre>. Only
          // on `pre`/`code`: on the token spans each token wraps alone and the line breaks apart.
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
          // Both off when wrapping: they wrap each line into a flex row of tokens, which scrambles.
          showLineNumbers={!wrap}
          wrapLines={!wrap}
          lineNumberStyle={{
            minWidth: '3.5em',
            paddingRight: '1.5em',
            // A line number is text a reader uses; `#cbd5e0` on white measured 1.49:1.
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
