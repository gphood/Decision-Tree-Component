<?php

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
		return true;
	}

	public function postflight(string $type, InstallerAdapter $adapter): bool
	{
		return true;
	}

	private function removeAssets(): void
	{
		$db = Factory::getContainer()->get(DatabaseInterface::class);
		$query = $db->getQuery(true)
			->delete($db->quoteName('#__assets'))
			->where(
				[
					$db->quoteName('name') . ' = ' . $db->quote('com_decisiontree'),
					$db->quoteName('name') . ' LIKE ' . $db->quote('com_decisiontree.%'),
				],
				'OR'
			);

		$db->setQuery($query)->execute();
	}
};
