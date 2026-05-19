<?php
/**
 * @package     Joomla.Package
 * @subpackage  pkg_decisiontree
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
		return true;
	}

	public function preflight(string $type, InstallerAdapter $adapter): bool
	{
		if ($type !== 'uninstall') {
			return true;
		}

		if ($this->isProPackageInstalled()) {
			Factory::getApplication()->enqueueMessage(
				'Uninstall the Decision Tree Pro add-on before uninstalling the base Decision Tree package.',
				'error'
			);

			return false;
		}

		$GLOBALS['decisiontree_base_package_uninstalling'] = true;

		return true;
	}

	public function postflight(string $type, InstallerAdapter $adapter): bool
	{
		return true;
	}

	private function isProPackageInstalled(): bool
	{
		$db = Factory::getContainer()->get(DatabaseInterface::class);
		$query = $db->getQuery(true)
			->select('COUNT(*)')
			->from($db->quoteName('#__extensions'))
			->where($db->quoteName('type') . ' = ' . $db->quote('package'))
			->where($db->quoteName('element') . ' = ' . $db->quote('pkg_decisiontreepro'));

		$db->setQuery($query);

		return (int) $db->loadResult() > 0;
	}
};
