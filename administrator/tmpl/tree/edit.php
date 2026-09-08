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
				<div class="com-decisiontree-embed-help__code-row">
					<code>{decisiontree id=<?php echo (int) $this->item->id; ?>}</code>
					<button
						type="button"
						class="btn btn-sm btn-outline-secondary com-decisiontree-embed-help__copy"
						data-decisiontree-copy-embed
						data-embed-tag="{decisiontree id=<?php echo (int) $this->item->id; ?>}"
					>
						<span class="icon-copy" aria-hidden="true"></span>
						<span data-decisiontree-copy-label aria-live="polite"><?php echo Text::_('COM_DECISIONTREE_COPY_EMBED_TAG'); ?></span>
					</button>
				</div>
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
				<div class="com-decisiontree-builder-view-switcher" role="group" aria-label="<?php echo Text::_('COM_DECISIONTREE_BUILDER_VIEW_LABEL'); ?>">
					<button type="button" class="btn btn-outline-secondary active" id="decisiontree-form-view-button" aria-pressed="true">
						<span class="icon-list" aria-hidden="true"></span>
						<?php echo Text::_('COM_DECISIONTREE_FORM_VIEW'); ?>
					</button>
					<button type="button" class="btn btn-outline-secondary" id="decisiontree-canvas-view-button" aria-pressed="false">
						<span class="icon-project-diagram" aria-hidden="true"></span>
						<?php echo Text::_('COM_DECISIONTREE_CANVAS_VIEW'); ?>
					</button>
				</div>
				<div id="decisiontree-form-view">
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
					<div id="decisiontree-selected-question-home">
						<div class="com-decisiontree-selected-question-panel" id="decisiontree-selected-question-panel">
							<div class="mb-3">
								<label class="form-label" for="decisiontree-question-text"><?php echo Text::_('COM_DECISIONTREE_FIELD_QUESTION_TEXT_LABEL'); ?></label>
								<?php // Keep Joomla validation attached when this field moves into the canvas modal. ?>
								<input type="text" class="form-control" id="decisiontree-question-text" form="tree-form">
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
				</div>
				<section class="com-decisiontree-canvas-view" id="decisiontree-canvas-view" aria-labelledby="decisiontree-canvas-heading" hidden>
					<div class="com-decisiontree-canvas-toolbar">
						<div>
							<h3 id="decisiontree-canvas-heading"><?php echo Text::_('COM_DECISIONTREE_CANVAS_HEADING'); ?></h3>
							<p class="text-muted"><?php echo Text::_('COM_DECISIONTREE_CANVAS_HELP'); ?></p>
						</div>
						<div class="com-decisiontree-canvas-actions" role="group" aria-label="<?php echo Text::_('COM_DECISIONTREE_CANVAS_CONTROLS'); ?>">
							<button type="button" class="btn btn-sm btn-primary" id="decisiontree-canvas-add-question">
								<?php echo Text::_('COM_DECISIONTREE_BUTTON_ADD_QUESTION'); ?>
							</button>
							<button type="button" class="btn btn-sm btn-outline-secondary" id="decisiontree-canvas-auto-layout">
								<?php echo Text::_('COM_DECISIONTREE_CANVAS_AUTO_ARRANGE'); ?>
							</button>
							<button type="button" class="btn btn-sm btn-outline-secondary" id="decisiontree-canvas-zoom-out" aria-label="<?php echo Text::_('COM_DECISIONTREE_CANVAS_ZOOM_OUT'); ?>" title="<?php echo Text::_('COM_DECISIONTREE_CANVAS_ZOOM_OUT'); ?>">−</button>
							<span class="com-decisiontree-canvas-zoom" id="decisiontree-canvas-zoom">100%</span>
							<button type="button" class="btn btn-sm btn-outline-secondary" id="decisiontree-canvas-zoom-in" aria-label="<?php echo Text::_('COM_DECISIONTREE_CANVAS_ZOOM_IN'); ?>" title="<?php echo Text::_('COM_DECISIONTREE_CANVAS_ZOOM_IN'); ?>">+</button>
							<button type="button" class="btn btn-sm btn-outline-secondary" id="decisiontree-canvas-fit">
								<?php echo Text::_('COM_DECISIONTREE_CANVAS_FIT'); ?>
							</button>
						</div>
					</div>
					<div class="com-decisiontree-canvas-viewport" id="decisiontree-canvas-viewport" tabindex="0" aria-label="<?php echo Text::_('COM_DECISIONTREE_CANVAS_VIEWPORT_LABEL'); ?>">
						<div class="com-decisiontree-canvas-stage" id="decisiontree-canvas-stage">
							<svg class="com-decisiontree-canvas-edges" id="decisiontree-canvas-edges" aria-hidden="true"></svg>
							<div class="com-decisiontree-canvas-nodes" id="decisiontree-canvas-nodes"></div>
						</div>
						<div class="com-decisiontree-canvas-empty" id="decisiontree-canvas-empty" hidden><?php echo Text::_('COM_DECISIONTREE_CANVAS_EMPTY'); ?></div>
					</div>
				</section>
			</div>
		</section>
		<?php echo $this->form->getInput('json_data'); ?>
		<?php if ($this->editorExtensionMarkup !== '') : ?>
			<div id="decisiontree-editor-extension-fields" hidden>
				<?php echo $this->editorExtensionMarkup; ?>
			</div>
		<?php endif; ?>
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

<div class="modal fade com-decisiontree-question-modal" id="decisiontree-question-modal" tabindex="-1" aria-labelledby="decisiontree-question-modal-title" aria-hidden="true">
	<div class="modal-dialog modal-xl modal-dialog-scrollable">
		<div class="modal-content">
			<div class="modal-header">
				<div>
					<h2 class="modal-title fs-4" id="decisiontree-question-modal-title"><?php echo Text::_('COM_DECISIONTREE_CANVAS_QUESTION_MODAL_HEADING'); ?></h2>
					<p class="text-muted mb-0 mt-1 com-decisiontree-question-modal__help"><?php echo Text::_('COM_DECISIONTREE_CANVAS_QUESTION_MODAL_HELP'); ?></p>
				</div>
				<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="<?php echo Text::_('JCLOSE'); ?>"></button>
			</div>
			<div class="modal-body com-decisiontree-question-modal__body" id="decisiontree-question-modal-body"></div>
			<div class="modal-footer">
				<button type="button" class="btn btn-primary" data-bs-dismiss="modal"><?php echo Text::_('COM_DECISIONTREE_BUTTON_DONE'); ?></button>
			</div>
		</div>
	</div>
</div>
