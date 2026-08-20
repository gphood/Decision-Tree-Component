<?php
/**
 * @package     Joomla.Administrator
 * @subpackage  com_decisiontree
 *
 * @copyright   (C) 2026 GrantDev. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

namespace GrantDev\Component\DecisionTree\Administrator\Model;

\defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\MVC\Model\ListModel;
use Joomla\Database\ParameterType;
use GrantDev\Component\DecisionTree\Administrator\Service\TreeValidator;

class TreesModel extends ListModel
{
	public function __construct($config = [])
	{
		if (empty($config['filter_fields'])) {
			$config['filter_fields'] = [
				'id',
				'a.id',
				'title',
				'a.title',
				'alias',
				'a.alias',
				'state',
				'a.state',
				'created',
				'a.created',
				'modified',
				'a.modified',
				'ordering',
				'a.ordering',
			];
		}

		parent::__construct($config);
	}

	protected function populateState($ordering = 'a.title', $direction = 'asc'): void
	{
		$app = Factory::getApplication();
		$search = $app->getUserStateFromRequest($this->context . '.filter.search', 'filter_search');
		$this->setState('filter.search', $search);

		$published = $app->getUserStateFromRequest($this->context . '.filter.state', 'filter_state', '', 'string');
		$this->setState('filter.state', $published);

		parent::populateState($ordering, $direction);
	}

	protected function getListQuery()
	{
		$db = $this->getDatabase();
		$query = $db->getQuery(true)
			->select($db->quoteName(['a.id', 'a.title', 'a.alias', 'a.state', 'a.json_data', 'a.created', 'a.modified', 'a.ordering']))
			->from($db->quoteName('#__decisiontree_trees', 'a'));

		$search = (string) $this->getState('filter.search');

		if ($search !== '') {
			if (stripos($search, 'id:') === 0) {
				$id = (int) substr($search, 3);
				$query->where($db->quoteName('a.id') . ' = :id')
					->bind(':id', $id, ParameterType::INTEGER);
			} else {
				$search = '%' . str_replace(' ', '%', trim($search)) . '%';
				$query->where($db->quoteName('a.title') . ' LIKE :search')
					->bind(':search', $search);
			}
		}

		$published = $this->getState('filter.state');

		if ($published === '*') {
			// Show all states, including trashed records.
		} elseif (is_numeric($published)) {
			$published = (int) $published;
			$query->where($db->quoteName('a.state') . ' = :state')
				->bind(':state', $published, ParameterType::INTEGER);
		} elseif ($published === '') {
			$query->where($db->quoteName('a.state') . ' != -2');
		}

		$orderCol = $this->state->get('list.ordering', 'a.title');
		$orderDirn = $this->state->get('list.direction', 'asc');
		$query->order($db->escape($orderCol . ' ' . $orderDirn));

		return $query;
	}

	public function getItems()
	{
		$items = parent::getItems();

		foreach ($items as $item) {
			$this->addTreeSummary($item);
		}

		return $items;
	}

	private function addTreeSummary(object $item): void
	{
		$item->question_count = 0;
		$item->outcome_count = 0;
		$item->rich_block_outcome_count = 0;
		$item->rich_block_count = 0;
		$item->tree_data_valid = false;
		$item->path_error_count = 0;
		$item->path_warning_count = 0;

		$tree = json_decode((string) ($item->json_data ?? ''));

		if (json_last_error() !== JSON_ERROR_NONE || !\is_object($tree) || !isset($tree->questions) || !\is_object($tree->questions)) {
			return;
		}

		$item->tree_data_valid = true;
		$questions = get_object_vars($tree->questions);
		$item->question_count = \count($questions);
		$treeArray = json_decode((string) $item->json_data, true);

		if (\is_array($treeArray)) {
			$analysis = TreeValidator::analyse($treeArray);
			$item->path_error_count = \count($analysis['errors']);
			$item->path_warning_count = \count($analysis['warnings']);
		}

		foreach ($questions as $question) {
			if (!\is_object($question) || !isset($question->options) || !\is_array($question->options)) {
				continue;
			}

			foreach ($question->options as $option) {
				if (!\is_object($option) || !property_exists($option, 'result') || $option->result === null) {
					continue;
				}

				$item->outcome_count++;

				if (!\is_object($option->result) || empty($option->result->blocks) || !\is_array($option->result->blocks)) {
					continue;
				}

				$blockCount = \count(array_filter($option->result->blocks, static fn ($block): bool => \is_object($block)));

				if ($blockCount === 0) {
					continue;
				}

				$item->rich_block_outcome_count++;
				$item->rich_block_count += $blockCount;
			}
		}
	}
}
