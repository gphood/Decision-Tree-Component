<?php

\defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\Language\Text;

$wa = Factory::getApplication()->getDocument()->getWebAssetManager();
$wa->getRegistry()->addExtensionRegistryFile('com_decisiontree');
$wa->useStyle('com_decisiontree.frontend.styles');
$wa->useScript('com_decisiontree.frontend');

if (!$this->item) : ?>
	<div class="com-decisiontree com-decisiontree--missing">
		<?php echo Text::_('COM_DECISIONTREE_TREE_NOT_FOUND'); ?>
	</div>
<?php return; endif; ?>

<?php
$jsonData = trim((string) $this->item->json_data);
$jsonData = $jsonData === '' ? '{}' : str_replace('</script', '<\/script', $jsonData);
?>

<div class="com-decisiontree gd-decisiontree" id="decisiontree-<?php echo (int) $this->item->id; ?>" data-tree-id="<?php echo (int) $this->item->id; ?>">
	<h1><?php echo $this->escape($this->item->title); ?></h1>
	<?php if (!empty($this->item->description)) : ?>
		<div class="com-decisiontree__description">
			<?php echo $this->item->description; ?>
		</div>
	<?php endif; ?>
	<div class="com-decisiontree__container"></div>
	<script type="application/json" class="com-decisiontree__data" id="decisiontree-data-<?php echo (int) $this->item->id; ?>">
		<?php echo $jsonData; ?>
	</script>
</div>
