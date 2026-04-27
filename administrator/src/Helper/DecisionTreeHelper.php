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

use Joomla\CMS\Factory;
use Joomla\Database\DatabaseInterface;

class DecisionTreeHelper
{
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
		return false;
	}

	public static function canCreateTree(): bool
	{
		if (self::isProEnabled()) {
			return true;
		}

		return self::getTreeCount() < 1;
	}

	public static function getCreateLimitMessageKey(): string
	{
		if (self::getTreeCount() > 0 && self::getActiveTreeCount() === 0) {
			return 'COM_DECISIONTREE_FREE_LIMIT_REACHED_TRASHED';
		}

		return 'COM_DECISIONTREE_FREE_LIMIT_REACHED';
	}

	public static function shouldShowListSearchTools(): bool
	{
		return true;
	}

	public static function getTreeCount(): int
	{
		$db = Factory::getContainer()->get(DatabaseInterface::class);
		$query = $db->getQuery(true)
			->select('COUNT(*)')
			->from($db->quoteName('#__decisiontree_trees'));

		$db->setQuery($query);

		return (int) $db->loadResult();
	}

	public static function getActiveTreeCount(): int
	{
		$db = Factory::getContainer()->get(DatabaseInterface::class);
		$query = $db->getQuery(true)
			->select('COUNT(*)')
			->from($db->quoteName('#__decisiontree_trees'))
			->where($db->quoteName('state') . ' != -2');

		$db->setQuery($query);

		return (int) $db->loadResult();
	}
}
