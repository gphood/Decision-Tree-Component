<?php

namespace GrantDev\Component\DecisionTree\Administrator\View\Tree;

\defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\Language\Text;
use Joomla\CMS\MVC\View\HtmlView as BaseHtmlView;
use Joomla\CMS\Toolbar\ToolbarHelper;

class HtmlView extends BaseHtmlView
{
	protected $form;

	protected $item;

	public function display($tpl = null): void
	{
		$this->form = $this->get('Form');
		$this->item = $this->get('Item');

		$this->addToolbar();

		Factory::getApplication()->getDocument()->getWebAssetManager()
			->registerAndUseStyle('com_decisiontree.admin', 'media/com_decisiontree/css/admin.css')
			->registerAndUseScript('com_decisiontree.admin', 'media/com_decisiontree/js/admin.js', [], ['defer' => true]);

		parent::display($tpl);
	}

	protected function addToolbar(): void
	{
		$isNew = empty($this->item->id);

		ToolbarHelper::title($isNew ? Text::_('COM_DECISIONTREE_MANAGER_TREE_NEW') : Text::_('COM_DECISIONTREE_MANAGER_TREE_EDIT'), 'tree');
		ToolbarHelper::apply('tree.apply');
		ToolbarHelper::save('tree.save');
		ToolbarHelper::save2new('tree.save2new');
		ToolbarHelper::cancel('tree.cancel', $isNew ? 'JTOOLBAR_CANCEL' : 'JTOOLBAR_CLOSE');
	}
}
