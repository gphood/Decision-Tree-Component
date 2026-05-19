<?php
/**
 * @package     Joomla.Administrator
 * @subpackage  com_decisiontree
 *
 * @copyright   (C) 2026 GrantDev. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

namespace GrantDev\Component\DecisionTree\Administrator\Helper;

\defined('_JEXEC') or die;

use GrantDev\Component\DecisionTree\Administrator\Service\EditionService;
use Joomla\CMS\Factory;
use Joomla\CMS\Filter\OutputFilter;
use Joomla\CMS\Language\Text;

class DecisionTreeHelper
{
	private static ?EditionService $editionService = null;

	public static function loadAdminLanguage(): void
	{
		Factory::getApplication()->getLanguage()->load(
			'com_decisiontree',
			JPATH_ADMINISTRATOR . '/components/com_decisiontree',
			null,
			true,
			true
		);
	}

	public static function isProEnabled(): bool
	{
		return self::getEditionService()->isPro();
	}

	public static function getTreeLimit(): int
	{
		return self::getEditionService()->getTreeLimit();
	}

	public static function getEditionLabel(): string
	{
		return self::isProEnabled()
			? Text::_('COM_DECISIONTREE_EDITION_PRO')
			: Text::_('COM_DECISIONTREE_EDITION_FREE');
	}

	public static function canCreateTree(): bool
	{
		return self::getEditionService()->canCreateTree();
	}

	public static function isTreeLimitExceeded(): bool
	{
		return self::getEditionService()->isTreeLimitExceeded();
	}

	public static function canImportTree(): bool
	{
		return self::getEditionService()->canImportTree();
	}

	public static function requiresImportReplacement(): bool
	{
		return self::getEditionService()->requiresImportReplacement();
	}

	public static function getCreateLimitMessageKey(): string
	{
		return self::getEditionService()->getCreateLimitMessageKey();
	}

	public static function getCreateLimitMessage(): string
	{
		$key = self::getCreateLimitMessageKey();

		if (self::getTreeLimit() === 1) {
			return Text::_($key);
		}

		return Text::sprintf($key, self::getTreeLimit());
	}

	public static function getTreeLimitExceededMessage(): string
	{
		return Text::_('COM_DECISIONTREE_TREE_LIMIT_EXCEEDED');
	}

	public static function shouldShowListSearchTools(): bool
	{
		return true;
	}

	public static function getTreeCount(): int
	{
		return self::getEditionService()->getCurrentTreeCount();
	}

	public static function getCurrentTreeCount(): int
	{
		return self::getEditionService()->getCurrentTreeCount();
	}

	public static function getActiveTreeCount(): int
	{
		return self::getEditionService()->getActiveTreeCount();
	}

	public static function createExportFilename(string $title): string
	{
		$filename = Factory::getApplication()->getLanguage()->transliterate($title);
		$filename = OutputFilter::stringURLSafe($filename);
		$filename = strtolower($filename);
		$filename = preg_replace('/[\s-]+/', '_', $filename);
		$filename = preg_replace('/[^a-z0-9_]+/', '', $filename);
		$filename = preg_replace('/_+/', '_', $filename);
		$filename = trim($filename, '_');

		if ($filename === '') {
			$filename = 'decision_tree_export';

			return $filename . '.json';
		}

		return $filename . '_decision_tree.json';
	}

	private static function getEditionService(): EditionService
	{
		if (self::$editionService === null) {
			self::$editionService = new EditionService();
		}

		return self::$editionService;
	}
}
