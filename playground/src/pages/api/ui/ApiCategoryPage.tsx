import styles from '@/pages/api/ui/ApiCategoryPage.module.css';
import { ArrowBackIcon, ArrowForwardIcon } from '@/shared/ui/icons';
import { PageLayout } from '@/shared/ui/PageLayout';
import { SurfaceCard } from '@/shared/ui/SurfaceCard';
import { useParams } from '@tanstack/react-router';
import type { ApiCategory } from 'virtual:dialog-api';
import { categoryHref, findCategory, neighboursOf } from '../model/api-index';
import { useActiveSymbol, useHashScroll } from '../model/use-api-scroll';
import { ApiLayout } from './ApiLayout';
import { RouterLink } from './RouterLink';
import { CodeLine } from './Signature';
import { SymbolArticle } from './SymbolArticle';

/** The line you would paste to use this page — values as an import, types as `import type`. */
const ImportLine = ({ category }: { readonly category: ApiCategory }) => {
  const values = category.symbols.filter((symbol) => {
    return symbol.kind !== 'type';
  });
  const named = values.length > 0 ? values : category.symbols;
  const shown = named.slice(0, 4).map((symbol) => {
    return symbol.name;
  });
  const rest = named.length - shown.length;

  return (
    <CodeLine>
      {values.length === 0 ? 'import type { ' : 'import { '}
      {shown.join(', ')}
      {rest > 0 ? `, /* +${String(rest)} */ ` : ' '}
      {`} from '${category.specifier}';`}
    </CodeLine>
  );
};

const CategoryStep = ({
  category,
  direction,
}: {
  readonly category: ApiCategory;
  readonly direction: 'previous' | 'next';
}) => {
  return (
    <RouterLink to={categoryHref(category.id)} className={styles['step']}>
      <SurfaceCard interactive>
        <div className={styles['stepContent']}>
          <div
            className={
              direction === 'next'
                ? `${styles['stepRow']} ${styles['stepRowNext']}`
                : styles['stepRow']
            }
          >
            {direction === 'previous' && <ArrowBackIcon className={styles['stepIcon']} />}
            <div
              className={
                direction === 'next'
                  ? `${styles['stepText']} ${styles['stepTextNext']}`
                  : styles['stepText']
              }
            >
              <span className={styles['stepDirection']}>
                {direction === 'previous' ? 'Previous' : 'Next'}
              </span>
              <p className={styles['stepLabel']}>{category.label}</p>
            </div>
            {direction === 'next' && <ArrowForwardIcon className={styles['stepIcon']} />}
          </div>
        </div>
      </SurfaceCard>
    </RouterLink>
  );
};

/** One chapter of the reference: everything you need for one job, in the order you need it. */
export const ApiCategoryPage = () => {
  const { category: categoryId } = useParams({ from: '/api/$category' });
  const category = findCategory(categoryId);
  const activeSymbol = useActiveSymbol(categoryId);
  useHashScroll();

  if (category === undefined) {
    return (
      <PageLayout
        title="Not in the reference"
        description={`No API page is called “${categoryId}”.`}
      >
        <ApiLayout>
          <RouterLink to="/api" className={styles['accentLink']}>
            Back to the API reference
          </RouterLink>
        </ApiLayout>
      </PageLayout>
    );
  }

  const { previous, next } = neighboursOf(category.id);

  return (
    <PageLayout
      title={category.label}
      description={category.blurb}
      actions={<span className={styles['specifierChip']}>{category.specifier}</span>}
    >
      <ApiLayout activeCategory={category.id} activeSymbol={activeSymbol}>
        <div className={styles['column']}>
          <div className={styles['breadcrumbs']}>
            <RouterLink to="/api" className={styles['breadcrumbLink']}>
              API Reference
            </RouterLink>
            <p className={styles['crumbDivider']}>›</p>
            <p className={styles['crumbCurrent']}>{category.label}</p>
            <p className={styles['exportCount']}>{String(category.symbols.length)} exports</p>
          </div>

          <ImportLine category={category} />

          {category.symbols.map((symbol) => {
            return <SymbolArticle key={symbol.name} symbol={symbol} />;
          })}

          <div className={styles['pager']}>
            {previous !== undefined && <CategoryStep category={previous} direction="previous" />}
            {next !== undefined && <CategoryStep category={next} direction="next" />}
          </div>
        </div>
      </ApiLayout>
    </PageLayout>
  );
};
