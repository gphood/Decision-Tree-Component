<?php

namespace GrantDev\Component\DecisionTree\Site\Model;

\defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\MVC\Model\ItemModel;
use Joomla\Database\ParameterType;

class TreeModel extends ItemModel
{
	protected $_item;

	public function getItem($pk = null)
	{
		$pk = $pk ?: (int) Factory::getApplication()->getInput()->getInt('id');

		if ($this->_item === null) {
			$db = $this->getDatabase();
			$query = $db->getQuery(true)
				->select($db->quoteName(['id', 'title', 'alias', 'description', 'json_data']))
				->from($db->quoteName('#__decisiontree_trees'))
				->where($db->quoteName('id') . ' = :id')
				->where($db->quoteName('state') . ' = 1')
				->bind(':id', $pk, ParameterType::INTEGER);

			$db->setQuery($query);
			$this->_item = $db->loadObject();
		}

		return $this->_item;
	}
}
