<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Domain logic lives in pure functions in src/lib/inventory.ts; UI state uses the localStorage store in src/lib/store.ts — keeps the app portable and lets storage be swapped for a backend later.
- Photo identification runs in a server function (src/lib/identify.functions.ts) that returns a list of detected items with catalog ids only; the user confirms them into a sale cart sold atomically via sellMany — keeps the AI key server-side and prevents invented products or partial sales.
- Account profiles, business branding and team access live in Cloud with RLS; roles stay separate from profiles and privileged user actions verify the caller through authenticated RPCs before loading the admin client.
- AccountProvider owns the single auth identity subscriber and settings query; private logos and avatars use signed storage URLs so uploads stay scoped to their owner or business.
- Inventory state is one shared JSON document per business in Cloud (business_inventory), cached in localStorage by src/lib/store.ts; members read it, sales/inventory users write it, so per-item field protection is UI-only until it is normalized into tables.

- Calculator display names belong to business settings and use the existing business RLS policies, so the team shares administrator-managed labels without changing cost formulas.
- New-item photo analysis shares an authenticated, inventory-authorized server function and camera confirmation UI for products and supplies; supply suggestions update only name and description, never quantities or costs, and saving stays explicit and separate from sales catalog identification.
