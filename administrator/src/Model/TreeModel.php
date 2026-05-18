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

use GrantDev\Component\DecisionTree\Administrator\Helper\DecisionTreeHelper;
use Joomla\CMS\Factory;
use Joomla\CMS\Filter\OutputFilter;
use Joomla\CMS\Language\Text;
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
		if (empty($data['id']) && !DecisionTreeHelper::canCreateTree()) {
			$this->setError(DecisionTreeHelper::getCreateLimitMessage());

			return false;
		}

		if (empty($data['alias'])) {
			$data['alias'] = $data['title'] ?? '';
		}

		$data['alias'] = Factory::getApplication()->getLanguage()->transliterate($data['alias']);
		$data['alias'] = OutputFilter::stringURLSafe($data['alias']);
		$data['alias'] = $this->getUniqueAlias($data['alias'], (int) ($data['id'] ?? 0));

		return parent::save($data);
	}

	public function buildExportData(int $id): ?array
	{
		if ($id <= 0) {
			return null;
		}

		$item = $this->getItem($id);

		if (empty($item->id)) {
			return null;
		}

		$treeData = json_decode((string) $item->json_data);

		if (json_last_error() !== JSON_ERROR_NONE || !\is_object($treeData)) {
			$this->setError(Text::_('COM_DECISIONTREE_ERROR_INVALID_JSON'));

			return null;
		}

		$componentVersion = $this->getComponentVersion();
		$export = [
			'export_format' => 'decisiontree',
			'export_version' => '1.0',
			'exported_at' => Factory::getDate()->toISO8601(),
		];

		if ($componentVersion !== '') {
			$export['component_version'] = $componentVersion;
		}

		$export['tree'] = [
			'title' => (string) $item->title,
			'alias' => (string) $item->alias,
			'state' => (int) $item->state,
			'description' => (string) $item->description,
		];
		$export['tree_data'] = $treeData;

		return $export;
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

	private function getComponentVersion(): string
	{
		$manifestPaths = [
			JPATH_ADMINISTRATOR . '/components/com_decisiontree/decisiontree.xml',
			JPATH_COMPONENT_ADMINISTRATOR . '/decisiontree.xml',
		];

		foreach (array_unique($manifestPaths) as $manifestPath) {
			if (!is_file($manifestPath)) {
				continue;
			}

			$previousLibxmlState = libxml_use_internal_errors(true);
			$manifest = simplexml_load_file($manifestPath);
			libxml_clear_errors();
			libxml_use_internal_errors($previousLibxmlState);

			if ($manifest !== false && isset($manifest->version)) {
				return (string) $manifest->version;
			}
		}

		return '';
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
