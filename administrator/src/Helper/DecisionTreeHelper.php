<?php

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

	public static function shouldShowListSearchTools(): bool
	{
		return self::isProEnabled();
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
}
