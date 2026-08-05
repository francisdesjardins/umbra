import CloseIcon from '@mui/icons-material/Close';
import CodeIcon from '@mui/icons-material/Code';
import { Box, IconButton, Typography } from '@mui/material';
import type { ModalHandle } from 'umbra/react';
import type { ReactNode } from 'react';
import { CodeBlock } from '@/shared/ui/CodeBlock/CodeBlock';

/**
 * Highlighter language for a sample. Registered CSS-module samples are the only non-TSX
 * entries, and they all use the `-styles` key suffix — everything else is TypeScript JSX.
 */
const languageForCodeKey = (codeKey: string) => {
  return codeKey.endsWith('-styles') ? 'css' : 'tsx';
};

// Shared content renderer for code modal
export const CodeModalContent = ({
  code,
  codeKey,
  exampleActions,
  handle,
  title,
}: {
  code: string;
  codeKey: string;
  exampleActions: ReactNode;
  handle: ModalHandle;
  title: string;
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header */}
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

      {/* Code content */}
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
              flex: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No code available
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};
