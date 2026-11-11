import React from 'react';
import {
  ChapterBackdrop, ContentSurface, DriveKey, DrivePortal, FeatureProvider,
  RetailChapter, RichText, Scene, Timeline, useStillBackdrop,
} from '../vendor/spring26/presentation.js';
import { ReleaseGrid } from './ReleaseGrid.jsx';
import { OpeningChapterPicture } from './OpeningChapterPicture.jsx';
import { edition, editionPath } from './content.js';

function ChapterTitle({ chapter }) {
  const subhead = 'section-hero-subhead col-span-6 sm:col-span-5 md:col-span-9 mt-24 sm:mt-40 md:mt-56 lg:mt-64 xl:mt-64';
  return <div className="relative min-h-[100svh] py-100 flex items-center box-border pointer-events-none">
    <div data-section-anchor className="w-full max-w-content-lg xl:max-w-content mx-auto px-16 sm:px-30 md:px-32">
      <h2 className="t2 lg:t1 text-w100 text-left">{chapter.title}</h2>
      <div className="grid grid-cols-6 md:grid-cols-12 gap-x-grid-gutter sm:gap-x-grid-gutter-sm">
        {chapter.descriptionHtml
          ? <RichText className={`${subhead} text-w100 pointer-events-auto`} content={chapter.descriptionHtml} handle={chapter.handle} />
          : <div className={`${subhead} invisible min-h-[1lh]`} />}
      </div>
    </div>
  </div>;
}

function StandardChapter({ chapter, first, last, children }) {
  const showBackdrop = useStillBackdrop();
  const hasDrive = chapter.handle === 'developer' && edition.driveEasterEggEnabled;
  return <section id={chapter.handle} data-section-key={chapter.handle} tabIndex={-1} className="relative outline-none">
    {showBackdrop && (first
      ? <OpeningChapterPicture chapter={chapter} className="opening-chapter-poster" />
      : <ChapterBackdrop collection={chapter} />)}
    <Timeline stateUrl={chapter.theatreSheetUrl}>
      <Scene handle={chapter.handle} defaultPresetName={chapter.scenePresetName}>
        {children}
        {hasDrive && <DriveKey targetSceneHandle={chapter.drivePortalTargetSceneName} />}
      </Scene>
    </Timeline>
    {hasDrive && <DrivePortal sectionHandle={chapter.handle} stateUrl={edition.drivePortalTheatreSheetUrl} targetSceneHandle={chapter.drivePortalTargetSceneName} />}
    <ChapterTitle chapter={chapter} />
    <ContentSurface pinBottom={last} data-nav-trigger className="z-1 text-white pointer-events-auto">
      <ReleaseGrid chapter={chapter} />
    </ContentSurface>
  </section>;
}

export function Chapter({ chapter, first, last }) {
  return <FeatureProvider collection={chapter}>
    {feature => chapter.handle === 'retail'
      ? <RetailChapter collection={chapter} merchApiPath={`${editionPath}/api/merch`} pinBottom={last} featherTop={first}>{feature}</RetailChapter>
      : <StandardChapter chapter={chapter} first={first} last={last}>{feature}</StandardChapter>}
  </FeatureProvider>;
}
