#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$ROOT_DIR/dist"
BUILD_DIR="$ROOT_DIR/build/tmp"
VERSION="${VERSION:-1.2.1}"

COMPONENT_ZIP="$DIST_DIR/com_decisiontree-${VERSION}.zip"
CONTENT_PLUGIN_ZIP="$DIST_DIR/plg_content_decisiontree-${VERSION}.zip"
FREE_PACKAGE_ZIP="$DIST_DIR/pkg_decisiontree-${VERSION}.zip"

require_command() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "Required command not found: $1" >&2
		exit 1
	fi
}

usage() {
	echo "Usage: $0" >&2
	exit 1
}

stage_manifest() {
	local source_manifest="$1"
	local target_manifest="$2"

	sed "s/@VERSION@/${VERSION}/g" "$source_manifest" > "$target_manifest"
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
			-x '*/.DS_Store' \
			-x 'build/*'
	)
}

build_content_plugin() {
	rm -f "$CONTENT_PLUGIN_ZIP"

	(
		cd "$ROOT_DIR/plugins/content/decisiontree"
		zip -qr "$CONTENT_PLUGIN_ZIP" \
			decisiontree.xml \
			script.php \
			services \
			src \
			language \
			-x '*/.DS_Store' '*.zip'
	)
}

build_free_package() {
	local manifest="$BUILD_DIR/pkg_decisiontree.xml"

	rm -f "$FREE_PACKAGE_ZIP"
	stage_manifest "$ROOT_DIR/build/manifests/pkg_decisiontree.xml.in" "$manifest"
	stage_manifest "$ROOT_DIR/build/scripts/pkg_decisiontree.php" "$BUILD_DIR/pkg_decisiontree.php"

	(
		cd "$BUILD_DIR"
		zip -q "$FREE_PACKAGE_ZIP" pkg_decisiontree.xml pkg_decisiontree.php
	)

	zip -jq "$FREE_PACKAGE_ZIP" \
		"$COMPONENT_ZIP" \
		"$CONTENT_PLUGIN_ZIP" \
		-x '*/.DS_Store'
}

if [[ $# -gt 0 ]]; then
	usage
fi

require_command sed
require_command zip
mkdir -p "$DIST_DIR" "$BUILD_DIR"
rm -f "$BUILD_DIR"/*.xml

build_component
build_content_plugin
build_free_package

echo "Created:"
echo "  $COMPONENT_ZIP"
echo "  $CONTENT_PLUGIN_ZIP"
echo "  $FREE_PACKAGE_ZIP"
