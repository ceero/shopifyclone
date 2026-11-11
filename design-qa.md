# Spring ’26 recreation verification

The custom mountain cover was checked in Chromium at [1440 × 900](verification/mountain-cover-desktop.jpg) and [390 × 844](verification/mountain-cover-mobile.jpg). Both production captures show the uploaded photograph and the summit-anchored title. Browser checks exercised pause/resume, reduced motion, the chapter index, and the arrow into Agentic. The original-edition comparisons below document the previous forest hero.

Tested on November 10, 2026 against the [live English edition](https://www.shopify.com/editions/spring2026) and the local development and production builds in the same Chromium-based in-app browser.

## Layout and content

The measurements cover the hero, ten chapter sections, and 219 article elements. The comparison used the document-relative x/y position, width and height of each element rounded to 0.1 CSS px. The content comparison covered each article’s ID, rendered text, link text, and href.

| CSS viewport | Document height on both sites | Matched bounds | Articles with matching text and links | Geometry evidence |
| --- | ---: | ---: | ---: | --- |
| 1440 × 900 | 38,915 px | 230 / 230 | 219 / 219 | [Desktop](verification/desktop-geometry.json) |
| 820 × 1180 | 46,885 px | 230 / 230 | 219 / 219 | [Tablet](verification/tablet-geometry.json) |
| 390 × 844 | 56,929 px | 230 / 230 | 219 / 219 | [Phone](verification/mobile-geometry.json) |

## Visual evidence

The reference and clone were captured at the same CSS viewport using the same browser screenshot API. For scrollable pages it returned 1425 × 891, 805 × 1158 and 375 × 812 pixel images respectively. The driving page produced 1440 × 900 images. Each source/implementation pair has identical pixel dimensions. Pixel comparisons used the unscaled decoded RGB captures. Contact sheets scale both sides equally for viewing.

| State | Source | Implementation | Paired view |
| --- | --- | --- | --- |
| Desktop hero | [Reference](verification/reference-desktop.jpg) | [Local](verification/local-desktop.jpg) | [Compare](verification/compare-desktop.jpg) |
| Tablet hero | [Reference](verification/reference-tablet.jpg) | [Local](verification/local-tablet.jpg) | [Compare](verification/compare-tablet.jpg) |
| Phone hero | [Reference](verification/reference-mobile.jpg) | [Local](verification/local-mobile.jpg) | [Compare](verification/compare-mobile.jpg) |
| Phone navigation | [Reference](verification/reference-mobile-menu.jpg) | [Local](verification/local-mobile-menu.jpg) | [Compare](verification/compare-mobile-menu.jpg) |
| Three-column media grid | [Reference](verification/reference-cards-desktop.jpg) | [Local](verification/local-cards-desktop.jpg) | [Compare](verification/compare-cards-desktop.jpg) |
| Developer release grid | [Reference](verification/reference-text-desktop.jpg) | [Local](verification/local-text-desktop.jpg) | [Compare](verification/compare-text-desktop.jpg) |
| Driving scene | [Reference](verification/reference-drive.jpg) | [Local](verification/local-drive.jpg) | [Compare](verification/compare-drive.jpg) |

- **Typography and copy.** National2 and ShopifyInter load locally. In both builds the sampled desktop release heading uses ShopifyInter at 14 px with 18.2 px line height. The phone text crop matches at every decoded pixel, including glyph positions, underlines, line endings and divider placement. [Native-size detail](verification/compare-type-detail.png)
- **Spacing and color.** The expanded phone menu and the sampled phone and tablet developer text views have zero differing RGB pixels across their entire captures. The desktop text capture has a mean absolute RGB difference of 0.49 on a 0–255 scale, including a different Editions-button hover state. [Phone text](verification/compare-text-mobile.jpg) · [Tablet text](verification/compare-text-tablet.jpg) · [Image measurements](verification/image-comparison.json)
- **Image quality and movement.** The animated forest, revolving title, product footage and racing model use the original assets. Independently timed frames vary with rotation, cursor position, particle simulation, device tier and clip playback. These comparisons assess composition, materials, alignment and motion. They do not establish frame-for-frame parity. [Mobile low-graphics comparison](verification/compare-mobile-fallback.jpg)

## Issues corrected during comparison

| Finding | Change | Recheck |
| --- | --- | --- |
| Initial WebGL build showed the loading screen or the wrong particle scene | Matched the React dispatcher used by the graphics reconciler and resolved the local scene presets, point clouds and worker decoder URLs | [Earlier local capture](verification/local-desktop-initial.jpg) · [Final desktop comparison](verification/compare-desktop.jpg) |
| A search result updated its hash while leaving the previous article in view | Added router scroll restoration | Selecting “Sidekick on Apple Watch” placed the target 50 px below the top edge |
| Deferred Rive requests received the app shell and POS textures used malformed URLs | Captured twenty animation manifests and linked resources, preserved the full video variants and used local texture paths | Visited all twenty card targets, checked the Finance feature canvas and exercised all four POS tabs. [POS capture](verification/local-pos.jpg) |
| The driving page initially stayed on its spinner | Used the installed Theatre package’s named exports and bundled the car, character and Draco decoders locally | The production driving page rendered its canvas and accepted keyboard input. [Driving comparison](verification/compare-drive.jpg) |

## Functional validation

- Exercised the edition dropdown, phone menu, keyboard-operable floating chapter picker, release lookup, grouped historical search results and hash navigation.
- Compared card labels and destinations throughout the document. Opened and dismissed the video overlay, including direct entry through a video URL. The hosted YouTube player initialized. [Player capture](verification/local-video.jpg)
- Opened the merchandise panel, changed quantity to two and checked the resulting official cart link. Exercised Add product, Custom discount, Add customer and Split payment. [Merchandise capture](verification/local-cap.jpg)
- Verified the no-WebGL mobile rendering path using the edition’s tier-zero switch. Both documents measured 56,893 px in that mode.
- Built the optimized bundle and opened its main and driving pages. The final production smoke pass completed without browser errors. Three.js emits a clock deprecation warning on the driving page, also present on the reference.
- Seven automated tests passed, including catalog/anchor completeness, local asset existence, Rive dependencies and build packaging.

## Remaining limits

Testing used emulated viewport sizes. Physical touch devices, Safari, Firefox, screen readers and the complete two-window driving sequence remain unverified. Search uses a local snapshot and ranking. The full videos, account flow, purchases, other editions and independent commerce demos depend on their original providers. Asset redistribution rights were not verified.

final result: passed
