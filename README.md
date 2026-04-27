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

1. Install the component:
   - Go to System -> Install -> Extensions
   - Upload `com_decisiontree-1.0.0.zip`
2. Install the content plugin:
   - Upload `plg_content_decisiontree-1.0.0.zip`
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

To create additional trees, a Pro version will be available.

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
A Pro version with additional capabilities will be available separately.

## Support

For support and questions please use https://github.com/gphood/Decision-Tree-Component/issues
