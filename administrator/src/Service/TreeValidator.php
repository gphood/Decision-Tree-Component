<?php
/**
 * @package     Joomla.Administrator
 * @subpackage  com_decisiontree
 *
 * @copyright   (C) 2026 GrantDev. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

namespace GrantDev\Component\DecisionTree\Administrator\Service;

\defined('_JEXEC') or die;

use Joomla\CMS\Language\Text;

final class TreeValidator
{
	/**
	 * Analyse a decoded decision tree.
	 *
	 * Errors prevent a tree from being saved. Warnings identify incomplete or
	 * unreachable paths without preventing an administrator from saving a draft.
	 */
	public static function analyse(array $tree): array
	{
		$errors = [];
		$warnings = [];
		$start = trim((string) ($tree['start'] ?? ''));
		$questions = $tree['questions'] ?? null;

		if ($start === '') {
			$errors[] = Text::_('COM_DECISIONTREE_ERROR_JSON_START_REQUIRED');
		}

		if (!\is_array($questions) || $questions === []) {
			$errors[] = Text::_('COM_DECISIONTREE_ERROR_NO_QUESTIONS');

			return ['errors' => array_values(array_unique($errors)), 'warnings' => $warnings];
		}

		if ($start !== '' && !\array_key_exists($start, $questions)) {
			$errors[] = Text::sprintf('COM_DECISIONTREE_ERROR_JSON_START_QUESTION_MISSING', $start);
		}

		$adjacency = [];
		$deadEnds = [];

		foreach ($questions as $questionId => $question) {
			$questionId = (string) $questionId;
			$adjacency[$questionId] = [];

			if (!preg_match('/^[a-z0-9_]+$/', $questionId)) {
				$errors[] = Text::sprintf('COM_DECISIONTREE_ERROR_JSON_QUESTION_REFERENCE_INVALID', $questionId);
			}

			if (!\is_array($question)) {
				$errors[] = Text::sprintf('COM_DECISIONTREE_ERROR_JSON_QUESTION_INVALID', $questionId);
				continue;
			}

			$options = $question['options'] ?? null;

			if (!\is_array($options)) {
				$errors[] = Text::sprintf('COM_DECISIONTREE_ERROR_JSON_OPTIONS_INVALID', $questionId);
				continue;
			}

			if ($options === []) {
				$deadEnds[] = $questionId;
				continue;
			}

			foreach ($options as $optionIndex => $option) {
				if (!\is_array($option)) {
					$errors[] = Text::sprintf('COM_DECISIONTREE_ERROR_JSON_OPTION_INVALID', $questionId, $optionIndex + 1);
					continue;
				}

				$nextQuestionId = trim((string) ($option['next'] ?? ''));
				$hasNext = $nextQuestionId !== '';
				$hasResult = \array_key_exists('result', $option) && self::resultHasContent($option['result']);

				if ($hasNext && $hasResult) {
					$errors[] = Text::sprintf('COM_DECISIONTREE_ERROR_JSON_OPTION_AMBIGUOUS', $questionId, $optionIndex + 1);
					continue;
				}

				if (!$hasNext && !$hasResult) {
					$warnings[] = Text::sprintf('COM_DECISIONTREE_WARNING_JSON_OPTION_INCOMPLETE', $questionId, $optionIndex + 1);
					continue;
				}

				if (!$hasNext) {
					continue;
				}

				if (!\array_key_exists($nextQuestionId, $questions)) {
					$errors[] = Text::sprintf('COM_DECISIONTREE_ERROR_JSON_NEXT_QUESTION_MISSING', $nextQuestionId);
					continue;
				}

				if ($nextQuestionId === $questionId) {
					$errors[] = Text::sprintf('COM_DECISIONTREE_ERROR_JSON_NEXT_QUESTION_SELF_REFERENCE', $questionId);
					continue;
				}

				$adjacency[$questionId][] = $nextQuestionId;
			}
		}

		if ($deadEnds !== []) {
			$warnings[] = Text::sprintf('COM_DECISIONTREE_WARNING_JSON_DEAD_ENDS', implode(', ', $deadEnds));
		}

		$cycle = self::findCycle($adjacency);

		if ($cycle !== []) {
			$errors[] = Text::sprintf('COM_DECISIONTREE_ERROR_JSON_CYCLE', implode(' -> ', $cycle));
		}

		if ($start !== '' && \array_key_exists($start, $questions)) {
			$reachable = self::findReachable($start, $adjacency);
			$unreachable = array_values(array_diff(array_map('strval', array_keys($questions)), $reachable));

			if ($unreachable !== []) {
				$warnings[] = Text::sprintf('COM_DECISIONTREE_WARNING_JSON_UNREACHABLE', implode(', ', $unreachable));
			}
		}

		return [
			'errors' => array_values(array_unique($errors)),
			'warnings' => array_values(array_unique($warnings)),
		];
	}

	private static function findReachable(string $start, array $adjacency): array
	{
		$visited = [];
		$pending = [$start];

		while ($pending !== []) {
			$questionId = array_pop($pending);

			if (isset($visited[$questionId])) {
				continue;
			}

			$visited[$questionId] = true;

			foreach ($adjacency[$questionId] ?? [] as $nextQuestionId) {
				if (!isset($visited[$nextQuestionId])) {
					$pending[] = $nextQuestionId;
				}
			}
		}

		return array_keys($visited);
	}

	private static function resultHasContent($result): bool
	{
		if (\is_string($result)) {
			return trim($result) !== '';
		}

		if (\is_int($result) || \is_float($result)) {
			return true;
		}

		if (!\is_array($result)) {
			return false;
		}

		foreach ($result as $key => $value) {
			if ($key === 'target_blank') {
				continue;
			}

			if (self::resultHasContent($value)) {
				return true;
			}
		}

		return false;
	}

	private static function findCycle(array $adjacency): array
	{
		$state = [];
		$stack = [];

		$visit = static function (string $questionId) use (&$visit, &$state, &$stack, $adjacency): array {
			$state[$questionId] = 1;
			$stack[] = $questionId;

			foreach ($adjacency[$questionId] ?? [] as $nextQuestionId) {
				if (($state[$nextQuestionId] ?? 0) === 0) {
					$cycle = $visit($nextQuestionId);

					if ($cycle !== []) {
						return $cycle;
					}
				} elseif (($state[$nextQuestionId] ?? 0) === 1) {
					$cycleStart = array_search($nextQuestionId, $stack, true);
					$cycle = $cycleStart === false ? [$nextQuestionId] : array_slice($stack, $cycleStart);
					$cycle[] = $nextQuestionId;

					return $cycle;
				}
			}

			array_pop($stack);
			$state[$questionId] = 2;

			return [];
		};

		foreach (array_keys($adjacency) as $questionId) {
			if (($state[$questionId] ?? 0) !== 0) {
				continue;
			}

			$cycle = $visit((string) $questionId);

			if ($cycle !== []) {
				return $cycle;
			}
		}

		return [];
	}
}
