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

	public $existingTrees;

	public $defaultReplacementTreeId;

	public $showGenerateAliasOption;

	public function display($tpl = null): void
	{
		DecisionTreeHelper::loadAdminLanguage();
		$layout = $this->getLayout();
		$this->replaceMode = DecisionTreeHelper::getTreeCount() > 0;
		$actions = ContentHelper::getActions('com_decisiontree');
		$action = $this->replaceMode ? 'core.edit' : 'core.create';

		if (!$actions->get($action)) {
			throw new \Exception(Text::_('JERROR_ALERTNOAUTHOR'), 403);
		}

		$this->export = Factory::getApplication()->getUserState(self::IMPORT_STATE_KEY);

		if ($layout === 'preview' && (empty($this->export) || !\is_array($this->export))) {
			Factory::getApplication()->enqueueMessage(Text::_('COM_DECISIONTREE_IMPORT_ERROR_NO_PREVIEW'), 'error');
			Factory::getApplication()->redirect(Route::_('index.php?option=com_decisiontree&view=import', false));

			return;
		}

		if ($layout === 'preview') {
			$model = $this->getModel();
			$this->existingTrees = $model->getExistingTrees();
			$this->defaultReplacementTreeId = $model->getDefaultReplacementTreeId();
			$this->showGenerateAliasOption = \count($this->existingTrees) > 1;
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
		ToolbarHelper::cancel('import.cancel', 'JTOOLBAR_CANCEL');
	}
}
