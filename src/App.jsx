import React from 'react';
import { Experience } from './edition/Experience.jsx';
import { LoadingOverlay, Navigation, VideoDialog } from './vendor/spring26/presentation.js';
import { t as BrowserSpecs } from './vendor/spring26/BrowserSpecs.js';
import { t as TierResolver } from './vendor/spring26/TierResolver-CkiufdAJ.js';
import { Tooltip } from './vendor/spring26/Tooltip.js';
import './edition/header-brand.css';

export function App() {
  return <>
    <BrowserSpecs mobileBreakpoint={767} />
    <LoadingOverlay />
    <Navigation />
    <VideoDialog />
    <TierResolver />
    <Experience />
    <Tooltip />
  </>;
}
