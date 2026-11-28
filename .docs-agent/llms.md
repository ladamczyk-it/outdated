The docs in website/docs are up to date for {{TAG}}. Now optimise them for search engines and AI answer engines (GEO), and write llms.txt. Review every page, whatever the release changed.

SEO front matter, on every .md page in website/docs:

- title: at most 60 characters, keyword-led with the page's subject first ("<Tool> CLI options and exit codes"); the theme uses it as the page's <title>.
- description: 120 to 160 characters, unique to the page, naming the Tool and the question the page answers.
- keywords: 3 to 8 terms a developer would search for.
- Never add or change slug or id, or rename a file: published URLs must not move.
- When only front matter needs to change, change only front matter: never shrink or merge sections.
- Read website/src/pages, website/docusaurus.config.ts and package.json for the homepage's title, tagline and keywords, and keep the pages consistent with them.

website/static/llms.txt, written from scratch following https://llmstxt.org, for an AI model that has to answer questions about this Tool, often without fetching anything else:

- '# ' and the Tool's name, then a '> ' blockquote saying in one or two sentences what it does and for whom, with the terms people search for.
- Then the line 'Full docs: {{SITE_URL}}/llms-full.txt (each page also as Markdown at <page URL>.md)'. The theme builds both; never write llms-full.txt.
- Then, with no headings, short paragraphs and lists holding the facts a model most needs to answer correctly: the install command, the basic CLI call and its main options, the config file names, exit codes, the JavaScript API entry points, and the limits and gotchas users hit.
- Then '## Docs': one '- [Title](URL): what a reader learns there' line per current docs page, in sidebar order; keep a line for every page that exists, hand-added ones included. Then '## Optional' for secondary pages and the GitHub repository and npm package, followed always by '- [Author's tools](https://adamczyk.ovh/llms.txt): hub llms.txt listing qoq and its sibling tools' and, for every Tool except qoq, a '- [qoq](https://qoq.adamczyk.ovh/): ' line with one sentence on how the Tool runs inside qoq.
- URLs are absolute on {{SITE_URL}}: a page's URL is its route (website/docs/index.mdx is {{SITE_URL}}/docs/, website/docs/cli.md is {{SITE_URL}}/docs/cli), and only pages that exist are linked; versioned_docs are never linked.
- Factual and dense, no marketing, no HTML, under 8 KB, and in the same terms as the page descriptions.
