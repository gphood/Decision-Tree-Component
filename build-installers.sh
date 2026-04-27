#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$ROOT_DIR/dist"
VERSION="${VERSION:-1.0.0}"

COMPONENT_ZIP="$DIST_DIR/com_decisiontree_v${VERSION}.zip"
PLUGIN_ZIP="$DIST_DIR/plg_content_decisiontree_v${VERSION}.zip"

require_command() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "Required command not found: $1" >&2
		exit 1
	fi
}

build_component() {
	rm -f "$COMPONENT_ZIP"

	(
		cd "$ROOT_DIR"
		zip -qr "$COMPONENT_ZIP" \
			decisiontree.xml \
			script.php \
			administrator/access.xml \
			administrator/forms \
			administrator/language \
			administrator/services \
			administrator/sql \
			administrator/src \
			administrator/tmpl \
			media \
			site \
			-x '*/.DS_Store'
	)
}

build_plugin() {
	rm -f "$PLUGIN_ZIP"

	(
		cd "$ROOT_DIR/plugins/content/decisiontree"
		zip -qr "$PLUGIN_ZIP" \
			decisiontree.xml \
			script.php \
			services \
			src \
			language \
			-x '*/.DS_Store' '*.zip'
	)
}

require_command zip
mkdir -p "$DIST_DIR"

build_component
build_plugin

echo "Created:"
echo "  $COMPONENT_ZIP"
echo "  $PLUGIN_ZIP"
