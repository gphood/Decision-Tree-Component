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
	require_once __DIR__ . '/../administrator/src/Service/TreeNormalizer.php';

	use GrantDev\Component\DecisionTree\Administrator\Service\TreeNormalizer;
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

	$normalizedTree = TreeNormalizer::normalize($validTree);
	$assert($normalizedTree['version'] === '1.1', 'A legacy tree should be upgraded to data version 1.1.');
	$assert($normalizedTree['questions']['q1']['options'][0]['id'] === 'o1', 'A missing option ID should be assigned.');
	$assert($normalizedTree['questions']['q2']['options'][0]['id'] === 'o1', 'Option IDs should be scoped to their question.');
	$assert($normalizedTree['questions']['q1']['options'][0]['next'] === 'q2', 'Normalisation must preserve branch destinations.');

	$unknownData = $validTree;
	$unknownData['extension_data'] = ['preserve' => true];
	$unknownData['questions']['q1']['options'][0]['custom'] = ['value' => 12];
	$normalizedUnknownData = TreeNormalizer::normalize($unknownData);
	$assert($normalizedUnknownData['extension_data']['preserve'] === true, 'Unknown top-level data should be preserved.');
	$assert($normalizedUnknownData['questions']['q1']['options'][0]['custom']['value'] === 12, 'Unknown option data should be preserved.');

	$duplicateOptionIds = TreeNormalizer::normalize($validTree);
	$duplicateOptionIds['questions']['q1']['options'][] = [
		'id' => 'o1',
		'text' => 'Duplicate ID',
		'result' => ['text' => 'Done'],
	];
	$analysis = TreeValidator::analyse($duplicateOptionIds);
	$assert(count($analysis['errors']) === 1, 'A duplicate option ID should produce one error.');

	$invalidStepSetting = TreeNormalizer::normalize($validTree);
	$invalidStepSetting['settings'] = ['show_step_number' => 'yes'];
	$analysis = TreeValidator::analyse($invalidStepSetting);
	$assert(count($analysis['errors']) === 1, 'A non-boolean step-number setting should produce one error.');

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
