# Testing

This project includes a small Playwright e2e suite for the local Joomla dev site.

## Environment

Set these variables before running the tests:

```sh
export JOOMLA_ADMIN_URL="https://dev.docker/administrator"
export JOOMLA_ADMIN_USER="your-admin-username"
export JOOMLA_ADMIN_PASS="your-admin-password"
export DECISIONTREE_FRONTEND_BASE_URL="https://dev.docker"
```

Credentials are intentionally not hard-coded.

## Install

```sh
npm install
npx playwright install chromium
```

## Run

```sh
npm run test:e2e
```

Run the standalone path validator checks with:

```sh
php tests/tree-validator.php
```

The browser tests log in to Joomla admin, open Components -> Decision Tree, create a tree with the demo loader, and exercise both the form builder and visual canvas. Canvas coverage includes node and connection rendering, outcome-card layout, warnings, direct question and outcome editing, duplication, deletion, changing the start question, keyboard movement, pan and zoom, auto-layout, saved positions and view restoration. The direct-outcome check verifies that the correct parent question and option are opened, expanded and focused. The suite also verifies readable question labels, path health, option collapsing, option reordering, embed-tag copying and unsaved preview, then reopens the tree and exercises step numbering, keyboard focus, Back, Reset and the versioned interaction events on the frontend. It confirms that missing-tree guidance is visible to authorised frontend administrators but not public visitors.

When Pro is not installed, the target site should not already contain a decision
tree because the Free edition allows one tree. Existing trees are fine when Pro
is enabled; the suite reopens its saved tree by ID so pagination does not affect
the result.

The frontend suite also verifies backward-compatible result rendering and the
generic structured-result extension hook used by compatible add-ons. A focused
interaction test verifies step numbering, Back and Reset history, all five
versioned browser events and the creation of a fresh run ID after Reset.

## Joomla 6

To run the same suite against a Joomla 6 test site, create `.env.joomla6.local`:

```sh
JOOMLA_ADMIN_URL="https://joomla-6-test.docker/administrator"
JOOMLA_ADMIN_USER="your-admin-username"
JOOMLA_ADMIN_PASS="your-admin-password"
DECISIONTREE_FRONTEND_BASE_URL="https://joomla-6-test.docker"
```

Then run:

```sh
npm run test:e2e:joomla6
```

## Joomla 6 Free-only site

`https://decision-tree-free-6.docker` is the dedicated Joomla 6 site for testing
Decision Tree Free without Pro installed. It uses the administrator credentials
from `.env.joomla6.local`.

Run the full suite plus the Free-edition boundary checks with:

```sh
npm run test:e2e:free-joomla6
```

The Free-only suite reuses its existing automated-test tree so repeated runs do
not have to delete data. It confirms the one-tree limit is active and that
Analytics, Duplicate Tree, per-tree analytics links and Pro rich-content
controls, Image blocks and per-node preview actions are not shown.

## 1.4.0 release matrix

Run all five installed-site configurations before release:

1. `npm run test:e2e` — Joomla 5 with Pro.
2. `npm run test:e2e:joomla6` — Joomla 6 with Pro.
3. `npm run test:e2e:free-joomla6` — Joomla 6 Free-only.
4. `npm run test:compatibility` — isolated Joomla 5, Free 1.4.0 + Pro 1.3.0.
5. `npm run test:compatibility` — isolated Joomla 6, Free 1.4.0 + Pro 1.3.0.

The two matching-version Pro runs must pass the rich-outcome canvas preservation test, including
selecting a real local image through Joomla's Media Manager, previewing it from
question and outcome cards, and preserving it after save/reload. They skip only
the dedicated Free-boundary test. The Free-only run must pass the edition
boundary test and skip only the Pro rich-outcome test.

### Required Free-first compatibility gate

Use a disposable copy of each Joomla test site with **separate files and database
tables**, administrator credentials, and a working frontend. Do not use a live
site, a shared development mount or customer data: this suite installs older
packages, creates trees and enables anonymous analytics on the copy.

Set `JOOMLA_ADMIN_URL`, `JOOMLA_ADMIN_USER`, `JOOMLA_ADMIN_PASS` and
`DECISIONTREE_FRONTEND_BASE_URL` for that copy, then supply the actual release ZIPs:

```sh
export DECISIONTREE_DISPOSABLE_SITE=1
export DECISIONTREE_PREVIOUS_FREE_ZIP="$PWD/dist/archive/pkg_decisiontree-1.3.0.zip"
export DECISIONTREE_PREVIOUS_PRO_ZIP="$PWD/../decision-tree-pro/dist/pkg_decisiontreepro-1.3.0.zip"
export DECISIONTREE_CURRENT_FREE_ZIP="$PWD/dist/pkg_decisiontree-1.4.0.zip"
export DECISIONTREE_CURRENT_PRO_ZIP="$PWD/../decision-tree-pro/dist/pkg_decisiontreepro-1.4.0.zip"
npm run test:compatibility
```

Use the published Free 1.3.0 ZIP from GitHub, not a locally rebuilt ZIP with the
same version. The suite pins both previous-package checksums and fails before
installation if either differs. Pro's archived package was also verified against
all 18 plugin files in its 1.3.0 release commit. Keep these archived packages when
building the next release.

The suite requires all inputs and must pass without skips. It uses Joomla's
package installer and verifies installed versions at each stage:

1. Install Free/Pro 1.3.0, save heading/text/list/button outcomes and fallback
   links, and record a real anonymous frontend completion. Verify Pro 1.4.0 is
   refused while Free is still 1.3.0 and that the old installation is intact.
2. Update only Free to 1.4.0. Verify the saved outcome and existing analytics,
   edit rich content in the canvas, duplicate a question, switch editing views,
   preview, save/reload, preserve layout and duplicate the whole tree. Confirm
   new Pro image/per-node-preview controls are absent. Record another frontend
   completion and verify it appears alongside the original.
3. Update Pro to 1.4.0. Verify content, layout and analytics survive, the new
   preview hooks work, and another completion is recorded.

Run this on both supported Joomla majors in addition to the matching-version
and Free-only suites. Preserve package SHA-256 checksums, Joomla/PHP versions,
source revisions, test results and intentional skips in the release evidence.
Check update keys/settings, menu links and article embeds during the wider
installer matrix; this focused gate does not replace those checks. Tear down the
disposable copies after recording results. The compatibility contract is in
`NOTES.md`; a mixed-version failure blocks the Free release.
