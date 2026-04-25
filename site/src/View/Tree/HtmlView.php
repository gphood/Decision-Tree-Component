<?php

namespace GrantDev\Component\DecisionTree\Site\View\Tree;

\defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\MVC\View\HtmlView as BaseHtmlView;

class HtmlView extends BaseHtmlView
{
	protected $item;

	public function display($tpl = null): void
	{
		$this->item = $this->get('Item');

		$wa = Factory::getApplication()->getDocument()->getWebAssetManager();
		$wa->getRegistry()->addExtensionRegistryFile('com_decisiontree');
		$wa->registerStyle('com_decisiontree.frontend.styles', 'media/com_decisiontree/css/decisiontree.css');
		$wa->registerScript('com_decisiontree.frontend', 'media/com_decisiontree/js/decisiontree.js', [], ['defer' => true]);
		$wa->useStyle('com_decisiontree.frontend.styles');
		$wa->useScript('com_decisiontree.frontend');

		parent::display($tpl);
	}
}
