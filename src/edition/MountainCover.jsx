import React, { useEffect, useRef, useState } from 'react';
import cover from '../data/mountain-cover.json';
import { n as loading, t as assets } from '../vendor/spring26/useAssetLoadingStore-BjdwlLYn.js';
import { Hero } from '../vendor/spring26/presentation.js';
import { mountCover } from './cover-orbit.js';
import { OpeningChapterPicture } from './OpeningChapterPicture.jsx';
import './mountain-cover.css';

function MountainCover({ paused, firstChapter }) {
  const stage = useRef(null);
  const photo = useRef(null);
  const band = useRef(null);
  const drawing = useRef(null);
  useEffect(() => {
    // The photograph is the hero's critical asset on every graphics tier.
    const img = photo.current;
    const ready = () => assets.getState().markAssetLoaded('hero', cover.image);
    assets.getState().declareExpectedAssets('hero', [cover.image]);
    img.addEventListener('load', ready);
    img.addEventListener('error', ready);
    if (img.complete) ready();
    drawing.current = mountCover(stage.current, img, band.current, cover, () => loading.getState().isLoadingComplete);
    return () => {
      drawing.current.dispose();
      drawing.current = null;
      img.removeEventListener('load', ready);
      img.removeEventListener('error', ready);
      assets.getState().clearHandle('hero');
    };
  }, []);
  useEffect(() => drawing.current?.refresh(), [paused]);

  return <div ref={stage} className="mountain-cover" data-paused={paused || undefined}>
    <img ref={photo} src={cover.image} alt={cover.alt} fetchPriority="high"
      style={{objectPosition: cover.focal.map(n => n * 100 + '%').join(' ')}} />
    <div className="mountain-particles" aria-hidden="true" />
    <canvas ref={band} aria-hidden="true" />
    <OpeningChapterPicture chapter={firstChapter} className="opening-arrival" hidden />
    <canvas className="opening-wipe-fallback" hidden aria-hidden="true" />
    <h1>{cover.title}</h1>
  </div>;
}

export function MountainHero({ onExitChange, firstChapter }) {
  const [paused, setPaused] = useState(false);
  const label = paused ? 'Resume cover motion' : 'Pause cover motion';
  return <Hero onExitChange={onExitChange} artwork={<MountainCover paused={paused} firstChapter={firstChapter} />}
    coverControls={<div className="mountain-controls">
      <button type="button" className="mountain-pause" onClick={() => setPaused(!paused)}
        aria-label={label} title={label} data-paused={paused || undefined}>
        <span aria-hidden="true" />
      </button>
      <a href={'#' + firstChapter.handle} aria-label={'Read ' + firstChapter.title} title={'Read ' + firstChapter.title}>
        <span aria-hidden="true">↓</span>
      </a>
    </div>} />;
}
