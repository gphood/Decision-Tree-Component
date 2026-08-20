<?php
/**
 * @package     Joomla.Administrator
 * @subpackage  com_decisiontree
 *
 * @copyright   (C) 2026 GrantDev. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

namespace GrantDev\Component\DecisionTree\Administrator\View\Tree;

\defined('_JEXEC') or die;

use GrantDev\Component\DecisionTree\Administrator\Helper\DecisionTreeHelper;
use Joomla\CMS\Factory;
use Joomla\CMS\Language\Text;
use Joomla\CMS\MVC\View\HtmlView as BaseHtmlView;
use Joomla\CMS\Toolbar\ToolbarHelper;
use Joomla\Event\Event;

class HtmlView extends BaseHtmlView
{
	protected $form;

	protected $item;

	public function display($tpl = null): void
	{
		DecisionTreeHelper::loadAdminLanguage();

		$this->form = $this->get('Form');
		$this->item = $this->get('Item');

		$this->addToolbar();
		$this->registerScriptText();

		Factory::getApplication()->getDocument()->getWebAssetManager()
			->registerAndUseStyle('com_decisiontree.admin', 'media/com_decisiontree/css/admin.css')
			->registerAndUseScript('com_decisiontree.admin', 'media/com_decisiontree/js/admin.js', [], ['defer' => true]);

		Factory::getApplication()->getDispatcher()->dispatch(
			'onDecisionTreePrepareEditor',
			new Event('onDecisionTreePrepareEditor', ['subject' => $this])
		);

		parent::display($tpl);
	}

	protected function addToolbar(): void
	{
		$isNew = empty($this->item->id);

		ToolbarHelper::title($isNew ? Text::_('COM_DECISIONTREE_MANAGER_TREE_NEW') : Text::_('COM_DECISIONTREE_MANAGER_TREE_EDIT'), 'tree');
		ToolbarHelper::apply('tree.apply');
		ToolbarHelper::save('tree.save');

		if (DecisionTreeHelper::canCreateTree()) {
			ToolbarHelper::save2new('tree.save2new');
		}

		ToolbarHelper::cancel('tree.cancel', $isNew ? 'JTOOLBAR_CANCEL' : 'JTOOLBAR_CLOSE');
	}

	private function registerScriptText(): void
	{
		foreach ([
			'COM_DECISIONTREE_JS_ACTION_LABEL',
			'COM_DECISIONTREE_JS_ACTION_GOES_TO_QUESTION',
			'COM_DECISIONTREE_JS_ACTION_SHOWS_RESULT',
			'COM_DECISIONTREE_JS_COLLAPSE_ALL_OPTIONS',
			'COM_DECISIONTREE_JS_COLLAPSE_OPTION',
			'COM_DECISIONTREE_JS_DELETE_QUESTION_CONFIRM',
			'COM_DECISIONTREE_JS_DELETE_QUESTION_REFERENCED_CONFIRM',
			'COM_DECISIONTREE_JS_EXPAND_ALL_OPTIONS',
			'COM_DECISIONTREE_JS_EXPAND_OPTION',
			'COM_DECISIONTREE_JS_LOAD_DEMO_CONFIRM',
			'COM_DECISIONTREE_JS_MOVE_OPTION_DOWN',
			'COM_DECISIONTREE_JS_MOVE_OPTION_UP',
			'COM_DECISIONTREE_JS_NEW_OPTION',
			'COM_DECISIONTREE_JS_NEXT_QUESTION_EMPTY_STATE',
			'COM_DECISIONTREE_JS_NEXT_QUESTION_LABEL',
			'COM_DECISIONTREE_JS_NEXT_QUESTION_SELF_REFERENCE_BLOCK_SAVE',
			'COM_DECISIONTREE_JS_NEXT_QUESTION_SELF_REFERENCE_LEGACY_LABEL',
			'COM_DECISIONTREE_JS_NEXT_QUESTION_SELF_REFERENCE_WARNING',
			'COM_DECISIONTREE_JS_OPTION_HEADING',
			'COM_DECISIONTREE_JS_OPTION_SUMMARY_ACTION_NEXT',
			'COM_DECISIONTREE_JS_OPTION_SUMMARY_ACTION_RESULT',
			'COM_DECISIONTREE_JS_OPTION_SUMMARY_EMPTY',
			'COM_DECISIONTREE_JS_OPTION_TEXT_LABEL',
			'COM_DECISIONTREE_JS_OPTION_TEXT_PLACEHOLDER',
			'COM_DECISIONTREE_JS_QUESTION_EMPTY_SELECT',
			'COM_DECISIONTREE_JS_QUESTION_EDITOR_EMPTY',
			'COM_DECISIONTREE_JS_QUESTION_EDITOR_INVALID_JSON',
			'COM_DECISIONTREE_JS_QUESTION_EDITOR_MISSING_QUESTIONS',
			'COM_DECISIONTREE_JS_RESULT_LINK_TARGET_BLANK_LABEL',
			'COM_DECISIONTREE_JS_RESULT_LINK_TEXT_LABEL',
			'COM_DECISIONTREE_JS_RESULT_LINK_TEXT_PLACEHOLDER',
			'COM_DECISIONTREE_JS_RESULT_LINK_URL_DESC',
			'COM_DECISIONTREE_JS_RESULT_LINK_URL_LABEL',
			'COM_DECISIONTREE_JS_RESULT_LINK_URL_PLACEHOLDER',
			'COM_DECISIONTREE_JS_RESULT_TEXT_LABEL',
			'COM_DECISIONTREE_JS_REFRESH_PAGE',
			'COM_DECISIONTREE_JS_SELECT_QUESTION',
			'COM_DECISIONTREE_JS_SESSION_EXPIRED_MESSAGE',
			'COM_DECISIONTREE_JS_PATH_HEALTH_VALID',
			'COM_DECISIONTREE_JS_START_QUESTION_LABEL',
			'COM_DECISIONTREE_JS_START_QUESTION_NOT_SET',
			'COM_DECISIONTREE_JS_START_QUESTION_SUFFIX',
			'COM_DECISIONTREE_JS_REMOVE_OPTION',
			'COM_DECISIONTREE_ERROR_JSON_CYCLE',
			'COM_DECISIONTREE_ERROR_JSON_NEXT_QUESTION_MISSING',
			'COM_DECISIONTREE_ERROR_JSON_NEXT_QUESTION_SELF_REFERENCE',
			'COM_DECISIONTREE_ERROR_JSON_OPTION_AMBIGUOUS',
			'COM_DECISIONTREE_WARNING_JSON_DEAD_ENDS',
			'COM_DECISIONTREE_WARNING_JSON_OPTION_INCOMPLETE',
			'COM_DECISIONTREE_WARNING_JSON_UNREACHABLE',
		] as $key) {
			Text::script($key);
		}
	}
}
