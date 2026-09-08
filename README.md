# Decision Tree for Joomla

A simple, flexible way to guide users through a series of questions and provide tailored outcomes.

Create interactive decision trees in the Joomla administrator and display them anywhere on your site using a content plugin.

## Features

- Build multi-step decision trees with branching logic
- Switch between the form builder and a visual canvas of the same decision tree
- Arrange question and outcome cards, inspect connections and resolve path warnings visually
- Add, edit, duplicate, delete and set the start question directly from the canvas
- Navigate questions using readable question previews
- Preview unsaved trees before publishing
- Duplicate individual questions and their options
- Reorder and collapse answer options while editing
- Copy article embed tags directly from the tree list or editor
- Detect broken links, loops, unreachable questions and incomplete paths
- Optionally show the current step on the frontend
- Keep keyboard focus aligned with each newly displayed question or result
- Listen for versioned frontend interaction events from compatible add-ons
- Import and export reusable Decision Tree JSON files
- Review question, outcome and path-health summaries from the tree list
- Display trees via menu item or inside articles
- Show helpful missing-tree guidance to authorised administrators
- Responsive frontend layout
- Optional heading control when embedding
- Lightweight and framework-free

## Installation

Install the current free package:

1. Go to System -> Install -> Extensions
2. Upload `pkg_decisiontree-1.4.0.zip`

Manual component/plugin installation is also supported:

1. Install the component:
   - Go to System -> Install -> Extensions
   - Upload `com_decisiontree-1.4.0.zip`
2. Install the content plugin:
   - Upload `plg_content_decisiontree-1.4.0.zip`
3. Enable the plugin:
   - Go to System -> Plugins
   - Search for `Decision Tree`
   - Enable `Content - Decision Tree`

## Creating a Decision Tree

1. Go to Components -> Decision Tree
2. Click New
3. Build your tree using the editor:
	- Add questions
	- Duplicate existing questions when useful
	- Add options
	- Reorder or collapse options as needed
	- Link options to other questions or results
	- Preview the current unsaved tree
4. Review the path-health message and save your tree

### Visual Canvas

Select **Visual canvas** in the builder to see questions, outcomes and the paths
between them. The canvas and form builder edit the same tree, so you can switch
between them at any time without converting or duplicating content.

From the canvas you can:

- drag questions and outcomes into a useful layout;
- pan the background and zoom, fit or automatically arrange the tree;
- open a question in the editing modal by double-clicking it or selecting **Edit question**;
- select **Edit outcome** to open the same modal at the exact option that produces an outcome;
- add, duplicate and delete questions, or set a different start question;
- inspect warnings for unreachable questions, missing connections and incomplete options.

Selecting **Done** in the question modal updates the current unsaved tree. Use
Joomla's main **Save** button to persist tree content and canvas positions. Pro
rich-outcome blocks, including images selected from Joomla's Media Manager,
remain available in the modal and are preserved in canvas previews, duplication
and saving. Pro also adds **Preview from here** to question cards and **Preview
outcome** to outcome cards.

See [Visual canvas guide](docs/1.4.0-visual-canvas.md) for controls, keyboard
operation and Free/Pro behavior.

## Displaying a Decision Tree

### Option 1: Menu Item

Create a menu item pointing to:

Decision Tree -> Single Tree

### Option 2: Embed in Article

Use the content plugin:

```text
{decisiontree id=1}
```

Replace `1` with your tree ID.

## Plugin Options

### Hide the Heading

```text
{decisiontree id=1 heading=false}
```

### Set Heading Level

```text
{decisiontree id=1 heading_level=h3}
```

- Default: `h2`
- Allowed: `h1` to `h6`
- Invalid values fall back to `h2`

## Free Version Limit

The free version allows one decision tree.

Existing additional trees are not deleted when moving from Pro back to Free, but Free installs cannot create additional trees while the one-tree limit is reached.

If you need multiple decision trees, richer outcome content and additional productivity features, please see Decision Tree Pro: https://granthood.co.uk/joomla-extensions/decision-tree-pro

### Updating Free and Pro

Update Free first, then Pro. Free 1.4.0 has been tested with Pro 1.3.0 on Joomla 5
and Joomla 6: existing Pro features remain available while you wait to update
the add-on. Pro 1.4.0 requires Free 1.4.0 or later. Its new image blocks and
per-node previews become available after updating Pro.

Free releases must pass the previous-Pro compatibility gate described in
`TESTING.md` before release. The versions do not need to match to retain existing
Pro access.

## Build Packages

This public repository contains the free/core Decision Tree extension only. Pro-only implementation, installers and packaging live in the separate private Pro repository and must not be built or shipped from this repository.

```sh
./build-installers.sh
```

The public build creates:

- `dist/com_decisiontree-1.4.0.zip`
- `dist/plg_content_decisiontree-1.4.0.zip`
- `dist/pkg_decisiontree-1.4.0.zip`

The build script intentionally does not create any Pro package. If Pro is installed on a site, uninstall the Pro add-on before uninstalling the free/base package.

Do not uninstall the component or plugins directly from Extensions Manager while their package is installed. Their installer scripts will block that path and ask you to uninstall the package instead.

## Example Use Cases

- Product or service selection
- Guided support flows
- Eligibility checks
- FAQs with branching logic

## Requirements

- Joomla 5.x or 6.x (tested)
- PHP 8.1+

## License

This extension is released as a free version.
Pro features are maintained separately in a private repository.

## Support

For support and questions please use https://github.com/gphood/Decision-Tree-Component/issues
