import { createConfig } from '@internal/docusaurus-theme/config';

import packageJson from '../package.json' with { type: 'json' };

const config = createConfig({
  tool: 'outdated',
  title: 'Outdated',
  tagline: packageJson.description,
  version: packageJson.version,
});

// detect: a .md page is CommonMark, never MDX, so a generated .md page compiles to no code.
// Follow-up: the Theme's createConfig takes this over, and the override goes.
export default { ...config, markdown: { ...config.markdown, format: 'detect' } };
