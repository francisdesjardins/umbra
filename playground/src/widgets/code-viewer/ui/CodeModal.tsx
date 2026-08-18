import CloseIcon from '@mui/icons-material/Close';
import CodeIcon from '@mui/icons-material/Code';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { ModalHandle } from 'umbra/react';
import type { ReactNode } from 'react';
import { CodeBlock } from '@/shared/ui/CodeBlock/CodeBlock';

/**
 * Highlighter language by suffix — `-styles` (CSS modules), `-html` (the microfrontend host);
 * everything else, plain `.js` included, is TSX. Renaming past a suffix picks the wrong grammar.
 */
const languageForCodeKey = (codeKey: string) => {
  if (codeKey.endsWith('-styles')) {
    return 'css';
  }
  return codeKey.endsWith('-html') ? 'markup' : 'tsx';
};

export const CodeModalContent = ({
  code,
  codeKey,
  exampleActions,
  handle,
  isLoading,
  title,
  titleId,
}: {
  code: string;
  codeKey: string;
  exampleActions: ReactNode;
  handle: ModalHandle;
  /** Still arriving — distinct from an empty `code`, which means the key names no sample. */
  isLoading: boolean;
  title: string;
  /** What the panel's `ariaLabelledBy` points at; the reference is in `model/useCodeModal.tsx`. */
  titleId: string;
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexShrink: 0,
          bgcolor: (theme) => {
            return theme.palette.mode === 'dark' ? '#1a1a1a' : '#fafafa';
          },
        }}
      >
        <CodeIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Typography
            id={titleId}
            variant="h6"
            sx={{
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </Typography>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              bgcolor: (theme) => {
                return theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(0,0,0,0.04)';
              },
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 500,
                fontSize: '0.7rem',
                textTransform: 'uppercase',
              }}
            >
              {codeKey}
            </Typography>
          </Box>
        </Box>
        {exampleActions && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {exampleActions}
          </Box>
        )}
        <IconButton
          size="small"
          onClick={() => {
            handle.close('close');
          }}
          sx={{
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {code ? (
          <CodeBlock code={code} language={languageForCodeKey(codeKey)} />
        ) : (
          <Box
            sx={{
              p: 3,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              flex: 1,
            }}
          >
            {/* No live region: this branch unmounts when the code arrives, so a region on it would
                be born with its text rather than updated, announcing nothing. The panel takes focus
                on open and is named by its heading. */}
            {isLoading && <CircularProgress size={18} />}
            <Typography variant="body2" color="text.secondary">
              {isLoading ? 'Loading source…' : 'No code available'}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};
