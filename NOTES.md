# com_decisiontree Notes

- This is a Joomla 5/6 component called `com_decisiontree`.
- Correct frontend template path is `site/tmpl/tree/default.php`.
- Do not move templates into `site/src/View/.../tmpl`.
- Frontend JSON should be output inside `script[type="application/json"]`.
- Frontend assets should be loaded using Joomla `WebAssetManager`.
- Keep code minimal and Joomla-conventional.

## Public Free Repository

- This public repository contains the free/core extension only.
- Pro-only implementation, packages, plugins and installer scripts live in the private Pro repository.
- Shared/free code remains in the existing component and content plugin paths:
  - `administrator`
  - `site`
  - `media`
  - `plugins/content/decisiontree`
- `build-installers.sh` creates the public free package only: `dist/pkg_decisiontree-<version>.zip`.
- The public repository must not generate `pkg_decisiontreepro`, include a `decisiontreepro` plugin, or contain Pro-only MVC implementation such as duplicate-tree tasks.
- The base/free package installer may keep harmless downgrade protection, such as blocking base package uninstall while a Pro add-on package is installed.
- Child extension installer scripts block direct uninstall while their owning package is installed. Uninstall the package rather than the component or plugins.
- Free edition limits are enforced centrally. Existing extra trees from a previous Pro install are left intact, but Free cannot create additional trees while over the limit.
- Pro feature hooks in shared code should stay inert without the private Pro implementation.

## Private Pro Repository Handoff

Move the following Pro-only files/code from the current private working copy or git history into the private Pro repository:

- `pkg_decisiontreepro.xml`
- `build/manifests/pkg_decisiontreepro.xml.in`
- `build/scripts/pkg_decisiontreepro.php`
- `pro/plugins/system/decisiontreepro/**`
- Pro build logic removed from `build-installers.sh`
- Duplicate Tree toolbar/action logic removed from `administrator/src/View/Trees/HtmlView.php`
- Duplicate Tree task removed from `administrator/src/Controller/TreesController.php`
- Duplicate Tree model methods removed from `administrator/src/Model/TreeModel.php`
- Duplicate Tree language strings removed from administrator language files

## Media Paths

Repository media paths:

- `media/css`
- `media/js`

Installed Joomla media paths:

- `media/com_decisiontree/css`
- `media/com_decisiontree/js`

When loading assets in Joomla, reference the installed Joomla media paths via `WebAssetManager`, not the raw repo paths.
