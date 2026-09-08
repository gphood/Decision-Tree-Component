# Website copy verification — 8 September 2026

## Completed

- Read the fourteen relevant live articles and their Decision Tree/documentation menu destinations through a read-only SSH query. Saved the pre-edit records locally.
- Checked feature descriptions against the current Free/Pro README files, canvas guide, administrator controls, rich-block renderer, Pro image settings and analytics implementation.
- Verified Free and Pro feature boundaries: the canvas and question actions are shared; whole-tree duplication, image/rich blocks, per-node previews and analytics are Pro.
- Checked installation order and Download Key instructions against the Pro manifest and README.
- Checked image defaults against the Pro manifest: 500 KB warning, 2,048 KB maximum, 2,400-pixel width warning and 25-megapixel maximum; checked supported formats and displayed sizes.
- Checked analytics defaults against the Pro configuration: collection off, logged-in users excluded, 180-day retention. Reports and 30-minute drop-off explanation match the implementation/current UI.
- Parsed all fourteen article fragments: no duplicate anchors, missing cross-page anchors, missing image files, empty image alternative text or unfinished copy markers.
- Verified all three displayed embed-code examples are copyable and the article source does not contain executable Decision Tree shortcodes in those examples.
- Verified existing live demo tags, template-download URLs and the Stripe module position are retained.
- Compared the purchase article's existing commercial section byte-for-byte with the saved source; unchanged.
- Verified 1.3.0, 1.2.4, 1.2.3 and 1.2.2 remain in the product histories, with 1.4.0 presented separately.
- Inspected the Pro guide and comparison in the desktop browser preview. The Free guide, Pro guide and comparison had no page-level horizontal overflow at a 390-pixel mobile width. Reset the temporary viewport afterwards.
- Checked screenshot placement in the desktop guide preview; no loaded image failures were reported. All referenced image files are included locally.

## Scope of these checks

The HTML is prepared article content, not a replacement website template. The local preview does not execute Joomla content plugins, the live demo trees, payment modules or extension updates. Validate these in the actual Joomla staging/launch check. The existing Pro documentation route is intentionally not live until its menu is corrected and published.

No production articles, menus, extension code, download items, customer keys or payment settings were written during preparation. No purchase, download or customer-message flow was triggered.

## Production publication and follow-up checks

Grant approved publication on 8 September 2026. Applied all fourteen article bodies and metadata, uploaded and checksum-verified fourteen screenshots, corrected/published Pro guide menu 216, and retained article 14/menu 219 as unpublished. A fresh private server backup was saved before edits. Saved article HTML matched the prepared content exactly; payment modules and download settings were unchanged.

All thirteen public pages passed browser checks for current metadata, loaded screenshots and alternative text, no uncaught JavaScript errors, and no horizontal overflow at 390 pixels. Documentation shortcodes rendered as text, with existing demo embeds preserved. The Stripe purchase module retained the £25 price and its Buy button was visible, enabled and fully opaque after loading; no checkout or payment was submitted.

Grant then noted that screenshot controls looked like working page content. Added consistent shaded frames, borders and “Screenshot” labels to all 21 placements across nine pages. Those nine pages passed a second layout/image check and the mobile framing was visually inspected. Checked all 30 internal link/image destinations and 91 references, including guide anchors, template JSON files and the Free ZIP checksum. Joomla correctly renders the stored relative contact/template URLs as root-relative links; no link content correction was needed.

Machine-readable evidence is in `live-verification.json`. Customer update-feed and Pro download activation remain separate steps.
