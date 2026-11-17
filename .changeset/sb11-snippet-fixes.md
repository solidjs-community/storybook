---
"storybook-solidjs-vite": patch
---

Fix several code snippet and component docs issues:

- A story whose args use a value built from other local names (for example `const label = prefix + '!'`) now gets a warning next to its snippet, saying which names could not be resolved. Before, the snippet looked complete but did not work when copied.
- A `render` function that reads parameters other than `args`, such as `(args, context) => …`, keeps those parameters in the snippet instead of leaving them undefined.
- Multi-line `children` added to a tag split over several lines are now indented to match the line they land on.
- Components imported with `import Button = require('./Button')`, or with `import Button = UI.Button` through a namespace import, now get their props in docs. A name that only points into a namespace declared in the story file is no longer listed as a component.
- Arg names written as computed keys (`['size']`, `` [`size`] ``) or as numbers now count as story args when docs decide which props to show.
