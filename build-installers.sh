#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$ROOT_DIR/dist"
BUILD_DIR="$ROOT_DIR/build/tmp"
VERSION="$(sed -n 's:.*<version>\([^<]*\)</version>.*:\1:p' "$ROOT_DIR/decisiontree.xml" | head -n 1)"

COMPONENT_ZIP="$DIST_DIR/com_decisiontree-${VERSION}.zip"
CONTENT_PLUGIN_ZIP="$DIST_DIR/plg_content_decisiontree-${VERSION}.zip"
FREE_PACKAGE_ZIP="$DIST_DIR/pkg_decisiontree-${VERSION}.zip"

require_command() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "Required command not found: $1" >&2
		exit 1
	fi
}

read_xml_version() {
	sed -n 's:.*<version>\([^<]*\)</version>.*:\1:p' "$1" | head -n 1
}

assert_version() {
	local label="$1"
	local actual="$2"

	if [[ "$actual" != "$VERSION" ]]; then
		echo "$label version mismatch: expected $VERSION, found ${actual:-missing}" >&2
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

validate_sources() {
	assert_version "Administrator manifest" "$(read_xml_version "$ROOT_DIR/administrator/decisiontree.xml")"
	assert_version "Content plugin manifest" "$(read_xml_version "$ROOT_DIR/plugins/content/decisiontree/decisiontree.xml")"
	assert_version "Package manifest" "$(read_xml_version "$ROOT_DIR/pkg_decisiontree.xml")"

	local asset_version
	asset_version="$(sed -n 's|.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*|\1|p' "$ROOT_DIR/media/joomla.asset.json" | head -n 1)"
	assert_version "Web asset registry" "$asset_version"
}

validate_packages() {
	assert_version "Component package manifest" "$(unzip -p "$COMPONENT_ZIP" decisiontree.xml | sed -n 's:.*<version>\([^<]*\)</version>.*:\1:p' | head -n 1)"
	assert_version "Content plugin package manifest" "$(unzip -p "$CONTENT_PLUGIN_ZIP" decisiontree.xml | sed -n 's:.*<version>\([^<]*\)</version>.*:\1:p' | head -n 1)"
	assert_version "Free package manifest" "$(unzip -p "$FREE_PACKAGE_ZIP" pkg_decisiontree.xml | sed -n 's:.*<version>\([^<]*\)</version>.*:\1:p' | head -n 1)"

	if unzip -Z1 "$FREE_PACKAGE_ZIP" | grep -qi 'decisiontreepro'; then
		echo "Free package unexpectedly contains Pro files" >&2
		exit 1
	fi
}

if [[ $# -gt 0 ]]; then
	usage
fi

require_command sed
require_command zip
require_command unzip
require_command grep

if [[ -z "$VERSION" ]]; then
	echo "Could not read the component version from decisiontree.xml" >&2
	exit 1
fi

mkdir -p "$DIST_DIR" "$BUILD_DIR"
rm -f "$BUILD_DIR"/*.xml

validate_sources
build_component
build_content_plugin
build_free_package
validate_packages

echo "Created:"
echo "  $COMPONENT_ZIP"
echo "  $CONTENT_PLUGIN_ZIP"
echo "  $FREE_PACKAGE_ZIP"
