const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { test, expect } = require('@playwright/test');

// These are release inputs, never bundled copies of private Pro source.
const previousVersion = '1.3.0';
const releaseVersion = '1.4.0';
const previousChecksums = {
	previousFree: '46f888f26ec099ee7d2cce60a3ae39f8ee306754fce7e5f958dd2a3c8dc372f8',
	previousPro: '80e3c42542cc52f03d8d440935689a9b112f25b50515c11ba468708a6850acf1',
};
const adminUrl = process.env.JOOMLA_ADMIN_URL;
const frontendUrl = process.env.DECISIONTREE_FRONTEND_BASE_URL;
const packages = {
	previousFree: process.env.DECISIONTREE_PREVIOUS_FREE_ZIP,
	previousPro: process.env.DECISIONTREE_PREVIOUS_PRO_ZIP,
	currentFree: process.env.DECISIONTREE_CURRENT_FREE_ZIP,
	currentPro: process.env.DECISIONTREE_CURRENT_PRO_ZIP,
};
const title = `Compatibility ${Date.now()}`;
const outcome = {
	text: 'Compatibility fallback',
	link: { text: 'Fallback link', url: 'https://example.com/fallback', target_blank: true },
	blocks: [
		{ type: 'heading', content: 'Existing rich outcome', level: 'h3' },
		{ type: 'text', content: 'Existing customer content' },
		{ type: 'list', items: ['First preserved item', 'Second preserved item'] },
		{ type: 'button', text: 'Existing action', url: 'https://example.com/action', target_blank: true },
	],
};
const tree = {
	version: '1.1', start: 'q1', settings: { show_step_number: true },
	questions: {
		q1: { question_text: 'Compatibility start', options: [{ id: 'o1', text: 'Continue', next: 'q2' }] },
		q2: { question_text: 'Compatibility finish', options: [{ id: 'o1', text: 'Finish', result: outcome }] },
	},
};

const adminLink = (query) => `${adminUrl.replace(/\/$/, '')}/index.php?${query}`;
const readTree = (page) => page.locator('#jform_json_data').evaluate((element) => JSON.parse(element.value));

async function save(page) {
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.locator('#system-message-container')).toContainText(/saved|success/i);
}

async function install(page, filename, message = /Installing package was successful|Installation of the package was successful/i) {
	await page.goto(adminLink('option=com_installer&view=install'));
	await page.locator('#install_package').setInputFiles(path.resolve(filename));
	await expect(page.locator('#system-message-container')).toContainText(message);
}

async function openModal(modal, trigger) {
	// Bootstrap ignores dismissal while the opening transition is running.
	const shown = modal.evaluate((element) => new Promise((resolve) => {
		element.addEventListener('shown.bs.modal', () => resolve(), { once: true });
	}));
	await trigger.click();
	await shown;
}

async function closeModal(modal, name) {
	await modal.getByRole('button', { name, exact: true }).last().click();
	await expect(modal).toBeHidden();
}

async function assertVersions(page, free, pro) {
	await page.goto(adminLink('option=com_installer&view=manage&filter[search]=Decision Tree'));
	const rows = page.locator('table tbody tr');
	await expect(rows.filter({ hasText: 'System - Decision Tree Pro' })).toContainText(pro);
	await expect(rows.filter({ hasText: 'Decision Tree (Component + Plugin)' })).toContainText(free);
}

async function assertResult(page, result = outcome) {
	await expect(page.getByRole('heading', { name: 'Existing rich outcome', exact: true })).toBeVisible();
	await expect(page.getByText(result.blocks[1].content, { exact: true })).toBeVisible();
	await expect(page.getByRole('listitem').filter({ hasText: 'First preserved item' })).toBeVisible();
	await expect(page.getByRole('link', { name: /Existing action$/ })).toHaveAttribute('href', 'https://example.com/action');
}

