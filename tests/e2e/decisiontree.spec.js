const { expect, test } = require('@playwright/test');

const adminUrl = process.env.JOOMLA_ADMIN_URL || 'https://dev.docker/administrator';
const adminUser = process.env.JOOMLA_ADMIN_USER;
const adminPass = process.env.JOOMLA_ADMIN_PASS;
const frontendBaseUrl = process.env.DECISIONTREE_FRONTEND_BASE_URL || 'https://dev.docker';

const uniqueTitle = `Decision Tree E2E ${Date.now()}`;

test.describe.serial('com_decisiontree', () => {
	let treeId;

	test.beforeAll(() => {
		expect(adminUser, 'JOOMLA_ADMIN_USER must be set').toBeTruthy();
		expect(adminPass, 'JOOMLA_ADMIN_PASS must be set').toBeTruthy();
	});

	test('admin login', async ({ page }) => {
		await login(page);
		await expect(page.locator('body')).toContainText(/Control Panel|Home Dashboard|System Dashboard/i);
	});

	test('open Components -> Decision Tree', async ({ page }) => {
		await login(page);
		await openDecisionTreeComponent(page);
		await expect(page.getByRole('heading', { name: 'Decision Trees', exact: true })).toBeVisible();
	});

	test('create or refresh the test decision tree using the demo loader', async ({ page }) => {
		await login(page);
		await openDecisionTreeComponent(page);

		const newTreeButton = page.getByRole('link', { name: /^New$/i }).or(page.getByRole('button', { name: /^New$/i }));
		const reuseExistingTree = process.env.DECISIONTREE_EXPECT_FREE_ONLY === '1' && await newTreeButton.count() === 0;

		if (reuseExistingTree) {
			await page.locator('table.itemList tbody th[scope="row"] > a').first().click();
		} else {
			await newTreeButton.click();
		}

		await page.getByLabel('Title').fill(uniqueTitle);

		if (reuseExistingTree) {
			page.once('dialog', (dialog) => dialog.accept());
		}

		await page.getByRole('button', { name: 'Load Demo Decision Tree' }).click();
		await expect(page.locator('#decisiontree-question-select')).toHaveValue('q1');
		await expect(page.locator('#decisiontree-question-select option').first()).toContainText('What will you mainly use the laptop for?');
		await expect(page.locator('#decisiontree-question-text')).toHaveValue('What will you mainly use the laptop for?');
		await expect(page.locator('#decisiontree-options input').first()).toHaveValue('Work / Office tasks');
		await expect(page.locator('#decisiontree-path-health')).toContainText('All decision paths have passed validation checks.');
		await expect(page.getByRole('heading', { name: 'Frontend display', exact: true })).toBeVisible();
		await expect(page.getByText('above each subsequent question in the frontend Decision Tree', { exact: false })).toBeVisible();
		await expect(page.locator('#decisiontree-show-step-number')).not.toBeChecked();
		const nextQuestionLabels = await page.locator('#decisiontree-option-next-0 option').allTextContents();
		expect(nextQuestionLabels).not.toContain('What will you mainly use the laptop for?');

		await page.locator('#decisiontree-option-toggle-0').click();
		await expect(page.locator('.com-decisiontree-option-editor').first().locator('.com-decisiontree-option-editor__body')).toBeHidden();
		await page.locator('#decisiontree-option-toggle-0').click();
		await expect(page.locator('.com-decisiontree-option-editor').first().locator('.com-decisiontree-option-editor__body')).toBeVisible();

		await page.locator('#decisiontree-option-move-down-0').click();
		await expect(page.locator('#decisiontree-options input').first()).toHaveValue('Gaming');
		await page.locator('#decisiontree-option-move-up-1').click();
		await expect(page.locator('#decisiontree-options input').first()).toHaveValue('Work / Office tasks');

		const firstOption = page.locator('.com-decisiontree-option-editor').first();
		await firstOption.getByRole('button', { name: 'Duplicate option', exact: true }).click();
		await expect(page.locator('#decisiontree-option-1')).toHaveValue('Work / Office tasks (Copy)');
		await expect.poll(async () => {
			const json = await page.locator('#jform_json_data').inputValue();
			const tree = JSON.parse(json);
			const original = tree.questions.q1.options[0];
			const copy = tree.questions.q1.options[1];

			return tree.questions.q1.options.length === 4
				&& original.id === 'o1'
				&& copy.id === 'o4'
				&& copy.text === 'Work / Office tasks (Copy)'
				&& copy.next === original.next;
		}).toBe(true);
		await page.locator('.com-decisiontree-option-editor').nth(1).getByRole('button', { name: 'Remove option', exact: true }).click();
		await expect(page.locator('.com-decisiontree-option-editor')).toHaveCount(3);

		await page.getByRole('button', { name: 'Duplicate question' }).click();
		await expect(page.locator('#decisiontree-question-text')).toHaveValue('What will you mainly use the laptop for? (Copy)');
		await expect.poll(async () => {
			const json = await page.locator('#jform_json_data').inputValue();
			const tree = JSON.parse(json);
			const originalIds = tree.questions.q1.options.map((option) => option.id);
			const copyIds = tree.questions.q5.options.map((option) => option.id);

			return tree.version === '1.1'
				&& originalIds.join(',') === 'o1,o2,o3'
				&& copyIds.join(',') === 'o1,o2,o3'
				&& tree.questions.q5.options[0].next === 'q2';
		}).toBe(true);
		page.once('dialog', (dialog) => dialog.accept());
		await page.getByRole('button', { name: 'Delete question' }).click();
		await expect(page.locator('#decisiontree-question-select')).toHaveValue('q1');

		await page.locator('#decisiontree-show-step-number').check();
		await page.getByRole('button', { name: 'Preview decision tree', exact: true }).click();
		await expect(page.locator('#decisiontree-preview-modal')).toHaveClass(/show/);
		await expect(page.locator('#decisiontree-preview-modal .modal-dialog')).toHaveClass(/modal-lg/);
		await expect(page.locator('#decisiontree-preview-tree .gd-decisiontree__step')).toHaveText('Step 1');
		await expect(page.locator('#decisiontree-preview-tree')).toContainText('What will you mainly use the laptop for?');
		await expect(page.locator('#decisiontree-preview-tree').getByRole('button', { name: 'Back', exact: true })).toBeDisabled();
		await expect(page.locator('#decisiontree-preview-tree').getByRole('button', { name: 'Reset', exact: true })).toBeVisible();
		await expect(page.locator('#decisiontree-preview-tree')).not.toContainText('COM_DECISIONTREE_JS_');
		await page.locator('#decisiontree-preview-tree').getByRole('button', { name: 'Work / Office tasks' }).click();
		await expect(page.locator('#decisiontree-preview-tree .gd-decisiontree__step')).toHaveText('Step 2');
		await expect(page.locator('#decisiontree-preview-tree').getByRole('heading', { name: 'Do you need portability?' })).toBeFocused();
		await page.locator('#decisiontree-preview-modal').getByRole('button', { name: 'Close' }).last().click();
		await expect(page.locator('#decisiontree-preview-modal')).not.toHaveClass(/show/);

		await expect.poll(async () => {
			const json = await page.locator('#jform_json_data').inputValue();
			const tree = JSON.parse(json);
			const endpoints = Object.values(tree.questions)
				.flatMap((question) => question.options || [])
				.filter((option) => option.result);

			return endpoints.length === 6 && endpoints.every((option) => (
				option.result.link?.url === 'https://en.wikipedia.org/wiki/Laptop'
				&& option.result.link?.text === 'Learn more about laptops'
				&& option.result.link?.target_blank === true
			));
		}).toBe(true);

		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await expect(page.locator('#system-message-container')).toContainText(/saved|success/i);

		treeId = await page.locator('input[name="jform[id]"], #jform_id').first().inputValue();
		expect(treeId, 'Saved tree ID').toMatch(/^\d+$/);
	});

	test('keeps the dedicated Free site within the Free edition boundaries', async ({ page }) => {
		test.skip(process.env.DECISIONTREE_EXPECT_FREE_ONLY !== '1', 'The target site is not configured as Free-only.');

		await login(page);
		await openDecisionTreeComponent(page);

		await expect(page.getByText('Decision Tree Free', { exact: true })).toBeVisible();
		await expect(page.getByRole('link', { name: /^New$/i })).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'Analytics', exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Duplicate Tree', exact: true })).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'View analytics', exact: true })).toHaveCount(0);
		await expect(page.locator('table.itemList tbody tr')).toHaveCount(1);

		await openTreeForEdit(page, uniqueTitle, treeId);
		await expect(page.locator('.com-decisiontree-rich-blocks__rich')).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'View analytics', exact: true })).toHaveCount(0);
	});

	test('filter and sort the Decision Trees list using Joomla Search Tools', async ({ page }) => {
		await login(page);
		await openDecisionTreeComponent(page);

		await expect(page.locator('input[name="filter_order"], input[name="filter_order_Dir"]')).toHaveCount(0);
		await page.locator('#list_fullordering').selectOption('a.id DESC');
		await expect(page.locator('#list_fullordering')).toHaveValue('a.id DESC');
		await expect(page.locator('thead [data-order="a.id"]')).toHaveClass(/selected/);
		await expect(page.locator('thead [data-order="a.id"]')).toHaveAttribute('data-sort', 'descending');

		const ids = await page.locator('table.itemList tbody tr td:last-child').allTextContents();
		const numericIds = ids.map((id) => Number(id.trim())).filter(Number.isFinite);
		expect(numericIds).toEqual([...numericIds].sort((a, b) => b - a));

		await page.locator('#filter_search').fill(`id:${treeId}`);
		await page.getByRole('button', { name: 'Search', exact: true }).click();
		await expect(page.locator('#filter_search')).toHaveValue(`id:${treeId}`);
		await expect(page.locator('table.itemList tbody tr')).toHaveCount(1);
		await expect(page.getByRole('link', { name: uniqueTitle, exact: true })).toBeVisible();

		await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
			origin: new URL(adminUrl).origin,
		});
		const copyEmbedButton = page.locator('[data-decisiontree-copy-embed]').first();
		await expect(copyEmbedButton).toHaveAccessibleName('Copy embed tag');
		await copyEmbedButton.click();
		await expect(copyEmbedButton).toHaveAttribute('data-copy-state', 'success');
		await expect(copyEmbedButton.getByText('Copied', { exact: true })).toBeVisible();
		await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(`{decisiontree id=${treeId}}`);

		await page.getByRole('button', { name: 'Clear', exact: true }).click();
		await expect(page.locator('#filter_search')).toHaveValue('');
		await page.getByRole('button', { name: 'Filter Options', exact: true }).click();
		await page.locator('#filter_state').selectOption('1');
		await expect(page.locator('#filter_state')).toHaveValue('1');
		await expect(page.getByRole('link', { name: uniqueTitle, exact: true })).toBeVisible();

		await page.getByRole('button', { name: 'Clear', exact: true }).click();
		await page.locator('#list_fullordering').selectOption('a.title ASC');
		await expect(page.locator('#list_fullordering')).toHaveValue('a.title ASC');
	});

	test('save and reopen it, then confirm builder values persist', async ({ page }) => {
		await login(page);
		await openTreeForEdit(page, uniqueTitle, treeId);

		await expect(page.getByLabel('Title')).toHaveValue(uniqueTitle);
		await expect(page.locator('#decisiontree-question-select')).toHaveValue('q1');
		await expect(page.locator('#decisiontree-question-text')).toHaveValue('What will you mainly use the laptop for?');
		await expect(page.locator('#decisiontree-options input').first()).toHaveValue('Work / Office tasks');

		await page.locator('#decisiontree-question-select').selectOption('q2');
		const newTabCheckbox = page.getByLabel('Open link in new tab').first();
		await expect(newTabCheckbox).toBeChecked();
		await newTabCheckbox.uncheck();
		await expect.poll(async () => {
			const json = await page.locator('#jform_json_data').inputValue();
			const tree = JSON.parse(json);

			return tree.questions.q2.options[0].result.link.target_blank;
		}).toBe(false);
		await newTabCheckbox.check();
		await expect.poll(async () => {
			const json = await page.locator('#jform_json_data').inputValue();
			const tree = JSON.parse(json);

			return tree.questions.q2.options[0].result.link.target_blank;
		}).toBe(true);

		treeId = await page.locator('input[name="jform[id]"], #jform_id').first().inputValue();
		expect(treeId, 'Saved tree ID').toMatch(/^\d+$/);
	});

	test('visit frontend URL, click through to a result, then reset', async ({ page }) => {
		expect(treeId, 'Saved tree ID from admin tests').toBeTruthy();
		await page.addInitScript(() => {
			window.__decisionTreeEvents = [];
			['start', 'answer', 'back', 'reset', 'complete'].forEach((eventName) => {
				document.addEventListener(`decisiontree:${eventName}`, (event) => {
					window.__decisionTreeEvents.push({
						name: eventName,
						detail: event.detail,
					});
				});
			});
		});

		await page.goto(`${frontendBaseUrl}/index.php?option=com_decisiontree&view=tree&id=${treeId}`);
		await expect(page.getByText('What will you mainly use the laptop for?')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Work / Office tasks' })).toBeVisible();
		await expect(page.locator('.gd-decisiontree__step')).toHaveText('Step 1');

		await page.getByRole('button', { name: 'Work / Office tasks' }).click();
		await expect(page.getByText('Do you need portability?')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Do you need portability?' })).toBeFocused();
		await expect(page.locator('.gd-decisiontree__step')).toHaveText('Step 2');
		await page.getByRole('button', { name: 'Back' }).click();
		await expect(page.getByText('What will you mainly use the laptop for?')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'What will you mainly use the laptop for?' })).toBeFocused();
		await expect(page.locator('.gd-decisiontree__step')).toHaveText('Step 1');
		await page.getByRole('button', { name: 'Work / Office tasks' }).click();

		await page.getByRole('button', { name: 'Yes, I need it lightweight' }).click();
		await expect(page.getByText('You should look for an ultrabook or lightweight laptop.')).toBeVisible();
		await expect(page.locator('.gd-decisiontree__result')).toBeFocused();
		await expect(page.getByRole('link', { name: 'Learn more about laptops' })).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Laptop');
		await expect(page.getByRole('link', { name: 'Learn more about laptops' })).toHaveAttribute('target', '_blank');
		await expect(page.getByRole('link', { name: 'Learn more about laptops' })).toHaveAttribute('rel', 'noopener noreferrer');

		const eventsBeforeReset = await page.evaluate(() => window.__decisionTreeEvents);
		const firstRunId = eventsBeforeReset[0].detail.runId;
		expect(eventsBeforeReset.map((event) => event.name)).toEqual([
			'start',
			'answer',
			'back',
			'answer',
			'answer',
			'complete',
		]);
		expect(eventsBeforeReset[0].detail).toMatchObject({
			schemaVersion: 1,
			treeId: Number(treeId),
			source: 'component',
			step: 1,
			questionId: 'q1',
		});
		expect(eventsBeforeReset[1].detail).toMatchObject({
			optionId: 'o1',
			optionIndex: 0,
			nextQuestionId: 'q2',
			completesTree: false,
		});

		await page.getByRole('button', { name: 'Reset' }).click();
		await expect(page.getByText('What will you mainly use the laptop for?')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'What will you mainly use the laptop for?' })).toBeFocused();
		await expect(page.getByRole('button', { name: 'Work / Office tasks' })).toBeVisible();
		await expect(page.locator('.gd-decisiontree__step')).toHaveText('Step 1');

		const eventsAfterReset = await page.evaluate(() => window.__decisionTreeEvents);
		expect(eventsAfterReset.slice(-2).map((event) => event.name)).toEqual(['reset', 'start']);
		expect(eventsAfterReset.at(-1).detail.runId).not.toBe(firstRunId);
	});

	test('shows missing-tree guidance only to administrators', async ({ page }) => {
		await loginFrontend(page);
		await page.goto(`${frontendBaseUrl}/index.php?option=com_decisiontree&view=tree&id=999999999`);
		const missingTree = page.locator('.com-decisiontree--missing');
		await expect(missingTree).toContainText('Decision tree not found.');
		await expect(missingTree.locator('.com-decisiontree__admin-note')).toHaveText('Administrator note: This menu item or embed code points to a decision tree that is missing or unpublished.');

		await page.context().clearCookies();
		await page.reload();
		await expect(missingTree).toContainText('Decision tree not found.');
		await expect(missingTree.locator('.com-decisiontree__admin-note')).toHaveCount(0);
	});
});

