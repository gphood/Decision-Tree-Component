<?php

namespace GrantDev\Component\DecisionTree\Administrator\Controller;

\defined('_JEXEC') or die;

use Joomla\CMS\MVC\Controller\AdminController;

class TreesController extends AdminController
{
	public function getModel($name = 'Tree', $prefix = 'Administrator', $config = ['ignore_request' => true])
	{
		return parent::getModel($name, $prefix, $config);
	}
}
