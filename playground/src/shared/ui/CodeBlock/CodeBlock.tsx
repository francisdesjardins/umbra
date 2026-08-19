import { readableSyntaxStyle } from '@/shared/lib/readable-syntax';
import { useTheme } from '@/shared/lib/theme-context';
import { AppIconButton } from '@/shared/ui/AppButton';
import styles from '@/shared/ui/CodeBlock/CodeBlock.module.css';
import { CheckIcon, ContentCopyIcon } from '@/shared/ui/icons';
import { useState } from 'react';
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
  readonly code: string;
  readonly language?: string | undefined;
  /**
   * Wrap long lines instead of scrolling them: in prose a horizontal scrollbar hides the line's
   * end with none in view to suggest it. The code viewer keeps scrolling — wide pane, real source.
   */
  readonly wrap?: boolean | undefined;
};

export const CodeBlock = ({ code, language = 'tsx', wrap = false }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const { isDarkMode } = useTheme();
  const surface = CODE_SURFACE[isDarkMode ? 'dark' : 'light'];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className={styles['frame']}>
      {/* The icon is `aria-hidden`, so the control's name has to come from here — and it states the
          outcome, which is also what a screen reader hears change when the tick appears. */}
      <AppIconButton
        size="small"
        onClick={handleCopy}
        className={styles['copyButton']}
        aria-label={copied ? 'Code copied' : 'Copy code'}
      >
        {copied ? <CheckIcon className={styles['checkIcon']} /> : <ContentCopyIcon />}
      </AppIconButton>

      <div
        className={wrap ? `${styles['scroll']} ${styles['wrap']}` : styles['scroll']}
        style={{ background: surface }}
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
            // The token, not a stack of its own: code is the largest mono surface here, and a
            // second opinion about the mono face shows up as two monos on one page.
            fontFamily: 'var(--app-font-mono)',
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
      </div>
    </div>
  );
};
