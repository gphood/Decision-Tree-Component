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
use Joomla\CMS\Filter\OutputFilter;
use Joomla\CMS\MVC\Model\AdminModel;
use Joomla\Database\ParameterType;
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
		$data['alias'] = OutputFilter::stringURLSafe($data['alias']);
		$data['alias'] = $this->getUniqueAlias($data['alias'], (int) ($data['id'] ?? 0));

		return parent::save($data);
	}

	private function getUniqueAlias(string $alias, int $id = 0): string
	{
		$alias = $alias !== '' ? $alias : OutputFilter::stringURLSafe((string) Factory::getDate()->toUnix());
		$baseAlias = $alias;
		$suffix = 2;

		while ($this->aliasExists($alias, $id)) {
			$alias = $baseAlias . '-' . $suffix;
			$suffix++;
		}

		return $alias;
	}

	private function aliasExists(string $alias, int $id = 0): bool
	{
		$db = $this->getDatabase();
		$query = $db->getQuery(true)
			->select('COUNT(*)')
			->from($db->quoteName('#__decisiontree_trees'))
			->where($db->quoteName('alias') . ' = :alias')
			->bind(':alias', $alias);

		if ($id > 0) {
			$query->where($db->quoteName('id') . ' != :id')
				->bind(':id', $id, ParameterType::INTEGER);
		}

		$db->setQuery($query);

		return (int) $db->loadResult() > 0;
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
