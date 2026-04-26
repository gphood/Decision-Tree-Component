<?php

\defined('_JEXEC') or die;

use Joomla\CMS\HTML\HTMLHelper;
use Joomla\CMS\Router\Route;

HTMLHelper::_('behavior.formvalidator');
HTMLHelper::_('behavior.keepalive');
?>
<form action="<?php echo Route::_('index.php?option=com_decisiontree&layout=edit&id=' . (int) $this->item->id); ?>" method="post" name="adminForm" id="tree-form" class="form-validate">
	<div class="main-card">
		<?php echo $this->form->renderField('title'); ?>
		<?php echo $this->form->renderField('alias'); ?>
		<?php echo $this->form->renderField('description'); ?>
		<?php echo $this->form->renderField('state'); ?>
		<section class="com-decisiontree-editor-section">
			<h2>Decision Tree Builder</h2>
			<p class="text-muted">
				Use this interface to manage questions and options.
			</p>
			<div class="com-decisiontree-question-editor" id="decisiontree-question-editor">
				<div class="alert alert-warning" id="decisiontree-editor-message" hidden></div>
				<div class="com-decisiontree-question-toolbar">
					<div>
						<label class="form-label" for="decisiontree-question-select">Question</label>
						<select class="form-select" id="decisiontree-question-select"></select>
					</div>
					<div class="com-decisiontree-start-display" id="decisiontree-start-display"></div>
					<div class="com-decisiontree-question-actions">
						<button type="button" class="btn btn-secondary" id="decisiontree-add-question">
							Add question
						</button>
						<button type="button" class="btn btn-outline-danger" id="decisiontree-delete-question">
							Delete question
						</button>
						<button type="button" class="btn btn-secondary" id="decisiontree-set-start-question">
							Set as start question
						</button>
					</div>
				</div>
				<div class="com-decisiontree-selected-question-panel">
					<div class="mb-3">
						<label class="form-label" for="decisiontree-question-text">Question text</label>
						<input type="text" class="form-control" id="decisiontree-question-text">
					</div>
					<div class="com-decisiontree-options-group">
						<h3>Options</h3>
						<div class="com-decisiontree-options" id="decisiontree-options"></div>
						<button type="button" class="btn btn-secondary" id="decisiontree-add-option">
							Add option
						</button>
					</div>
				</div>
			</div>
		</section>
		<section class="com-decisiontree-editor-section com-decisiontree-raw-json-section">
			<h2>Raw JSON</h2>
			<p class="text-muted">
				Advanced: edit the raw JSON structure directly.
			</p>
			<div class="com-decisiontree-json-tools">
				<div class="alert alert-info">
					<p>The JSON defines the decision tree structure.</p>
					<ul>
						<li><code>start</code> must match an ID in <code>questions</code>.</li>
						<li>Each question should contain <code>question_text</code> and <code>options</code>.</li>
						<li>Each option should usually contain either <code>next</code> or <code>result</code>.</li>
					</ul>
				</div>
				<div class="btn-toolbar mb-3" role="toolbar" aria-label="JSON tools">
					<button type="button" class="btn btn-secondary" id="decisiontree-insert-sample-json">
						Insert Sample JSON
					</button>
					<button type="button" class="btn btn-secondary" id="decisiontree-format-json">
						Format JSON
					</button>
				</div>
			</div>
			<?php echo $this->form->renderField('json_data'); ?>
		</section>
	</div>

	<?php echo $this->form->getInput('id'); ?>
	<input type="hidden" name="task" value="">
	<?php echo HTMLHelper::_('form.token'); ?>
</form>
