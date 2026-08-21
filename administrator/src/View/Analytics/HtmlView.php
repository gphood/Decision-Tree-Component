<?php
/**
 * @package     Joomla.Administrator
 * @subpackage  com_decisiontree
 *
 * @copyright   (C) 2026 GrantDev. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

namespace GrantDev\Component\DecisionTree\Administrator\View\Analytics;

\defined('_JEXEC') or die;

use GrantDev\Component\DecisionTree\Administrator\Helper\DecisionTreeHelper;
use Joomla\CMS\Factory;
use Joomla\CMS\Helper\ContentHelper;
use Joomla\CMS\Language\Text;
use Joomla\CMS\MVC\View\HtmlView as BaseHtmlView;
use Joomla\CMS\Router\Route;
use Joomla\CMS\Toolbar\Toolbar;
use Joomla\CMS\Toolbar\ToolbarHelper;
use Joomla\Event\Event;

class HtmlView extends BaseHtmlView
{
	public bool $analyticsAvailable = false;

	public function display($tpl = null): void
	{
		DecisionTreeHelper::loadAdminLanguage();

		if (!ContentHelper::getActions('com_decisiontree')->get('core.manage')) {
			throw new \Exception(Text::_('JERROR_ALERTNOAUTHOR'), 403);
		}

		ToolbarHelper::title(Text::_('COM_DECISIONTREE_ANALYTICS_TITLE'), 'chart');
		Toolbar::getInstance()
			->link('COM_DECISIONTREE_BACK_TO_TREES', Route::_('index.php?option=com_decisiontree&view=trees', false))
			->icon('fas fa-arrow-left');

		Factory::getApplication()->getDispatcher()->dispatch(
			'onDecisionTreePrepareAnalytics',
			new Event('onDecisionTreePrepareAnalytics', ['subject' => $this])
		);

		Factory::getApplication()->getDocument()->getWebAssetManager()
			->registerAndUseStyle('com_decisiontree.admin', 'media/com_decisiontree/css/admin.css');

		parent::display($tpl);
	}
}
