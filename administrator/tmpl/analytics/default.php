<?php
/**
 * @package     Joomla.Administrator
 * @subpackage  com_decisiontree
 *
 * @copyright   (C) 2026 GrantDev. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

\defined('_JEXEC') or die;

use Joomla\CMS\Language\Text;
?>
<div class="com-decisiontree-empty-state">
	<div class="com-decisiontree-empty-state__icon" aria-hidden="true">
		<span class="icon-chart"></span>
	</div>
	<h2><?php echo Text::_('COM_DECISIONTREE_ANALYTICS_PRO_TITLE'); ?></h2>
	<p><?php echo Text::_('COM_DECISIONTREE_ANALYTICS_PRO_DESCRIPTION'); ?></p>
	<a class="btn btn-primary" href="https://granthood.co.uk/joomla-extensions/decision-tree-pro" target="_blank" rel="noopener noreferrer">
		<?php echo Text::_('COM_DECISIONTREE_ANALYTICS_PRO_LINK'); ?>
	</a>
</div>
