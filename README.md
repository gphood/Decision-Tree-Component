# Decision Tree for Joomla

A simple, flexible way to guide users through a series of questions and provide tailored outcomes.

Create interactive decision trees in the Joomla administrator and display them anywhere on your site using a content plugin.

## Features

- Build multi-step decision trees with branching logic
- User-friendly admin interface
- Display trees via menu item or inside articles
- Responsive frontend layout
- Optional heading control when embedding
- Lightweight and framework-free

## Installation

Install the current free package:

1. Go to System -> Install -> Extensions
2. Upload `pkg_decisiontree-1.2.1.zip`

Manual component/plugin installation is also supported:

1. Install the component:
   - Go to System -> Install -> Extensions
   - Upload `com_decisiontree-1.2.1.zip`
2. Install the content plugin:
   - Upload `plg_content_decisiontree-1.2.1.zip`
3. Enable the plugin:
   - Go to System -> Plugins
   - Search for `Decision Tree`
   - Enable `Content - Decision Tree`

## Creating a Decision Tree

1. Go to Components -> Decision Tree
2. Click New
3. Build your tree using the editor:
   - Add questions
   - Add options
   - Link options to other questions or results
4. Save your tree

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

## Build Packages

This public repository contains the free/core Decision Tree extension only. Pro-only implementation, installers and packaging live in the separate private Pro repository and must not be built or shipped from this repository.

```sh
./build-installers.sh
```

The public build creates:

- `dist/com_decisiontree-1.2.1.zip`
- `dist/plg_content_decisiontree-1.2.1.zip`
- `dist/pkg_decisiontree-1.2.1.zip`

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
