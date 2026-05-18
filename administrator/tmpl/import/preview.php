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

HTMLHelper::_('bootstrap.tooltip', '.hasTooltip');

$tree = $this->export['tree'];
$preserveChecked = $this->defaultImportState === 'preserve' ? ' checked' : '';
$unpublishedChecked = $this->defaultImportState === 'unpublished' ? ' checked' : '';
$createChecked = $this->defaultImportMode === 'create' ? ' checked' : '';
$replaceChecked = $this->defaultImportMode === 'replace' ? ' checked' : '';
?>
<form action="<?php echo Route::_('index.php?option=com_decisiontree&task=import.confirm'); ?>" method="post" name="adminForm" id="adminForm">
	<div class="main-card">
		<h2><?php echo Text::_('COM_DECISIONTREE_IMPORT_PREVIEW_HEADING'); ?></h2>
		<table class="table">
			<tbody>
				<tr>
					<th scope="row"><?php echo Text::_('COM_DECISIONTREE_IMPORT_PREVIEW_TITLE'); ?></th>
					<td><?php echo $this->escape((string) $tree['title']); ?></td>
				</tr>
				<tr>
					<th scope="row"><?php echo Text::_('COM_DECISIONTREE_IMPORT_PREVIEW_ALIAS'); ?></th>
					<td><?php echo $this->escape($this->aliasPreview); ?></td>
				</tr>
				<tr>
					<th scope="row"><?php echo Text::_('COM_DECISIONTREE_IMPORT_PREVIEW_EXPORTED_AT'); ?></th>
					<td><?php echo $this->escape((string) ($this->export['exported_at'] ?? '')); ?></td>
				</tr>
				<tr>
					<th scope="row"><?php echo Text::_('COM_DECISIONTREE_IMPORT_PREVIEW_COMPONENT_VERSION'); ?></th>
					<td><?php echo $this->escape((string) ($this->export['component_version'] ?? '')); ?></td>
				</tr>
				<tr>
					<th scope="row">
						<?php echo Text::_('COM_DECISIONTREE_IMPORT_PREVIEW_EXPORT_VERSION'); ?>
						<span class="icon-info-circle hasTooltip com-decisiontree-help-icon" aria-hidden="true" title="<?php echo $this->escape(Text::_('COM_DECISIONTREE_IMPORT_PREVIEW_EXPORT_VERSION_DESC')); ?>"></span>
						<span class="visually-hidden"><?php echo Text::_('COM_DECISIONTREE_IMPORT_PREVIEW_EXPORT_VERSION_DESC'); ?></span>
					</th>
					<td><?php echo $this->escape((string) $this->export['export_version']); ?></td>
				</tr>
				<tr>
					<th scope="row"><?php echo Text::_('COM_DECISIONTREE_IMPORT_PREVIEW_EXPORTED_STATE'); ?></th>
					<td><?php echo $this->escape($this->exportedStateLabel); ?></td>
				</tr>
			</tbody>
		</table>

		<fieldset class="com-decisiontree-import-options">
			<legend><?php echo Text::_('COM_DECISIONTREE_IMPORT_OPTIONS_HEADING'); ?></legend>
			<div class="com-decisiontree-import-field">
				<div class="form-label"><?php echo Text::_('COM_DECISIONTREE_IMPORT_MODE_LABEL'); ?></div>
				<div class="com-decisiontree-import-control com-decisiontree-import-choice-list">
					<div class="form-check com-decisiontree-import-choice">
						<input class="form-check-input" type="radio" name="import_mode" id="import_mode_create" value="create"<?php echo $createChecked; ?><?php echo $this->canCreateImport ? '' : ' disabled'; ?>>
						<label class="form-check-label" for="import_mode_create"><?php echo Text::_('COM_DECISIONTREE_IMPORT_MODE_CREATE'); ?></label>
						<?php if ($this->createDisabledByTreeLimit) : ?>
							<div class="form-text text-muted"><?php echo Text::_('COM_DECISIONTREE_IMPORT_MODE_CREATE_LIMIT_HELP'); ?></div>
						<?php endif; ?>
					</div>
					<?php if (\count($this->existingTrees) > 0) : ?>
						<div class="form-check com-decisiontree-import-choice">
							<input class="form-check-input" type="radio" name="import_mode" id="import_mode_replace" value="replace"<?php echo $replaceChecked; ?><?php echo $this->canReplaceImport ? '' : ' disabled'; ?>>
							<label class="form-check-label" for="import_mode_replace"><?php echo Text::_('COM_DECISIONTREE_IMPORT_MODE_REPLACE'); ?></label>
						</div>
					<?php endif; ?>
				</div>
			</div>

			<?php if (\count($this->existingTrees) > 0) : ?>
				<div class="alert alert-warning" id="decisiontree-import-replace-warning">
					<span class="icon-warning" aria-hidden="true"></span>
					<?php echo Text::_('COM_DECISIONTREE_IMPORT_REPLACE_WARNING'); ?>
				</div>
				<div class="com-decisiontree-import-field" id="decisiontree-import-replace-field">
					<label class="form-label" for="replace_id"><?php echo Text::_('COM_DECISIONTREE_IMPORT_REPLACE_TREE_LABEL'); ?></label>
					<div class="com-decisiontree-import-control">
						<select class="form-select" name="replace_id" id="replace_id" required>
							<option value=""><?php echo Text::_('COM_DECISIONTREE_IMPORT_REPLACE_TREE_SELECT'); ?></option>
							<?php foreach ($this->existingTrees as $replacementTree) : ?>
								<option value="<?php echo (int) $replacementTree->id; ?>"<?php echo (int) $replacementTree->id === (int) $this->defaultReplacementTreeId ? ' selected' : ''; ?>>
									<?php echo $this->escape($replacementTree->title . ' (' . $replacementTree->alias . ')'); ?>
								</option>
							<?php endforeach; ?>
						</select>
					</div>
				</div>
			<?php endif; ?>
			<div class="com-decisiontree-import-field">
				<div class="form-label"><?php echo Text::_('COM_DECISIONTREE_IMPORT_STATE_LABEL'); ?></div>
				<div class="com-decisiontree-import-control com-decisiontree-import-choice-list">
					<div class="form-check com-decisiontree-import-choice">
						<input class="form-check-input" type="radio" name="import_state" id="import_state_preserve" value="preserve"<?php echo $preserveChecked; ?><?php echo $this->canPreserveState ? '' : ' disabled'; ?>>
						<label class="form-check-label" for="import_state_preserve">
							<?php echo Text::sprintf('COM_DECISIONTREE_IMPORT_STATE_PRESERVE', $this->exportedStateLabel); ?>
						</label>
					</div>
					<div class="form-check com-decisiontree-import-choice">
						<input class="form-check-input" type="radio" name="import_state" id="import_state_published" value="published">
						<label class="form-check-label" for="import_state_published"><?php echo Text::_('COM_DECISIONTREE_STATE_PUBLISHED'); ?></label>
					</div>
					<div class="form-check com-decisiontree-import-choice">
						<input class="form-check-input" type="radio" name="import_state" id="import_state_unpublished" value="unpublished"<?php echo $unpublishedChecked; ?>>
						<label class="form-check-label" for="import_state_unpublished"><?php echo Text::_('COM_DECISIONTREE_STATE_UNPUBLISHED'); ?></label>
					</div>
					<div class="form-check com-decisiontree-import-choice">
						<input class="form-check-input" type="radio" name="import_state" id="import_state_archived" value="archived">
						<label class="form-check-label" for="import_state_archived"><?php echo Text::_('COM_DECISIONTREE_STATE_ARCHIVED'); ?></label>
					</div>
				</div>
			</div>
			<?php if (\count($this->existingTrees) > 0) : ?>
				<div class="com-decisiontree-import-field" id="decisiontree-import-confirm-field">
					<div class="com-decisiontree-import-control">
						<div class="form-check com-decisiontree-import-choice">
							<input class="form-check-input" type="checkbox" name="confirm_replace" id="confirm_replace" value="1" required>
							<label class="form-check-label" for="confirm_replace">
								<?php echo Text::_('COM_DECISIONTREE_IMPORT_CONFIRM_REPLACE_SELECTED_LABEL'); ?>
							</label>
						</div>
					</div>
				</div>
			<?php endif; ?>
		</fieldset>

		<div class="mt-3">
			<button type="submit" class="btn btn-primary" id="decisiontree-import-submit">
				<span class="icon-upload" aria-hidden="true"></span>
				<?php echo Text::_('COM_DECISIONTREE_IMPORT_CONFIRM_BUTTON'); ?>
			</button>
			<a class="btn btn-secondary" href="<?php echo Route::_('index.php?option=com_decisiontree&task=import.cancel'); ?>">
				<?php echo Text::_('JCANCEL'); ?>
			</a>
		</div>
	</div>

	<?php echo HTMLHelper::_('form.token'); ?>
