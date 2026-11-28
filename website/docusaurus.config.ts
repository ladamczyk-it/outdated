import { createConfig } from '@internal/docusaurus-theme/config';

import packageJson from '../package.json' with { type: 'json' };

const config = createConfig({
  tool: 'outdated',
  title: 'Outdated',
  tagline: packageJson.description,
  version: packageJson.version,
  logo: 'img/outdated.svg',
});

// og:image / twitter:image for every page; the Theme sets twitter:card=summary_large_image but no image.
export default { ...config, themeConfig: { ...config.themeConfig, image: 'img/social-card.png' } };
