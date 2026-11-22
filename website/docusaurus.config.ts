import { createConfig } from '@internal/docusaurus-theme/config';

import packageJson from '../package.json' with { type: 'json' };

import type { ThemeConfig } from '@docusaurus/preset-classic';

const LOGO = 'img/outdated.svg';

const config = createConfig({
  tool: 'outdated',
  title: 'Outdated',
  tagline: packageJson.description,
  version: packageJson.version,
});
const themeConfig = config.themeConfig as ThemeConfig;
const AUTHOR = 'SPOT SOFT Łukasz Adamczyk';

export default {
  ...config,
  // detect: a .md page is CommonMark, never MDX, so a generated .md page compiles to no code.
  // Follow-up: the Theme's createConfig takes this over, and the override goes.
  markdown: { ...config.markdown, format: 'detect' },
  // The tool's own mark replaces the Theme's shared logo and favicon.
  favicon: LOGO,
  themeConfig: {
    ...themeConfig,
    navbar: { ...themeConfig.navbar, logo: { alt: config.title, src: LOGO } },
    // shortcut: links the author in the Theme's copyright text; move into the Theme so every site gets it
    footer: {
      ...themeConfig.footer,
      copyright: themeConfig.footer?.copyright?.replace(
        AUTHOR,
        `<a href="https://adamczyk.ovh/" style="color: var(--ifm-color-primary)" target="_blank" rel="noopener noreferrer">${AUTHOR}</a>`
      ),
    },
  },
};
