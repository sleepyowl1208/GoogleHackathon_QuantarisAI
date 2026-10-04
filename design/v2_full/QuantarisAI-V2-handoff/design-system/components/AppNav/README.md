# AppNav
The navigation rail: `nav-surface` navy with the reverse logo, the structural layer of the product.

**Provide:** `items` (`{id, label, index?, href?}` or `{section}` dividers), `active` (id), optional `onSelect(id)`.

- Index numbers (`00`, `01`…) in mono echo the scenario's stage order; keep them in product order.
- The active item gets a 3px `saffron` bar and `on-ashoka` text — the only saffron in the rail.
- Inactive items are `nav-muted` (7.9:1 on `nav-surface`). Don't add icons that duplicate the index, and never colour items green.
- Collapse to a 64px icon rail below 1024px wide; keep the active bar.
