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
use Joomla\CMS\Factory;
use Joomla\CMS\Language\Text;
use Joomla\CMS\Layout\LayoutHelper;
use Joomla\CMS\Router\Route;
use Joomla\CMS\Session\Session;

HTMLHelper::_('behavior.multiselect');

$listOrder = $this->escape($this->state->get('list.ordering'));
$listDirn = $this->escape($this->state->get('list.direction'));
$hasActiveFilters = !empty($this->activeFilters);
$dateFormat = Text::_('DATE_FORMAT_LC4');
$nullDate = Factory::getDbo()->getNullDate();
?>
<form action="<?php echo Route::_('index.php?option=com_decisiontree&view=trees'); ?>" method="post" name="adminForm" id="adminForm">
	<div class="small text-muted mb-2">
		<?php echo $this->escape($this->editionLabel); ?>
	</div>

	<?php if (!$this->isProEnabled && $this->treeLimitExceeded) : ?>
		<div class="alert alert-warning">
			<span class="icon-warning" aria-hidden="true"></span>
			<span class="visually-hidden"><?php echo Text::_('WARNING'); ?></span>
			<?php echo $this->escape($this->treeLimitExceededMessage); ?>
		</div>
	<?php elseif (!$this->isProEnabled && $this->createLimitReached) : ?>
		<div class="alert alert-info">
			<span class="icon-info-circle" aria-hidden="true"></span>
			<span class="visually-hidden"><?php echo Text::_('INFO'); ?></span>
			<?php echo $this->escape($this->createLimitMessage); ?>
		</div>
	<?php endif; ?>

	<?php if ($this->showSearchTools && (!empty($this->items) || $hasActiveFilters || $this->createLimitReached)) : ?>
		<?php echo LayoutHelper::render('joomla.searchtools.default', ['view' => $this]); ?>
	<?php endif; ?>

	<?php if (empty($this->items) && !$hasActiveFilters && !$this->createLimitReached) : ?>
		<div class="com-decisiontree-empty-state">
			<div class="com-decisiontree-empty-state__icon" aria-hidden="true">
				<span class="icon-tree"></span>
			</div>
			<h2><?php echo Text::_('COM_DECISIONTREE_EMPTY_TITLE'); ?></h2>
			<p><?php echo Text::_($this->isProEnabled ? 'COM_DECISIONTREE_EMPTY_DESCRIPTION_PRO' : 'COM_DECISIONTREE_EMPTY_DESCRIPTION'); ?></p>
			<a class="btn btn-primary" href="<?php echo Route::_('index.php?option=com_decisiontree&task=tree.add'); ?>">
				<?php echo Text::_('COM_DECISIONTREE_EMPTY_ADD_BUTTON'); ?>
			</a>
			<?php if ($this->canImport) : ?>
				<a class="btn btn-secondary ms-2" href="<?php echo Route::_('index.php?option=com_decisiontree&task=trees.import&' . Session::getFormToken() . '=1'); ?>">
					<?php echo Text::_('COM_DECISIONTREE_TOOLBAR_IMPORT_JSON'); ?>
				</a>
			<?php endif; ?>
		</div>
	<?php elseif (empty($this->items)) : ?>
		<div class="alert alert-info">
			<span class="icon-info-circle" aria-hidden="true"></span>
			<span class="visually-hidden"><?php echo Text::_('INFO'); ?></span>
			<?php echo Text::_('JGLOBAL_NO_MATCHING_RESULTS'); ?>
		</div>
	<?php else : ?>
		<table class="table itemList">
			<caption class="visually-hidden">
				<?php echo Text::_('COM_DECISIONTREE_TABLE_CAPTION'); ?>
			</caption>
			<thead>
				<tr>
					<td class="w-1 text-center">
						<?php echo HTMLHelper::_('grid.checkall'); ?>
					</td>
					<th scope="col">
						<?php echo HTMLHelper::_('searchtools.sort', 'JGLOBAL_TITLE', 'a.title', $listDirn, $listOrder); ?>
					</th>
					<th scope="col" class="w-10 text-center">
						<?php echo HTMLHelper::_('searchtools.sort', 'JSTATUS', 'a.state', $listDirn, $listOrder); ?>
					</th>
					<th scope="col" class="w-8 text-center">
						<?php echo Text::_('COM_DECISIONTREE_HEADING_QUESTIONS'); ?>
					</th>
					<th scope="col" class="w-8 text-center">
						<?php echo Text::_('COM_DECISIONTREE_HEADING_OUTCOMES'); ?>
					</th>
					<th scope="col" class="w-10 text-center">
						<?php echo Text::_('COM_DECISIONTREE_HEADING_HEALTH'); ?>
					</th>
					<?php if ($this->isProEnabled) : ?>
						<th scope="col" class="w-10 text-center">
							<?php echo Text::_('COM_DECISIONTREE_HEADING_RICH_BLOCKS'); ?>
						</th>
					<?php endif; ?>
					<th scope="col" class="w-12">
						<?php echo HTMLHelper::_('searchtools.sort', 'COM_DECISIONTREE_HEADING_MODIFIED', 'a.modified', $listDirn, $listOrder); ?>
					</th>
					<th scope="col" class="w-12 d-none d-xl-table-cell">
						<?php echo HTMLHelper::_('searchtools.sort', 'COM_DECISIONTREE_HEADING_CREATED', 'a.created', $listDirn, $listOrder); ?>
					</th>
					<th scope="col" class="w-5 text-center d-none d-lg-table-cell">
						<?php echo HTMLHelper::_('searchtools.sort', 'JGRID_HEADING_ID', 'a.id', $listDirn, $listOrder); ?>
					</th>
				</tr>
			</thead>
			<tbody>
				<?php foreach ($this->items as $i => $item) : ?>
					<tr class="row<?php echo $i % 2; ?>">
						<td class="text-center">
							<?php echo HTMLHelper::_('grid.id', $i, $item->id); ?>
						</td>
						<th scope="row">
							<a href="<?php echo Route::_('index.php?option=com_decisiontree&task=tree.edit&id=' . (int) $item->id); ?>">
								<?php echo $this->escape($item->title); ?>
							</a>
							<div class="small break-word">
								<?php echo Text::sprintf('JGLOBAL_LIST_ALIAS', $this->escape($item->alias)); ?>
							</div>
							<div class="small com-decisiontree-embed-tag">
								<code>{decisiontree id=<?php echo (int) $item->id; ?>}</code>
								<button
									type="button"
									class="btn btn-sm btn-link com-decisiontree-embed-tag__copy"
									data-decisiontree-copy-embed
									data-embed-tag="{decisiontree id=<?php echo (int) $item->id; ?>}"
								>
									<span class="icon-copy" aria-hidden="true"></span>
									<span data-decisiontree-copy-label aria-live="polite"><?php echo Text::_('COM_DECISIONTREE_COPY_EMBED_TAG'); ?></span>
								</button>
							</div>
							<?php if (!empty($this->analyticsTreeUrls[(int) $item->id])) : ?>
								<div class="small mt-1">
									<a href="<?php echo $this->escape($this->analyticsTreeUrls[(int) $item->id]); ?>">
										<span class="icon-chart" aria-hidden="true"></span>
										<?php echo Text::_('PLG_SYSTEM_DECISIONTREEPRO_VIEW_ANALYTICS'); ?>
									</a>
								</div>
							<?php endif; ?>
						</th>
						<td class="text-center">
							<?php echo HTMLHelper::_('jgrid.published', $item->state, $i, 'trees.', true, 'cb'); ?>
						</td>
						<td class="text-center">
							<?php echo $item->tree_data_valid ? (int) $item->question_count : '<span class="text-muted">&ndash;</span>'; ?>
						</td>
						<td class="text-center">
							<?php echo $item->tree_data_valid ? (int) $item->outcome_count : '<span class="text-muted">&ndash;</span>'; ?>
						</td>
						<td class="text-center">
							<?php if (!$item->tree_data_valid || (int) $item->path_error_count > 0) : ?>
								<span class="badge bg-danger"><?php echo Text::sprintf('COM_DECISIONTREE_PATH_HEALTH_INVALID', max(1, (int) $item->path_error_count)); ?></span>
							<?php elseif ((int) $item->path_warning_count > 0) : ?>
								<span class="badge bg-warning text-dark"><?php echo Text::sprintf('COM_DECISIONTREE_PATH_HEALTH_WARNINGS', (int) $item->path_warning_count); ?></span>
							<?php else : ?>
								<span class="badge bg-success"><?php echo Text::_('COM_DECISIONTREE_PATH_HEALTH_VALID'); ?></span>
							<?php endif; ?>
						</td>
						<?php if ($this->isProEnabled) : ?>
							<td class="text-center">
								<?php if ($item->tree_data_valid && (int) $item->rich_block_outcome_count > 0) : ?>
									<span class="badge bg-info text-light">
										<?php echo Text::sprintf('COM_DECISIONTREE_RICH_BLOCKS_COUNT', (int) $item->rich_block_outcome_count); ?>
									</span>
								<?php else : ?>
									<span class="text-muted"><?php echo Text::_('COM_DECISIONTREE_NO_RICH_BLOCKS'); ?></span>
								<?php endif; ?>
							</td>
						<?php endif; ?>
						<td>
							<?php if (!empty($item->modified) && $item->modified !== $nullDate) : ?>
								<?php echo HTMLHelper::_('date', $item->modified, $dateFormat); ?>
							<?php else : ?>
								<span class="text-muted">&ndash;</span>
							<?php endif; ?>
						</td>
						<td class="d-none d-xl-table-cell">
							<?php echo !empty($item->created) ? HTMLHelper::_('date', $item->created, $dateFormat) : '<span class="text-muted">&ndash;</span>'; ?>
						</td>
						<td class="text-center d-none d-lg-table-cell">
							<?php echo (int) $item->id; ?>
						</td>
					</tr>
				<?php endforeach; ?>
			</tbody>
		</table>

		<?php echo $this->pagination->getListFooter(); ?>
	<?php endif; ?>

	<input type="hidden" name="task" value="">
	<input type="hidden" name="boxchecked" value="0">
	<?php echo HTMLHelper::_('form.token'); ?>
</form>
