# Button
Actions: `primary` is a saffron fill with `on-saffron` (navy) text — never white text on saffron.

**Provide:** `variant` (`primary` | `secondary` | `ghost` | `danger`), `size` (`md` | `sm`), optional `icon` (a glyph), children (verb-first label), plus any `<button>` attribute.

- One `primary` per view region — it is the single thing the screen is for ("Initiate simulation", "Run scenario").
- `ghost` (blue text) for navigation-like actions into evidence or detail.
- `danger` is outlined `red`, never a filled red.
- Labels are sentence case, verb first, no trailing punctuation.
