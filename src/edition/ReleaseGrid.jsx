import React from 'react';
import {
  DemoCard, MediaGrid, PointOfSaleCard, ReleaseCard, ReleaseSection,
  hasMedia, mediaRevealClasses, textRevealClass,
} from '../vendor/spring26/presentation.js';

function CardGroup({ products, subsectionTitle }) {
  const features = products.filter(product => product.isxxl);
  const media = products.filter(product => !product.isxxl && (product.isDemoCard || hasMedia(product.productMedia)));
  const notes = products.filter(product => !product.isxxl && !product.isDemoCard && !hasMedia(product.productMedia));
  const heading = subsectionTitle ? 4 : 3;
  const shared = { titleHeadingLevel: heading, hasNoVisibleTitle: !subsectionTitle };
  const delays = mediaRevealClasses(media);
  const divided = media.length > 0 || (!subsectionTitle && features.length === 0);

  return <div className="flex flex-col">
    {features.length > 0 && <div className="flex flex-col gap-40">
      {features.map(product => {
        const Card = product.isPosXXL ? PointOfSaleCard : ReleaseCard;
        return <Card key={product.id} product={product} {...shared} />;
      })}
    </div>}
    {media.length > 0 && <div className={`content-container md:pb-0 mt-40 md:mt-56 ${subsectionTitle ? 'pb-64' : 'pb-32 sm:pb-64'}`}>
      <MediaGrid>{media.map((product, i) => {
        const Card = product.isDemoCard ? DemoCard : ReleaseCard;
        return <Card key={product.id} product={product} {...shared} revealIndexClass={delays[i]} />;
      })}</MediaGrid>
    </div>}
    {notes.length > 0 && <div className={`content-container md:pt-32 md:pb-0 ${media.length ? 'md:mt-56' : features.length ? 'mt-40 md:mt-56' : ''}`}>
      <div className={`text-card-grid grid grid-cols-6 md:grid-cols-12 gap-x-grid-gutter sm:gap-x-grid-gutter-sm gap-y-48 md:gap-y-64 pt-40 md:pt-0 ${divided ? 'border-t border-w10 md:border-t-0' : ''} ${!media.length && subsectionTitle ? 'text-only-grid' : ''}`}>
        {notes.map((product, i) => <ReleaseCard key={product.id} product={product} {...shared} revealIndexClass={textRevealClass(i)} />)}
      </div>
    </div>}
  </div>;
}

// Retail's interactive POS section is composed with its 3D controller in RetailChapter.
export function ReleaseGrid({ chapter }) {
  const subsections = (chapter.nestedCollections || []).filter(group => group.products.length);
  const groups = chapter.products.length ? [{ ...chapter, title: null, primary: true }, ...subsections] : subsections;

  return <div className="pb-64 md:pb-96">
    <div data-section-handle={chapter.handle} className="last:pb-0">
      <ReleaseSection componentName={chapter.title} className="pt-24" handle={chapter.handle}>
        {groups.map((group, i) => {
          const title = !chapter.hideSubsectionTitles && group.title;
          let spacing = '';
          if (!group.primary && i !== groups.length - 1) {
            spacing = title ? 'pb-32 md:pb-56 mb-64 sm:mb-56' : 'pb-0 sm:pb-32 md:pb-56 mb-24 sm:mb-56';
          }
          return <div key={group.id} className={spacing || (group.primary ? '' : 'pb-0')}>
            {title && <div className="scroll-reveal-trigger content-container pt-32 md:pt-0">
              <h3 className="scroll-reveal t5 text-w60 mt-0 md:mt-48 pb-24 md:pb-32 mb-24 border-b border-w10">{title}</h3>
            </div>}
            <CardGroup products={group.products} subsectionTitle={title} />
          </div>;
        })}
      </ReleaseSection>
    </div>
  </div>;
}
