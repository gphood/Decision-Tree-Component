const path = require('node:path');
const { expect, test } = require('@playwright/test');

const scriptPath = path.resolve(__dirname, '../../media/js/decisiontree.js');

async function renderTree(page, result, options = {}) {
	const tree = {
		start: 'q1',
		questions: {
			q1: {
				question_text: 'Choose a route',
				options: [
					{
						text: 'Finish',
						result,
					},
				],
			},
		},
	};

	await page.setContent(`
		<div class="gd-decisiontree" data-tree-id="1" data-tree-data-id="decisiontree-data-1"></div>
		<script type="application/json" id="decisiontree-data-1">${JSON.stringify(tree).replace(/<\/script/gi, '<\\/script')}</script>
		<script>
			window.Joomla = {
				Text: {
					_: (key, fallback) => key === 'COM_DECISIONTREE_JS_READ_MORE' ? 'Read more' : fallback
				}
			};
		</script>
	`);

	if (options.installResultExtension) {
		await page.evaluate(() => {
			window.DecisionTreeResultExtensions = {
				renderFrontendBlocks: (container, blocks) => {
					blocks.forEach((block) => {
						const paragraph = document.createElement('p');
						paragraph.className = 'test-result-extension';
						paragraph.textContent = block.content || '';
						container.appendChild(paragraph);
					});

					return blocks.length > 0;
				},
			};
		});
	}

	await page.addScriptTag({ path: scriptPath });
	await page.getByRole('button', { name: 'Finish' }).click();
}

test.describe('decision tree result links', () => {
	test('keeps plain string results backwards compatible', async ({ page }) => {
		await renderTree(page, 'Plain result text');

		await expect(page.getByText('Plain result text')).toBeVisible();
		await expect(page.locator('.gd-decisiontree__result-link')).toHaveCount(0);
	});

	test('renders object results without links as plain results', async ({ page }) => {
		await renderTree(page, { text: 'Object result text' });

		await expect(page.getByText('Object result text')).toBeVisible();
		await expect(page.locator('.gd-decisiontree__result-link')).toHaveCount(0);
	});

	test('renders relative result URLs', async ({ page }) => {
		await renderTree(page, {
			text: 'Relative link result',
			link: {
				url: '/contact',
				text: 'Contact us',
			},
		});

		const link = page.getByRole('link', { name: 'Contact us' });

		await expect(link).toBeVisible();
		await expect(link).toHaveAttribute('href', /\/contact$/);
	});

	test('does not add new-tab attributes when target_blank is missing', async ({ page }) => {
		await renderTree(page, {
			text: 'Default link target result',
			link: {
				url: 'https://example.com/resource',
				text: 'Read example',
			},
		});

		const link = page.getByRole('link', { name: 'Read example' });

		await expect(link).toHaveAttribute('href', 'https://example.com/resource');
		await expect(link).not.toHaveAttribute('target', '_blank');
		await expect(link).not.toHaveAttribute('rel', 'noopener noreferrer');
	});

	test('renders absolute URLs with new-tab attributes and fallback link text', async ({ page }) => {
		await renderTree(page, {
			text: 'Absolute link result',
			link: {
				url: 'https://example.com/resource',
				target_blank: true,
			},
		});

		const link = page.getByRole('link', { name: 'Read more' });

		await expect(link).toHaveAttribute('href', 'https://example.com/resource');
		await expect(link).toHaveAttribute('target', '_blank');
		await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
	});

	test('does not render unsafe result URLs as clickable links', async ({ page }) => {
		await renderTree(page, {
			text: 'Unsafe link result',
			link: {
				url: 'javascript:alert(1)',
				text: 'Bad link',
			},
		});

		await expect(page.getByText('Unsafe link result')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Bad link' })).toHaveCount(0);
	});

	test('allows an installed result extension to render structured blocks', async ({ page }) => {
		await renderTree(page, {
			text: 'Fallback result',
			blocks: [
				{ type: 'custom', content: 'Extended result' },
			],
		}, { installResultExtension: true });

		await expect(page.locator('.test-result-extension')).toHaveText('Extended result');
		await expect(page.getByText('Fallback result')).toHaveCount(0);
	});
});