</form>
<?php if (\count($this->existingTrees) > 0) : ?>
	<script>
		document.addEventListener('DOMContentLoaded', function () {
			var createMode = document.getElementById('import_mode_create');
			var replaceMode = document.getElementById('import_mode_replace');
			var confirmReplace = document.getElementById('confirm_replace');
			var confirmField = document.getElementById('decisiontree-import-confirm-field');
			var replaceField = document.getElementById('decisiontree-import-replace-field');
			var replaceSelect = document.getElementById('replace_id');
			var replaceWarning = document.getElementById('decisiontree-import-replace-warning');
			var submitButton = document.getElementById('decisiontree-import-submit');

			if (!replaceMode || !confirmReplace || !submitButton) {
				return;
			}

			var toggleSubmit = function () {
				var isReplace = replaceMode.checked;
				var hasReplacement = !replaceSelect || replaceSelect.value !== '';

				if (replaceField) {
					replaceField.hidden = !isReplace;
				}

				if (replaceWarning) {
					replaceWarning.hidden = !isReplace;
				}

				if (confirmField) {
					confirmField.hidden = !isReplace;
				}

				if (replaceSelect) {
					replaceSelect.disabled = !isReplace;
					replaceSelect.required = isReplace;

					if (!isReplace || hasReplacement) {
						replaceSelect.setCustomValidity('');
					}
				}

				confirmReplace.disabled = !isReplace;
				confirmReplace.required = isReplace;
				submitButton.disabled = isReplace && (!confirmReplace.checked || !hasReplacement);
			};

			var validateReplacement = function () {
				if (!replaceMode.checked || !replaceSelect) {
					toggleSubmit();

					return;
				}

				replaceSelect.setCustomValidity('');
				toggleSubmit();

				if (confirmReplace.checked && replaceSelect.value === '') {
					replaceSelect.reportValidity();
				}
			};

			if (createMode) {
				createMode.addEventListener('change', toggleSubmit);
			}

			replaceMode.addEventListener('change', toggleSubmit);
			confirmReplace.addEventListener('change', validateReplacement);

			if (replaceSelect) {
				replaceSelect.addEventListener('change', validateReplacement);
			}

			toggleSubmit();
		});
	</script>
<?php endif; ?>
