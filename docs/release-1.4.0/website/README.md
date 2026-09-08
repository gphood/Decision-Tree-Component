# Decision Tree 1.4.0 — website content bundle

Prepared 8 September 2026. All fourteen article drafts are complete and ready for editorial review. No live articles, menus, payment settings, downloads or demo trees have been changed.

Open **index.html** to browse the drafts. Each preview contains the proposed copy and the assigned screenshots. It uses a simple light layout; the live Joomla template and embedded components still need their staging check before launch.

## Included

- `articles/`: complete HTML article bodies for the existing Joomla articles.
- `images/`: fourteen WebP screenshots, all administrator views in light mode.
- `page-map.json`: article IDs, proposed titles and descriptions, preserved aliases, destinations and publication status.
- `image-map.json`: image destinations, alternative text and dimensions.
- `preview/`, `index.html`, `review.css`: a portable local review gallery. These are review files, not a replacement Joomla template.
- `content-checks.json` and `verification.md`: checks performed and their limits.
- `snapshots/website-before.json`: local pre-edit copies of the relevant articles and menu records. Excluded from the distribution ZIP; not a complete website backup.

## Page-by-page changes

| Article | Page | Prepared changes |
| --- | --- | --- |
| 1 | Homepage | Current Free/Pro descriptions, canvas introduction, new visitor screenshot and links to guides. |
| 2 | Extensions overview | Updated edition summaries and screenshots; corrected obsolete Free details/demo links. |
| 3 | Free product | 1.4.0 highlights, shared canvas scope, screenshots, installation guidance; keeps 1.3.0 and earlier history. |
| 4 | Free demo | Clear visitor instructions, canvas explanation and illustration; keeps live tree 1. |
| 5 | Free documentation | Complete guide to installation, building, canvas controls, saving, previews, start questions, warnings, embedding and import/export. |
| 6 | Free download | 1.4.0 package/version wording, stable download link, requirements and Free-first Pro update instructions. |
| 7 | Starter templates | Corrected one-tree/import explanation; keeps live trees 4, 3 and 2 and existing JSON downloads. |
| 9 | Pro product | Image blocks, per-question/outcome previews, current screenshots and prerequisites; distinguishes existing analytics and retains version history. |
| 10 | Comparison | Seventeen feature rows, clear shared/Pro boundaries and an image-outcome example. |
| 11 | Pro demo | Keeps live tree 5; adds clearly labelled screenshots of the image outcome and branch preview. |
| 12 | Pro documentation | Complete guide for the existing empty article, including Download Keys, rich blocks, images/limits, previews, analytics, retention, migration and troubleshooting. |
| 13 | Buy Pro | Updated feature list and installation prerequisites; payment module and commercial terms preserved. |
| 14 | Pro downloads | Updated secure-download instructions; **keep unpublished**. |
| 16 | Documentation index | Direct links to both guides, starter templates and support. |

## Applying the approved copy

1. Take the launch website/database backup. The article snapshot included here does not replace it.
2. Upload the files in `images/` to **`/images/decision-tree/1.4.0/`** on the website. The filenames match the article HTML exactly.
3. Update the existing articles using the matching HTML fragments and metadata in `page-map.json`. Replace the whole article body rather than appending it. These fragments form the complete content; clear any old continuation/full-text content if present. Preserve existing aliases, categories, access settings and article display settings unless the page map explicitly identifies a change.
4. For the Pro guide, use **article 12**. Update existing menu **216** to `index.php?option=com_content&view=article&id=12`, preserving its alias/path. Publish that menu item at launch. Its current target is incorrectly article 5. Do not create a second guide article or menu route.
5. Keep **article 14 and menu 219 unpublished**. They are included so the dormant download page's copy is ready, without adding a new public download route.
6. Preserve the live Decision Tree tags in the demo and template articles, and preserve `{loadposition stripe-decision-tree-pro-buy}` in article 13. No demo tree data or payment module settings need changing for this copy update.
7. Preserve the inline spans in the Free guide's code examples. They keep the displayed shortcode copyable while preventing Joomla's Decision Tree content plugin from treating documentation examples as live embeds. Check the examples after saving through the article editor.
8. Apply the version-specific public copy alongside the verified 1.4.0 downloads and installed extensions. The Free download button keeps **`/download/decision-tree-free-latest`**; its target must deliver the final Free package. The Pro package remains protected through the existing Pro item/customer keys.
9. Check the finished pages in Joomla as a logged-out visitor, including navigation, headings, images, code examples, mobile layout, live demos and purchase-module placement. Confirm the Pro guide route works before exposing links to it from the product page and documentation index.

## Links and routes

All public article URLs are retained. Two obsolete Free links on the Extensions overview are replaced with the existing `/joomla-extensions/decision-tree-free` product and demo routes. The Free product's old demo link is also corrected. The Pro documentation link becomes valid when menu 216 is corrected and published.

The three legacy standalone download menu items **108, 109 and 125** still require their download-target review in the release checklist. They are distribution settings, not article copy; no proposed package URLs or checksums have been invented here.

## Purchase wording

The existing “Licence, Updates and Delivery” and “Refunds” section is retained verbatim, including its delivery/key wording. Its bytes were compared against the snapshot. The Stripe module position is unchanged. This bundle does not change prices, licence terms, refunds, subscriptions, payment configuration or customer emails.

## Images and demonstrations

The fourteen supplied images are real local captures, cropped for presentation. Captions and alternative text are included in each HTML fragment. The illustrated Pro outcome uses the NASA sample image supplied with Joomla; its visible image credit is retained. The analytics caption explicitly identifies its figures as local demonstration data: three starts and two completed runs.

Existing interactive website examples are retained. The new “Explore space” images are labelled illustrations; the demo pages do not imply that the existing live demo has been replaced by that example.

## Remaining before publication

- Grant's editorial review and any requested copy changes.
- Final Joomla staging check with the approved 1.4.0 installers and the uploaded images.
- Release backup, download-target activation and the existing Pro guide menu correction, in the release checklist's order.

There are no unwritten article sections or unresolved copy placeholders in this bundle. JED submission text and release-package verification are separate release tasks.
