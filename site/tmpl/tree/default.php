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
$headingLevel = \in_array($this->headingLevel ?? 'h2', ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], true) ? $this->headingLevel : 'h2';
$domId = $this->domId ?: 'decisiontree-' . (int) $this->item->id;
$dataId = $this->dataId ?: 'decisiontree-data-' . (int) $this->item->id;
?>

<div class="com-decisiontree gd-decisiontree" id="<?php echo $this->escape($domId); ?>" data-tree-id="<?php echo (int) $this->item->id; ?>" data-tree-data-id="<?php echo $this->escape($dataId); ?>">
	<?php if ($this->showHeading ?? true) : ?>
		<<?php echo $headingLevel; ?>><?php echo $this->escape($this->item->title); ?></<?php echo $headingLevel; ?>>
	<?php endif; ?>
	<?php if (!empty($this->item->description)) : ?>
		<div class="com-decisiontree__description">
			<?php echo $this->item->description; ?>
		</div>
	<?php endif; ?>
	<div class="com-decisiontree__container"></div>
	<script type="application/json" class="com-decisiontree__data" id="<?php echo $this->escape($dataId); ?>">
		<?php echo $jsonData; ?>
	</script>
</div>
