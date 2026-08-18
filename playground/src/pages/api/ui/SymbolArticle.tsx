import styles from '@/pages/api/ui/SymbolArticle.module.css';
import { CodeBlock } from '@/shared/ui/CodeBlock/CodeBlock';
import { LinkIcon } from '@/shared/ui/icons';
import { SurfaceCard } from '@/shared/ui/SurfaceCard';
import type { ApiSymbol } from 'virtual:dialog-api';
import { categoryHref, symbolAnchor } from '../model/api-index';
import { DocProse } from './DocText';
import { KindBadge } from './KindBadge';
import { MemberList, MemberListLabel } from './MemberList';
import { RouterLink } from './RouterLink';
import { Signature } from './Signature';

const Remarks = ({ symbol }: { readonly symbol: ApiSymbol }) => {
  if (symbol.remarks.length === 0) {
    return null;
  }
  return (
    <div className={styles['remarks']}>
      <DocProse parts={symbol.remarks} variant="body2" color="text.secondary" />
    </div>
  );
};

/**
 * One entry in the order a reader needs it: name, signature, summary, then detail. Members are
 * titled "Props" for a component, since typedoc's destructured parameter is the props object.
 */
export const SymbolArticle = ({ symbol }: { readonly symbol: ApiSymbol }) => {
  return (
    <div id={symbolAnchor(symbol.name)} className={styles['article']}>
      <SurfaceCard>
        <div className={styles['content']}>
          <div className={styles['stack']}>
            <div className={styles['header']}>
              <h3 className={styles['name']}>{symbol.name}</h3>
              <KindBadge kind={symbol.kind} />
              <RouterLink
                to={categoryHref(symbol.category)}
                hash={symbolAnchor(symbol.name)}
                aria-label={`Link to ${symbol.name}`}
                className={styles['anchor']}
              >
                <LinkIcon className={styles['anchorIcon']} />
              </RouterLink>
            </div>

            <Signature parts={symbol.signature} />

            <DocProse parts={symbol.summary} />
            <Remarks symbol={symbol} />

            <MemberList title="Type parameters" members={symbol.typeParams} />
            <MemberList title="Parameters" members={symbol.params} />
            <MemberList
              title={symbol.kind === 'function' ? 'Props' : 'Properties'}
              members={symbol.members}
            />

            {symbol.returns.length > 0 && (
              <div>
                <MemberListLabel>Returns</MemberListLabel>
                <DocProse parts={symbol.returns} variant="body2" color="text.secondary" />
              </div>
            )}

            {symbol.examples.map((example, index) => {
              return (
                <div key={index}>
                  <MemberListLabel>
                    {symbol.examples.length > 1 ? `Example ${String(index + 1)}` : 'Example'}
                  </MemberListLabel>
                  {/* No height cap: a nested scrollbar hides the end of a twenty-line example. */}
                  <div className={styles['example']}>
                    <CodeBlock code={example} language="tsx" wrap />
                  </div>
                </div>
              );
            })}

            {symbol.see.length > 0 && (
              <div>
                <MemberListLabel>See also</MemberListLabel>
                {symbol.see.map((entry, index) => {
                  return (
                    <DocProse key={index} parts={entry} variant="body2" color="text.secondary" />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
};
