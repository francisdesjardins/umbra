import { Box, Button, Typography } from '@mui/material';
import { Fragment, useState } from 'react';
import type { ApiMember } from 'virtual:dialog-api';
import { InlineCode, SymbolLink } from './DocText';

/** Above this, a list is a wall — `Key` alone has 67 entries. */
const COLLAPSE_ABOVE = 12;
const COLLAPSED_ROWS = 8;

const Label = ({ children }: { readonly children: React.ReactNode }) => {
  return (
    <Typography
      variant="overline"
      color="text.secondary"
      sx={{ display: 'block', letterSpacing: '0.1em', fontWeight: 600, mb: 0.5 }}
    >
      {children}
    </Typography>
  );
};

const MemberType = ({ member }: { readonly member: ApiMember }) => {
  return (
    <Box
      component="span"
      sx={{
        fontFamily: 'monospace',
        fontSize: '0.8125rem',
        color: 'text.secondary',
        overflowWrap: 'anywhere',
      }}
    >
      {member.type.map((part, index) => {
        return part.link !== undefined ? (
          <SymbolLink key={index} symbolKey={part.link}>
            {part.text}
          </SymbolLink>
        ) : (
          <Box component="span" key={index}>
            {part.text}
          </Box>
        );
      })}
    </Box>
  );
};

/**
 * Parameters, type parameters, props or members — one shape, each a name, a type and a line on what
 * it is for. One grid, not a row each, so names share a left edge across three typographic ranks.
 */
export const MemberList = ({
  title,
  members,
}: {
  readonly title: string;
  readonly members: readonly ApiMember[];
}) => {
  const [expanded, setExpanded] = useState(false);

  if (members.length === 0) {
    return null;
  }

  const collapsible = members.length > COLLAPSE_ABOVE;
  const visible = collapsible && !expanded ? members.slice(0, COLLAPSED_ROWS) : members;

  return (
    <Box>
      <Label>{title}</Label>
      <Box
        component="dl"
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            sm: 'minmax(0, max-content) minmax(0, 1fr)',
          },
          columnGap: 2.5,
          m: 0,
        }}
      >
        {visible.map((member, index) => {
          const rule = { borderTop: index === 0 ? 0 : 1, borderColor: 'divider' };
          return (
            <Fragment key={member.name}>
              <Box
                component="dt"
                sx={{
                  ...rule,
                  pt: index === 0 ? 0 : 1,
                  pb: { xs: 0, sm: 1 },
                  fontFamily: 'monospace',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  overflowWrap: 'anywhere',
                }}
              >
                {member.name}
                {member.optional && (
                  <Box component="span" sx={{ color: 'text.disabled' }}>
                    ?
                  </Box>
                )}
              </Box>
              <Box
                component="dd"
                sx={{
                  ...rule,
                  borderTop: { xs: 0, sm: index === 0 ? 0 : 1 },
                  pt: { xs: 0.25, sm: index === 0 ? 0 : 1 },
                  pb: 1,
                  m: 0,
                  minWidth: 0,
                }}
              >
                <MemberType member={member} />
                {member.summary !== '' && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.25, lineHeight: 1.6 }}
                  >
                    <InlineCode text={member.summary} />
                  </Typography>
                )}
              </Box>
            </Fragment>
          );
        })}
      </Box>
      {collapsible && (
        <Button
          size="small"
          onClick={() => {
            setExpanded((previous) => {
              return !previous;
            });
          }}
          sx={{ mt: 0.5 }}
        >
          {expanded ? 'Show fewer' : `Show all ${String(members.length)}`}
        </Button>
      )}
    </Box>
  );
};

export { Label as MemberListLabel };
