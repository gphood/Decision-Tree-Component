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
use GrantDev\Component\DecisionTree\Administrator\Service\TreeNormalizer;
use GrantDev\Component\DecisionTree\Administrator\Service\TreeValidator;
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

		if (!\array_key_exists('tree_data', $export)) {
			$this->setError(Text::_('COM_DECISIONTREE_IMPORT_ERROR_TREE_DATA'));

			return null;
		}

		$treeData = $this->decodeTreeData($export['tree_data']);

		if ($treeData === null) {
			$this->setError(Text::_('COM_DECISIONTREE_IMPORT_ERROR_TREE_DATA_DECODE'));

			return null;
		}

		if ($this->isWrappedTreeData($treeData)) {
			$treeData = $this->decodeTreeData($treeData['tree_data']);
		}

		if ($treeData === null) {
			$this->setError(Text::_('COM_DECISIONTREE_IMPORT_ERROR_TREE_DATA_DECODE'));

			return null;
		}

		$missingFields = [];

		if (empty($treeData['start'])) {
			$missingFields[] = 'start';
		}

		if (empty($treeData['questions']) || !\is_array($treeData['questions'])) {
			$missingFields[] = 'questions';
		}

		if ($missingFields !== []) {
			$this->setError(Text::sprintf('COM_DECISIONTREE_IMPORT_ERROR_TREE_DATA_REQUIRED_FIELDS', implode(', ', $missingFields)));

			return null;
		}

		if (empty($treeData['version'])) {
			$treeData['version'] = (string) ($export['export_version'] ?? '1.0');
		}

		if (!\array_key_exists((string) $treeData['start'], $treeData['questions'])) {
			$this->setError(Text::sprintf('COM_DECISIONTREE_ERROR_JSON_START_QUESTION_MISSING', (string) $treeData['start']));

			return null;
		}

		$treeData = TreeNormalizer::normalize($treeData);
		$analysis = TreeValidator::analyse($treeData);

		if ($analysis['errors'] !== []) {
			$this->setError($analysis['errors'][0]);

			return null;
		}

		$export['tree_data'] = $treeData;

		return $export;
	}

	private function decodeTreeData($rawTreeData): ?array
	{
		if (\is_array($rawTreeData)) {
			return $rawTreeData;
		}

		if (!\is_string($rawTreeData) || trim($rawTreeData) === '') {
			return null;
		}

		$treeData = json_decode($rawTreeData, true);

		if (json_last_error() !== JSON_ERROR_NONE || !\is_array($treeData)) {
			return null;
		}

		return $treeData;
	}

	private function isWrappedTreeData(array $treeData): bool
	{
		if (!\array_key_exists('tree_data', $treeData)) {
			return false;
		}

		if (!empty($treeData['start']) || !empty($treeData['questions'])) {
			return false;
		}

		return \is_array($treeData['tree_data']) || \is_string($treeData['tree_data']);
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

	public function importTree(array $export, string $importState): bool
	{
		if (!DecisionTreeHelper::canCreateTree()) {
			$this->setError(DecisionTreeHelper::getCreateLimitMessage());

			return false;
		}

		return $this->saveImportedTree($export, $importState);
	}

	public function replaceTree(array $export, string $importState, int $id): bool
	{
		if ($id <= 0 || !$this->treeExists($id)) {
			$this->setError(Text::_('COM_DECISIONTREE_IMPORT_ERROR_REPLACE_TREE'));

			return false;
		}

		return $this->saveImportedTree($export, $importState, $id);
	}

	private function saveImportedTree(array $export, string $importState, int $id = 0): bool
	{
		$title = trim((string) ($export['tree']['title'] ?? ''));
		$alias = $this->resolveAlias($export, $id);

		if ($alias === '') {
			$this->setError(Text::_('COM_DECISIONTREE_IMPORT_ERROR_TREE_TITLE'));

			return false;
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

	private function resolveAlias(array $export, int $id = 0): string
	{
		$title = (string) ($export['tree']['title'] ?? '');
		$importedAlias = $this->normaliseAlias((string) ($export['tree']['alias'] ?? ''), '');

		if ($importedAlias !== '' && !$this->aliasExists($importedAlias, $id)) {
			return $importedAlias;
		}

		$titleAlias = $this->normaliseAlias($title, '');

		return $titleAlias === '' ? '' : $this->getUniqueAlias($titleAlias, $id);
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
