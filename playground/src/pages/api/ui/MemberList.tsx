import styles from '@/pages/api/ui/MemberList.module.css';
import { AppButton } from '@/shared/ui/AppButton';
import { Fragment, useState } from 'react';
import type { ApiMember } from 'virtual:dialog-api';
import { InlineCode, SymbolLink } from './DocText';

/** Above this, a list is a wall — `Key` alone has 67 entries. */
const COLLAPSE_ABOVE = 12;
const COLLAPSED_ROWS = 8;

const Label = ({ children }: { readonly children: React.ReactNode }) => {
  return <span className={styles['label']}>{children}</span>;
};

const MemberType = ({ member }: { readonly member: ApiMember }) => {
  return (
    <span className={styles['memberType']}>
      {member.type.map((part, index) => {
        return part.link !== undefined ? (
          <SymbolLink key={index} symbolKey={part.link}>
            {part.text}
          </SymbolLink>
        ) : (
          <span key={index}>{part.text}</span>
        );
      })}
    </span>
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
    <div>
      <Label>{title}</Label>
      <dl className={styles['grid']}>
        {visible.map((member, index) => {
          const first = index === 0 ? ` ${styles['firstRow']}` : '';
          return (
            <Fragment key={member.name}>
              <dt className={`${styles['term']}${first}`}>
                {member.name}
                {member.optional && <span className={styles['optional']}>?</span>}
              </dt>
              <dd className={`${styles['detail']}${first}`}>
                <MemberType member={member} />
                {member.summary !== '' && (
                  <p className={styles['summary']}>
                    <InlineCode text={member.summary} />
                  </p>
                )}
              </dd>
            </Fragment>
          );
        })}
      </dl>
      {collapsible && (
        <AppButton
          size="small"
          className={styles['toggle']}
          onClick={() => {
            setExpanded((previous) => {
              return !previous;
            });
          }}
        >
          {expanded ? 'Show fewer' : `Show all ${String(members.length)}`}
        </AppButton>
      )}
    </div>
  );
};

export { Label as MemberListLabel };
