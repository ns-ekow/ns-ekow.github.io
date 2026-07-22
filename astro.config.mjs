// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages deployment.
//
//  - User/org site (repo named `<username>.github.io`, served at the domain root):
//      site: 'https://<username>.github.io'   and leave `base` unset.
//
//  - Project site (any other repo name, served at /<repo>/):
//      site: 'https://<username>.github.io'   and set base: '/<repo>'.
//
// The layout builds every internal link from import.meta.env.BASE_URL, so
// flipping `base` is all you need to move between the two.
export default defineConfig({
  // User site (repo named ns-ekow.github.io) → served at the domain root, no `base`.
  site: 'https://ns-ekow.github.io',
});
