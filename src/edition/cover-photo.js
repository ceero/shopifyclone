// Dimensions can be available while a JPEG is still downloading. Only hand it
// to the canvas after load + decode, and retry transient failures independently
// of the page's loading screen.
export function watchCoverPhoto(photo, source, { onReady, onSettled }) {
  const retryDelays = [250, 1000];
  let ready = false, disposed = false, settled = false, attempts = 0;
  let timer = null, generation = 0;

  function settle() {
    if (!settled) { settled = true; onSettled(); }
  }
  function failed() {
    if (disposed || ready || timer !== null) return;
    generation++;
    if (attempts === retryDelays.length) { settle(); return; }
    timer = setTimeout(() => {
      timer = null;
      const url = new URL(source, photo.ownerDocument.baseURI);
      url.searchParams.set('cover-retry', String(++attempts));
      photo.src = url.href;
    }, retryDelays[attempts]);
  }
  async function loaded() {
    if (disposed || ready || !photo.complete || !photo.naturalWidth) return;
    const current = ++generation;
    try {
      await photo.decode();
    } catch {
      if (!disposed && current === generation) failed();
      return;
    }
    if (disposed || current !== generation) return;
    clearTimeout(timer);
    timer = null;
    ready = true;
    settle();
    onReady();
  }

  photo.addEventListener('load', loaded);
  photo.addEventListener('error', failed);
  if (photo.complete) {
    if (photo.naturalWidth) loaded();
    else failed();
  }
  return {
    get ready() { return ready; },
    dispose() {
      disposed = true;
      clearTimeout(timer);
      photo.removeEventListener('load', loaded);
      photo.removeEventListener('error', failed);
    },
  };
}
