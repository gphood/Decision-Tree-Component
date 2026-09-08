const { expect, test } = require('@playwright/test');

const adminUrl = process.env.JOOMLA_ADMIN_URL || 'https://dev.docker/administrator';
const adminUser = process.env.JOOMLA_ADMIN_USER;
const adminPass = process.env.JOOMLA_ADMIN_PASS;
const frontendBaseUrl = process.env.DECISIONTREE_FRONTEND_BASE_URL || 'https://dev.docker';

const uniqueTitle = `Decision Tree E2E ${Date.now()}`;

const contrastRatio = (foreground, background) => {
	const luminance = (colour) => {
		const channels = colour.match(/[\d.]+/g).slice(0, 3).map((value) => Number(value) / 255);
		const linear = channels.map((value) => (
			value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4
		));

		return (.2126 * linear[0]) + (.7152 * linear[1]) + (.0722 * linear[2]);
	};
	const lighter = Math.max(luminance(foreground), luminance(background));
	const darker = Math.min(luminance(foreground), luminance(background));

	return (lighter + .05) / (darker + .05);
};

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

		await page.getByRole('button', { name: 'Visual canvas', exact: true }).click();
		await expect(page.locator('#decisiontree-canvas-view')).toBeVisible();
		await expect(page.locator('#decisiontree-form-view')).toBeHidden();
		await expect(page.locator('.com-decisiontree-canvas-node.is-question')).toHaveCount(4);
		await expect(page.locator('.com-decisiontree-canvas-node.is-outcome')).toHaveCount(6);
		await expect(page.locator('.com-decisiontree-canvas-edge')).toHaveCount(9);
		const outcomeMetrics = await page.locator('.com-decisiontree-canvas-node.is-outcome').evaluateAll((nodes) => (
			nodes.map((node) => {
				const meta = node.querySelector('.com-decisiontree-canvas-node__meta');
				const metaStyle = getComputedStyle(meta);

				return {
					lineHeight: Number.parseFloat(metaStyle.lineHeight),
					metaHeight: meta.clientHeight,
				};
			})
		));
		outcomeMetrics.forEach(({ lineHeight, metaHeight }) => {
			expect(metaHeight).toBeGreaterThanOrEqual(lineHeight - 1);
		});
		await expect(page.locator('[data-node-id="q1"]')).toContainText('Start');
		await expect(page.locator('#decisiontree-canvas-view')).not.toContainText('COM_DECISIONTREE_');
		const wrappedQuestionMetrics = await page.locator('[data-node-id="q1"]').evaluate((node) => {
			const title = node.querySelector('.com-decisiontree-canvas-node__title');
			const titleStyle = getComputedStyle(title);

			return {
				cardHeight: Number.parseFloat(getComputedStyle(node).height),
				lineHeight: Number.parseFloat(titleStyle.lineHeight),
				titleHeight: title.clientHeight,
			};
		});
		expect(wrappedQuestionMetrics.cardHeight).toBeGreaterThanOrEqual(159);
		expect(wrappedQuestionMetrics.titleHeight).toBeGreaterThanOrEqual((wrappedQuestionMetrics.lineHeight * 2) - 1);
		const getInitialCanvasInset = () => page.evaluate(() => {
			const viewport = document.getElementById('decisiontree-canvas-viewport');
			const nodes = [...document.querySelectorAll('.com-decisiontree-canvas-node')];
			const viewportBounds = viewport?.getBoundingClientRect();
			const nodeBounds = nodes.map((node) => node.getBoundingClientRect());

			return {
				left: Math.min(...nodeBounds.map((bounds) => bounds.left)) - viewportBounds.left,
				top: Math.min(...nodeBounds.map((bounds) => bounds.top)) - viewportBounds.top,
			};
		});
		await expect.poll(async () => (await getInitialCanvasInset()).left).toBeGreaterThanOrEqual(35);
		await expect.poll(async () => (await getInitialCanvasInset()).left).toBeLessThanOrEqual(60);
		await expect.poll(async () => (await getInitialCanvasInset()).top).toBeGreaterThanOrEqual(35);
		await expect.poll(async () => (await getInitialCanvasInset()).top).toBeLessThanOrEqual(60);
		const firstQuestionNode = page.locator('[data-node-id="q1"]');
		const secondQuestionNode = page.locator('[data-node-id="q2"]');
		await expect(firstQuestionNode.getByRole('button', { name: 'Set as start question', exact: true })).toBeDisabled();
		await expect(firstQuestionNode.getByRole('button', { name: 'Delete question', exact: true })).toBeDisabled();
		const actionColours = await secondQuestionNode.evaluate((node) => {
			const root = document.documentElement;
			const originalTheme = root.getAttribute('data-bs-theme');
			const readTheme = (theme) => {
				root.setAttribute('data-bs-theme', theme);
				const nodeBackground = getComputedStyle(node).backgroundColor;
				const neutral = getComputedStyle(node.querySelector('.is-duplicate')).color;
				const danger = getComputedStyle(node.querySelector('.is-delete')).color;

				return { danger, neutral, nodeBackground };
			};
			const colours = {
				dark: readTheme('dark'),
				light: readTheme('light'),
			};

			if (originalTheme === null) {
				root.removeAttribute('data-bs-theme');
			} else {
				root.setAttribute('data-bs-theme', originalTheme);
			}

			return colours;
		});
		for (const theme of ['light', 'dark']) {
			expect(contrastRatio(actionColours[theme].neutral, actionColours[theme].nodeBackground)).toBeGreaterThanOrEqual(4.5);
			expect(contrastRatio(actionColours[theme].danger, actionColours[theme].nodeBackground)).toBeGreaterThanOrEqual(4.5);
		}
		const firstOutcomeNode = page.locator('[data-node-id="outcome:q2:o1"]');
		const editOutcomeButton = firstOutcomeNode.getByRole('button', { name: 'Edit outcome', exact: true });
		await expect(editOutcomeButton).toBeVisible();
		await editOutcomeButton.click();
		const questionModal = page.locator('#decisiontree-question-modal');
		await expect(questionModal).toHaveClass(/show/);
		await expect(questionModal.getByRole('heading', { name: 'Edit outcome', exact: true })).toBeVisible();
		await expect(page.locator('#decisiontree-question-select')).toHaveValue('q2');
		const targetedOption = questionModal.locator('.com-decisiontree-option-editor[data-option-id="o1"]');
		await expect(targetedOption).toBeVisible();
		await expect(targetedOption).not.toHaveClass(/is-collapsed/);
		await expect.poll(() => targetedOption.evaluate((card) => card.contains(document.activeElement))).toBe(true);
		await questionModal.getByRole('button', { name: 'Done', exact: true }).click();
		await expect(editOutcomeButton).toBeFocused();
		await secondQuestionNode.getByRole('button', { name: 'Set as start question', exact: true }).click();
		await expect(secondQuestionNode.locator('.badge.bg-success')).toHaveText('Start');
		await firstQuestionNode.getByRole('button', { name: 'Set as start question', exact: true }).click();
		await expect(firstQuestionNode.locator('.badge.bg-success')).toHaveText('Start');
		await secondQuestionNode.getByRole('button', { name: 'Duplicate question', exact: true }).click();
		await expect(page.locator('#decisiontree-question-modal')).toHaveClass(/show/);
		await expect(page.locator('#decisiontree-question-modal #decisiontree-question-text')).toHaveValue('Do you need portability? (Copy)');
		await page.locator('#decisiontree-question-modal').getByRole('button', { name: 'Done', exact: true }).click();
		const duplicatedQuestionNode = page.locator('[data-node-id="q5"]');
		await expect(duplicatedQuestionNode).toContainText('Do you need portability? (Copy)');
		page.once('dialog', (dialog) => dialog.accept());
		await duplicatedQuestionNode.getByRole('button', { name: 'Delete question', exact: true }).click();
		await expect(page.locator('.com-decisiontree-canvas-node.is-question')).toHaveCount(4);
		await page.locator('[data-node-id="q1"]').getByRole('button', { name: 'Edit question', exact: true }).click();
		await expect(page.locator('#decisiontree-question-modal')).toHaveClass(/show/);
		await expect(page.locator('#decisiontree-form-view')).toBeHidden();
		await expect(page.locator('#decisiontree-question-modal #decisiontree-question-text')).toHaveValue('What will you mainly use the laptop for?');
		await expect(page.locator('#decisiontree-question-modal .com-decisiontree-option-editor')).toHaveCount(3);
		await page.locator('#decisiontree-question-modal #decisiontree-question-text').fill('Canvas question editing test');
		await page.locator('#decisiontree-question-modal').getByRole('button', { name: 'Done', exact: true }).click();
		await expect(page.locator('#decisiontree-question-modal')).not.toHaveClass(/show/);
		await expect(page.locator('[data-node-id="q1"]')).toContainText('Canvas question editing test');
		await page.locator('[data-node-id="q1"]').getByRole('button', { name: 'Edit question', exact: true }).click();
		await page.locator('#decisiontree-question-modal #decisiontree-question-text').fill('What will you mainly use the laptop for?');
		await page.locator('#decisiontree-question-modal').getByRole('button', { name: 'Done', exact: true }).click();
		await expect(page.locator('[data-node-id="q1"]')).toContainText('What will you mainly use the laptop for?');
		await page.locator('[data-node-id="q4"]').getByRole('button', { name: 'Edit question', exact: true }).click();
		await page.locator('#decisiontree-question-modal .com-decisiontree-option-editor').first().getByRole('button', { name: 'Remove option', exact: true }).click();
		await page.locator('#decisiontree-question-modal .com-decisiontree-option-editor').first().getByRole('button', { name: 'Remove option', exact: true }).click();
		await page.locator('#decisiontree-question-modal').getByRole('button', { name: 'Done', exact: true }).click();
		const warningButton = page.locator('[data-node-id="q4"] .com-decisiontree-canvas-node__issue');
		await expect(warningButton).toHaveText('Warning');
		await warningButton.click();
		const warningPopover = page.locator('.com-decisiontree-canvas-issue-popover');
		await expect(warningPopover).toBeVisible();
		await expect(warningPopover).toContainText('"What is your budget?" has no answer options.');
		await expect(warningPopover).not.toContainText('q4');
		await page.locator('[data-node-id="q1"]').press('ArrowRight');
		await expect.poll(async () => {
			const json = await page.locator('#jform_json_data').inputValue();
			const tree = JSON.parse(json);

			return tree.layout?.canvas?.positions?.q1?.x;
		}).toBe(80);
		await page.getByRole('button', { name: 'Form builder', exact: true }).click();
		await expect(page.locator('#decisiontree-form-view')).toBeVisible();
		page.once('dialog', (dialog) => dialog.accept());
		await page.getByRole('button', { name: 'Load Demo Decision Tree' }).click();
		await expect(page.locator('#decisiontree-question-select')).toHaveValue('q1');
		await page.getByRole('button', { name: 'Visual canvas', exact: true }).click();
		await page.locator('#decisiontree-canvas-zoom-in').click();
		const canvasViewport = page.locator('#decisiontree-canvas-viewport');
		const canvasViewportBounds = await canvasViewport.boundingBox();
		expect(canvasViewportBounds).not.toBeNull();
		await page.mouse.move(canvasViewportBounds.x + 24, canvasViewportBounds.y + 24);
		await page.mouse.down();
		await page.mouse.move(canvasViewportBounds.x + 84, canvasViewportBounds.y + 69, { steps: 4 });
		await page.mouse.up();
		const canvasTransformBeforeSave = await page.locator('#decisiontree-canvas-stage').evaluate(
			(element) => element.style.transform,
		);
		const scrollPositionBeforeSave = await page.evaluate(() => {
			const maximumScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
			window.scrollTo(0, Math.min(220, Math.floor(maximumScroll / 2)));

			return window.scrollY;
		});
		expect(scrollPositionBeforeSave).toBeGreaterThan(0);
		await page.getByRole('button', { name: 'Save', exact: true }).evaluate((button) => {
			button.addEventListener('click', () => {
				const canvasView = document.getElementById('decisiontree-canvas-view');
				window.sessionStorage.setItem('decisiontree-e2e-save-scroll', JSON.stringify({
					anchorTop: canvasView?.getBoundingClientRect().top,
					scrollY: window.scrollY,
				}));
			}, { capture: true, once: true });
		});
		await page.getByRole('button', { name: 'Save', exact: true }).evaluate((button) => button.click());
		await expect(page.locator('#system-message-container')).toContainText(/saved|success/i);
		await expect(page.locator('#decisiontree-canvas-view')).toBeVisible();
		await expect(page.locator('#decisiontree-form-view')).toBeHidden();
		await expect.poll(() => page.locator('#decisiontree-canvas-stage').evaluate(
			(element) => element.style.transform,
		)).toBe(canvasTransformBeforeSave);
		await expect.poll(async () => page.evaluate(() => {
			const savedState = JSON.parse(window.sessionStorage.getItem('decisiontree-e2e-save-scroll') || '{}');
			const canvasView = document.getElementById('decisiontree-canvas-view');

			return Math.abs((canvasView?.getBoundingClientRect().top || 0) - savedState.anchorTop);
		})).toBeLessThan(3);
		await page.evaluate(() => window.sessionStorage.removeItem('decisiontree-e2e-save-scroll'));
		await page.getByRole('button', { name: 'Form builder', exact: true }).click();

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
		await expect(page.locator('#decisiontree-preview-modal').getByRole('heading', { name: 'Decision Tree Preview', exact: true })).toBeVisible();
		await expect(page.locator('#decisiontree-preview-modal')).toContainText('This functional preview uses your current unsaved changes.');
		await expect(page.locator('#decisiontree-preview-modal')).not.toContainText('COM_DECISIONTREE_PREVIEW_');
		await expect(page.locator('#decisiontree-preview-modal .modal-dialog')).toHaveClass(/modal-lg/);
		await expect(page.locator('#decisiontree-preview-tree .gd-decisiontree__step')).toHaveText('Step 1');
		await expect(page.locator('#decisiontree-preview-tree')).toContainText('What will you mainly use the laptop for?');
		await expect(page.locator('#decisiontree-preview-tree').getByRole('button', { name: 'Back', exact: true })).toBeDisabled();
		await expect(page.locator('#decisiontree-preview-tree').getByRole('button', { name: 'Reset', exact: true })).toBeVisible();
		await expect(page.locator('#decisiontree-preview-tree')).not.toContainText('COM_DECISIONTREE_JS_');
		const darkPreviewColours = await page.evaluate(() => {
			const originalTheme = document.documentElement.getAttribute('data-bs-theme');
			document.documentElement.setAttribute('data-bs-theme', 'dark');
			const bodyBackground = getComputedStyle(document.body).backgroundColor;
			const previewBackground = getComputedStyle(document.getElementById('decisiontree-preview-tree')).backgroundColor;
			const optionBackground = getComputedStyle(document.querySelector('#decisiontree-preview-tree .gd-decisiontree__option')).backgroundColor;
			const resetBackground = getComputedStyle(document.querySelector('#decisiontree-preview-tree .gd-decisiontree__reset')).backgroundColor;

			if (originalTheme === null) {
				document.documentElement.removeAttribute('data-bs-theme');
			} else {
				document.documentElement.setAttribute('data-bs-theme', originalTheme);
			}

			return { bodyBackground, optionBackground, previewBackground, resetBackground };
		});
		expect(darkPreviewColours.previewBackground).not.toBe(darkPreviewColours.bodyBackground);
		expect(darkPreviewColours.optionBackground).not.toBe(darkPreviewColours.bodyBackground);
		expect(darkPreviewColours.resetBackground).not.toBe(darkPreviewColours.bodyBackground);
		await page.locator('#decisiontree-preview-tree').getByRole('button', { name: 'Work / Office tasks' }).click();
		await expect(page.locator('#decisiontree-preview-tree .gd-decisiontree__step')).toHaveText('Step 2');
		await expect(page.locator('#decisiontree-preview-tree').getByRole('heading', { name: 'Do you need portability?' })).toBeFocused();
		await page.locator('#decisiontree-preview-tree').getByRole('button', { name: 'Yes, I need it lightweight' }).click();
		const previewResultLink = page.locator('#decisiontree-preview-tree').getByRole('link', { name: 'Learn more about laptops' });
		await expect(previewResultLink).toBeVisible();
		expect(await previewResultLink.evaluate((link) => Number.parseFloat(getComputedStyle(link).columnGap))).toBeGreaterThanOrEqual(5);
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
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
			origin: new URL(adminUrl).origin,
		});
		const editCopyEmbedButton = page.locator('.com-decisiontree-embed-help [data-decisiontree-copy-embed]');
		await expect(editCopyEmbedButton).toHaveAccessibleName('Copy embed tag');
		await editCopyEmbedButton.click();
		await expect(editCopyEmbedButton).toHaveAttribute('data-copy-state', 'success');
		await expect(editCopyEmbedButton.getByText('Copied', { exact: true })).toBeVisible();
		await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(`{decisiontree id=${treeId}}`);
	});

	test('preserves Pro rich outcomes through canvas editing, preview and save', async ({ page }) => {
		await login(page);
		await openTreeForEdit(page, uniqueTitle, treeId);
		test.skip(
			await page.locator('script[src*="admin-rich-endpoint-blocks.js"]').count() === 0,
			'Decision Tree Pro is not installed on this site.',
		);

		const readFirstPortableResult = () => page.locator('#jform_json_data').evaluate((textarea) => {
			const tree = JSON.parse(textarea.value);

			return tree.questions.q2.options[0].result;
		});
		const previewModal = page.locator('#decisiontree-preview-modal');
		const questionModal = page.locator('#decisiontree-question-modal');
		const richMarker = 'Canvas rich outcome preservation test';
		await expect(page.locator('#decisiontree-editor-extension-fields joomla-field-media')).toHaveCount(1);
		expect(await page.evaluate(() => customElements.get('joomla-field-media') !== undefined)).toBe(true);

		await page.getByRole('button', { name: 'Visual canvas', exact: true }).click();
		await page.locator('[data-node-id="q2"]').getByRole('button', { name: 'Edit question', exact: true }).click();
		const firstRichOption = questionModal.locator('.com-decisiontree-option-editor').first();
		await expect(firstRichOption.locator('.com-decisiontree-rich-blocks__rich')).toBeVisible();
		const initialResult = await readFirstPortableResult();
		await firstRichOption.getByRole('button', { name: 'Add content block', exact: true }).last().click();
		const addedBlock = firstRichOption.locator('.com-decisiontree-rich-block').last();
		await addedBlock.locator('textarea').fill(richMarker);
		let expectedResult = await readFirstPortableResult();
		expect(expectedResult.blocks.at(-1)).toEqual({
			type: 'text',
			content: richMarker,
		});

		await firstRichOption.getByRole('button', { name: 'Add content block', exact: true }).last().click();
		const imageBlock = firstRichOption.locator('.com-decisiontree-rich-block').last();
		await imageBlock.getByLabel('Block type', { exact: true }).selectOption('image');
		await expect(imageBlock.getByText('Choose an image from Joomla Media Manager.', { exact: false })).toBeVisible();
		await expect(imageBlock.getByLabel('Display size', { exact: true })).toHaveValue('full');
		await imageBlock.getByRole('button', { name: 'Select image', exact: true }).click();
		const mediaDialogHost = page.locator('joomla-dialog.joomla-dialog-media-field');
		await expect(mediaDialogHost.locator('dialog[open]')).toBeVisible();
		const mediaFrame = page.frameLocator('joomla-dialog.joomla-dialog-media-field iframe');
		await mediaFrame.locator('.media-browser-item').filter({ hasText: /^sampledata$/ })
			.locator('.media-browser-item-preview').dblclick();
		await mediaFrame.locator('.media-browser-item').filter({ hasText: /^cassiopeia$/ })
			.locator('.media-browser-item-preview').dblclick();
		await mediaFrame.locator('.media-browser-item').filter({ hasText: /nasa1-400\.jpg/ }).click();
		await mediaDialogHost.getByRole('button', { name: 'Select', exact: true }).click();
		await expect(mediaDialogHost).toHaveCount(0);
		await expect(imageBlock.getByLabel('Selected image', { exact: true }))
			.toHaveValue('images/sampledata/cassiopeia/nasa1-400.jpg');
		await imageBlock.getByLabel('Alternative text', { exact: true }).fill('Earth viewed from orbit');
		await imageBlock.getByLabel('Caption (optional)', { exact: true }).fill('A sample Joomla image');
		await imageBlock.getByLabel('Display size', { exact: true }).selectOption('medium');
		expectedResult = await readFirstPortableResult();
		expect(expectedResult.blocks.at(-1)).toMatchObject({
			type: 'image',
			src: 'images/sampledata/cassiopeia/nasa1-400.jpg',
			alt: 'Earth viewed from orbit',
			caption: 'A sample Joomla image',
			size: 'medium',
		});
		expect(expectedResult.blocks.at(-1).width).toBeGreaterThan(0);
		expect(expectedResult.blocks.at(-1).height).toBeGreaterThan(0);

		await questionModal.getByRole('button', { name: 'Done', exact: true }).click();
		const previewFromQuestionButton = page.locator('[data-node-id="q2"]')
			.getByRole('button', { name: 'Preview from here', exact: true });
		await expect(previewFromQuestionButton).toBeVisible();
		await expect(previewFromQuestionButton.locator('.icon-external-link-alt')).toHaveCount(1);
		await expect(previewFromQuestionButton).not.toContainText('▶');
		const previewColours = await previewFromQuestionButton.evaluate((button) => {
			const root = document.documentElement;
			const originalTheme = root.getAttribute('data-bs-theme');
			const node = button.closest('.com-decisiontree-canvas-node');
			const readTheme = (theme) => {
				root.setAttribute('data-bs-theme', theme);

				return {
					foreground: getComputedStyle(button).color,
					nodeBackground: getComputedStyle(node).backgroundColor,
				};
			};
			const colours = {
				dark: readTheme('dark'),
				light: readTheme('light'),
			};

			if (originalTheme === null) {
				root.removeAttribute('data-bs-theme');
			} else {
				root.setAttribute('data-bs-theme', originalTheme);
			}

			return colours;
		});
		for (const theme of ['light', 'dark']) {
			expect(contrastRatio(previewColours[theme].foreground, previewColours[theme].nodeBackground)).toBeGreaterThanOrEqual(4.5);
		}
		await previewFromQuestionButton.click();
		await expect(previewModal).toHaveClass(/show/);
		await expect(previewModal.getByRole('heading', { name: 'Question Preview', exact: true })).toBeVisible();
		await expect(previewModal).toContainText('Do you need portability?');
		await expect(previewModal).not.toContainText('What will you mainly use the laptop for?');
		await previewModal.getByRole('button', { name: 'Close' }).last().click();
		await expect(previewFromQuestionButton).toBeFocused();

		const previewOutcomeButton = page.locator('[data-node-id="outcome:q2:o1"]')
			.getByRole('button', { name: 'Preview outcome', exact: true });
		await expect(previewOutcomeButton).toBeVisible();
		await expect(previewOutcomeButton.locator('.icon-external-link-alt')).toHaveCount(1);
		await expect(previewOutcomeButton).not.toContainText('▶');
		await previewOutcomeButton.click();
		await expect(previewModal.getByRole('heading', { name: 'Outcome Preview', exact: true })).toBeVisible();
		await expect(previewModal.getByText(richMarker, { exact: true })).toBeVisible();
		await expect(previewModal.getByRole('img', { name: 'Earth viewed from orbit' })).toBeVisible();
		await expect(previewModal.getByText('A sample Joomla image', { exact: true })).toBeVisible();
		await previewModal.getByRole('button', { name: 'Close' }).last().click();
		await expect(previewOutcomeButton).toBeFocused();

		await page.locator('[data-node-id="q2"]').getByRole('button', { name: 'Duplicate question', exact: true }).click();
		await expect(questionModal).toHaveClass(/show/);
		await expect(questionModal.locator('.com-decisiontree-rich-block textarea').last()).toHaveValue(richMarker);
		const duplicatedResult = await page.locator('#jform_json_data').evaluate((textarea) => {
			const tree = JSON.parse(textarea.value);

			return tree.questions.q5.options[0].result;
		});
		expect(duplicatedResult).toEqual(expectedResult);
		await questionModal.getByRole('button', { name: 'Done', exact: true }).click();
		page.once('dialog', (dialog) => dialog.accept());
		await page.locator('[data-node-id="q5"]').getByRole('button', { name: 'Delete question', exact: true }).click();

		await expect(page.locator('[data-node-id="outcome:q2:o1"] .com-decisiontree-canvas-node__title')).toContainText(richMarker);
		await page.getByRole('button', { name: 'Preview decision tree', exact: true }).click();
		await previewModal.getByRole('button', { name: 'Work / Office tasks', exact: true }).click();
		await previewModal.getByRole('button', { name: 'Yes, I need it lightweight', exact: true }).click();
		await expect(previewModal.getByText(richMarker, { exact: true })).toBeVisible();
		await expect(previewModal.getByRole('img', { name: 'Earth viewed from orbit' })).toBeVisible();
		await previewModal.getByRole('button', { name: 'Close' }).last().click();
		expect(await readFirstPortableResult()).toEqual(expectedResult);

		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await expect(page.locator('#system-message-container')).toContainText(/saved|success/i);
		await page.reload();
		expect(await readFirstPortableResult()).toEqual(expectedResult);

		await page.getByRole('button', { name: 'Visual canvas', exact: true }).click();
		await expect(page.locator('[data-node-id="outcome:q2:o1"] .com-decisiontree-canvas-node__title')).toContainText(richMarker);
		await page.locator('[data-node-id="q2"]').getByRole('button', { name: 'Edit question', exact: true }).click();
		const savedImageBlock = questionModal.locator('.com-decisiontree-rich-block').last();
		await expect(savedImageBlock.getByLabel('Selected image', { exact: true }))
			.toHaveValue('images/sampledata/cassiopeia/nasa1-400.jpg');
		await expect(savedImageBlock.getByLabel('Alternative text', { exact: true })).toHaveValue('Earth viewed from orbit');
		await savedImageBlock.getByRole('button', { name: 'Remove block', exact: true }).click();
		const savedRichBlock = questionModal.locator('.com-decisiontree-rich-block').last();
		await expect(savedRichBlock.locator('textarea')).toHaveValue(richMarker);
		await savedRichBlock.getByRole('button', { name: 'Remove block', exact: true }).click();
		await questionModal.getByRole('button', { name: 'Done', exact: true }).click();
		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await expect(page.locator('#system-message-container')).toContainText(/saved|success/i);
		await page.reload();
		expect(await readFirstPortableResult()).toEqual(initialResult);
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
		await page.getByRole('button', { name: 'Visual canvas', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Preview from here', exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Preview outcome', exact: true })).toHaveCount(0);
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
		const frontendResultLink = page.getByRole('link', { name: 'Learn more about laptops' });
		await expect(frontendResultLink).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Laptop');
		await expect(frontendResultLink).toHaveAttribute('target', '_blank');
		await expect(frontendResultLink).toHaveAttribute('rel', 'noopener noreferrer');
		expect(await frontendResultLink.evaluate((link) => Number.parseFloat(getComputedStyle(link).columnGap))).toBeGreaterThanOrEqual(5);

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
