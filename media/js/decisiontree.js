(() => {
	'use strict';

	const text = (key) => (
		window.Joomla && Joomla.Text ? Joomla.Text._(key, key) : key
	);

	const sprintf = (key, ...values) => values.reduce(
		(output, value) => output.replace(/%s|%d/, value),
		text(key),
	);

	const findQuestion = (tree, questionId) => {
		if (!tree || !tree.questions) {
			return null;
		}

		if (Array.isArray(tree.questions)) {
			return tree.questions.find((question) => String(question.id) === String(questionId)) || null;
		}

		return tree.questions[questionId] || null;
	};

	const resolveResult = (tree, result) => {
		if (typeof result !== 'string' && typeof result !== 'number') {
			return result;
		}

		if (Array.isArray(tree.results)) {
			const item = tree.results.find((entry) => String(entry.id) === String(result));

			return item && item.blocks ? item.blocks : item;
		}

		if (tree.results && tree.results[result]) {
			return tree.results[result];
		}

		return result;
	};

	const createButton = (label, className, onClick) => {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = className;
		button.textContent = label;
		button.addEventListener('click', onClick);

		return button;
	};

	const getSafeLinkUrl = (url) => {
		const value = String(url || '').trim();

		if (value === '' || /\s/.test(value) || value.startsWith('//')) {
			return '';
		}

		if (/^https?:\/\//i.test(value)) {
			try {
				const parsed = new URL(value);

				return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
			} catch (error) {
				return '';
			}
		}

		if (/^(\/(?!\/)|\.{1,2}\/|[?#])/.test(value)) {
			return value;
		}

		return '';
	};

	const normalizeResultBlocks = (result) => {
		if (Array.isArray(result)) {
			return result;
		}

		if (result && typeof result === 'object') {
			const blocks = [];
			const content = result.text || result.content || '';

			if (content !== '') {
				blocks.push({
					type: 'text',
					content,
				});
			}

			if (result.link && typeof result.link === 'object') {
				blocks.push({
					type: 'link',
					url: result.link.url || '',
					text: result.link.text || '',
					target_blank: Boolean(result.link.target_blank),
				});
			}

			return blocks;
		}

		return [
			{
				type: 'text',
				content: String(result ?? ''),
			},
		];
	};

	const createUuid = () => {
		if (window.crypto && typeof window.crypto.randomUUID === 'function') {
			return window.crypto.randomUUID();
		}

		const values = new Uint8Array(16);

		if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
			window.crypto.getRandomValues(values);
		} else {
			values.forEach((value, index) => {
				values[index] = Math.floor(Math.random() * 256);
			});
		}

		values[6] = (values[6] & 0x0f) | 0x40;
		values[8] = (values[8] & 0x3f) | 0x80;
		const hex = Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');

		return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
	};

	const normalizeTreeId = (value) => (/^\d+$/.test(String(value || '')) ? Number(value) : String(value || ''));

	const commonEventDetail = (state, questionId = state.currentQuestionId) => {
		const question = findQuestion(state.tree, questionId);

		return {
			schemaVersion: 1,
			treeId: normalizeTreeId(state.treeId),
			instanceId: state.instanceId,
			runId: state.runId,
			source: state.source,
			step: state.history.length + 1,
			questionId: questionId === null || questionId === undefined ? '' : String(questionId),
			questionText: String(question?.question_text || ''),
		};
	};

	const emitInteraction = (state, eventName, extra = {}, questionId = state.currentQuestionId) => {
		state.container.dispatchEvent(new CustomEvent(`decisiontree:${eventName}`, {
			bubbles: true,
			detail: {
				...commonEventDetail(state, questionId),
				...extra,
			},
		}));
	};

	const getOptionId = (option, index) => {
		const optionId = String(option?.id || '').trim();

		return optionId !== '' ? optionId : `o${index + 1}`;
	};

	const getOutcomeKey = (questionId, optionId, result) => (
		typeof result === 'string' || typeof result === 'number'
			? `result:${String(result)}`
			: `terminal:${String(questionId)}:${String(optionId)}`
	);

	const renderFallback = (state, missingQuestionId) => {
		console.warn(`Decision tree question not found: ${missingQuestionId}`);

		state.content.replaceChildren();

		const message = document.createElement('div');
		message.className = 'gd-decisiontree__error';
		message.tabIndex = -1;
		message.textContent = text('COM_DECISIONTREE_JS_OPTION_NOT_CONFIGURED');
		state.content.appendChild(message);

		renderControls(state);
		message.focus();
	};

	const renderResult = (container, result) => {
		container.replaceChildren();

		const resultWrap = document.createElement('div');
		resultWrap.className = 'gd-decisiontree__result';
		resultWrap.tabIndex = -1;
		const extendedRenderer = window.DecisionTreeResultExtensions?.renderFrontendBlocks;
		let renderedByExtension = false;

		if (
			typeof extendedRenderer === 'function'
			&& result
			&& typeof result === 'object'
			&& !Array.isArray(result)
			&& Array.isArray(result.blocks)
		) {
			try {
				renderedByExtension = extendedRenderer(resultWrap, result.blocks, {
					getSafeLinkUrl,
					text,
				}) === true;
			} catch (error) {
				console.error('Decision Tree result renderer extension failed.', error);
			}
		}

		const blocks = renderedByExtension ? [] : normalizeResultBlocks(result);

		blocks.forEach((block) => {
			if (!block) {
				return;
			}

			if (block.type === 'text') {
				const paragraph = document.createElement('p');
				paragraph.textContent = block.text || block.content || '';
				resultWrap.appendChild(paragraph);
			}

			if (block.type === 'link') {
				const safeUrl = getSafeLinkUrl(block.url);

				if (safeUrl === '') {
					return;
				}

				const link = document.createElement('a');
				const linkText = String(block.text || '').trim();
				link.className = 'gd-decisiontree__result-link';
				link.href = safeUrl;
				link.textContent = linkText || text('COM_DECISIONTREE_JS_READ_MORE');

				if (block.target_blank) {
					link.target = '_blank';
					link.rel = 'noopener noreferrer';
				}

				resultWrap.appendChild(link);
			}
		});

		container.appendChild(resultWrap);

		return resultWrap;
	};

	const renderQuestion = (state, questionId, pushHistory = true, moveFocus = false) => {
		const question = findQuestion(state.tree, questionId);

		if (!question) {
			renderFallback(state, questionId);

			return false;
		}

		if (pushHistory && state.currentQuestionId !== null) {
			state.history.push(state.currentQuestionId);
		}

		state.currentQuestionId = questionId;
		state.content.replaceChildren();

		if (state.tree.settings?.show_step_number === true) {
			const step = document.createElement('div');
			step.className = 'gd-decisiontree__step';
			step.setAttribute('aria-live', 'polite');
			step.textContent = sprintf('COM_DECISIONTREE_JS_STEP_NUMBER', state.history.length + 1);
			state.content.appendChild(step);
		}

		const questionText = document.createElement('div');
		questionText.className = 'gd-decisiontree__question';
		questionText.setAttribute('role', 'heading');
		questionText.setAttribute('aria-level', '3');
		questionText.tabIndex = -1;
		questionText.textContent = question.question_text || '';
		state.content.appendChild(questionText);

		const options = document.createElement('div');
		options.className = 'gd-decisiontree__options';

		(question.options || []).forEach((option, optionIndex) => {
			const optionId = getOptionId(option, optionIndex);
			const optionText = String(option.text || option.label || option.option_text || '');
			const button = createButton(optionText, 'gd-decisiontree__option', () => {
				const hasNext = option.next !== undefined && option.next !== null && option.next !== '';
				const hasResult = option.result !== undefined && option.result !== null && option.result !== '';
				const eventDetail = {
					optionId,
					optionIndex,
					optionText,
					nextQuestionId: hasNext ? String(option.next) : '',
					completesTree: !hasNext && hasResult,
				};

				emitInteraction(state, 'answer', eventDetail, questionId);

				if (hasNext) {
					if (!findQuestion(state.tree, option.next)) {
						renderFallback(state, option.next);

						return;
					}

					renderQuestion(state, option.next, true, true);

					return;
				}

				if (hasResult) {
					const completedStep = state.history.length + 1;
					state.history.push(state.currentQuestionId);
					state.currentQuestionId = null;
					const resultElement = renderResult(state.content, resolveResult(state.tree, option.result));
					renderControls(state);
					resultElement.focus();
					emitInteraction(state, 'complete', {
						optionId,
						optionIndex,
						optionText,
						outcomeKey: getOutcomeKey(questionId, optionId, option.result),
						step: completedStep,
					}, questionId);
				}
			});

			button.dataset.optionId = optionId;
			options.appendChild(button);
		});

		state.content.appendChild(options);
		renderControls(state);

		if (moveFocus) {
			questionText.focus();
		}

		return true;
	};

	const renderControls = (state) => {
		state.controls.replaceChildren();

		const backButton = createButton(text('COM_DECISIONTREE_JS_BACK'), 'gd-decisiontree__back', () => {
			const previousQuestionId = state.history.pop();

			if (previousQuestionId === undefined) {
				return;
			}

			renderQuestion(state, previousQuestionId, false, true);
			emitInteraction(state, 'back', {
				targetQuestionId: String(previousQuestionId),
			}, previousQuestionId);
		});
		backButton.disabled = state.history.length === 0;
		state.controls.appendChild(backButton);

		state.controls.appendChild(createButton(text('COM_DECISIONTREE_JS_RESET'), 'gd-decisiontree__reset', () => {
			emitInteraction(state, 'reset');
			state.history = [];
			state.runId = createUuid();
			renderQuestion(state, state.tree.start, false, true);
			emitInteraction(state, 'start', {}, state.tree.start);
		}));
	};

	const mount = (container, tree, options = {}) => {
		if (!(container instanceof Element) || !tree || typeof tree !== 'object') {
			return null;
		}

		if (container.dataset.decisionTreeInitialised === 'true' && options.force !== true) {
			return container.decisionTreeState || null;
		}

		const contentHost = container.querySelector('.com-decisiontree__container') || container;
		const content = document.createElement('div');
		content.className = 'gd-decisiontree__content';

		const controls = document.createElement('div');
		controls.className = 'gd-decisiontree__controls';
		contentHost.replaceChildren(content, controls);

		const treeId = options.treeId ?? container.getAttribute('data-tree-id') ?? '';
		const state = {
			container,
			content,
			controls,
			currentQuestionId: null,
			history: [],
			instanceId: options.instanceId || container.id || `decisiontree-${String(treeId || 'preview')}`,
			runId: createUuid(),
			source: options.source || container.getAttribute('data-decision-tree-source') || 'component',
			tree,
			treeId,
		};

		container.dataset.decisionTreeInitialised = 'true';
		container.decisionTreeState = state;

		if (renderQuestion(state, tree.start, false)) {
			emitInteraction(state, 'start', {}, tree.start);
		}

		return state;
	};

	const initContainer = (container, options = {}) => {
		if (!(container instanceof Element)) {
			return null;
		}

		if (options.tree) {
			return mount(container, options.tree, options);
		}

		const id = container.getAttribute('data-tree-id');
		const dataId = container.getAttribute('data-tree-data-id') || `decisiontree-data-${id}`;
		const data = document.getElementById(dataId);

		if (!id || !data) {
			return null;
		}

		let tree;

		try {
			tree = JSON.parse(data.textContent || '{}');
		} catch (error) {
			return null;
		}

		return mount(container, tree, {
			...options,
			treeId: id,
		});
	};

	const initDecisionTrees = () => {
		document.querySelectorAll('.gd-decisiontree[data-tree-data-id]').forEach((container) => {
			initContainer(container);
		});
	};

	window.DecisionTreeFrontend = Object.assign(window.DecisionTreeFrontend || {}, {
		initContainer,
		initDecisionTrees,
		mount,
	});
	const initDecisionTreesAfterDeferredExtensions = () => {
		window.setTimeout(initDecisionTrees, 0);
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initDecisionTreesAfterDeferredExtensions, { once: true });
	} else {
		initDecisionTreesAfterDeferredExtensions();
	}
})();
