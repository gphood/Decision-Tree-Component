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
		<?php if (!empty($this->item->id)) : ?>
			<div class="alert alert-info com-decisiontree-embed-help">
				<strong><?php echo Text::_('COM_DECISIONTREE_EMBED_HEADING'); ?></strong>
				<div><?php echo Text::_('COM_DECISIONTREE_EMBED_HELP'); ?></div>
				<code>{decisiontree id=<?php echo (int) $this->item->id; ?>}</code>
			</div>
		<?php endif; ?>
		<section class="com-decisiontree-editor-section">
			<h2><?php echo Text::_('COM_DECISIONTREE_BUILDER_HEADING'); ?></h2>
			<p class="text-muted">
				<?php echo Text::_('COM_DECISIONTREE_BUILDER_HELP'); ?>
			</p>
			<div class="com-decisiontree-question-editor" id="decisiontree-question-editor">
				<div class="alert alert-warning" id="decisiontree-editor-message" hidden></div>
				<div class="alert alert-success" id="decisiontree-path-health" role="status" aria-live="polite" tabindex="-1" hidden></div>
				<div class="com-decisiontree-tree-settings">
					<h3><?php echo Text::_('COM_DECISIONTREE_FRONTEND_DISPLAY_HEADING'); ?></h3>
					<div class="form-check form-switch">
						<input class="form-check-input" type="checkbox" role="switch" id="decisiontree-show-step-number">
						<label class="form-check-label" for="decisiontree-show-step-number">
							<?php echo Text::_('COM_DECISIONTREE_FIELD_SHOW_STEP_NUMBER_LABEL'); ?>
						</label>
						<div class="form-text"><?php echo Text::_('COM_DECISIONTREE_FIELD_SHOW_STEP_NUMBER_DESC'); ?></div>
					</div>
				</div>
				<div class="com-decisiontree-preview-action">
					<button type="button" class="btn btn-outline-primary" id="decisiontree-preview">
						<?php echo Text::_('COM_DECISIONTREE_BUTTON_PREVIEW'); ?>
					</button>
					<?php if ($this->analyticsTreeUrl !== '') : ?>
						<a class="btn btn-outline-secondary" href="<?php echo $this->escape($this->analyticsTreeUrl); ?>">
							<span class="icon-chart" aria-hidden="true"></span>
							<?php echo Text::_('PLG_SYSTEM_DECISIONTREEPRO_VIEW_ANALYTICS'); ?>
						</a>
					<?php endif; ?>
				</div>
				<div class="com-decisiontree-question-toolbar">
					<div>
						<label class="form-label" for="decisiontree-question-select"><?php echo Text::_('COM_DECISIONTREE_FIELD_QUESTION_LABEL'); ?></label>
						<select class="form-select" id="decisiontree-question-select"></select>
					</div>
					<div class="com-decisiontree-question-actions">
						<button type="button" class="btn btn-secondary" id="decisiontree-load-demo">
							<?php echo Text::_('COM_DECISIONTREE_BUTTON_LOAD_DEMO_TREE'); ?>
						</button>
						<button type="button" class="btn btn-primary" id="decisiontree-add-question">
							<?php echo Text::_('COM_DECISIONTREE_BUTTON_ADD_QUESTION'); ?>
						</button>
						<button type="button" class="btn btn-secondary" id="decisiontree-duplicate-question">
							<?php echo Text::_('COM_DECISIONTREE_BUTTON_DUPLICATE_QUESTION'); ?>
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

<div class="modal fade com-decisiontree-preview-modal" id="decisiontree-preview-modal" tabindex="-1" aria-labelledby="decisiontree-preview-title" aria-hidden="true">
	<div class="modal-dialog modal-lg modal-dialog-scrollable">
		<div class="modal-content">
			<div class="modal-header">
				<h2 class="modal-title fs-4" id="decisiontree-preview-title"><?php echo Text::_('COM_DECISIONTREE_PREVIEW_HEADING'); ?></h2>
				<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="<?php echo Text::_('JCLOSE'); ?>"></button>
			</div>
			<div class="modal-body com-decisiontree-preview-modal__body">
				<p class="text-muted com-decisiontree-preview-modal__help"><?php echo Text::_('COM_DECISIONTREE_PREVIEW_HELP'); ?></p>
				<div class="gd-decisiontree com-decisiontree-preview" id="decisiontree-preview-tree" data-decision-tree-source="preview">
					<h3 class="h4 com-decisiontree-preview__title"></h3>
					<div class="com-decisiontree__description com-decisiontree-preview__description"></div>
					<div class="com-decisiontree__container"></div>
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?php echo Text::_('JCLOSE'); ?></button>
			</div>
		</div>
	</div>
</div>
