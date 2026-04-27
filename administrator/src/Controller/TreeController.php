<?php

namespace GrantDev\Component\DecisionTree\Administrator\Controller;

\defined('_JEXEC') or die;

use GrantDev\Component\DecisionTree\Administrator\Helper\DecisionTreeHelper;
use Joomla\CMS\Language\Text;
use Joomla\CMS\MVC\Controller\FormController;
use Joomla\CMS\Router\Route;

class TreeController extends FormController
{
	protected $view_list = 'trees';

	public function add()
	{
		DecisionTreeHelper::loadAdminLanguage();

		if (!DecisionTreeHelper::canCreateTree()) {
			$this->setMessage(Text::_(DecisionTreeHelper::getCreateLimitMessageKey()), 'warning');
			$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=trees', false));

			return false;
		}

		return parent::add();
	}

	protected function allowAdd($data = []): bool
	{
		return DecisionTreeHelper::canCreateTree() && parent::allowAdd($data);
	}
}
