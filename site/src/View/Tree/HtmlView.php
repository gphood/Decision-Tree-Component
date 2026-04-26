<?php

namespace GrantDev\Component\DecisionTree\Site\View\Tree;

\defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\Language\Text;
use Joomla\CMS\MVC\View\HtmlView as BaseHtmlView;

class HtmlView extends BaseHtmlView
{
	protected $item;

	public function display($tpl = null): void
	{
		$this->item = $this->get('Item');

		Text::script('COM_DECISIONTREE_JS_BACK');
		Text::script('COM_DECISIONTREE_JS_OPTION_NOT_CONFIGURED');
		Text::script('COM_DECISIONTREE_JS_RESET');

		$wa = Factory::getApplication()->getDocument()->getWebAssetManager();
		$registry = $wa->getRegistry();
		$registry->addExtensionRegistryFile('com_decisiontree');

		if (!$registry->exists('style', 'com_decisiontree.frontend.styles')) {
			$wa->registerStyle('com_decisiontree.frontend.styles', 'media/com_decisiontree/css/decisiontree.css');
		}

		if (!$registry->exists('script', 'com_decisiontree.frontend')) {
			$wa->registerScript('com_decisiontree.frontend', 'media/com_decisiontree/js/decisiontree.js', [], ['defer' => true]);
		}

		$wa->useStyle('com_decisiontree.frontend.styles');
		$wa->useScript('com_decisiontree.frontend');

		parent::display($tpl);
	}
}
