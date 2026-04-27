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

	test('create a new decision tree using the demo loader', async ({ page }) => {
		await login(page);
		await openDecisionTreeComponent(page);

		await page.getByRole('link', { name: /^New$/i }).or(page.getByRole('button', { name: /^New$/i })).click();
		await page.getByLabel('Title').fill(uniqueTitle);

		await page.getByRole('button', { name: 'Load Demo Decision Tree' }).click();
		await expect(page.locator('#decisiontree-question-select')).toHaveValue('q1');
		await expect(page.locator('#decisiontree-question-text')).toHaveValue('What will you mainly use the laptop for?');
		await expect(page.locator('#decisiontree-options input').first()).toHaveValue('Work / Office tasks');

		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await expect(page.locator('#system-message-container, .alert-success')).toContainText(/saved|success/i);

		treeId = await page.locator('input[name="jform[id]"], #jform_id').first().inputValue();
		expect(treeId, 'Saved tree ID').toMatch(/^\d+$/);
	});

	test('save and reopen it, then confirm builder values persist', async ({ page }) => {
		await login(page);
		await openTreeForEdit(page, uniqueTitle);

		await expect(page.getByLabel('Title')).toHaveValue(uniqueTitle);
		await expect(page.locator('#decisiontree-question-select')).toHaveValue('q1');
		await expect(page.locator('#decisiontree-question-text')).toHaveValue('What will you mainly use the laptop for?');
		await expect(page.locator('#decisiontree-options input').first()).toHaveValue('Work / Office tasks');

		treeId = await page.locator('input[name="jform[id]"], #jform_id').first().inputValue();
		expect(treeId, 'Saved tree ID').toMatch(/^\d+$/);
	});

	test('visit frontend URL, click through to a result, then reset', async ({ page }) => {
		expect(treeId, 'Saved tree ID from admin tests').toBeTruthy();

		await page.goto(`${frontendBaseUrl}/index.php?option=com_decisiontree&view=tree&id=${treeId}`);
		await expect(page.getByText('What will you mainly use the laptop for?')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Work / Office tasks' })).toBeVisible();

		await page.getByRole('button', { name: 'Work / Office tasks' }).click();
		await expect(page.getByText('Do you need portability?')).toBeVisible();

		await page.getByRole('button', { name: 'Yes, I need it lightweight' }).click();
		await expect(page.getByText('You should look for an ultrabook or lightweight laptop.')).toBeVisible();

		await page.getByRole('button', { name: 'Reset' }).click();
		await expect(page.getByText('What will you mainly use the laptop for?')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Work / Office tasks' })).toBeVisible();
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

async function openDecisionTreeComponent(page) {
	const components = page.getByRole('link', { name: /^Components$/i })
		.or(page.getByRole('button', { name: /^Components$/i }));

	await components.click();
	await page.getByRole('link', { name: /Decision Tree/i }).click();
	await page.waitForURL(/option=com_decisiontree/);
}

async function openTreeForEdit(page, title) {
	await openDecisionTreeComponent(page);
	await page.getByRole('link', { name: title }).click();
	await expect(page.getByLabel('Title')).toHaveValue(title);
}
