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

use Joomla\CMS\Factory;
use Joomla\CMS\Plugin\PluginHelper;
use Joomla\Database\DatabaseInterface;

class EditionService
{
	private const FREE_TREE_LIMIT = 1;
	private const PRO_TREE_LIMIT = 999999;

	public function isPro(): bool
	{
		return PluginHelper::isEnabled('system', 'decisiontreepro');
	}

	public function getTreeLimit(): int
	{
		return $this->isPro() ? self::PRO_TREE_LIMIT : self::FREE_TREE_LIMIT;
	}

	public function canCreateTree(): bool
	{
		return $this->getCurrentTreeCount() < $this->getTreeLimit();
	}

	public function isTreeLimitExceeded(): bool
	{
		return $this->getCurrentTreeCount() > $this->getTreeLimit();
	}

	public function canImportTree(): bool
	{
		return $this->canCreateTree() || $this->getCurrentTreeCount() > 0;
	}

	public function requiresImportReplacement(): bool
	{
		return !$this->canCreateTree() && $this->getCurrentTreeCount() > 0;
	}

	public function getCurrentTreeCount(): int
	{
		$db = Factory::getContainer()->get(DatabaseInterface::class);
		$query = $db->getQuery(true)
			->select('COUNT(*)')
			->from($db->quoteName('#__decisiontree_trees'));

		$db->setQuery($query);

		return (int) $db->loadResult();
	}

	public function getActiveTreeCount(): int
	{
		$db = Factory::getContainer()->get(DatabaseInterface::class);
		$query = $db->getQuery(true)
			->select('COUNT(*)')
			->from($db->quoteName('#__decisiontree_trees'))
			->where($db->quoteName('state') . ' != -2');

		$db->setQuery($query);

		return (int) $db->loadResult();
	}

	public function getCreateLimitMessageKey(): string
	{
		$limit = $this->getTreeLimit();

		if (!$this->canCreateTree() && $this->getActiveTreeCount() === 0) {
			return $limit === 1
				? 'COM_DECISIONTREE_FREE_LIMIT_REACHED_TRASHED'
				: 'COM_DECISIONTREE_FREE_LIMIT_REACHED_TRASHED_MULTIPLE';
		}

		return $limit === 1
			? 'COM_DECISIONTREE_FREE_LIMIT_REACHED'
			: 'COM_DECISIONTREE_FREE_LIMIT_REACHED_MULTIPLE';
	}
}
