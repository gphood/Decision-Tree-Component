<?php
/**
 * @package     Joomla.Administrator
 * @subpackage  com_decisiontree
 *
 * @copyright   (C) 2026 GrantDev. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

namespace GrantDev\Component\DecisionTree\Administrator\Service;

\defined('_JEXEC') or die;

final class TreeNormalizer
{
	/**
	 * Add identifiers required by the 1.1 tree format without removing unknown
	 * extension data or changing branch destinations.
	 */
	public static function normalize(array $tree): array
	{
		if (!isset($tree['questions']) || !\is_array($tree['questions'])) {
			return $tree;
		}

		foreach ($tree['questions'] as &$question) {
			if (!\is_array($question) || !isset($question['options']) || !\is_array($question['options'])) {
				continue;
			}

			$usedIds = [];

			foreach ($question['options'] as $option) {
				if (!\is_array($option) || !\array_key_exists('id', $option)) {
					continue;
				}

				$optionId = trim((string) $option['id']);

				if ($optionId !== '' && preg_match('/^[a-z0-9_]+$/', $optionId)) {
					$usedIds[$optionId] = true;
				}
			}

			$nextId = 1;

			foreach ($question['options'] as &$option) {
				if (!\is_array($option)) {
					continue;
				}

				if (\array_key_exists('id', $option) && trim((string) $option['id']) !== '') {
					$option['id'] = trim((string) $option['id']);
					continue;
				}

				do {
					$optionId = 'o' . $nextId;
					$nextId++;
				} while (isset($usedIds[$optionId]));

				$option['id'] = $optionId;
				$usedIds[$optionId] = true;
			}
			unset($option);
		}
		unset($question);

		$version = trim((string) ($tree['version'] ?? ''));

		if ($version === '' || version_compare($version, '1.1', '<')) {
			$tree['version'] = '1.1';
		}

		return $tree;
	}
}
