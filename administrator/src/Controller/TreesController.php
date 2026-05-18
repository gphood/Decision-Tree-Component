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
use Joomla\CMS\Factory;
use Joomla\CMS\Helper\ContentHelper;
use Joomla\CMS\Language\Text;
use Joomla\CMS\MVC\Controller\AdminController;
use Joomla\CMS\Router\Route;
use Joomla\CMS\Session\Session;
use Joomla\Utilities\ArrayHelper;

class TreesController extends AdminController
{
	public function delete()
	{
		DecisionTreeHelper::loadAdminLanguage();

		return parent::delete();
	}

	public function export()
	{
		DecisionTreeHelper::loadAdminLanguage();

		if (!Session::checkToken('request')) {
			$this->setMessage(Text::_('JINVALID_TOKEN'), 'error');
			$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=trees', false));

			return false;
		}

		if (!ContentHelper::getActions('com_decisiontree')->get('core.manage')) {
			$this->setMessage(Text::_('JERROR_ALERTNOAUTHOR'), 'error');
			$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=trees', false));

			return false;
		}

		$cid = (array) $this->input->post->get('cid', [], 'array');
		ArrayHelper::toInteger($cid);
		$cid = array_values(array_filter($cid));
		$id = $this->input->getInt('id');

		if ($id <= 0 && \count($cid) === 1) {
			$id = (int) $cid[0];
		}

		if ($id <= 0 || \count($cid) > 1) {
			$this->setMessage(Text::_('COM_DECISIONTREE_EXPORT_SELECT_ONE'), 'error');
			$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=trees', false));

			return false;
		}

		$model = $this->getModel('Tree');
		$export = $model->buildExportData($id);

		if ($export === null) {
			$message = $model->getError() ?: Text::_('COM_DECISIONTREE_EXPORT_TREE_NOT_FOUND');
			$this->setMessage($message, 'error');
			$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=trees', false));

			return false;
		}

		$json = json_encode($export, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

		if ($json === false) {
			$this->setMessage(Text::_('COM_DECISIONTREE_EXPORT_JSON_FAILED'), 'error');
			$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=trees', false));

			return false;
		}

		$filename = DecisionTreeHelper::createExportFilename((string) $export['tree']['title']);
		$app = Factory::getApplication();
		$app->setHeader('Content-Type', 'application/json; charset=utf-8', true);
		$app->setHeader('Content-Disposition', 'attachment; filename="' . $filename . '"', true);
		$app->setHeader('Cache-Control', 'no-store, no-cache, must-revalidate', true);
		$app->sendHeaders();

		echo $json;

		$app->close();
	}

	public function getModel($name = 'Tree', $prefix = 'Administrator', $config = ['ignore_request' => true])
	{
		return parent::getModel($name, $prefix, $config);
	}

	public function import()
	{
		DecisionTreeHelper::loadAdminLanguage();

		if (!Session::checkToken('request')) {
			$this->setMessage(Text::_('JINVALID_TOKEN'), 'error');
			$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=trees', false));

			return false;
		}

		$actions = ContentHelper::getActions('com_decisiontree');
		$action = DecisionTreeHelper::requiresImportReplacement() ? 'core.edit' : 'core.create';

		if (!DecisionTreeHelper::canImportTree() || !$actions->get($action)) {
			$this->setMessage(Text::_('JERROR_ALERTNOAUTHOR'), 'error');
			$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=trees', false));

			return false;
		}

		$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=import', false));
	}

	public function publish()
	{
		DecisionTreeHelper::loadAdminLanguage();

		return parent::publish();
	}
}
