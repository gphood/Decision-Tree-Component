<?php
/**
 * @package     Joomla.Administrator
 * @subpackage  com_decisiontree
 *
 * @copyright   (C) 2026 GrantDev. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

namespace GrantDev\Component\DecisionTree\Administrator\Table;

\defined('_JEXEC') or die;

use Joomla\CMS\Language\Text;
use Joomla\CMS\Factory;
use Joomla\CMS\Table\Table;
use Joomla\Database\DatabaseDriver;
use GrantDev\Component\DecisionTree\Administrator\Service\TreeNormalizer;
use GrantDev\Component\DecisionTree\Administrator\Service\TreeValidator;
use Joomla\Event\Event;

class TreeTable extends Table
{
	public function __construct(DatabaseDriver $db)
	{
		parent::__construct('#__decisiontree_trees', 'id', $db);

		$this->setColumnAlias('published', 'state');
	}

	public function check(): bool
	{
		if (trim($this->title) === '') {
			$this->setError(Text::_('COM_DECISIONTREE_ERROR_TITLE_REQUIRED'));

			return false;
		}

		$jsonData = trim((string) $this->json_data);

		if ($jsonData === '') {
			$this->setError(Text::_('COM_DECISIONTREE_ERROR_NO_QUESTIONS'));

			return false;
		}

		$tree = json_decode($jsonData, true);

		if (json_last_error() !== JSON_ERROR_NONE || !\is_array($tree)) {
			$this->setError(Text::_('COM_DECISIONTREE_ERROR_INVALID_JSON'));

			return false;
		}

		$tree = TreeNormalizer::normalize($tree);
		$analysis = TreeValidator::analyse($tree);

		if ($analysis['errors'] !== []) {
			$this->setError($analysis['errors'][0]);

			return false;
		}

		$normalizedJson = json_encode($tree, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

		if ($normalizedJson === false) {
			$this->setError(Text::_('COM_DECISIONTREE_ERROR_INVALID_JSON'));

			return false;
		}

		$this->json_data = $normalizedJson;

		return true;
	}

	public function delete($pk = null): bool
	{
		$treeId = (int) ($pk ?? $this->getId());

		if (!parent::delete($pk)) {
			return false;
		}

		if ($treeId > 0) {
			Factory::getApplication()->getDispatcher()->dispatch(
				'onDecisionTreeAfterDelete',
				new Event('onDecisionTreeAfterDelete', [
					'subject' => $this,
					'treeId' => $treeId,
				])
			);
		}

		return true;
	}
}
