<?php

namespace GrantDev\Component\DecisionTree\Administrator\Model;

\defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\MVC\Model\ListModel;
use Joomla\Database\ParameterType;

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
			->select($db->quoteName(['a.id', 'a.title', 'a.alias', 'a.state', 'a.ordering']))
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
}
