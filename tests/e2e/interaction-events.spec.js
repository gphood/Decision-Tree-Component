const path = require('node:path');
const { expect, test } = require('@playwright/test');

const scriptPath = path.resolve(__dirname, '../../media/js/decisiontree.js');

const tree = {
	version: '1.1',
	start: 'q1',
	settings: {
		show_step_number: true,
	},
	questions: {
		q1: {
			question_text: 'First question',
			options: [
				{ id: 'o1', text: 'Continue', next: 'q2' },
			],
		},
		q2: {
			question_text: 'Second question',
			options: [
				{ id: 'o1', text: 'Finish', result: { text: 'Complete' } },
			],
		},
	},
};

async function mountTree(page) {
	await page.setContent(`
		<div class="gd-decisiontree" id="decisiontree-test" data-tree-id="42" data-tree-data-id="decisiontree-data-42"></div>
		<script type="application/json" id="decisiontree-data-42">${JSON.stringify(tree)}</script>
		<script>
			window.decisionTreeEvents = [];
			window.Joomla = {
				Text: {
					_: (key, fallback) => ({
						COM_DECISIONTREE_JS_BACK: 'Back',
						COM_DECISIONTREE_JS_RESET: 'Reset',
						COM_DECISIONTREE_JS_STEP_NUMBER: 'Step %s',
					}[key] || fallback || key),
				},
			};
			['start', 'answer', 'back', 'reset', 'complete'].forEach((type) => {
				document.addEventListener('decisiontree:' + type, (event) => {
					window.decisionTreeEvents.push({ type, detail: event.detail });
				});
			});
		</script>
	`);
	await page.addScriptTag({ path: scriptPath });
	await expect(page.getByText('First question')).toBeVisible();
}

test('keeps navigation history, step numbering and interaction events in sync', async ({ page }) => {
	await mountTree(page);

	await expect(page.locator('.gd-decisiontree__step')).toHaveText('Step 1');
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page.getByText('Second question')).toBeVisible();
	await expect(page.locator('.gd-decisiontree__step')).toHaveText('Step 2');

	await page.getByRole('button', { name: 'Back' }).click();
	await expect(page.getByText('First question')).toBeVisible();
	await expect(page.locator('.gd-decisiontree__step')).toHaveText('Step 1');
	await expect(page.getByRole('button', { name: 'Back' })).toBeDisabled();

	await page.getByRole('button', { name: 'Continue' }).click();
	await page.getByRole('button', { name: 'Finish' }).click();
	await expect(page.getByText('Complete')).toBeVisible();
	await page.getByRole('button', { name: 'Reset' }).click();
	await expect(page.getByText('First question')).toBeVisible();
	await expect(page.locator('.gd-decisiontree__step')).toHaveText('Step 1');

	const events = await page.evaluate(() => window.decisionTreeEvents);

	expect(events.map((event) => event.type)).toEqual([
		'start',
		'answer',
		'back',
		'answer',
		'answer',
		'complete',
		'reset',
		'start',
	]);
	expect(events[0].detail).toMatchObject({
		schemaVersion: 1,
		treeId: 42,
		instanceId: 'decisiontree-test',
		source: 'component',
		step: 1,
		questionId: 'q1',
	});
	expect(events[1].detail).toMatchObject({
		optionId: 'o1',
		optionIndex: 0,
		optionText: 'Continue',
		nextQuestionId: 'q2',
		completesTree: false,
	});
	expect(events[2].detail).toMatchObject({
		step: 1,
		targetQuestionId: 'q1',
	});
	expect(events[5].detail).toMatchObject({
		step: 2,
		questionId: 'q2',
		optionId: 'o1',
		outcomeKey: 'terminal:q2:o1',
	});
	expect(events[7].detail.runId).not.toBe(events[0].detail.runId);
});
