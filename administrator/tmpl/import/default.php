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
?>
<form action="<?php echo Route::_('index.php?option=com_decisiontree&task=import.upload'); ?>" method="post" name="adminForm" id="adminForm" enctype="multipart/form-data">
	<div class="main-card">
		<div class="control-group">
			<label class="form-label" for="import_file"><?php echo Text::_('COM_DECISIONTREE_IMPORT_FILE_LABEL'); ?></label>
			<input type="file" class="form-control" id="import_file" name="import_file" accept="application/json,.json" required>
			<div class="form-text"><?php echo Text::_('COM_DECISIONTREE_IMPORT_FILE_DESC'); ?></div>
		</div>

		<div class="mt-3">
			<button type="submit" class="btn btn-primary">
				<span class="icon-upload" aria-hidden="true"></span>
				<?php echo Text::_('COM_DECISIONTREE_IMPORT_PREVIEW_BUTTON'); ?>
			</button>
			<a class="btn btn-secondary" href="<?php echo Route::_('index.php?option=com_decisiontree&view=trees'); ?>">
				<?php echo Text::_('JCANCEL'); ?>
			</a>
		</div>
	</div>

	<?php echo HTMLHelper::_('form.token'); ?>
</form>
