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

	private static $instance = 0;

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

		$regex = '/\{decisiontree\s*([^}]*)\}/i';

		if ($event->getContext() === 'com_finder.indexer') {
			$article->text = preg_replace($regex, '', $article->text);

			return;
		}

		$article->text = preg_replace_callback(
			$regex,
			function (array $match): string {
				$attributes = $this->parseAttributes($match[1] ?? '');
				$id = isset($attributes['id']) && ctype_digit($attributes['id']) ? (int) $attributes['id'] : 0;

				if ($id < 1) {
					return Text::_('PLG_CONTENT_DECISIONTREE_TREE_NOT_FOUND');
				}

				return $this->renderTree(
					$id,
					$this->shouldShowHeading($attributes),
					$this->normaliseHeadingLevel($attributes['heading_level'] ?? '')
				);
			},
			$article->text
		);
	}

	private function parseAttributes(string $attributes): array
	{
		$parsed = [];

		preg_match_all('/([a-z_]+)\s*=\s*("[^"]*"|\'[^\']*\'|[^\s]+)/i', $attributes, $matches, PREG_SET_ORDER);

		foreach ($matches as $match) {
			$name = strtolower($match[1]);
			$value = trim($match[2], "\"'");
			$parsed[$name] = $value;
		}

		return $parsed;
	}

	private function shouldShowHeading(array $attributes): bool
	{
		$heading = strtolower($attributes['heading'] ?? 'true');

		return !\in_array($heading, ['0', 'false', 'no', 'off'], true);
	}

	private function normaliseHeadingLevel(string $headingLevel): string
	{
		$headingLevel = strtolower($headingLevel);

		return \in_array($headingLevel, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], true) ? $headingLevel : 'h2';
	}

	private function renderTree(int $id, bool $showHeading = true, string $headingLevel = 'h2'): string
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
			$view->showHeading = $showHeading;
			$view->headingLevel = $headingLevel;
			self::$instance++;
			$view->domId = 'decisiontree-' . $id . '-' . self::$instance;
			$view->dataId = 'decisiontree-data-' . $id . '-' . self::$instance;
			$view->display();

			$output = trim((string) ob_get_clean());
		} catch (\Throwable $exception) {
			ob_end_clean();

			$output = '';
		}

		return $output !== '' ? $output : Text::_('PLG_CONTENT_DECISIONTREE_TREE_NOT_FOUND');
	}
}