async function login(page) {
	await page.goto(adminUrl);

	if (await page.locator('#form-login, input[name="username"]').first().isVisible().catch(() => false)) {
		await page.locator('input[name="username"]').fill(adminUser);
		await page.locator('input[name="passwd"], input[name="password"]').fill(adminPass);
		await page.getByRole('button', { name: /log in|login/i }).click();
		await expect(page.locator('body')).not.toContainText(/Username and password do not match|Login denied/i);
	}
}

async function loginFrontend(page) {
	await page.goto(`${frontendBaseUrl}/index.php?option=com_users&view=login`);
	const form = page.locator('form[action*="user.login"]').first();
	await form.locator('input[name="username"]').fill(adminUser);
	await form.locator('input[name="password"]').fill(adminPass);
	await form.locator('button[type="submit"]').click();
	await expect(page.locator('body')).not.toContainText(/Username and password do not match|Login denied/i);
}

async function openDecisionTreeComponent(page) {
	const components = page.getByRole('link', { name: /^Components$/i })
		.or(page.getByRole('button', { name: /^Components$/i }));

	await components.click();
	await page.getByRole('link', { name: 'Decision Tree', exact: true }).click();
	await page.waitForURL(/option=com_decisiontree/);
}

async function openTreeForEdit(page, title, id) {
	await openDecisionTreeComponent(page);

	if (id) {
		await page.locator('#filter_search').fill(`id:${id}`);
		await page.getByRole('button', { name: 'Search', exact: true }).click();
	}

	await page.getByRole('link', { name: title, exact: true }).click();
	await expect(page.getByLabel('Title')).toHaveValue(title);
}
