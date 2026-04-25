<?php

namespace GrantDev\Component\DecisionTree\Administrator\Table;

\defined('_JEXEC') or die;

use Joomla\CMS\Language\Text;
use Joomla\CMS\Table\Table;
use Joomla\Database\DatabaseDriver;

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
			$this->setError(Text::_('COM_DECISIONTREE_ERROR_JSON_REQUIRED'));

			return false;
		}

		$tree = json_decode($jsonData);

		if (json_last_error() !== JSON_ERROR_NONE || !\is_object($tree)) {
			$this->setError(Text::_('COM_DECISIONTREE_ERROR_INVALID_JSON'));

			return false;
		}

		if (!property_exists($tree, 'start') || trim((string) $tree->start) === '') {
			$this->setError(Text::_('COM_DECISIONTREE_ERROR_JSON_START_REQUIRED'));

			return false;
		}

		if (!property_exists($tree, 'questions') || !\is_object($tree->questions)) {
			$this->setError(Text::_('COM_DECISIONTREE_ERROR_JSON_QUESTIONS_REQUIRED'));

			return false;
		}

		if (!property_exists($tree->questions, (string) $tree->start)) {
			$this->setError(Text::sprintf('COM_DECISIONTREE_ERROR_JSON_START_QUESTION_MISSING', (string) $tree->start));

			return false;
		}

		return true;
	}
}
