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
use Joomla\CMS\Language\Text;
use Joomla\CMS\MVC\Model\BaseDatabaseModel;
use Joomla\Database\ParameterType;

class ImportModel extends BaseDatabaseModel
{
	private const STATE_LABELS = [
		1 => 'COM_DECISIONTREE_STATE_PUBLISHED',
		0 => 'COM_DECISIONTREE_STATE_UNPUBLISHED',
		2 => 'COM_DECISIONTREE_STATE_ARCHIVED',
		-2 => 'COM_DECISIONTREE_STATE_TRASHED',
	];

	public function validateExportJson(string $json): ?array
	{
		$export = json_decode($json, true);

		if (json_last_error() !== JSON_ERROR_NONE || !\is_array($export)) {
			$this->setError(Text::_('COM_DECISIONTREE_IMPORT_ERROR_INVALID_JSON'));

			return null;
		}

		if (($export['export_format'] ?? '') !== 'decisiontree') {
			$this->setError(Text::_('COM_DECISIONTREE_IMPORT_ERROR_FORMAT'));

			return null;
		}

		if (empty($export['export_version'])) {
			$this->setError(Text::_('COM_DECISIONTREE_IMPORT_ERROR_EXPORT_VERSION'));

			return null;
		}

		if (empty($export['tree']) || !\is_array($export['tree'])) {
			$this->setError(Text::_('COM_DECISIONTREE_IMPORT_ERROR_TREE_METADATA'));

			return null;
		}

		if (empty($export['tree']['title'])) {
			$this->setError(Text::_('COM_DECISIONTREE_IMPORT_ERROR_TREE_TITLE'));

			return null;
		}

		if (empty($export['tree_data']) || !\is_array($export['tree_data'])) {
			$this->setError(Text::_('COM_DECISIONTREE_IMPORT_ERROR_TREE_DATA'));

			return null;
		}

		if (empty($export['tree_data']['version']) || empty($export['tree_data']['start']) || empty($export['tree_data']['questions']) || !\is_array($export['tree_data']['questions'])) {
			$this->setError(Text::_('COM_DECISIONTREE_IMPORT_ERROR_TREE_DATA_REQUIRED'));

			return null;
		}

		if (empty($export['tree_data']['questions'][(string) $export['tree_data']['start']])) {
			$this->setError(Text::sprintf('COM_DECISIONTREE_ERROR_JSON_START_QUESTION_MISSING', (string) $export['tree_data']['start']));

			return null;
		}

		return $export;
	}

	public function getStateLabel($state): string
	{
		if (!is_numeric($state)) {
			return Text::_('COM_DECISIONTREE_STATE_UNKNOWN');
		}

		return Text::_(self::STATE_LABELS[(int) $state] ?? 'COM_DECISIONTREE_STATE_UNKNOWN');
	}

	public function getDefaultImportState(array $export): string
	{
		if (!isset($export['tree']['state']) || !is_numeric($export['tree']['state'])) {
			return 'unpublished';
		}

		$state = (int) $export['tree']['state'];

		return \in_array($state, [0, 1, 2], true) ? 'preserve' : 'unpublished';
	}

	public function getAliasPreview(array $export): string
	{
		return $this->normaliseAlias((string) ($export['tree']['alias'] ?? ''), (string) ($export['tree']['title'] ?? ''));
	}

	public function getExistingTrees(): array
	{
		$db = $this->getDatabase();
		$query = $db->getQuery(true)
			->select($db->quoteName(['id', 'title', 'alias', 'state']))
			->from($db->quoteName('#__decisiontree_trees'))
			->order($db->quoteName('title') . ' ASC');

		$db->setQuery($query);

		return $db->loadObjectList() ?: [];
	}

	public function getDefaultReplacementTreeId(): int
	{
		$trees = $this->getExistingTrees();

		return \count($trees) === 1 ? (int) $trees[0]->id : 0;
	}

	public function importTree(array $export, string $importState, bool $generateAlias): bool
	{
		return $this->saveImportedTree($export, $importState, $generateAlias);
	}

	public function replaceTree(array $export, string $importState, bool $generateAlias, int $id): bool
	{
		if ($id <= 0 || !$this->treeExists($id)) {
			$this->setError(Text::_('COM_DECISIONTREE_IMPORT_ERROR_REPLACE_TREE'));

			return false;
		}

		return $this->saveImportedTree($export, $importState, $generateAlias, $id);
	}

	private function saveImportedTree(array $export, string $importState, bool $generateAlias, int $id = 0): bool
	{
		$title = trim((string) ($export['tree']['title'] ?? ''));
		$alias = $this->getAliasPreview($export);

		if ($alias === '') {
			$this->setError(Text::_('COM_DECISIONTREE_IMPORT_ERROR_TREE_TITLE'));

			return false;
		}

		if ($this->aliasExists($alias, $id)) {
			if (!$generateAlias) {
				$this->setError(Text::sprintf('COM_DECISIONTREE_IMPORT_ERROR_ALIAS_EXISTS', $alias));

				return false;
			}

			$alias = $this->getUniqueAlias($alias, $id);
		}

		$state = $this->resolveImportState($export, $importState);

		if ($state === null) {
			$this->setError(Text::_('COM_DECISIONTREE_IMPORT_ERROR_STATE'));

			return false;
		}

		$jsonData = json_encode($export['tree_data'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

		if ($jsonData === false) {
			$this->setError(Text::_('COM_DECISIONTREE_IMPORT_ERROR_JSON_ENCODE'));

			return false;
		}

		$treeModel = $this->getMVCFactory()->createModel('Tree', 'Administrator', ['ignore_request' => true]);

		$data = [
			'title' => $title,
			'alias' => $alias,
			'description' => (string) ($export['tree']['description'] ?? ''),
			'state' => $state,
			'json_data' => $jsonData,
		];

		if ($id > 0) {
			$data['id'] = $id;
		}

		if (!$treeModel->save($data)) {
			$this->setError($treeModel->getError() ?: Text::_('COM_DECISIONTREE_IMPORT_ERROR_SAVE'));

			return false;
		}

		return true;
	}

	private function resolveImportState(array $export, string $importState): ?int
	{
		switch ($importState) {
			case 'preserve':
				if (!isset($export['tree']['state']) || !is_numeric($export['tree']['state'])) {
					return null;
				}

				$state = (int) $export['tree']['state'];

				return \in_array($state, [0, 1, 2], true) ? $state : null;

			case 'published':
				return 1;

			case 'unpublished':
				return 0;

			case 'archived':
				return 2;
		}

		return null;
	}

	private function normaliseAlias(string $alias, string $title): string
	{
		$alias = $alias !== '' ? $alias : $title;
		$alias = Factory::getApplication()->getLanguage()->transliterate($alias);
		$alias = OutputFilter::stringURLSafe($alias);

		if ($alias !== '') {
			return $alias;
		}

		$title = Factory::getApplication()->getLanguage()->transliterate($title);

		return OutputFilter::stringURLSafe($title);
	}

	private function getUniqueAlias(string $alias, int $id = 0): string
	{
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

	private function treeExists(int $id): bool
	{
		$db = $this->getDatabase();
		$query = $db->getQuery(true)
			->select('COUNT(*)')
			->from($db->quoteName('#__decisiontree_trees'))
			->where($db->quoteName('id') . ' = :id')
			->bind(':id', $id, ParameterType::INTEGER);

		$db->setQuery($query);

		return (int) $db->loadResult() > 0;
	}
}
