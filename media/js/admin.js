(() => {
	'use strict';

	const sampleJson = {
		version: '1.0',
		start: 'q1',
		questions: {
			q1: {
				question_text: 'What do you need help with?',
				options: [
					{
						text: 'Ask another question',
						next: 'q2',
					},
					{
						text: 'Show me the result',
						result: [
							{
								type: 'text',
								content: 'This is the final result.',
							},
						],
					},
				],
			},
			q2: {
				question_text: 'Which path should this user follow?',
				options: [
					{
						text: 'Finish here',
						result: [
							{
								type: 'text',
								content: 'This is another final result.',
							},
						],
					},
				],
			},
		},
	};

	let editorTree = null;
	let selectedQuestionId = '';

	const getJsonTextarea = () => document.getElementById('jform_json_data');
	const getEditorElements = () => ({
		addOptionButton: document.getElementById('decisiontree-add-option'),
		addQuestionButton: document.getElementById('decisiontree-add-question'),
		deleteQuestionButton: document.getElementById('decisiontree-delete-question'),
		message: document.getElementById('decisiontree-editor-message'),
		options: document.getElementById('decisiontree-options'),
		questionSelect: document.getElementById('decisiontree-question-select'),
		questionText: document.getElementById('decisiontree-question-text'),
		setStartButton: document.getElementById('decisiontree-set-start-question'),
		startDisplay: document.getElementById('decisiontree-start-display'),
	});

	const hasQuestionsObject = () => (
		editorTree
		&& editorTree.questions
		&& typeof editorTree.questions === 'object'
		&& !Array.isArray(editorTree.questions)
	);

	const getQuestionIds = () => (hasQuestionsObject() ? Object.keys(editorTree.questions) : []);
	const getSelectedQuestion = () => (hasQuestionsObject() ? editorTree.questions[selectedQuestionId] || null : null);

	const setEditorMessage = (message = '') => {
		const { message: messageElement } = getEditorElements();

		if (!messageElement) {
			return;
		}

		messageElement.textContent = message;
		messageElement.hidden = message === '';
	};

	const syncTextarea = () => {
		const textarea = getJsonTextarea();

		if (!textarea || !editorTree) {
			return;
		}

		textarea.value = JSON.stringify(editorTree, null, 2);
	};

	const getResultText = (option) => {
		if (!Array.isArray(option.result)) {
			return '';
		}

		const block = option.result.find((item) => item && item.type === 'text');

		return block ? block.content || block.text || '' : '';
	};

	const setOptionResult = (option, content) => {
		delete option.next;
		option.result = [
			{
				type: 'text',
				content,
			},
		];
	};

	const setOptionNext = (option, nextId) => {
		delete option.result;
		option.next = nextId;
	};

	const hasNext = (option) => option.next !== undefined && option.next !== null && option.next !== '';
	const hasResult = (option) => option.result !== undefined && option.result !== null && option.result !== '';

	const normalizeOptionAction = (option) => {
		if (!hasNext(option) || !hasResult(option)) {
			return false;
		}

		delete option.result;

		return true;
	};

	const countNextReferences = (questionId) => {
		if (!hasQuestionsObject()) {
			return 0;
		}

		return getQuestionIds().reduce((count, id) => {
			const question = editorTree.questions[id];

			if (!question || !Array.isArray(question.options)) {
				return count;
			}

			return count + question.options.filter((option) => String(option.next) === String(questionId)).length;
		}, 0);
	};

	const clearNextReferences = (questionId) => {
		getQuestionIds().forEach((id) => {
			const question = editorTree.questions[id];

			if (!question || !Array.isArray(question.options)) {
				return;
			}

			question.options.forEach((option) => {
				if (String(option.next) === String(questionId)) {
					delete option.next;
				}
			});
		});
	};

	const getNewQuestionId = () => {
		const ids = getQuestionIds();
		let index = 1;

		while (ids.includes(`q${index}`)) {
			index += 1;
		}

		return `q${index}`;
	};

	const populateQuestionSelect = () => {
		const { questionSelect, startDisplay } = getEditorElements();
		const ids = getQuestionIds();

		if (!questionSelect || !startDisplay) {
			return;
		}

		questionSelect.replaceChildren();

		ids.forEach((id) => {
			const option = document.createElement('option');
			option.value = id;
			option.textContent = id === editorTree.start ? `${id} (Start question)` : id;
			questionSelect.appendChild(option);
		});

		if (!ids.includes(selectedQuestionId)) {
			selectedQuestionId = ids.includes(editorTree?.start) ? editorTree.start : ids[0] || '';
		}

		questionSelect.value = selectedQuestionId;
		startDisplay.innerHTML = '';

		const startText = document.createElement('span');
		startText.className = 'com-decisiontree-start-question';
		startText.textContent = editorTree?.start ? `Start question: ${editorTree.start}` : 'Start question: not set';

		startDisplay.appendChild(startText);
	};

	const renderOptionEditor = (option, index, questionIds) => {
		if (normalizeOptionAction(option)) {
			syncTextarea();
		}

			const card = document.createElement('div');
			card.className = 'com-decisiontree-option-editor';

			const header = document.createElement('div');
			header.className = 'com-decisiontree-option-editor__header';

			const heading = document.createElement('h4');
			heading.textContent = `Option ${index + 1}`;

			header.appendChild(heading);

			const body = document.createElement('div');
			body.className = 'com-decisiontree-option-editor__body';

		const textWrap = document.createElement('div');
		textWrap.className = 'com-decisiontree-option-editor__text';

			const label = document.createElement('label');
			label.className = 'form-label';
			label.setAttribute('for', `decisiontree-option-${index}`);
			label.textContent = 'Option text';

		const input = document.createElement('input');
		input.type = 'text';
		input.className = 'form-control';
		input.id = `decisiontree-option-${index}`;
		input.value = option.text || '';
		input.addEventListener('input', () => {
			option.text = input.value;
			syncTextarea();
		});

		textWrap.append(label, input);

		const actionWrap = document.createElement('div');
		actionWrap.className = 'com-decisiontree-option-editor__action';

		const actionLabel = document.createElement('label');
		actionLabel.className = 'form-label';
		actionLabel.setAttribute('for', `decisiontree-option-action-${index}`);
		actionLabel.textContent = 'Action';

		const actionSelect = document.createElement('select');
		actionSelect.className = 'form-select';
		actionSelect.id = `decisiontree-option-action-${index}`;
		actionSelect.innerHTML = '<option value="result">Shows result</option><option value="next">Goes to question</option>';
		actionSelect.value = hasNext(option) ? 'next' : 'result';

			actionWrap.append(actionLabel, actionSelect);

		const detailWrap = document.createElement('div');
		detailWrap.className = 'com-decisiontree-option-editor__detail';

		const renderActionDetail = (convertAction = false) => {
			detailWrap.replaceChildren();

			if (actionSelect.value === 'next') {
				const nextLabel = document.createElement('label');
				nextLabel.className = 'form-label';
				nextLabel.setAttribute('for', `decisiontree-option-next-${index}`);
				nextLabel.textContent = 'Next question';

				const nextSelect = document.createElement('select');
				nextSelect.className = 'form-select';
				nextSelect.id = `decisiontree-option-next-${index}`;

				questionIds.forEach((id) => {
					const optionElement = document.createElement('option');
					optionElement.value = id;
					optionElement.textContent = id === editorTree.start ? `${id} (start)` : id;
					nextSelect.appendChild(optionElement);
				});

				nextSelect.value = questionIds.includes(option.next) ? option.next : '';

				if (convertAction) {
					nextSelect.value = nextSelect.value || questionIds[0] || '';
					setOptionNext(option, nextSelect.value);
				}

				nextSelect.addEventListener('change', () => {
					setOptionNext(option, nextSelect.value);
					syncTextarea();
				});

				detailWrap.append(nextLabel, nextSelect);
			} else {
				const resultLabel = document.createElement('label');
				resultLabel.className = 'form-label';
				resultLabel.setAttribute('for', `decisiontree-option-result-${index}`);
				resultLabel.textContent = 'Result text';

				const resultTextarea = document.createElement('textarea');
				resultTextarea.className = 'form-control';
				resultTextarea.id = `decisiontree-option-result-${index}`;
				resultTextarea.rows = 3;
				resultTextarea.value = getResultText(option);

				if (convertAction) {
					setOptionResult(option, resultTextarea.value);
				}

				resultTextarea.addEventListener('input', () => {
					setOptionResult(option, resultTextarea.value);
					syncTextarea();
				});

				detailWrap.append(resultLabel, resultTextarea);
			}
		};

			actionSelect.addEventListener('change', () => {
				renderActionDetail(true);
				syncTextarea();
			});

			renderActionDetail();

			const removeWrap = document.createElement('div');
			removeWrap.className = 'com-decisiontree-option-editor__remove';

			const removeButton = document.createElement('button');
			removeButton.type = 'button';
			removeButton.className = 'btn btn-outline-danger';
			removeButton.textContent = 'Remove option';
		removeButton.addEventListener('click', () => {
			const question = getSelectedQuestion();

			if (!question || !Array.isArray(question.options)) {
				return;
			}

			question.options.splice(index, 1);
				syncTextarea();
				renderQuestionEditor();
			});

			removeWrap.appendChild(removeButton);
			body.append(textWrap, actionWrap, detailWrap, removeWrap);
			card.append(header, body);

			return card;
		};

	const renderQuestionEditor = () => {
		const {
			addOptionButton,
			deleteQuestionButton,
			options,
			questionSelect,
			questionText,
			setStartButton,
		} = getEditorElements();

		if (!addOptionButton || !deleteQuestionButton || !options || !questionSelect || !questionText || !setStartButton) {
			return;
		}

		options.replaceChildren();
		questionText.value = '';
		questionText.disabled = true;
		addOptionButton.disabled = true;
		deleteQuestionButton.disabled = true;
		setStartButton.disabled = true;

		if (!hasQuestionsObject()) {
			populateQuestionSelect();
			setEditorMessage('Question editor is available when JSON contains a questions object.');

			return;
		}

		const questionIds = getQuestionIds();

		if (questionIds.length === 0) {
			populateQuestionSelect();
			setEditorMessage('Question editor is available when questions contains at least one question.');

			return;
		}

		populateQuestionSelect();

		const question = getSelectedQuestion();

		if (!question) {
			setEditorMessage('Select a question to edit.');

			return;
		}

		if (!Array.isArray(question.options)) {
			question.options = [];
			syncTextarea();
		}

		setEditorMessage('');
		questionText.disabled = false;
		addOptionButton.disabled = false;
		deleteQuestionButton.disabled = selectedQuestionId === editorTree.start;
		setStartButton.disabled = selectedQuestionId === editorTree.start;
		questionText.value = question.question_text || '';

		question.options.forEach((option, index) => {
			options.appendChild(renderOptionEditor(option, index, questionIds));
		});
	};

	const loadEditorFromTextarea = () => {
		const textarea = getJsonTextarea();

		if (!textarea || textarea.value.trim() === '') {
			editorTree = null;
			selectedQuestionId = '';
			renderQuestionEditor();

			return;
		}

		try {
			editorTree = JSON.parse(textarea.value);
			selectedQuestionId = hasQuestionsObject() && editorTree.questions[selectedQuestionId]
				? selectedQuestionId
				: editorTree.start || getQuestionIds()[0] || '';
			renderQuestionEditor();
		} catch (error) {
			editorTree = null;
			selectedQuestionId = '';
			renderQuestionEditor();
			setEditorMessage('Question editor is unavailable because the JSON is invalid.');
		}
	};

	const initJsonTools = () => {
		const insertButton = document.getElementById('decisiontree-insert-sample-json');
		const formatButton = document.getElementById('decisiontree-format-json');

		if (!insertButton || !formatButton) {
			return;
		}

		insertButton.addEventListener('click', () => {
			const textarea = getJsonTextarea();

			if (!textarea) {
				return;
			}

			if (textarea.value.trim() !== '' && !window.confirm('Replace the existing JSON data?')) {
				return;
			}

			textarea.value = JSON.stringify(sampleJson, null, 2);
			textarea.focus();
			selectedQuestionId = sampleJson.start;
			loadEditorFromTextarea();
		});

		formatButton.addEventListener('click', () => {
			const textarea = getJsonTextarea();

			if (!textarea) {
				return;
			}

			try {
				textarea.value = JSON.stringify(JSON.parse(textarea.value), null, 2);
				textarea.focus();
				loadEditorFromTextarea();
			} catch (error) {
				window.alert('The JSON data is not valid and could not be formatted.');
			}
		});
	};

	const initQuestionEditor = () => {
		const textarea = getJsonTextarea();
		const {
			addOptionButton,
			addQuestionButton,
			deleteQuestionButton,
			questionSelect,
			questionText,
			setStartButton,
		} = getEditorElements();

		if (
			!textarea
			|| !addOptionButton
			|| !addQuestionButton
			|| !deleteQuestionButton
			|| !questionSelect
			|| !questionText
			|| !setStartButton
		) {
			return;
		}

		questionSelect.addEventListener('change', () => {
			selectedQuestionId = questionSelect.value;
			renderQuestionEditor();
		});

		questionText.addEventListener('input', () => {
			const question = getSelectedQuestion();

			if (!question) {
				return;
			}

			question.question_text = questionText.value;
			syncTextarea();
		});

		addQuestionButton.addEventListener('click', () => {
			if (!editorTree || typeof editorTree !== 'object' || Array.isArray(editorTree)) {
				editorTree = {
					start: 'q1',
					questions: {},
				};
			}

			if (!hasQuestionsObject()) {
				editorTree.questions = {};
			}

			const id = getNewQuestionId();
			editorTree.questions[id] = {
				question_text: '',
				options: [],
			};

			if (!editorTree.start) {
				editorTree.start = id;
			}

			selectedQuestionId = id;
			syncTextarea();
			renderQuestionEditor();
		});

		deleteQuestionButton.addEventListener('click', () => {
			if (!hasQuestionsObject() || !selectedQuestionId || selectedQuestionId === editorTree.start) {
				return;
			}

			const referenceCount = countNextReferences(selectedQuestionId);
			const warning = referenceCount > 0
				? `Delete question "${selectedQuestionId}"? ${referenceCount} option link(s) pointing to it will be cleared.`
				: `Delete question "${selectedQuestionId}"?`;

			if (!window.confirm(warning)) {
				return;
			}

			clearNextReferences(selectedQuestionId);

			delete editorTree.questions[selectedQuestionId];
			selectedQuestionId = editorTree.start || getQuestionIds()[0] || '';
			syncTextarea();
			renderQuestionEditor();
		});

		setStartButton.addEventListener('click', () => {
			if (!hasQuestionsObject() || !selectedQuestionId) {
				return;
			}

			editorTree.start = selectedQuestionId;
			syncTextarea();
			renderQuestionEditor();
		});

		addOptionButton.addEventListener('click', () => {
			const question = getSelectedQuestion();

			if (!question) {
				return;
			}

			if (!Array.isArray(question.options)) {
				question.options = [];
			}

			question.options.push({
				text: 'New option',
				result: [
					{
						type: 'text',
						content: '',
					},
				],
			});
			syncTextarea();
			renderQuestionEditor();
		});

		textarea.addEventListener('change', loadEditorFromTextarea);
		loadEditorFromTextarea();
	};

	const initAdmin = () => {
		initJsonTools();
		initQuestionEditor();
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initAdmin);
	} else {
		initAdmin();
	}
})();
