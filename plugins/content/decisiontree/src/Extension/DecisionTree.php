<?php

namespace GrantDev\Plugin\Content\DecisionTree\Extension;

\defined('_JEXEC') or die;

use Joomla\CMS\Event\Content\ContentPrepareEvent;
use Joomla\CMS\Language\Text;
use Joomla\CMS\MVC\Factory\MVCFactoryServiceInterface;
use Joomla\CMS\Plugin\CMSPlugin;
use Joomla\Event\SubscriberInterface;

final class DecisionTree extends CMSPlugin implements SubscriberInterface
{
	protected $autoloadLanguage = true;

	public static function getSubscribedEvents(): array
	{
		return [
			'onContentPrepare' => 'onContentPrepare',
		];
	}

	public function onContentPrepare(ContentPrepareEvent $event): void
	{
		$article = $event->getItem();

		if (!\is_object($article) || !property_exists($article, 'text') || $article->text === null) {
			return;
		}

		if (!str_contains($article->text, '{decisiontree')) {
			return;
		}

		$regex = '/\{decisiontree(?:\s+id=([^}\s]+))?\s*\}/i';

		if ($event->getContext() === 'com_finder.indexer') {
			$article->text = preg_replace($regex, '', $article->text);

			return;
		}

		$article->text = preg_replace_callback(
			$regex,
			function (array $match): string {
				$id = isset($match[1]) && ctype_digit($match[1]) ? (int) $match[1] : 0;

				if ($id < 1) {
					return Text::_('PLG_CONTENT_DECISIONTREE_TREE_NOT_FOUND');
				}

				return $this->renderTree($id);
			},
			$article->text
		);
	}

	private function renderTree(int $id): string
	{
		$app = $this->getApplication();

		ob_start();

		try {
			$component = $app->bootComponent('com_decisiontree');

			if (!$component instanceof MVCFactoryServiceInterface) {
				ob_end_clean();

				return Text::_('PLG_CONTENT_DECISIONTREE_TREE_NOT_FOUND');
			}

			$factory = $component->getMVCFactory();
			$model = $factory->createModel('Tree', 'Site', ['ignore_request' => true]);
			$view = $factory->createView(
				'Tree',
				'Site',
				'Html',
				[
					'base_path' => JPATH_SITE . '/components/com_decisiontree',
					'layout' => 'default',
				]
			);

			if (!$model || !$view || !method_exists($view, 'setModel')) {
				ob_end_clean();

				return Text::_('PLG_CONTENT_DECISIONTREE_TREE_NOT_FOUND');
			}

			$model->setState('tree.id', $id);
			$view->setModel($model, true);
			$view->display();

			$output = trim((string) ob_get_clean());
		} catch (\Throwable $exception) {
			ob_end_clean();

			$output = '';
		}

		return $output !== '' ? $output : Text::_('PLG_CONTENT_DECISIONTREE_TREE_NOT_FOUND');
	}
}
