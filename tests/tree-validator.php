<?php

declare(strict_types=1);

namespace {
	define('_JEXEC', 1);
}

namespace Joomla\CMS\Language {
	final class Text
	{
		public static function _(string $key): string
		{
			return $key;
		}

		public static function sprintf(string $key, ...$values): string
		{
			return $key . ':' . implode('|', array_map('strval', $values));
		}
	}
}

namespace {
	require_once __DIR__ . '/../administrator/src/Service/TreeValidator.php';

	use GrantDev\Component\DecisionTree\Administrator\Service\TreeValidator;

	$failures = [];
	$assert = static function (bool $condition, string $message) use (&$failures): void {
		if (!$condition) {
			$failures[] = $message;
		}
	};

	$validTree = [
		'start' => 'q1',
		'questions' => [
			'q1' => [
				'question_text' => 'Choose',
				'options' => [
					['text' => 'Continue', 'next' => 'q2'],
				],
			],
			'q2' => [
				'question_text' => 'Finish',
				'options' => [
					['text' => 'Done', 'result' => ['text' => 'Complete']],
				],
			],
		],
	];

	$analysis = TreeValidator::analyse($validTree);
	$assert($analysis['errors'] === [], 'A valid tree should have no errors.');
	$assert($analysis['warnings'] === [], 'A valid tree should have no warnings.');

	$missingTarget = $validTree;
	$missingTarget['questions']['q1']['options'][0]['next'] = 'q99';
	$analysis = TreeValidator::analyse($missingTarget);
	$assert(count($analysis['errors']) === 1, 'A missing target should produce one error.');

	$selfReference = $validTree;
	$selfReference['questions']['q1']['options'][0]['next'] = 'q1';
	$analysis = TreeValidator::analyse($selfReference);
	$assert(count($analysis['errors']) === 1, 'A self-reference should produce one error.');

	$cycle = $validTree;
	$cycle['questions']['q2']['options'][0] = ['text' => 'Again', 'next' => 'q1'];
	$analysis = TreeValidator::analyse($cycle);
	$assert(count($analysis['errors']) === 1, 'A multi-question cycle should produce one error.');

	$unreachable = $validTree;
	$unreachable['questions']['q3'] = [
		'question_text' => 'Unused',
		'options' => [['text' => 'Finish', 'result' => ['text' => 'Unused result']]],
	];
	$analysis = TreeValidator::analyse($unreachable);
	$assert(count($analysis['warnings']) === 1, 'An unreachable question should produce one warning.');

	$deadEnd = $validTree;
	$deadEnd['questions']['q2']['options'] = [];
	$analysis = TreeValidator::analyse($deadEnd);
	$assert(count($analysis['warnings']) === 1, 'A question without options should produce one warning.');

	$incompleteOption = $validTree;
	$incompleteOption['questions']['q2']['options'][0] = ['text' => 'Nowhere'];
	$analysis = TreeValidator::analyse($incompleteOption);
	$assert(count($analysis['warnings']) === 1, 'An option without a destination should produce one warning.');

	$emptyOutcome = $validTree;
	$emptyOutcome['questions']['q2']['options'][0] = ['text' => 'Empty', 'result' => ['text' => '']];
	$analysis = TreeValidator::analyse($emptyOutcome);
	$assert(count($analysis['warnings']) === 1, 'An empty outcome should produce one warning.');

	if ($failures !== []) {
		fwrite(STDERR, implode(PHP_EOL, $failures) . PHP_EOL);
		exit(1);
	}

	echo "TreeValidator tests passed.\n";
}
