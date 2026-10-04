# StateView
Loading, empty and error states in one voice.

**Provide:** `kind` (`loading` | `empty` | `error`), `title`, `body`, optional `action` + `onAction`.

- Loading uses the stepping `ChakraRing` and says WHAT is being computed ("Building factory topology"), never "Loading…".
- Empty states point to the next action; errors say what is missing and what the result now excludes.
- Error icon is `red` "!" on `red-soft` — never a full red panel. Never blame the user.
