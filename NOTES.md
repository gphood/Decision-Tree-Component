# com_decisiontree Notes

- This is a Joomla 5/6 component called `com_decisiontree`.
- Correct frontend template path is `site/tmpl/tree/default.php`.
- Do not move templates into `site/src/View/.../tmpl`.
- Frontend JSON should be output inside `script[type="application/json"]`.
- Frontend assets should be loaded using Joomla `WebAssetManager`.
- Keep code minimal and Joomla-conventional.

## Media Paths

Repository media paths:

- `media/css`
- `media/js`

Installed Joomla media paths:

- `media/com_decisiontree/css`
- `media/com_decisiontree/js`

When loading assets in Joomla, reference the installed Joomla media paths via `WebAssetManager`, not the raw repo paths.
