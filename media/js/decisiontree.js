(() => {
	'use strict';

	const text = (key) => (
		window.Joomla && Joomla.Text ? Joomla.Text._(key, key) : key
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

	const createButton = (text, className, onClick) => {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = className;
		button.textContent = text;
		button.addEventListener('click', onClick);

		return button;
	};

	const renderFallback = (state, missingQuestionId) => {
		console.warn(`Decision tree question not found: ${missingQuestionId}`);

		state.content.replaceChildren();

		const message = document.createElement('div');
		message.className = 'gd-decisiontree__error';
		message.textContent = text('COM_DECISIONTREE_JS_OPTION_NOT_CONFIGURED');
		state.content.appendChild(message);

		renderControls(state);
	};

	const renderResult = (container, result) => {
		container.replaceChildren();

		const resultWrap = document.createElement('div');
		resultWrap.className = 'gd-decisiontree__result';

		const blocks = Array.isArray(result) ? result : [result];

		blocks.forEach((block) => {
			if (!block || block.type !== 'text') {
				return;
			}

			const paragraph = document.createElement('p');
			paragraph.textContent = block.text || block.content || '';
			resultWrap.appendChild(paragraph);
		});

		container.appendChild(resultWrap);
	};

	const renderQuestion = (state, questionId, pushHistory = true) => {
		const question = findQuestion(state.tree, questionId);

		if (!question) {
			return;
		}

		if (pushHistory && state.currentQuestionId !== null) {
			state.history.push(state.currentQuestionId);
		}

		state.currentQuestionId = questionId;
		state.content.replaceChildren();

		const questionText = document.createElement('div');
		questionText.className = 'gd-decisiontree__question';
		questionText.textContent = question.question_text || '';
		state.content.appendChild(questionText);

		const options = document.createElement('div');
		options.className = 'gd-decisiontree__options';

		(question.options || []).forEach((option) => {
			const button = createButton(option.text || option.label || option.option_text || '', 'gd-decisiontree__option', () => {
				if (option.next !== undefined && option.next !== null && option.next !== '') {
					if (!findQuestion(state.tree, option.next)) {
						renderFallback(state, option.next);

						return;
					}

					renderQuestion(state, option.next);

					return;
				}

				if (option.result !== undefined && option.result !== null && option.result !== '') {
					state.history.push(state.currentQuestionId);
					state.currentQuestionId = null;
					renderResult(state.content, resolveResult(state.tree, option.result));
					renderControls(state);
				}
			});

			options.appendChild(button);
		});

		state.content.appendChild(options);
		renderControls(state);
	};

	const renderControls = (state) => {
		state.controls.replaceChildren();

		state.controls.appendChild(createButton(text('COM_DECISIONTREE_JS_BACK'), 'gd-decisiontree__back', () => {
			const previousQuestionId = state.history.pop();

			if (previousQuestionId === undefined) {
				return;
			}

			renderQuestion(state, previousQuestionId, false);
		}));
		state.controls.lastElementChild.disabled = state.history.length === 0;

		state.controls.appendChild(createButton(text('COM_DECISIONTREE_JS_RESET'), 'gd-decisiontree__reset', () => {
			state.history = [];
			renderQuestion(state, state.tree.start, false);
		}));
	};

	document.querySelectorAll('.gd-decisiontree').forEach((container) => {
		const id = container.getAttribute('data-tree-id');
		const dataId = container.getAttribute('data-tree-data-id') || `decisiontree-data-${id}`;
		const data = document.getElementById(dataId);

		if (!id || !data) {
			return;
		}

		let tree;

		try {
			tree = JSON.parse(data.textContent || '{}');
		} catch (error) {
			return;
		}

		const content = document.createElement('div');
		content.className = 'gd-decisiontree__content';

		const controls = document.createElement('div');
		controls.className = 'gd-decisiontree__controls';

		container.append(content, controls);

		renderQuestion({
			container,
			content,
			controls,
			currentQuestionId: null,
			history: [],
			tree,
		}, tree.start, false);
	});
})();