async function completeRun(browser, treeId, result = outcome) {
	const context = await browser.newContext({ ignoreHTTPSErrors: true });
	try {
		const page = await context.newPage();
		await page.goto(`${frontendUrl}/index.php?option=com_decisiontree&view=tree&id=${treeId}`);
		await expect(page.getByText('Compatibility start', { exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'Continue', exact: true }).click();
		await page.getByRole('button', { name: 'Back', exact: true }).click();
		await expect(page.getByText('Compatibility start', { exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'Continue', exact: true }).click();
		await page.getByRole('button', { name: 'Reset', exact: true }).click();
		await expect(page.getByText('Compatibility start', { exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'Continue', exact: true }).click();
		const completed = page.waitForResponse((response) => (
			response.url().includes('task=interaction.track')
			&& response.request().postDataJSON()?.eventType === 'complete'
		));
		await page.getByRole('button', { name: 'Finish', exact: true }).click();
		await assertResult(page, result);
		expect((await completed).ok()).toBe(true);
	} finally {
		await context.close();
	}
}

async function assertCompletions(page, treeId, count) {
	await page.goto(adminLink(`option=com_decisiontree&view=analytics&tree_id=${treeId}`));
	await expect(page.getByRole('heading', { name: 'Decision Tree Analytics', exact: true })).toBeVisible();
	await expect(page.getByRole('combobox', { name: 'Tree', exact: true })).toHaveValue(treeId);
	const card = page.locator('.com-decisiontree-analytics__card').filter({ hasText: 'Completed runs' });
	await expect(card.locator('strong')).toHaveText(String(count));
}

test('Free-first upgrade preserves the previous Pro release, then accepts the current Pro release', async ({ page, browser }, testInfo) => {
	expect(process.env.DECISIONTREE_DISPOSABLE_SITE, 'Use an isolated disposable site; this test installs older packages.').toBe('1');
	for (const [name, value] of Object.entries({ adminUrl, frontendUrl, user: process.env.JOOMLA_ADMIN_USER, password: process.env.JOOMLA_ADMIN_PASS })) {
		expect(Boolean(value), `${name} must be configured`).toBe(true);
	}
	for (const [name, filename] of Object.entries(packages)) {
		expect(Boolean(filename) && fs.existsSync(filename), `${name} package must exist`).toBe(true);
	}
	const checksums = Object.fromEntries(Object.entries(packages).map(([name, filename]) => [
		name, createHash('sha256').update(fs.readFileSync(filename)).digest('hex'),
	]));
	for (const [name, checksum] of Object.entries(previousChecksums)) {
		expect(checksums[name], `${name} must match the archived release, not a rebuilt development ZIP`).toBe(checksum);
	}
	const pageErrors = [];
	page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
	await page.goto(adminUrl);
	await page.locator('input[name="username"]').fill(process.env.JOOMLA_ADMIN_USER);
	await page.locator('input[name="passwd"], input[name="password"]').fill(process.env.JOOMLA_ADMIN_PASS);
	await page.getByRole('button', { name: /log in|login/i }).click();
	let treeId;
	let savedResult;
	let savedLayout;

	await test.step('Install the published 1.3.0 packages and save a representative Pro tree', async () => {
		await install(page, packages.previousFree);
		await install(page, packages.previousPro);
		await assertVersions(page, previousVersion, previousVersion);
		await page.goto(adminLink('option=com_decisiontree&view=trees'));
		await page.getByRole('link', { name: /^New$/ }).or(page.getByRole('button', { name: /^New$/ })).click();
		await page.locator('#jform_title').fill(title);
		await page.locator('#jform_json_data').evaluate((element, data) => {
			element.value = JSON.stringify(data);
			element.dispatchEvent(new Event('change', { bubbles: true }));
		}, tree);
		await save(page);
		treeId = await page.locator('#jform_id').inputValue();
		await page.reload();
		savedResult = (await readTree(page)).questions.q2.options[0].result;
		expect(savedResult).toEqual(outcome);
		await page.getByRole('link', { name: 'View analytics', exact: true }).click();
		await page.getByRole('link', { name: 'Open analytics settings', exact: true }).click();
		const analyticsTab = page.getByRole('tab', { name: /Analytics/i });
		if (await analyticsTab.count()) await analyticsTab.click();
		await page.locator('input[name="jform[params][analytics_enabled]"][value="1"]').check({ force: true });
		await save(page);
		await completeRun(browser, treeId);
		await assertCompletions(page, treeId, 1);
	});

	await test.step('Reject Pro 1.4.0 before Free is updated', async () => {
		await install(page, packages.currentPro, /requires Decision Tree Free 1\.4\.0 or later/i);
		await assertVersions(page, previousVersion, previousVersion);
		await assertCompletions(page, treeId, 1);
	});

	await test.step('Update only Free; preserve old Pro content, canvas editing and analytics', async () => {
		await install(page, packages.currentFree);
		await assertVersions(page, releaseVersion, previousVersion);
		await assertCompletions(page, treeId, 1);
		await page.goto(adminLink(`option=com_decisiontree&task=tree.edit&id=${treeId}`));
		expect((await readTree(page)).questions.q2.options[0].result).toEqual(savedResult);
		await page.getByRole('button', { name: 'Visual canvas', exact: true }).click();
		await expect(page.locator('.com-decisiontree-canvas-node.is-question')).toHaveCount(2);
		await expect(page.getByRole('button', { name: 'Preview from here', exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Preview outcome', exact: true })).toHaveCount(0);
		const modal = page.locator('#decisiontree-question-modal');
		await openModal(modal, page.locator('[data-node-id="outcome:q2:o1"]').getByRole('button', { name: 'Edit outcome', exact: true }));
		await expect(modal.locator('.com-decisiontree-rich-block')).toHaveCount(4);
		await expect(modal.locator('option[value="image"]')).toHaveCount(0);
		await modal.locator('.com-decisiontree-rich-block').nth(1).locator('textarea').fill('Content edited with Free 1.4 and Pro 1.3');
		savedResult.blocks[1].content = 'Content edited with Free 1.4 and Pro 1.3';
		await closeModal(modal, 'Done');
		await openModal(modal, page.locator('[data-node-id="q2"]').getByRole('button', { name: 'Duplicate question', exact: true }));
		const questionText = modal.locator('#decisiontree-question-text');
		await expect(questionText).toBeFocused();
		expect(await questionText.evaluate((element) => element.form?.id)).toBe('tree-form');
		await questionText.press('Tab');
		expect((await readTree(page)).questions.q3.options[0].result).toEqual(savedResult);
		await closeModal(modal, 'Done');
		page.once('dialog', (dialog) => dialog.accept());
		await page.locator('[data-node-id="q3"]').getByRole('button', { name: 'Delete question', exact: true }).click();
		await page.getByRole('button', { name: 'Form builder', exact: true }).click();
		const preview = page.locator('#decisiontree-preview-modal');
		await openModal(preview, page.getByRole('button', { name: 'Preview decision tree', exact: true }));
		await preview.getByRole('button', { name: 'Continue', exact: true }).click();
		await preview.getByRole('button', { name: 'Finish', exact: true }).click();
		await assertResult(preview, savedResult);
		await closeModal(preview, 'Close');
		await page.getByRole('button', { name: 'Visual canvas', exact: true }).click();
		await page.getByRole('button', { name: 'Auto arrange', exact: true }).click();
		await save(page);
		await page.reload();
		expect((await readTree(page)).questions.q2.options[0].result).toEqual(savedResult);
		savedLayout = (await readTree(page)).layout;
		expect(Object.keys(savedLayout.canvas.positions)).toHaveLength(3);
		await completeRun(browser, treeId, savedResult);
		await assertCompletions(page, treeId, 2);
		await page.goto(adminLink(`option=com_decisiontree&view=trees&filter[search]=${encodeURIComponent(title)}`));
		await page.locator('input[name="cid[]"]').first().check();
		await page.getByRole('button', { name: 'Duplicate Tree', exact: true }).click();
		await expect(page.locator('#system-message-container')).toContainText('Tree duplicated successfully');
		await expect(page.getByRole('link', { name: `${title} (Copy)`, exact: true })).toBeVisible();
		await page.getByRole('link', { name: `${title} (Copy)`, exact: true }).click();
		expect((await readTree(page)).questions.q2.options[0].result).toEqual(savedResult);
		expect((await readTree(page)).layout).toEqual(savedLayout);
	});

	await test.step('Update Pro afterwards without losing the mixed-version edits or analytics', async () => {
		await install(page, packages.currentPro);
		await assertVersions(page, releaseVersion, releaseVersion);
		await assertCompletions(page, treeId, 2);
		await page.goto(adminLink(`option=com_decisiontree&task=tree.edit&id=${treeId}`));
		expect((await readTree(page)).questions.q2.options[0].result).toEqual(savedResult);
		expect((await readTree(page)).layout).toEqual(savedLayout);
		await page.getByRole('button', { name: 'Visual canvas', exact: true }).click();
		await expect(page.locator('[data-node-id="q2"]').getByRole('button', { name: 'Preview from here', exact: true })).toBeVisible();
		await openModal(page.locator('#decisiontree-preview-modal'), page.locator('[data-node-id="outcome:q2:o1"]').getByRole('button', { name: 'Preview outcome', exact: true }));
		await assertResult(page.locator('#decisiontree-preview-modal'), savedResult);
		await closeModal(page.locator('#decisiontree-preview-modal'), 'Close');
		await completeRun(browser, treeId, savedResult);
		await assertCompletions(page, treeId, 3);
	});
	expect(pageErrors, 'No uncaught administrator JavaScript errors').toEqual([]);
	await testInfo.attach('compatibility-versions', {
		body: JSON.stringify({ previousVersion, releaseVersion, checksums, treeId, sequence: ['1.3.0 + 1.3.0', '1.4.0 + 1.3.0', '1.4.0 + 1.4.0'] }, null, 2),
		contentType: 'application/json',
	});
});
