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

The tests log in to Joomla admin, open Components -> Decision Tree, create a tree with the demo loader, reopen it, verify the builder state, then visit the frontend and click through to a result before using Reset.

The target site should not already contain a decision tree, because the free version only allows one tree.

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
