<?php

namespace GrantDev\Component\DecisionTree\Administrator\Model;

\defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\MVC\Model\AdminModel;
use Joomla\Utilities\ArrayHelper;

class TreeModel extends AdminModel
{
	public $typeAlias = 'com_decisiontree.tree';

	protected $text_prefix = 'COM_DECISIONTREE';

	public function getTable($name = 'Tree', $prefix = 'Administrator', $options = [])
	{
		return parent::getTable($name, $prefix, $options);
	}

	public function getForm($data = [], $loadData = true)
	{
		$form = $this->loadForm('com_decisiontree.tree', 'tree', ['control' => 'jform', 'load_data' => $loadData]);

		if (empty($form)) {
			return false;
		}

		return $form;
	}

	protected function loadFormData(): array
	{
		$data = Factory::getApplication()->getUserState('com_decisiontree.edit.tree.data', []);

		if (empty($data)) {
			$data = $this->getItem();
		}

		return ArrayHelper::fromObject($data);
	}

	public function save($data): bool
	{
		if (empty($data['alias'])) {
			$data['alias'] = $data['title'] ?? '';
		}

		$data['alias'] = Factory::getApplication()->getLanguage()->transliterate($data['alias']);
		$data['alias'] = \Joomla\CMS\Filter\OutputFilter::stringURLSafe($data['alias']);

		return parent::save($data);
	}

	protected function prepareTable($table): void
	{
		$date = Factory::getDate()->toSql();
		$user = Factory::getApplication()->getIdentity();

		if (empty($table->id)) {
			$table->created = $date;
			$table->created_by = $user->id;
		} else {
			$table->modified = $date;
			$table->modified_by = $user->id;
		}
	}
}
