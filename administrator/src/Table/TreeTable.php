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
use Joomla\CMS\Table\Table;
use Joomla\Database\DatabaseDriver;
use GrantDev\Component\DecisionTree\Administrator\Service\TreeValidator;

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

		$analysis = TreeValidator::analyse($tree);

		if ($analysis['errors'] !== []) {
			$this->setError($analysis['errors'][0]);

			return false;
		}

		return true;
	}
}
