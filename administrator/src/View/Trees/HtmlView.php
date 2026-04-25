<?php

namespace GrantDev\Component\DecisionTree\Administrator\View\Trees;

\defined('_JEXEC') or die;

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

	public function display($tpl = null): void
	{
		$this->items = $this->get('Items');
		$this->pagination = $this->get('Pagination');
		$this->state = $this->get('State');
		$this->filterForm = $this->get('FilterForm');
		$this->activeFilters = $this->get('ActiveFilters');

		$this->addToolbar();

		Factory::getApplication()->getDocument()->getWebAssetManager()
			->registerAndUseStyle('com_decisiontree.admin', 'media/com_decisiontree/css/admin.css');

		parent::display($tpl);
	}

	protected function addToolbar(): void
	{
		ToolbarHelper::title(Text::_('COM_DECISIONTREE_MANAGER_TREES'), 'tree');

		if (ContentHelper::getActions('com_decisiontree')->get('core.create')) {
			ToolbarHelper::addNew('tree.add');
		}

		ToolbarHelper::editList('tree.edit');
		ToolbarHelper::publish('trees.publish', 'JTOOLBAR_PUBLISH', true);
		ToolbarHelper::unpublish('trees.unpublish', 'JTOOLBAR_UNPUBLISH', true);
		ToolbarHelper::trash('trees.trash');
	}
}
