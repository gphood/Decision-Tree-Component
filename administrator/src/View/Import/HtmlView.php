<?php
/**
 * @package     Joomla.Administrator
 * @subpackage  com_decisiontree
 *
 * @copyright   (C) 2026 GrantDev. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

namespace GrantDev\Component\DecisionTree\Administrator\View\Import;

\defined('_JEXEC') or die;

use GrantDev\Component\DecisionTree\Administrator\Helper\DecisionTreeHelper;
use Joomla\CMS\Factory;
use Joomla\CMS\Helper\ContentHelper;
use Joomla\CMS\Language\Text;
use Joomla\CMS\MVC\View\HtmlView as BaseHtmlView;
use Joomla\CMS\Router\Route;
use Joomla\CMS\Toolbar\Toolbar;
use Joomla\CMS\Toolbar\ToolbarHelper;

class HtmlView extends BaseHtmlView
{
	private const IMPORT_STATE_KEY = 'com_decisiontree.import.data';

	public $export;

	public $aliasPreview;

	public $exportedStateLabel;

	public $defaultImportState;

	public $canPreserveState;

	public $replaceMode;

	public $canCreateImport;

	public $createDisabledByTreeLimit;

	public $canReplaceImport;

	public $defaultImportMode;

	public $existingTrees;

	public $defaultReplacementTreeId;

	public function display($tpl = null): void
	{
		DecisionTreeHelper::loadAdminLanguage();
		$layout = $this->getLayout();
		$actions = ContentHelper::getActions('com_decisiontree');
		$model = $this->getModel();
		$this->existingTrees = $model->getExistingTrees();
		$this->canCreateImport = DecisionTreeHelper::canCreateTree() && $actions->get('core.create');
		$this->createDisabledByTreeLimit = !DecisionTreeHelper::canCreateTree() && $actions->get('core.create');
		$this->canReplaceImport = \count($this->existingTrees) > 0 && $actions->get('core.edit');
		$this->replaceMode = !$this->canCreateImport && $this->canReplaceImport;
		$this->defaultImportMode = $this->canCreateImport ? 'create' : 'replace';

		if (!DecisionTreeHelper::canImportTree() || (!$this->canCreateImport && !$this->canReplaceImport)) {
			throw new \Exception(Text::_('JERROR_ALERTNOAUTHOR'), 403);
		}

		$this->export = Factory::getApplication()->getUserState(self::IMPORT_STATE_KEY);

		if ($layout === 'preview' && (empty($this->export) || !\is_array($this->export))) {
			Factory::getApplication()->enqueueMessage(Text::_('COM_DECISIONTREE_IMPORT_ERROR_NO_PREVIEW'), 'error');
			Factory::getApplication()->redirect(Route::_('index.php?option=com_decisiontree&view=import', false));

			return;
		}

		if ($layout === 'preview') {
			$this->defaultReplacementTreeId = $model->getDefaultReplacementTreeId();
			$exportedState = $this->export['tree']['state'] ?? null;
			$exportedStateNumber = is_numeric($exportedState) ? (int) $exportedState : null;
			$this->aliasPreview = $model->getAliasPreview($this->export);
			$this->exportedStateLabel = $model->getStateLabel($exportedState);
			$this->defaultImportState = $model->getDefaultImportState($this->export);
			$this->canPreserveState = \in_array($exportedStateNumber, [0, 1, 2], true);
		}

		$this->addToolbar();

		Factory::getApplication()->getDocument()->getWebAssetManager()
			->registerAndUseStyle('com_decisiontree.admin', 'media/com_decisiontree/css/admin.css');

		parent::display($tpl);
	}

	protected function addToolbar(): void
	{
		ToolbarHelper::title(Text::_('COM_DECISIONTREE_IMPORT_TITLE'), 'upload');
		Toolbar::getInstance()
			->link('JTOOLBAR_CANCEL', Route::_('index.php?option=com_decisiontree&task=import.cancel', false))
			->icon('fas fa-times');
	}
}
