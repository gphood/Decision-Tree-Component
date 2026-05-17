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
?>
<form action="<?php echo Route::_('index.php?option=com_decisiontree&task=import.confirm'); ?>" method="post" name="adminForm" id="adminForm">
	<div class="main-card">
		<h2><?php echo Text::_('COM_DECISIONTREE_IMPORT_PREVIEW_HEADING'); ?></h2>
		<?php if ($this->replaceMode) : ?>
			<div class="alert alert-warning">
				<span class="icon-warning" aria-hidden="true"></span>
				<?php echo Text::_('COM_DECISIONTREE_IMPORT_REPLACE_WARNING'); ?>
			</div>
		<?php endif; ?>
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
			<?php if ($this->replaceMode) : ?>
				<div class="com-decisiontree-import-field">
					<label class="form-label" for="replace_id"><?php echo Text::_('COM_DECISIONTREE_IMPORT_REPLACE_TREE_LABEL'); ?></label>
					<div class="com-decisiontree-import-control">
						<?php if (\count($this->existingTrees) === 1) : ?>
							<?php $replacementTree = $this->existingTrees[0]; ?>
							<input type="hidden" name="replace_id" value="<?php echo (int) $replacementTree->id; ?>">
							<div class="com-decisiontree-import-replacement">
								<?php echo $this->escape($replacementTree->title); ?>
								<span>
									<?php echo Text::sprintf('JGLOBAL_LIST_ALIAS', $this->escape($replacementTree->alias)); ?>
								</span>
							</div>
						<?php else : ?>
							<select class="form-select" name="replace_id" id="replace_id" required>
								<option value=""><?php echo Text::_('COM_DECISIONTREE_IMPORT_REPLACE_TREE_SELECT'); ?></option>
								<?php foreach ($this->existingTrees as $replacementTree) : ?>
									<option value="<?php echo (int) $replacementTree->id; ?>"<?php echo (int) $replacementTree->id === (int) $this->defaultReplacementTreeId ? ' selected' : ''; ?>>
										<?php echo $this->escape($replacementTree->title . ' (' . $replacementTree->alias . ')'); ?>
									</option>
								<?php endforeach; ?>
							</select>
						<?php endif; ?>
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
			<?php if ($this->showGenerateAliasOption) : ?>
				<div class="com-decisiontree-import-field">
					<div class="com-decisiontree-import-control">
						<div class="form-check com-decisiontree-import-choice">
							<input class="form-check-input" type="checkbox" name="generate_alias" id="generate_alias" value="1" checked>
							<label class="form-check-label" for="generate_alias">
								<?php echo Text::_('COM_DECISIONTREE_IMPORT_GENERATE_ALIAS_LABEL'); ?>
							</label>
							<div class="form-text"><?php echo Text::_('COM_DECISIONTREE_IMPORT_GENERATE_ALIAS_DESC'); ?></div>
						</div>
					</div>
				</div>
			<?php else : ?>
				<input type="hidden" name="generate_alias" value="1">
			<?php endif; ?>
			<?php if ($this->replaceMode) : ?>
				<div class="com-decisiontree-import-field">
					<div class="com-decisiontree-import-control">
						<div class="form-check com-decisiontree-import-choice">
							<input class="form-check-input" type="checkbox" name="confirm_replace" id="confirm_replace" value="1" required>
							<label class="form-check-label" for="confirm_replace">
								<?php echo Text::_($this->showGenerateAliasOption ? 'COM_DECISIONTREE_IMPORT_CONFIRM_REPLACE_SELECTED_LABEL' : 'COM_DECISIONTREE_IMPORT_CONFIRM_REPLACE_LABEL'); ?>
							</label>
						</div>
					</div>
				</div>
			<?php endif; ?>
		</fieldset>

		<div class="mt-3">
			<button type="submit" class="btn btn-primary" id="decisiontree-import-submit"<?php echo $this->replaceMode ? ' disabled' : ''; ?>>
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
<?php if ($this->replaceMode) : ?>
	<script>
		document.addEventListener('DOMContentLoaded', function () {
			var confirmReplace = document.getElementById('confirm_replace');
			var submitButton = document.getElementById('decisiontree-import-submit');

			if (!confirmReplace || !submitButton) {
				return;
			}

			var toggleSubmit = function () {
				submitButton.disabled = !confirmReplace.checked;
			};

			confirmReplace.addEventListener('change', toggleSubmit);
			toggleSubmit();
		});
	</script>
<?php endif; ?>
