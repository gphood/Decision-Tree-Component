<?php
/**
 * @package     Joomla.Administrator
 * @subpackage  com_decisiontree
 *
 * @copyright   (C) 2026 GrantDev. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

namespace GrantDev\Component\DecisionTree\Administrator\Controller;

\defined('_JEXEC') or die;

use GrantDev\Component\DecisionTree\Administrator\Helper\DecisionTreeHelper;
use Joomla\CMS\MVC\Controller\AdminController;

class TreesController extends AdminController
{
	public function delete()
	{
		DecisionTreeHelper::loadAdminLanguage();

		return parent::delete();
	}

	public function getModel($name = 'Tree', $prefix = 'Administrator', $config = ['ignore_request' => true])
	{
		return parent::getModel($name, $prefix, $config);
	}

	public function publish()
	{
		DecisionTreeHelper::loadAdminLanguage();

		return parent::publish();
	}
}
