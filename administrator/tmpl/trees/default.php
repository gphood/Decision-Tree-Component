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
use Joomla\CMS\Layout\LayoutHelper;
use Joomla\CMS\Router\Route;

HTMLHelper::_('behavior.multiselect');

$listOrder = $this->escape($this->state->get('list.ordering'));
$listDirn = $this->escape($this->state->get('list.direction'));
$hasActiveFilters = !empty($this->activeFilters);
?>
<form action="<?php echo Route::_('index.php?option=com_decisiontree&view=trees'); ?>" method="post" name="adminForm" id="adminForm">
	<?php if (!$this->isProEnabled && $this->createLimitReached) : ?>
		<div class="alert alert-info">
			<span class="icon-info-circle" aria-hidden="true"></span>
			<span class="visually-hidden"><?php echo Text::_('INFO'); ?></span>
			<?php echo Text::_($this->createLimitMessageKey); ?>
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
			<p><?php echo Text::_('COM_DECISIONTREE_EMPTY_DESCRIPTION'); ?></p>
			<a class="btn btn-primary" href="<?php echo Route::_('index.php?option=com_decisiontree&task=tree.add'); ?>">
				<?php echo Text::_('COM_DECISIONTREE_EMPTY_ADD_BUTTON'); ?>
			</a>
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
					<th scope="col" class="w-5 text-center">
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
						</th>
						<td class="text-center">
							<?php echo HTMLHelper::_('jgrid.published', $item->state, $i, 'trees.', true, 'cb'); ?>
						</td>
						<td class="text-center">
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
	<input type="hidden" name="filter_order" value="<?php echo $listOrder; ?>">
	<input type="hidden" name="filter_order_Dir" value="<?php echo $listDirn; ?>">
	<?php echo HTMLHelper::_('form.token'); ?>
</form>
