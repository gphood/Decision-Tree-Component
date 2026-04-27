<?php
/**
 * @package     Joomla.Administrator
 * @subpackage  com_decisiontree
 *
 * @copyright   (C) 2026 GrantDev. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

namespace GrantDev\Component\DecisionTree\Administrator\View\Trees;

\defined('_JEXEC') or die;

use GrantDev\Component\DecisionTree\Administrator\Helper\DecisionTreeHelper;
use Joomla\CMS\Factory;
use Joomla\CMS\Helper\ContentHelper;
use Joomla\CMS\Language\Text;
use Joomla\CMS\MVC\View\HtmlView as BaseHtmlView;
use Joomla\CMS\Toolbar\ToolbarHelper;

class HtmlView extends BaseHtmlView
{
	public $items;

	public $pagination;

	public $state;

	public $filterForm;

	public $activeFilters;

	public $showSearchTools;

	public $isProEnabled;

	public $createLimitReached;

	public $createLimitMessageKey;

	public function display($tpl = null): void
	{
		DecisionTreeHelper::loadAdminLanguage();

		$this->items = $this->get('Items');
		$this->pagination = $this->get('Pagination');
		$this->state = $this->get('State');
		$this->filterForm = $this->get('FilterForm');
		$this->activeFilters = $this->get('ActiveFilters');
		$this->isProEnabled = DecisionTreeHelper::isProEnabled();
		$this->createLimitReached = !DecisionTreeHelper::canCreateTree();
		$this->createLimitMessageKey = DecisionTreeHelper::getCreateLimitMessageKey();
		$this->showSearchTools = DecisionTreeHelper::shouldShowListSearchTools();

		$this->addToolbar();

		Factory::getApplication()->getDocument()->getWebAssetManager()
			->registerAndUseStyle('com_decisiontree.admin', 'media/com_decisiontree/css/admin.css');

		parent::display($tpl);
	}

	protected function addToolbar(): void
	{
		ToolbarHelper::title(Text::_('COM_DECISIONTREE_MANAGER_TREES'), 'tree');

		if (ContentHelper::getActions('com_decisiontree')->get('core.create') && DecisionTreeHelper::canCreateTree()) {
			ToolbarHelper::addNew('tree.add');
		}

		ToolbarHelper::editList('tree.edit');
		ToolbarHelper::publish('trees.publish', 'JTOOLBAR_PUBLISH', true);
		ToolbarHelper::unpublish('trees.unpublish', 'JTOOLBAR_UNPUBLISH', true);

		if ((string) $this->state->get('filter.state') === '-2') {
			ToolbarHelper::deleteList('JGLOBAL_CONFIRM_DELETE', 'trees.delete', 'JTOOLBAR_EMPTY_TRASH');
		} else {
			ToolbarHelper::trash('trees.trash');
		}
	}
}
