import { createConfig } from '@internal/docusaurus-theme/config';

import packageJson from '../package.json' with { type: 'json' };

export default createConfig({
  tool: 'outdated',
  title: 'Outdated',
  tagline: packageJson.description,
  version: packageJson.version,
  logo: 'img/outdated.svg',
});
