<?php
/**
 * @package     Joomla.Site
 * @subpackage  com_decisiontree
 *
 * @copyright   (C) 2026 GrantDev. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

namespace GrantDev\Component\DecisionTree\Site\Controller;

\defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\MVC\Controller\BaseController;
use Joomla\CMS\Response\JsonResponse;
use Joomla\CMS\Session\Session;
use Joomla\Database\DatabaseInterface;
use Joomla\Database\ParameterType;
use Joomla\Event\Event;

final class InteractionController extends BaseController
{
	private const EVENT_TYPES = ['start', 'answer', 'back', 'reset', 'complete'];

	public function track(): void
	{
		$app = Factory::getApplication();

		if (strtoupper($app->getInput()->server->getCmd('REQUEST_METHOD')) !== 'POST') {
			$this->respond(null, 'Method not allowed.', true, 405);
		}

		if (!Session::checkToken('get')) {
			$this->respond(null, 'Invalid security token.', true, 403);
		}

		$payload = $this->normalisePayload($app->getInput()->json->getArray());

		if ($payload === null) {
			$this->respond(null, 'Invalid interaction data.', true, 400);
		}

		$tree = $this->getPublishedTree((int) $payload['treeId']);

		if ($tree === null) {
			$this->respond(null, 'Decision tree not found.', true, 404);
		}

		$app->getDispatcher()->dispatch(
			'onDecisionTreeInteraction',
			new Event('onDecisionTreeInteraction', [
				'subject' => $this,
				'payload' => $payload,
				'tree' => $tree,
			])
		);

		$this->respond(['accepted' => true]);
	}

	private function normalisePayload(array $input): ?array
	{
		$schemaVersion = filter_var($input['schemaVersion'] ?? null, FILTER_VALIDATE_INT);
		$treeId = filter_var($input['treeId'] ?? null, FILTER_VALIDATE_INT);
		$sequence = filter_var($input['sequence'] ?? null, FILTER_VALIDATE_INT);
		$step = filter_var($input['step'] ?? null, FILTER_VALIDATE_INT);
		$eventType = trim((string) ($input['eventType'] ?? ''));
		$eventId = trim((string) ($input['eventId'] ?? ''));
		$runId = trim((string) ($input['runId'] ?? ''));
		$source = trim((string) ($input['source'] ?? ''));

		if (
			$schemaVersion !== 1
			|| !$treeId
			|| $treeId < 1
			|| $sequence === false
			|| $sequence < 1
			|| $sequence > 200
			|| $step === false
			|| $step < 1
			|| $step > 200
			|| !\in_array($eventType, self::EVENT_TYPES, true)
			|| !\in_array($source, ['component', 'content'], true)
			|| !$this->isUuid($eventId)
			|| !$this->isUuid($runId)
		) {
			return null;
		}

		$payload = [
			'schemaVersion' => 1,
			'eventId' => $eventId,
			'runId' => $runId,
			'sequence' => $sequence,
			'eventType' => $eventType,
			'treeId' => $treeId,
			'source' => $source,
			'step' => $step,
		];

		foreach (['questionId', 'optionId', 'nextQuestionId', 'targetQuestionId', 'outcomeKey'] as $key) {
			$value = trim((string) ($input[$key] ?? ''));

			if (strlen($value) > 255) {
				return null;
			}

			$payload[$key] = $value;
		}

		$optionIndex = filter_var($input['optionIndex'] ?? null, FILTER_VALIDATE_INT);
		$payload['optionIndex'] = $optionIndex === false || $optionIndex < 0 || $optionIndex > 199
			? null
			: $optionIndex;

		return $payload;
	}

	private function getPublishedTree(int $treeId): ?array
	{
		$db = Factory::getContainer()->get(DatabaseInterface::class);
		$query = $db->getQuery(true)
			->select($db->quoteName(['id', 'title', 'json_data']))
			->from($db->quoteName('#__decisiontree_trees'))
			->where($db->quoteName('id') . ' = :id')
			->where($db->quoteName('state') . ' = 1')
			->bind(':id', $treeId, ParameterType::INTEGER);

		$db->setQuery($query);
		$record = $db->loadAssoc();

		if (!$record) {
			return null;
		}

		$treeData = json_decode((string) $record['json_data'], true);

		if (json_last_error() !== JSON_ERROR_NONE || !\is_array($treeData)) {
			return null;
		}

		return [
			'id' => (int) $record['id'],
			'title' => (string) $record['title'],
			'json' => (string) $record['json_data'],
			'data' => $treeData,
		];
	}

	private function isUuid(string $value): bool
	{
		return (bool) preg_match(
			'/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
			$value
		);
	}

	private function respond($data, string $message = '', bool $error = false, int $status = 200): void
	{
		http_response_code($status);
		header('Content-Type: application/json; charset=utf-8');
		echo new JsonResponse($data, $message, $error);
		Factory::getApplication()->close();
	}
}
