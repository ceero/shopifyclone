import React, { Suspense, useCallback, useState } from 'react';
import {
  ChapterPicker, ContentSurface, DriveExperience, Footer, ParticleBackground,
  SceneBoundary, StillBackground, VisibilityContext, sectionRegistry, useDriveState,
  useElementVisibility, useNavigationContrast, useMerchState, useSmoothScroll,
} from '../vendor/spring26/presentation.js';
import { n as useTier } from '../vendor/spring26/useTierStore-edsQsT8s.js';
import { edition, collections } from './content.js';
import { Chapter } from './Chapter.jsx';
import { MountainHero } from './MountainCover.jsx';

export function Experience() {
  useSmoothScroll();
  useNavigationContrast();
  const tier = useTier(state => state.tier);
  const driving = useDriveState(state => state.active);
  const merchOpen = useMerchState(state => state.isOpen);
  const [heroExited, setHeroExited] = useState(false);
  const updateVisibility = useCallback(entries => sectionRegistry.getState().updateVisibility(entries), []);
  const { visibilityRef } = useElementVisibility(updateVisibility);

  return <VisibilityContext value={visibilityRef}>
    <SceneBoundary componentName="Background" fallback={<StillBackground />}>
      {tier === 0 ? <StillBackground /> :
        <Suspense fallback={null}><ParticleBackground scenePresets={edition.scenePresets} /></Suspense>}
    </SceneBoundary>
    <ChapterPicker heroExited={heroExited} />
    <main inert={merchOpen} aria-hidden={merchOpen || driving || undefined}>
      {driving && <Suspense fallback={null}><DriveExperience /></Suspense>}
      <MountainHero onExitChange={setHeroExited} firstChapter={collections[0]} />
      {collections.map((chapter, i) => <SceneBoundary key={chapter.id} componentName={chapter.handle} fallback={null}>
        <Chapter chapter={chapter} first={i === 0} last={i === collections.length - 1} />
      </SceneBoundary>)}
    </main>
    <ContentSurface pinBottom data-section-key="outro" data-nav-trigger inert={merchOpen}
      aria-hidden={merchOpen || driving || undefined} className="z-1 -mt-px bg-b100 text-white">
      <Footer />
    </ContentSurface>
  </VisibilityContext>;
}
