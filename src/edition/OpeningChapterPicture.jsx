import React from 'react';

export function OpeningChapterPicture({ chapter, className, hidden }) {
  const desktop = chapter.desktopFallbackBackground?.url;
  const mobile = chapter.mobileFallbackBackground?.url;
  return <picture className={className} hidden={hidden} aria-hidden="true">
    {mobile && <source media="(max-width: 767px)" srcSet={mobile} />}
    <img src={desktop || mobile} alt="" decoding="async" />
  </picture>;
}
