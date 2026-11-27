The docs in website/docs are up to date for {{TAG}}. Now optimise them for search engines and AI answer engines (GEO), and write llms.txt. Review every page, whatever the release changed.

SEO front matter, on every .md page in website/docs:

- title: at most 60 characters, the page's subject first.
- description: 120 to 160 characters, unique to the page, naming the Tool and the question the page answers.
- keywords: 3 to 8 terms a developer would search for.
- Never add or change slug or id, or rename a file: published URLs must not move.
- Read website/src/pages, website/docusaurus.config.ts and package.json for the homepage's title, tagline and keywords, and keep the pages consistent with them.

website/static/llms.txt, written from scratch following https://llmstxt.org, for an AI model that has to answer questions about this Tool, often without fetching anything else:

- '# ' and the Tool's name, then a '> ' blockquote saying in one or two sentences what it does and for whom, with the terms people search for.
- Then, with no headings, short paragraphs and lists holding the facts a model most needs to answer correctly: the install command, the basic CLI call and its main options, the config file names, exit codes, the JavaScript API entry points, and the limits and gotchas users hit.
- Then '## Docs': one '- [Title](URL): what a reader learns there' line per current docs page, in sidebar order; then '## Optional' for secondary pages and the GitHub repository and npm package.
- URLs are absolute on {{SITE_URL}}: a page's URL is its route (website/docs/index.mdx is {{SITE_URL}}/docs/, website/docs/cli.md is {{SITE_URL}}/docs/cli), and only pages that exist are linked; versioned_docs are never linked.
- Factual and dense, no marketing, no HTML, under 8 KB, and in the same terms as the page descriptions.
