<?php
/**
 * @package     Joomla.Plugin
 * @subpackage  Content.DecisionTree
 *
 * @copyright   (C) 2026 GrantDev. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

\defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\Installer\InstallerAdapter;
use Joomla\CMS\Installer\InstallerScriptInterface;
use Joomla\Database\DatabaseInterface;

return new class () implements InstallerScriptInterface {
	public function install(InstallerAdapter $adapter): bool
	{
		return true;
	}

	public function update(InstallerAdapter $adapter): bool
	{
		return true;
	}

	public function uninstall(InstallerAdapter $adapter): bool
	{
		$this->removeAssets();

		return true;
	}

	public function preflight(string $type, InstallerAdapter $adapter): bool
	{
		if ($type === 'uninstall' && !$this->isBasePackageUninstalling() && $this->isPackageInstalled('pkg_decisiontree')) {
			Factory::getApplication()->enqueueMessage(
				'Uninstall the Decision Tree package instead of uninstalling the Decision Tree content plugin directly.',
				'error'
			);

			return false;
		}

		return true;
	}

	public function postflight(string $type, InstallerAdapter $adapter): bool
	{
		if (\in_array($type, ['install', 'update', 'discover_install'], true)) {
			$this->enablePlugin();
		}

		return true;
	}

	private function enablePlugin(): void
	{
		$db = Factory::getContainer()->get(DatabaseInterface::class);
		$query = $db->getQuery(true)
			->update($db->quoteName('#__extensions'))
			->set($db->quoteName('enabled') . ' = 1')
			->where($db->quoteName('type') . ' = ' . $db->quote('plugin'))
			->where($db->quoteName('folder') . ' = ' . $db->quote('content'))
			->where($db->quoteName('element') . ' = ' . $db->quote('decisiontree'));

		$db->setQuery($query)->execute();
	}

	private function removeAssets(): void
	{
		$db = Factory::getContainer()->get(DatabaseInterface::class);
		$query = $db->getQuery(true)
			->delete($db->quoteName('#__assets'))
			->where($db->quoteName('name') . ' = ' . $db->quote('plg_content_decisiontree'));

		$db->setQuery($query)->execute();
	}

	private function isBasePackageUninstalling(): bool
	{
		return !empty($GLOBALS['decisiontree_base_package_uninstalling']);
	}

	private function isPackageInstalled(string $element): bool
	{
		$db = Factory::getContainer()->get(DatabaseInterface::class);
		$query = $db->getQuery(true)
			->select('COUNT(*)')
			->from($db->quoteName('#__extensions'))
			->where($db->quoteName('type') . ' = ' . $db->quote('package'))
			->where($db->quoteName('element') . ' = ' . $db->quote($element));

		$db->setQuery($query);

		return (int) $db->loadResult() > 0;
	}
};
