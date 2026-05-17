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
use Joomla\CMS\MVC\Controller\BaseController;
use Joomla\CMS\Router\Route;
use Joomla\CMS\Session\Session;

class ImportController extends BaseController
{
	private const IMPORT_STATE_KEY = 'com_decisiontree.import.data';

	public function upload()
	{
		DecisionTreeHelper::loadAdminLanguage();

		if (!$this->checkImportToken() || !$this->checkImportPermission()) {
			return false;
		}

		$file = (array) $this->input->files->get('import_file', [], 'array');

		if (empty($file['tmp_name']) || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
			$this->setMessage(Text::_('COM_DECISIONTREE_IMPORT_ERROR_UPLOAD'), 'error');
			$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=import', false));

			return false;
		}

		if (strtolower(pathinfo((string) ($file['name'] ?? ''), PATHINFO_EXTENSION)) !== 'json') {
			$this->setMessage(Text::_('COM_DECISIONTREE_IMPORT_ERROR_FILE_TYPE'), 'error');
			$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=import', false));

			return false;
		}

		$json = file_get_contents((string) $file['tmp_name']);

		if ($json === false || trim($json) === '') {
			$this->setMessage(Text::_('COM_DECISIONTREE_IMPORT_ERROR_UPLOAD'), 'error');
			$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=import', false));

			return false;
		}

		$model = $this->getModel('Import');
		$export = $model->validateExportJson($json);

		if ($export === null) {
			$this->setMessage($model->getError(), 'error');
			$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=import', false));

			return false;
		}

		Factory::getApplication()->setUserState(self::IMPORT_STATE_KEY, $export);
		$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=import&layout=preview', false));
	}

	public function confirm()
	{
		DecisionTreeHelper::loadAdminLanguage();

		if (!$this->checkImportToken() || !$this->checkImportPermission()) {
			return false;
		}

		$app = Factory::getApplication();
		$export = $app->getUserState(self::IMPORT_STATE_KEY);

		if (empty($export) || !\is_array($export)) {
			$this->setMessage(Text::_('COM_DECISIONTREE_IMPORT_ERROR_NO_PREVIEW'), 'error');
			$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=import', false));

			return false;
		}

		$importState = $this->input->post->getCmd('import_state', 'unpublished');
		$generateAlias = (bool) $this->input->post->getInt('generate_alias', 0);
		$model = $this->getModel('Import');
		$replaceMode = DecisionTreeHelper::getTreeCount() > 0;

		if ($replaceMode) {
			if (!$this->input->post->getInt('confirm_replace', 0)) {
				$this->setMessage(Text::_('COM_DECISIONTREE_IMPORT_ERROR_CONFIRM_REPLACE'), 'error');
				$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=import&layout=preview', false));

				return false;
			}

			$replaceId = $this->input->post->getInt('replace_id', $model->getDefaultReplacementTreeId());
			$imported = $model->replaceTree($export, $importState, $generateAlias, $replaceId);
		} else {
			$imported = $model->importTree($export, $importState, $generateAlias);
		}

		if (!$imported) {
			$this->setMessage($model->getError(), 'error');
			$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=import&layout=preview', false));

			return false;
		}

		$app->setUserState(self::IMPORT_STATE_KEY, null);
		$this->setMessage(Text::_('COM_DECISIONTREE_IMPORT_SUCCESS'), 'success');
		$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=trees', false));
	}

	public function cancel()
	{
		DecisionTreeHelper::loadAdminLanguage();
		Factory::getApplication()->setUserState(self::IMPORT_STATE_KEY, null);
		$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=trees', false));
	}

	private function checkImportToken(): bool
	{
		if (!Session::checkToken('post')) {
			$this->setMessage(Text::_('JINVALID_TOKEN'), 'error');
			$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=trees', false));

			return false;
		}

		return true;
	}

	private function checkImportPermission(): bool
	{
		$actions = ContentHelper::getActions('com_decisiontree');
		$action = DecisionTreeHelper::getTreeCount() > 0 ? 'core.edit' : 'core.create';

		if (!$actions->get($action)) {
			$this->setMessage(Text::_('JERROR_ALERTNOAUTHOR'), 'error');
			$this->setRedirect(Route::_('index.php?option=com_decisiontree&view=trees', false));

			return false;
		}

		return true;
	}
}
