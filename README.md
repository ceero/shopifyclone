# Shopify Editions · Spring ’26

A local recreation of the English Spring ’26 edition, including all ten chapters, 219 updates, six video deep links, the retail POS demo, merchandise panel, and developer driving page.

The opening cover uses the supplied mountain photograph and the “Spark and Zen.” title treatment from the local edition preview. The photo crop, summit anchor, ridge mask, and 42-second orbit are configured in [mountain-cover.json](src/data/mountain-cover.json). Those coordinates belong to this specific photograph. The title also works without WebGL, can be paused, and stands still when reduced motion is enabled.

## Run locally

Use Node.js 22.12 or later and npm. From this folder, run:

```sh
npm ci
npm run dev
```

Open [the edition](http://127.0.0.1:4173/editions/spring2026). The root URL also opens the edition. The [driving page](http://127.0.0.1:4173/editions/spring2026/drive) supports keyboard controls.

```sh
npm test
npm run build
npm run preview
```

The production build is in `dist/client`. A static server needs to serve `index.html` for application routes. Vite handles this for both development and preview.

## Project structure

| Location | Purpose |
| --- | --- |
| `src/main.jsx`, `src/App.jsx` | React Router, deep links, navigation and media overlays |
| `src/edition/` | Chapter composition, release layouts, scene orchestration and local search |
| `src/data/chapters/` | One editable content file per chapter, including links and media references |
| `src/data/scenes.json` | Camera, lighting, particle and transition presets |
| `src/vendor/spring26/` | Locally adapted published presentation components, WebGL/Rive rendering and motion libraries |
| `src/drive/` | Separate entry point for the driving window |
| `public/styles/` | Captured Tailwind output, responsive rules and original font declarations |
| `public/media/`, `public/animation-data/` | Original local assets and the twenty on-demand Rive manifests |
| `verification/` | Browser screenshots, paired visual comparisons and geometry reports |

The React/Vite shell owns the content and routing. The isolated presentation runtime preserves the original point-cloud simulation, camera choreography, shaders, 3D typography, and animated product artwork. The local adapter excludes the production analytics client. Site-owned assets and rendering code remain third-party material. Original media URLs are recorded in [the asset manifest](public/media/sources.json). Public access to a file does not establish a license to redistribute it.

## Runtime behavior

The page, search index, graphic assets, and driving scene run from local files. The search index covers all 219 current updates and a captured set of historical results. It uses local matching and ranking, so suggestions and ordering can differ from Shopify’s live service.

Documentation, account creation, checkout, standalone commerce demos, and other editions open their original destinations. Full-length videos use YouTube. These destinations require a network connection.

See [the verification report](design-qa.md) for measurements, screenshots, tested interactions, and test coverage.
