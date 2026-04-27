<?php
/**
 * @package     Joomla.Administrator
 * @subpackage  com_decisiontree
 *
 * @copyright   (C) 2026 GrantDev. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

\defined('_JEXEC') or die;

use Joomla\CMS\HTML\HTMLHelper;
use Joomla\CMS\Language\Text;
use Joomla\CMS\Router\Route;

HTMLHelper::_('behavior.formvalidator');
HTMLHelper::_('behavior.keepalive');
?>
<form action="<?php echo Route::_('index.php?option=com_decisiontree&layout=edit&id=' . (int) $this->item->id); ?>" method="post" name="adminForm" id="tree-form" class="form-validate">
	<div class="main-card">
		<?php echo $this->form->renderField('title'); ?>
		<?php echo $this->form->renderField('description'); ?>
		<?php echo $this->form->renderField('state'); ?>
		<section class="com-decisiontree-editor-section">
			<h2><?php echo Text::_('COM_DECISIONTREE_BUILDER_HEADING'); ?></h2>
			<p class="text-muted">
				<?php echo Text::_('COM_DECISIONTREE_BUILDER_HELP'); ?>
			</p>
			<div class="com-decisiontree-question-editor" id="decisiontree-question-editor">
				<div class="alert alert-warning" id="decisiontree-editor-message" hidden></div>
				<div class="com-decisiontree-question-toolbar">
					<div>
						<label class="form-label" for="decisiontree-question-select"><?php echo Text::_('COM_DECISIONTREE_FIELD_QUESTION_LABEL'); ?></label>
						<select class="form-select" id="decisiontree-question-select"></select>
					</div>
					<div class="com-decisiontree-start-display" id="decisiontree-start-display"></div>
					<div class="com-decisiontree-question-actions">
						<button type="button" class="btn btn-secondary" id="decisiontree-load-demo">
							<?php echo Text::_('COM_DECISIONTREE_BUTTON_LOAD_DEMO_TREE'); ?>
						</button>
						<button type="button" class="btn btn-secondary" id="decisiontree-add-question">
							<?php echo Text::_('COM_DECISIONTREE_BUTTON_ADD_QUESTION'); ?>
						</button>
						<button type="button" class="btn btn-outline-danger" id="decisiontree-delete-question">
							<?php echo Text::_('COM_DECISIONTREE_BUTTON_DELETE_QUESTION'); ?>
						</button>
						<button type="button" class="btn btn-secondary" id="decisiontree-set-start-question">
							<?php echo Text::_('COM_DECISIONTREE_BUTTON_SET_START_QUESTION'); ?>
						</button>
					</div>
				</div>
				<div class="com-decisiontree-selected-question-panel">
					<div class="mb-3">
						<label class="form-label" for="decisiontree-question-text"><?php echo Text::_('COM_DECISIONTREE_FIELD_QUESTION_TEXT_LABEL'); ?></label>
						<input type="text" class="form-control" id="decisiontree-question-text">
					</div>
					<div class="com-decisiontree-options-group">
						<h3><?php echo Text::_('COM_DECISIONTREE_OPTIONS_HEADING'); ?></h3>
						<div class="com-decisiontree-options" id="decisiontree-options"></div>
						<button type="button" class="btn btn-secondary" id="decisiontree-add-option">
							<?php echo Text::_('COM_DECISIONTREE_BUTTON_ADD_OPTION'); ?>
						</button>
					</div>
				</div>
			</div>
		</section>
		<?php echo $this->form->getInput('json_data'); ?>
	</div>

	<?php echo $this->form->getInput('id'); ?>
	<input type="hidden" name="task" value="">
	<?php echo HTMLHelper::_('form.token'); ?>
</form>
