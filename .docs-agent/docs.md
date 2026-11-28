Update this Tool's documentation site in website/docs.
{{SCOPE}}
Source facts from the internal docs ({{SOURCES}}), not from memory.
In website/docs/index.mdx, set the Docs stamp to {{TAG}} (the 'Content is verified against' line).

Page structure, so search engines and AI answer engines can cite a page section by section:

- Split every page into H2 sections, phrased where natural as the question a developer asks ("What does exit code 1 mean?"), each answerable on its own.
- Every option or concept page shows at least one real command and its output or result.
- Every page's H1 says what the page covers, not only a single word (index.mdx stays the maintainer's, apart from the stamp).
- Never delete, merge or shrink existing pages or sections, or change their front matter or sidebar_position, unless this release made them wrong. Re-check every example against the released CLI.
