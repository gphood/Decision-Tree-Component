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

The browser tests log in to Joomla admin, open Components -> Decision Tree, create a tree with the demo loader, verify readable question labels, path health, option collapsing, option reordering, question duplication, embed-tag copying and unsaved preview, then reopen the tree and exercise step numbering, keyboard focus, Back, Reset and the versioned interaction events on the frontend. They also confirm that missing-tree guidance is visible to authorised frontend administrators but not public visitors.

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
controls are not shown.
