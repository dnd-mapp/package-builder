# Agent instructions

## Writing style

- Never hard wrap prose. Write each paragraph or list item on a single line and let the editor wrap it.
- Use US spelling only, for example "color", "behavior", and "initialize".
- Keep every sentence at or under 40 words.
- Pretty print Markdown tables so the columns line up in the source.
- Give every separator line alignment markers (`:---`, `:---:`, or `---:`).
- Carry the separator line from edge to edge of each column, with no spaces between the pipes and the dashes.

Example:

| Option   | Default  | Description               |
|:---------|:---------|:--------------------------|
| `strict` | `true`   | Enables all strict checks |
| `target` | `es2025` | Emitted language version  |

After creating or updating a file that contains prose, including Markdown files, do reading passes over it until every rule above is satisfied. Fix any violation you find, then read the file again.

## Pull requests

Turn on auto-merge for every pull request you open, so it merges as soon as it is approved and the checks pass.

1. Open the pull request with `gh pr create`.
2. Run `gh pr merge <number> --auto --merge` on it. A merge commit is the only merge method the repository allows.

- A draft cannot have auto-merge. Mark it ready with `gh pr ready <number>` first, then run the command above.
- When the user asks to keep a pull request open, leave auto-merge off. If it is already on, turn it off with `gh pr merge <number> --disable-auto`.
- Release pull requests (`chore: release X.Y.Z`) come from the Prepare release workflow, which turns on auto-merge itself. Do not prepare a release commit by hand. The release starts only when the maintainer pushes the `vX.Y.Z` tag on the merge commit by hand, as `CONTRIBUTING.md` describes.
