(() => {
	'use strict';

	const text = (key) => (
		window.Joomla && Joomla.Text ? Joomla.Text._(key, key) : key
	);

	const sprintf = (key, ...values) => values.reduce(
		(output, value) => output.replace(/%s|%d/, value),
		text(key),
	);
	const sessionExpiredMessageId = 'decisiontree-session-expired-message';
	const sessionExpiredErrorName = 'DecisionTreeSessionExpiredError';

	const isHtmlResponseText = (value) => {
		const trimmed = String(value || '').trim().toLowerCase();

		return trimmed.startsWith('<!doctype')
			|| trimmed.startsWith('<html')
			|| /<form[^>]+(?:id|name)=["']?(?:form-login|login-form|adminForm)/i.test(trimmed)
			|| /com_login|mod-login-username|name=["']username["']|task=["']?login/i.test(trimmed);
	};

	const isInvalidSessionText = (value) => (
		/invalid security token|invalid token|session (?:has )?expired|administrator session|please log in|please login/i
			.test(String(value || ''))
	);

	const isLikelySessionJson = (value) => {
		if (!value || typeof value !== 'object') {
			return false;
		}

		const message = [
			value.message,
			value.error,
			value.error_description,
			value.notice,
		].filter(Boolean).join(' ');

		return isInvalidSessionText(message)
			|| value.code === 401
			|| value.status === 401
			|| value.statusCode === 401;
	};

	const createSessionExpiredError = (cause = null) => {
		const error = new Error(text('COM_DECISIONTREE_JS_SESSION_EXPIRED_MESSAGE'));
		error.name = sessionExpiredErrorName;
		error.sessionExpired = true;

		if (cause) {
			error.cause = cause;
		}

		return error;
	};

	const showSessionExpiredMessage = () => {
		if (document.getElementById(sessionExpiredMessageId)) {
			return;
		}

		const messageContainer = document.getElementById('system-message-container') || document.body.insertBefore(
			document.createElement('div'),
			document.body.firstChild,
		);
		messageContainer.id = messageContainer.id || 'system-message-container';

		const alert = document.createElement('div');
		alert.id = sessionExpiredMessageId;
		alert.className = 'alert alert-warning';
		alert.setAttribute('role', 'alert');

		const message = document.createElement('span');
		message.textContent = text('COM_DECISIONTREE_JS_SESSION_EXPIRED_MESSAGE');

		const refreshButton = document.createElement('button');
		refreshButton.type = 'button';
		refreshButton.className = 'btn btn-sm btn-secondary ms-2';
		refreshButton.textContent = text('COM_DECISIONTREE_JS_REFRESH_PAGE');
		refreshButton.addEventListener('click', () => {
			window.location.reload();
		});

		alert.append(message, refreshButton);
		messageContainer.appendChild(alert);
	};

	const parseJsonResponse = async (response) => {
		const bodyText = await response.text();

		if (isHtmlResponseText(bodyText)) {
			showSessionExpiredMessage();
			throw createSessionExpiredError();
		}

		let data = null;

		try {
			data = bodyText.trim() === '' ? null : JSON.parse(bodyText);
		} catch (error) {
			if (response.status === 401 || response.status === 403 || isInvalidSessionText(bodyText)) {
				showSessionExpiredMessage();
				throw createSessionExpiredError(error);
			}

			throw error;
		}

		if (response.status === 401 || (response.status === 403 && (data === null || isLikelySessionJson(data)))) {
			showSessionExpiredMessage();
			throw createSessionExpiredError();
		}

		if (isLikelySessionJson(data)) {
			showSessionExpiredMessage();
			throw createSessionExpiredError();
		}

		return data;
	};

	const fetchJson = async (...args) => {
		const response = await window.fetch(...args);
		const data = await parseJsonResponse(response);

		if (!response.ok) {
			const error = new Error(data?.message || response.statusText || `HTTP ${response.status}`);
			error.response = response;
			error.data = data;
			throw error;
		}

		return data;
	};

	window.DecisionTreeAdmin = Object.assign(window.DecisionTreeAdmin || {}, {
		fetchJson,
		isHtmlResponseText,
		parseJsonResponse,
		showSessionExpiredMessage,
	});

	const createDemoResult = (resultText) => ({
		text: resultText,
		link: {
			url: 'https://en.wikipedia.org/wiki/Laptop',
			text: 'Learn more about laptops',
			target_blank: true,
		},
	});

	const demoTree = {
		version: '1.1',
		start: 'q1',
		settings: {
			show_step_number: false,
		},
		questions: {
			q1: {
				question_text: 'What will you mainly use the laptop for?',
				options: [
					{ id: 'o1', text: 'Work / Office tasks', next: 'q2' },
					{ id: 'o2', text: 'Gaming', next: 'q3' },
					{ id: 'o3', text: 'General use', next: 'q4' },
				],
			},
			q2: {
				question_text: 'Do you need portability?',
				options: [
					{
						id: 'o1',
						text: 'Yes, I need it lightweight',
						result: createDemoResult('You should look for an ultrabook or lightweight laptop. These are ideal for portability and everyday productivity.'),
					},
					{
						id: 'o2',
						text: 'No, performance matters more',
						result: createDemoResult('A standard business laptop with higher specs would suit you. These are great for multitasking and heavier workloads.'),
					},
				],
			},
			q3: {
				question_text: 'What level of gaming?',
				options: [
					{
						id: 'o1',
						text: 'Casual gaming',
						result: createDemoResult('A mid-range laptop with a decent GPU should be enough for casual gaming and everyday use.'),
					},
					{
						id: 'o2',
						text: 'High-end gaming',
						result: createDemoResult('You should consider a high-performance gaming laptop with a dedicated GPU and advanced cooling.'),
					},
				],
			},
			q4: {
				question_text: 'What is your budget?',
				options: [
					{
						id: 'o1',
						text: 'Low budget',
						result: createDemoResult('Look for an affordable entry-level laptop that covers basic tasks like browsing, email and streaming.'),
					},
					{
						id: 'o2',
						text: 'Mid to high budget',
						result: createDemoResult('You have a wide range of options. Consider a well-balanced laptop with good performance, build quality and battery life.'),
					},
				],
			},
		},
	};

	let editorTree = null;
	let selectedQuestionId = '';
	const optionUiState = new WeakMap();

	const getOptionUiState = (option) => {
		if (!option || typeof option !== 'object') {
			return {};
		}

		if (!optionUiState.has(option)) {
			optionUiState.set(option, {});
		}

		return optionUiState.get(option);
	};

	const getJsonTextarea = () => document.getElementById('jform_json_data');
	const trimPastedText = (value) => String(value || '').trim();
	const insertTextAtCursor = (element, textValue) => {
		if (!element || typeof element.value !== 'string') {
			return false;
		}

		const start = Number.isInteger(element.selectionStart) ? element.selectionStart : element.value.length;
		const end = Number.isInteger(element.selectionEnd) ? element.selectionEnd : element.value.length;
		const before = element.value.slice(0, start);
		const after = element.value.slice(end);
		const nextValue = `${before}${textValue}${after}`;
		const nextCaret = start + textValue.length;

		element.value = nextValue;
		element.setSelectionRange(nextCaret, nextCaret);
		element.dispatchEvent(new Event('input', { bubbles: true }));

		return true;
	};
	const getEditorElements = () => ({
		addOptionButton: document.getElementById('decisiontree-add-option'),
		addQuestionButton: document.getElementById('decisiontree-add-question'),
		deleteQuestionButton: document.getElementById('decisiontree-delete-question'),
		duplicateQuestionButton: document.getElementById('decisiontree-duplicate-question'),
		loadDemoButton: document.getElementById('decisiontree-load-demo'),
		message: document.getElementById('decisiontree-editor-message'),
		options: document.getElementById('decisiontree-options'),
		pathHealth: document.getElementById('decisiontree-path-health'),
		previewButton: document.getElementById('decisiontree-preview'),
		questionSelect: document.getElementById('decisiontree-question-select'),
		questionText: document.getElementById('decisiontree-question-text'),
		setStartButton: document.getElementById('decisiontree-set-start-question'),
		showStepNumber: document.getElementById('decisiontree-show-step-number'),
	});
	const hasQuestionsObject = () => (
		editorTree
		&& editorTree.questions
		&& typeof editorTree.questions === 'object'
		&& !Array.isArray(editorTree.questions)
	);
	const deepClone = (value) => JSON.parse(JSON.stringify(value));
	const isSafeIdentifier = (value) => /^[a-z0-9_]+$/.test(String(value || ''));
	const getNewOptionId = (question) => {
		const ids = Array.isArray(question?.options)
			? question.options.map((option) => String(option?.id || '')).filter(Boolean)
			: [];
		let index = 1;

		while (ids.includes(`o${index}`)) {
			index += 1;
		}

		return `o${index}`;
	};
	const normalizeEditorTree = (tree) => {
		if (!tree || typeof tree !== 'object' || Array.isArray(tree)) {
			return tree;
		}

		if (tree.questions && typeof tree.questions === 'object' && !Array.isArray(tree.questions)) {
			Object.values(tree.questions).forEach((question) => {
				if (!question || !Array.isArray(question.options)) {
					return;
				}

				question.options.forEach((option) => {
					if (!option || typeof option !== 'object' || Array.isArray(option)) {
						return;
					}

					if (!Object.prototype.hasOwnProperty.call(option, 'id') || String(option.id).trim() === '') {
						option.id = getNewOptionId(question);
					} else {
						option.id = String(option.id).trim();
					}
				});
			});
		}

		if (!tree.version || Number.parseFloat(tree.version) < 1.1) {
			tree.version = '1.1';
		}

		return tree;
	};

	const getQuestionIds = () => (hasQuestionsObject() ? Object.keys(editorTree.questions) : []);
	const getSelectedQuestion = () => (hasQuestionsObject() ? editorTree.questions[selectedQuestionId] || null : null);
	const getQuestionTextPreview = (question, maxLength = 72) => {
		const textValue = String(question?.question_text || '').replace(/\s+/g, ' ').trim();

		if (textValue === '') {
			return '';
		}

		if (textValue.length <= maxLength) {
			return textValue;
		}

		return `${textValue.slice(0, maxLength - 3).trimEnd()}...`;
	};
	const getOptionTextPreview = (option, maxLength = 56) => {
		const textValue = String(option?.text || '').replace(/\s+/g, ' ').trim();

		if (textValue === '') {
			return text('COM_DECISIONTREE_JS_OPTION_SUMMARY_EMPTY');
		}

		if (textValue.length <= maxLength) {
			return textValue;
		}

		return `${textValue.slice(0, maxLength - 3).trimEnd()}...`;
	};
	const getOptionActionSummaryText = (option) => (
		hasNext(option)
			? text('COM_DECISIONTREE_JS_OPTION_SUMMARY_ACTION_NEXT')
			: text('COM_DECISIONTREE_JS_OPTION_SUMMARY_ACTION_RESULT')
	);
	const getQuestionOptionLabel = (id) => {
		const question = hasQuestionsObject() ? editorTree.questions[id] : null;
		const preview = getQuestionTextPreview(question);
		const baseLabel = preview !== '' ? preview : id;

		return id === editorTree.start
			? `${baseLabel} (${text('COM_DECISIONTREE_JS_START_QUESTION_SUFFIX')})`
			: baseLabel;
	};
	const getSelfReferencingOptions = () => {
		if (!hasQuestionsObject()) {
			return [];
		}

		const issues = [];

		getQuestionIds().forEach((questionId) => {
			const question = editorTree.questions[questionId];

			if (!question || !Array.isArray(question.options)) {
				return;
			}

			question.options.forEach((option, index) => {
				if (String(option.next) === String(questionId)) {
					issues.push({ questionId, optionIndex: index });
				}
			});
		});

		return issues;
	};
	const resultHasContent = (result) => {
		if (typeof result === 'string') {
			return result.trim() !== '';
		}

		if (typeof result === 'number') {
			return true;
		}

		if (!result || typeof result !== 'object') {
			return false;
		}

		return Object.entries(result).some(([key, value]) => key !== 'target_blank' && resultHasContent(value));
	};
	const analyseTreePaths = () => {
		const errors = [];
		const warnings = [];

		if (!hasQuestionsObject()) {
			return { errors, warnings };
		}

		const questionIds = getQuestionIds();
		const adjacency = Object.fromEntries(questionIds.map((id) => [id, []]));

		questionIds.forEach((questionId) => {
			const question = editorTree.questions[questionId];
			const options = Array.isArray(question?.options) ? question.options : [];
			const optionIds = new Set();

			if (options.length === 0) {
				warnings.push(sprintf('COM_DECISIONTREE_WARNING_JSON_DEAD_ENDS', questionId));
			}

			options.forEach((option, optionIndex) => {
				const optionId = String(option?.id || '').trim();

				if (!isSafeIdentifier(optionId)) {
					errors.push({
						message: sprintf('COM_DECISIONTREE_ERROR_JSON_OPTION_ID_INVALID', questionId, optionIndex + 1),
						questionId,
					});
				} else if (optionIds.has(optionId)) {
					errors.push({
						message: sprintf('COM_DECISIONTREE_ERROR_JSON_OPTION_ID_DUPLICATE', questionId, optionId),
						questionId,
					});
				} else {
					optionIds.add(optionId);
				}

				const nextQuestionId = String(option?.next || '').trim();
				const hasNextQuestion = nextQuestionId !== '';
				const hasOutcome = option && Object.prototype.hasOwnProperty.call(option, 'result') && resultHasContent(option.result);

				if (hasNextQuestion && hasOutcome) {
					errors.push({
						message: sprintf('COM_DECISIONTREE_ERROR_JSON_OPTION_AMBIGUOUS', questionId, optionIndex + 1),
						questionId,
					});
					return;
				}

				if (!hasNextQuestion && !hasOutcome) {
					warnings.push(sprintf('COM_DECISIONTREE_WARNING_JSON_OPTION_INCOMPLETE', questionId, optionIndex + 1));
					return;
				}

				if (!hasNextQuestion) {
					return;
				}

				if (!questionIds.includes(nextQuestionId)) {
					errors.push({
						message: sprintf('COM_DECISIONTREE_ERROR_JSON_NEXT_QUESTION_MISSING', nextQuestionId),
						questionId,
					});
					return;
				}

				if (nextQuestionId === questionId) {
					errors.push({
						message: sprintf('COM_DECISIONTREE_ERROR_JSON_NEXT_QUESTION_SELF_REFERENCE', questionId),
						questionId,
					});
					return;
				}

				adjacency[questionId].push(nextQuestionId);
			});
		});

		const visitState = {};
		const stack = [];
		let cycle = [];
		const visit = (questionId) => {
			visitState[questionId] = 1;
			stack.push(questionId);

			for (const nextQuestionId of adjacency[questionId] || []) {
				if (!visitState[nextQuestionId]) {
					visit(nextQuestionId);

					if (cycle.length > 0) {
						return;
					}
				} else if (visitState[nextQuestionId] === 1) {
					const cycleStart = stack.indexOf(nextQuestionId);
					cycle = [...stack.slice(cycleStart), nextQuestionId];
					return;
				}
			}

			stack.pop();
			visitState[questionId] = 2;
		};

		for (const questionId of questionIds) {
			if (!visitState[questionId]) {
				visit(questionId);
			}

			if (cycle.length > 0) {
				errors.push({
					message: sprintf('COM_DECISIONTREE_ERROR_JSON_CYCLE', cycle.join(' -> ')),
					questionId: cycle[0],
				});
				break;
			}
		}

		if (questionIds.includes(editorTree.start)) {
			const reachable = new Set();
			const pending = [editorTree.start];

			while (pending.length > 0) {
				const questionId = pending.pop();

				if (reachable.has(questionId)) {
					continue;
				}

				reachable.add(questionId);
				pending.push(...(adjacency[questionId] || []));
			}

			const unreachable = questionIds.filter((questionId) => !reachable.has(questionId));

			if (unreachable.length > 0) {
				warnings.push(sprintf('COM_DECISIONTREE_WARNING_JSON_UNREACHABLE', unreachable.join(', ')));
			}
		}

		if (
			editorTree.settings !== undefined
			&& (
				editorTree.settings === null
				|| typeof editorTree.settings !== 'object'
				|| Array.isArray(editorTree.settings)
				|| (
					Object.prototype.hasOwnProperty.call(editorTree.settings, 'show_step_number')
					&& typeof editorTree.settings.show_step_number !== 'boolean'
				)
			)
		) {
			errors.push({
				message: text('COM_DECISIONTREE_ERROR_JSON_STEP_NUMBER_INVALID'),
				questionId: editorTree.start || questionIds[0] || '',
			});
		}

		return { errors, warnings: [...new Set(warnings)] };
	};
	const updatePathHealth = () => {
		const { pathHealth } = getEditorElements();

		if (!pathHealth || !editorTree || !hasQuestionsObject()) {
			if (pathHealth) {
				pathHealth.hidden = true;
			}

			return;
		}

		const analysis = analyseTreePaths();
		pathHealth.classList.remove('alert-success', 'alert-warning', 'alert-danger');

		if (analysis.errors.length > 0) {
			pathHealth.classList.add('alert-danger');
			pathHealth.textContent = analysis.errors.map((issue) => issue.message).join(' ');
		} else if (analysis.warnings.length > 0) {
			pathHealth.classList.add('alert-warning');
			pathHealth.textContent = analysis.warnings.join(' ');
		} else {
			pathHealth.classList.add('alert-success');
			pathHealth.textContent = text('COM_DECISIONTREE_JS_PATH_HEALTH_VALID');
		}

		pathHealth.hidden = false;
	};
	const cloneDemoTree = () => JSON.parse(JSON.stringify(demoTree));

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
		updatePathHealth();
	};

	const getResultText = (option) => {
		if (typeof option.result === 'string' || typeof option.result === 'number') {
			return String(option.result);
		}

		if (option.result && typeof option.result === 'object' && !Array.isArray(option.result)) {
			return option.result.text || option.result.content || '';
		}

		if (Array.isArray(option.result)) {
			const block = option.result.find((item) => item && item.type === 'text');

			return block ? block.content || block.text || '' : '';
		}

		return '';
	};

	const getResultLink = (option) => {
		const emptyLink = {
			url: '',
			text: '',
			target_blank: false,
		};

		if (option.result && typeof option.result === 'object' && !Array.isArray(option.result)) {
			return {
				url: option.result.link?.url || '',
				text: option.result.link?.text || '',
				target_blank: Boolean(option.result.link?.target_blank),
			};
		}

		if (Array.isArray(option.result)) {
			const block = option.result.find((item) => item && item.type === 'link');

			if (block) {
				return {
					url: block.url || '',
					text: block.text || '',
					target_blank: Boolean(block.target_blank),
				};
			}
		}

		return emptyLink;
	};

	const setOptionResult = (option, content, link = getResultLink(option)) => {
		delete option.next;
		option.result = {
			text: content,
		};

		if (link.url !== '') {
			option.result.link = {
				url: link.url,
				text: link.text,
				target_blank: Boolean(link.target_blank),
			};
		}
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

	const moveOptionInQuestion = (question, fromIndex, toIndex) => {
		if (
			!question
			|| !Array.isArray(question.options)
			|| fromIndex === toIndex
			|| fromIndex < 0
			|| toIndex < 0
			|| fromIndex >= question.options.length
			|| toIndex >= question.options.length
		) {
			return false;
		}

		const [option] = question.options.splice(fromIndex, 1);
		question.options.splice(toIndex, 0, option);

		return true;
	};

	const getUniqueOptionCopyText = (question, optionText) => {
		const baseText = String(optionText || '').trim();
		const existingTexts = new Set((question?.options || []).map(
			(option) => String(option?.text || '').trim(),
		));
		let copyText = sprintf('COM_DECISIONTREE_JS_OPTION_COPY', baseText);
		let copyNumber = 2;

		while (existingTexts.has(copyText)) {
			copyText = sprintf('COM_DECISIONTREE_JS_OPTION_COPY_NUMBERED', baseText, copyNumber);
			copyNumber += 1;
		}

		return copyText;
	};

	const duplicateOptionInQuestion = (question, index) => {
		if (!question || !Array.isArray(question.options) || !question.options[index]) {
			return false;
		}

		const copy = deepClone(question.options[index]);
		copy.id = getNewOptionId(question);
		copy.text = getUniqueOptionCopyText(question, copy.text);
		question.options.splice(index + 1, 0, copy);

		return true;
	};

	const getNewQuestionId = () => {
		const ids = getQuestionIds();
		let index = 1;

		while (ids.includes(`q${index}`)) {
			index += 1;
		}

		return `q${index}`;
	};

	const getUniqueQuestionCopyText = (questionText) => {
		const baseText = String(questionText || '').trim();
		const existingTexts = new Set(getQuestionIds().map(
			(questionId) => String(editorTree.questions[questionId]?.question_text || '').trim(),
		));
		let copyText = sprintf('COM_DECISIONTREE_JS_QUESTION_COPY', baseText);
		let copyNumber = 2;

		while (existingTexts.has(copyText)) {
			copyText = sprintf('COM_DECISIONTREE_JS_QUESTION_COPY_NUMBERED', baseText, copyNumber);
			copyNumber += 1;
		}

		return copyText;
	};

	const duplicateSelectedQuestion = () => {
		const source = getSelectedQuestion();

		if (!source || !hasQuestionsObject()) {
			return false;
		}

		const sourceId = selectedQuestionId;
		const copyId = getNewQuestionId();
		const copy = deepClone(source);
		copy.question_text = getUniqueQuestionCopyText(source.question_text);

		if (!Array.isArray(copy.options)) {
			copy.options = [];
		}

		copy.options.forEach((option) => {
			if (option && typeof option === 'object' && !Array.isArray(option)) {
				delete option.id;
			}
		});
		normalizeEditorTree({
			version: '1.1',
			questions: {
				[copyId]: copy,
			},
		});

		const questions = {};

		Object.entries(editorTree.questions).forEach(([questionId, question]) => {
			questions[questionId] = question;

			if (questionId === sourceId) {
				questions[copyId] = copy;
			}
		});

		editorTree.questions = questions;
		editorTree.version = '1.1';
		selectedQuestionId = copyId;

		return true;
	};

	const openPreview = () => {
		const analysis = analyseTreePaths();
		const { pathHealth, previewButton } = getEditorElements();

		if (!hasQuestionsObject() || getQuestionIds().length === 0 || analysis.errors.length > 0) {
			const firstIssue = analysis.errors[0];

			if (firstIssue?.questionId) {
				selectedQuestionId = firstIssue.questionId;
				renderQuestionEditor();
			}

			setEditorMessage(firstIssue?.message || text('COM_DECISIONTREE_JS_PREVIEW_BLOCKED'));
			pathHealth?.focus?.();

			return;
		}

		const modalElement = document.getElementById('decisiontree-preview-modal');
		const previewTree = document.getElementById('decisiontree-preview-tree');

		if (!modalElement || !previewTree || !window.DecisionTreeFrontend?.mount) {
			return;
		}

		const title = previewTree.querySelector('.com-decisiontree-preview__title');
		const description = previewTree.querySelector('.com-decisiontree-preview__description');
		const titleInput = document.getElementById('jform_title');
		const descriptionInput = document.getElementById('jform_description');

		if (title) {
			title.textContent = String(titleInput?.value || '').trim();
		}

		if (description) {
			description.textContent = String(descriptionInput?.value || '').trim();
		}

		window.DecisionTreeFrontend.mount(previewTree, deepClone(editorTree), {
			force: true,
			instanceId: 'decisiontree-preview-tree',
			source: 'preview',
			treeId: document.getElementById('jform_id')?.value || 'preview',
		});

		if (window.bootstrap?.Modal) {
			const modal = window.bootstrap.Modal.getOrCreateInstance(modalElement);
			modalElement.addEventListener('hidden.bs.modal', () => {
				previewButton?.focus();
			}, { once: true });
			modal.show();
		}
	};

	const populateQuestionSelect = () => {
		const { questionSelect } = getEditorElements();
		const ids = getQuestionIds();

		if (!questionSelect) {
			return;
		}

		questionSelect.replaceChildren();

		if (ids.length === 0) {
			const option = document.createElement('option');
			option.value = '';
			option.textContent = text('COM_DECISIONTREE_JS_QUESTION_EMPTY_SELECT');
			option.disabled = true;
			option.selected = true;
			questionSelect.appendChild(option);
		}

		ids.forEach((id) => {
			const option = document.createElement('option');
			option.value = id;
			option.textContent = getQuestionOptionLabel(id);
			questionSelect.appendChild(option);
		});

		if (!ids.includes(selectedQuestionId)) {
			selectedQuestionId = ids.includes(editorTree?.start) ? editorTree.start : ids[0] || '';
		}

		questionSelect.value = selectedQuestionId;
	};

	const renderOptionEditor = (option, index, questionIds, currentQuestionId) => {
		if (normalizeOptionAction(option)) {
			syncTextarea();
		}

		const uiState = getOptionUiState(option);
		const isCollapsed = Boolean(uiState.collapsed);
		const card = document.createElement('div');
		card.className = 'com-decisiontree-option-editor';
		card.classList.toggle('is-collapsed', isCollapsed);

		const header = document.createElement('div');
		header.className = 'com-decisiontree-option-editor__header';

		const heading = document.createElement('h4');
		heading.className = 'com-decisiontree-option-editor__heading';
		const headingMain = document.createElement('span');
		headingMain.className = 'com-decisiontree-option-editor__heading-main';
		headingMain.textContent = sprintf('COM_DECISIONTREE_JS_OPTION_HEADING', index + 1);
		const headingMeta = document.createElement('span');
		headingMeta.className = 'com-decisiontree-option-editor__heading-meta';
		const textPreview = getOptionTextPreview(option);
		const actionSummary = getOptionActionSummaryText(option);
		headingMeta.textContent = `${textPreview} | ${actionSummary}`;
		heading.append(headingMain, headingMeta);

		const headerActions = document.createElement('div');
		headerActions.className = 'com-decisiontree-option-editor__header-actions';

		const toggleCollapseButton = document.createElement('button');
		toggleCollapseButton.type = 'button';
		toggleCollapseButton.className = 'btn btn-outline-secondary btn-sm com-decisiontree-option-editor__toggle';
		toggleCollapseButton.id = `decisiontree-option-toggle-${index}`;
		toggleCollapseButton.setAttribute('aria-expanded', String(!isCollapsed));
		toggleCollapseButton.setAttribute('aria-label', isCollapsed ? text('COM_DECISIONTREE_JS_EXPAND_OPTION') : text('COM_DECISIONTREE_JS_COLLAPSE_OPTION'));
		toggleCollapseButton.title = isCollapsed ? text('COM_DECISIONTREE_JS_EXPAND_OPTION') : text('COM_DECISIONTREE_JS_COLLAPSE_OPTION');
		toggleCollapseButton.textContent = isCollapsed ? text('COM_DECISIONTREE_JS_EXPAND_OPTION') : text('COM_DECISIONTREE_JS_COLLAPSE_OPTION');
		toggleCollapseButton.addEventListener('click', () => {
			uiState.collapsed = !uiState.collapsed;
			renderQuestionEditor({
				focus: {
					control: 'toggleCollapse',
					index,
				},
			});
		});

		const moveUpButton = document.createElement('button');
		moveUpButton.type = 'button';
		moveUpButton.className = 'btn btn-secondary btn-sm com-decisiontree-option-editor__move';
		moveUpButton.id = `decisiontree-option-move-up-${index}`;
		moveUpButton.textContent = text('COM_DECISIONTREE_JS_MOVE_OPTION_UP');
		moveUpButton.disabled = index === 0;
		moveUpButton.setAttribute('aria-label', text('COM_DECISIONTREE_JS_MOVE_OPTION_UP'));
		moveUpButton.addEventListener('click', () => {
			const question = getSelectedQuestion();
			const nextIndex = index - 1;

			if (!moveOptionInQuestion(question, index, nextIndex)) {
				return;
			}

			syncTextarea();
			renderQuestionEditor({
				focus: {
					control: 'moveUp',
					index: nextIndex,
				},
			});
		});

		const moveDownButton = document.createElement('button');
		moveDownButton.type = 'button';
		moveDownButton.className = 'btn btn-secondary btn-sm com-decisiontree-option-editor__move';
		moveDownButton.id = `decisiontree-option-move-down-${index}`;
		moveDownButton.textContent = text('COM_DECISIONTREE_JS_MOVE_OPTION_DOWN');
		const selectedQuestion = getSelectedQuestion();
		const optionCount = selectedQuestion && Array.isArray(selectedQuestion.options) ? selectedQuestion.options.length : 0;
		moveDownButton.disabled = index >= optionCount - 1;
		moveDownButton.setAttribute('aria-label', text('COM_DECISIONTREE_JS_MOVE_OPTION_DOWN'));
		moveDownButton.addEventListener('click', () => {
			const question = getSelectedQuestion();

			if (!question || !Array.isArray(question.options)) {
				return;
			}

			const nextIndex = index + 1;

			if (!moveOptionInQuestion(question, index, nextIndex)) {
				return;
			}

			syncTextarea();
			renderQuestionEditor({
				focus: {
					control: 'moveDown',
					index: nextIndex,
				},
			});
		});

		headerActions.append(toggleCollapseButton, moveUpButton, moveDownButton);
		header.append(heading, headerActions);

		const body = document.createElement('div');
		body.className = 'com-decisiontree-option-editor__body';
		body.hidden = isCollapsed;

		const textWrap = document.createElement('div');
		textWrap.className = 'com-decisiontree-option-editor__text';

			const label = document.createElement('label');
			label.className = 'form-label';
			label.setAttribute('for', `decisiontree-option-${index}`);
			label.textContent = text('COM_DECISIONTREE_JS_OPTION_TEXT_LABEL');

		const input = document.createElement('input');
		input.type = 'text';
		input.className = 'form-control';
		input.id = `decisiontree-option-${index}`;
		input.value = option.text || '';
		input.placeholder = text('COM_DECISIONTREE_JS_OPTION_TEXT_PLACEHOLDER');
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
		actionLabel.textContent = text('COM_DECISIONTREE_JS_ACTION_LABEL');

		const actionSelect = document.createElement('select');
		actionSelect.className = 'form-select';
		actionSelect.id = `decisiontree-option-action-${index}`;
		actionSelect.innerHTML = `<option value="result">${text('COM_DECISIONTREE_JS_ACTION_SHOWS_RESULT')}</option><option value="next">${text('COM_DECISIONTREE_JS_ACTION_GOES_TO_QUESTION')}</option>`;
		actionSelect.value = hasNext(option) ? 'next' : 'result';

			actionWrap.append(actionLabel, actionSelect);

		const topRow = document.createElement('div');
		topRow.className = 'com-decisiontree-option-editor__top-row';

		const detailWrap = document.createElement('div');
		detailWrap.className = 'com-decisiontree-option-editor__detail';

		const renderActionDetail = (convertAction = false) => {
			detailWrap.replaceChildren();

			if (actionSelect.value === 'next') {
				const availableQuestionIds = questionIds.filter((id) => String(id) !== String(currentQuestionId));
				const hasLegacySelfReference = String(option.next) === String(currentQuestionId);
				const nextLabel = document.createElement('label');
				nextLabel.className = 'form-label';
				nextLabel.setAttribute('for', `decisiontree-option-next-${index}`);
				nextLabel.textContent = text('COM_DECISIONTREE_JS_NEXT_QUESTION_LABEL');

				const nextSelect = document.createElement('select');
				nextSelect.className = 'form-select';
				nextSelect.id = `decisiontree-option-next-${index}`;
				nextSelect.disabled = availableQuestionIds.length === 0 && !hasLegacySelfReference;

				if (hasLegacySelfReference) {
					const legacyOption = document.createElement('option');
					legacyOption.value = currentQuestionId;
					legacyOption.textContent = `${getQuestionOptionLabel(currentQuestionId)} (${text('COM_DECISIONTREE_JS_NEXT_QUESTION_SELF_REFERENCE_LEGACY_LABEL')})`;
					nextSelect.appendChild(legacyOption);
				}

				if (availableQuestionIds.length === 0) {
					const emptyOption = document.createElement('option');
					emptyOption.value = '';
					emptyOption.textContent = text('COM_DECISIONTREE_JS_NEXT_QUESTION_EMPTY_STATE');
					emptyOption.disabled = true;
					nextSelect.appendChild(emptyOption);
				}

				availableQuestionIds.forEach((id) => {
					const optionElement = document.createElement('option');
					optionElement.value = id;
					optionElement.textContent = getQuestionOptionLabel(id);
					nextSelect.appendChild(optionElement);
				});

				const validValues = [currentQuestionId, ...availableQuestionIds];
				nextSelect.value = validValues.includes(option.next) ? option.next : '';

				if (nextSelect.value === '' && availableQuestionIds.length === 0 && !hasLegacySelfReference) {
					nextSelect.value = '';
				}

				if (convertAction) {
					if (availableQuestionIds.length > 0) {
						nextSelect.value = availableQuestionIds[0];
						setOptionNext(option, nextSelect.value);
					} else if (!hasLegacySelfReference) {
						setOptionNext(option, '');
					}
				}

				nextSelect.addEventListener('change', () => {
					setOptionNext(option, nextSelect.value);
					syncTextarea();
				});

				detailWrap.append(nextLabel, nextSelect);

				if (hasLegacySelfReference) {
					const selfReferenceWarning = document.createElement('div');
					selfReferenceWarning.className = 'alert alert-warning mt-2 mb-0';
					selfReferenceWarning.textContent = text('COM_DECISIONTREE_JS_NEXT_QUESTION_SELF_REFERENCE_WARNING');
					detailWrap.appendChild(selfReferenceWarning);
				}
			} else {
				const extendedEditor = window.DecisionTreeResultExtensions?.renderAdminEditor;

				if (typeof extendedEditor === 'function') {
					try {
						const handled = extendedEditor({
							detailWrap,
							getResultLink,
							getResultText,
							index,
							option,
							optionUiState: getOptionUiState(option),
							setOptionResult,
							syncTextarea,
							text,
						});

						if (handled) {
							if (convertAction && !hasResult(option)) {
								setOptionResult(option, '');
							}

							return;
						}
					} catch (error) {
						console.error('Decision Tree result editor extension failed.', error);
					}
				}

				const resultLabel = document.createElement('label');
				resultLabel.className = 'form-label';
				resultLabel.setAttribute('for', `decisiontree-option-result-${index}`);
				resultLabel.textContent = text('COM_DECISIONTREE_JS_RESULT_TEXT_LABEL');

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

				const resultLink = getResultLink(option);

				const linkFields = document.createElement('div');
				linkFields.className = 'com-decisiontree-result-link-fields';

				const linkTextWrap = document.createElement('div');
				linkTextWrap.className = 'com-decisiontree-result-link-text';
				const linkTextLabel = document.createElement('label');
				linkTextLabel.className = 'form-label';
				linkTextLabel.setAttribute('for', `decisiontree-option-result-link-text-${index}`);
				linkTextLabel.textContent = text('COM_DECISIONTREE_JS_RESULT_LINK_TEXT_LABEL');

				const linkTextInput = document.createElement('input');
				linkTextInput.type = 'text';
				linkTextInput.className = 'form-control';
				linkTextInput.id = `decisiontree-option-result-link-text-${index}`;
				linkTextInput.value = resultLink.text;
				linkTextInput.placeholder = text('COM_DECISIONTREE_JS_RESULT_LINK_TEXT_PLACEHOLDER');

				linkTextWrap.append(linkTextLabel, linkTextInput);

				const linkUrlWrap = document.createElement('div');
				linkUrlWrap.className = 'com-decisiontree-result-link-url';
				const linkUrlLabel = document.createElement('label');
				linkUrlLabel.className = 'form-label';
				linkUrlLabel.setAttribute('for', `decisiontree-option-result-link-url-${index}`);
				linkUrlLabel.textContent = text('COM_DECISIONTREE_JS_RESULT_LINK_URL_LABEL');

				const linkUrlInput = document.createElement('input');
				linkUrlInput.type = 'text';
				linkUrlInput.className = 'form-control';
				linkUrlInput.id = `decisiontree-option-result-link-url-${index}`;
				linkUrlInput.value = resultLink.url;
				linkUrlInput.placeholder = text('COM_DECISIONTREE_JS_RESULT_LINK_URL_PLACEHOLDER');

				const linkUrlHelp = document.createElement('div');
				linkUrlHelp.className = 'form-text';
				linkUrlHelp.textContent = text('COM_DECISIONTREE_JS_RESULT_LINK_URL_DESC');

				linkUrlWrap.append(linkUrlLabel, linkUrlInput, linkUrlHelp);

				const targetWrap = document.createElement('div');
				targetWrap.className = 'form-check com-decisiontree-result-link-target';

				const targetInput = document.createElement('input');
				targetInput.type = 'checkbox';
				targetInput.className = 'form-check-input';
				targetInput.id = `decisiontree-option-result-link-target-${index}`;
				targetInput.checked = resultLink.target_blank;

				const targetLabel = document.createElement('label');
				targetLabel.className = 'form-check-label';
				targetLabel.setAttribute('for', `decisiontree-option-result-link-target-${index}`);
				targetLabel.textContent = text('COM_DECISIONTREE_JS_RESULT_LINK_TARGET_BLANK_LABEL');

				targetWrap.append(targetInput, targetLabel);
				linkFields.append(linkTextWrap, linkUrlWrap, targetWrap);

				const updateResult = () => {
					setOptionResult(option, resultTextarea.value, {
						url: linkUrlInput.value.trim(),
						text: linkTextInput.value.trim(),
						target_blank: targetInput.checked,
					});
					syncTextarea();
				};

				linkTextInput.addEventListener('input', updateResult);
				linkUrlInput.addEventListener('input', updateResult);
				targetInput.addEventListener('change', updateResult);

				detailWrap.append(resultLabel, resultTextarea, linkFields);
			}
		};

		actionSelect.addEventListener('change', () => {
			renderActionDetail(true);
			syncTextarea();
		});

		renderActionDetail();

		const optionActions = document.createElement('div');
		optionActions.className = 'com-decisiontree-option-editor__actions';

		const duplicateButton = document.createElement('button');
		duplicateButton.type = 'button';
		duplicateButton.className = 'btn btn-secondary';
		duplicateButton.textContent = text('COM_DECISIONTREE_JS_DUPLICATE_OPTION');
		duplicateButton.addEventListener('click', () => {
			const question = getSelectedQuestion();

			if (!duplicateOptionInQuestion(question, index)) {
				return;
			}

			syncTextarea();
			renderQuestionEditor({
				focus: {
					index: index + 1,
				},
			});

			const copiedOptionText = document.getElementById(`decisiontree-option-${index + 1}`);

			if (copiedOptionText) {
				copiedOptionText.select();
			}
		});

		const removeButton = document.createElement('button');
		removeButton.type = 'button';
		removeButton.className = 'btn btn-outline-danger com-decisiontree-option-editor__remove-button';
		removeButton.textContent = text('COM_DECISIONTREE_JS_REMOVE_OPTION');
		removeButton.addEventListener('click', () => {
			const question = getSelectedQuestion();

			if (!question || !Array.isArray(question.options)) {
				return;
			}

			question.options.splice(index, 1);
			syncTextarea();
			renderQuestionEditor();
		});

		optionActions.append(duplicateButton, removeButton);
		topRow.append(textWrap, actionWrap, optionActions);
		body.append(topRow, detailWrap);
		card.append(header, body);

		return card;
	};

	const renderQuestionEditor = (state = {}) => {
		const {
			addOptionButton,
			deleteQuestionButton,
			duplicateQuestionButton,
			options,
			previewButton,
			questionSelect,
			questionText,
			setStartButton,
			showStepNumber,
		} = getEditorElements();

		if (
			!addOptionButton
			|| !deleteQuestionButton
			|| !duplicateQuestionButton
			|| !options
			|| !previewButton
			|| !questionSelect
			|| !questionText
			|| !setStartButton
			|| !showStepNumber
		) {
			return;
		}

		const optionsGroup = options.closest('.com-decisiontree-options-group');
		const existingOptionControls = optionsGroup ? optionsGroup.querySelector('.com-decisiontree-options-controls') : null;

		if (existingOptionControls) {
			existingOptionControls.remove();
		}

		options.replaceChildren();
		questionText.value = '';
		questionText.disabled = true;
		addOptionButton.disabled = true;
		deleteQuestionButton.disabled = true;
		duplicateQuestionButton.disabled = true;
		previewButton.disabled = true;
		setStartButton.disabled = true;
		showStepNumber.disabled = !editorTree;
		showStepNumber.checked = editorTree?.settings?.show_step_number === true;

		if (!hasQuestionsObject()) {
			populateQuestionSelect();
			setEditorMessage(text('COM_DECISIONTREE_JS_QUESTION_EDITOR_MISSING_QUESTIONS'));

			return;
		}

		const questionIds = getQuestionIds();

		if (questionIds.length === 0) {
			populateQuestionSelect();
			setEditorMessage(text('COM_DECISIONTREE_JS_QUESTION_EDITOR_EMPTY'));

			return;
		}

		populateQuestionSelect();

		const question = getSelectedQuestion();
		const selfReferencingOptions = getSelfReferencingOptions();

		if (!question) {
			setEditorMessage(text('COM_DECISIONTREE_JS_SELECT_QUESTION'));

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
		duplicateQuestionButton.disabled = false;
		previewButton.disabled = false;
		setStartButton.disabled = selectedQuestionId === editorTree.start;
		questionText.value = question.question_text || '';

		question.options.forEach((option, index) => {
			options.appendChild(renderOptionEditor(option, index, questionIds, selectedQuestionId));
		});

		const optionControls = document.createElement('div');
		optionControls.className = 'com-decisiontree-options-controls';

		const collapseAllButton = document.createElement('button');
		collapseAllButton.type = 'button';
		collapseAllButton.className = 'btn btn-sm btn-outline-secondary';
		collapseAllButton.textContent = text('COM_DECISIONTREE_JS_COLLAPSE_ALL_OPTIONS');
		collapseAllButton.setAttribute('aria-label', text('COM_DECISIONTREE_JS_COLLAPSE_ALL_OPTIONS'));
		collapseAllButton.title = text('COM_DECISIONTREE_JS_COLLAPSE_ALL_OPTIONS');
		collapseAllButton.disabled = question.options.length === 0;
		collapseAllButton.addEventListener('click', () => {
			question.options.forEach((item) => {
				getOptionUiState(item).collapsed = true;
			});
			renderQuestionEditor();
		});

		const expandAllButton = document.createElement('button');
		expandAllButton.type = 'button';
		expandAllButton.className = 'btn btn-sm btn-outline-secondary';
		expandAllButton.textContent = text('COM_DECISIONTREE_JS_EXPAND_ALL_OPTIONS');
		expandAllButton.setAttribute('aria-label', text('COM_DECISIONTREE_JS_EXPAND_ALL_OPTIONS'));
		expandAllButton.title = text('COM_DECISIONTREE_JS_EXPAND_ALL_OPTIONS');
		expandAllButton.disabled = question.options.length === 0;
		expandAllButton.addEventListener('click', () => {
			question.options.forEach((item) => {
				getOptionUiState(item).collapsed = false;
			});
			renderQuestionEditor();
		});

		optionControls.append(collapseAllButton, expandAllButton);

		if (optionsGroup) {
			optionsGroup.insertBefore(optionControls, options);
		}

		const focus = state && typeof state === 'object' ? state.focus : null;
		const focusIndex = Number.isInteger(focus?.index) ? focus.index : null;

		if (focusIndex !== null && focusIndex >= 0) {
			const controlId = focus.control === 'moveUp'
				? `decisiontree-option-move-up-${focusIndex}`
				: focus.control === 'moveDown'
					? `decisiontree-option-move-down-${focusIndex}`
					: focus.control === 'toggleCollapse'
						? `decisiontree-option-toggle-${focusIndex}`
					: `decisiontree-option-${focusIndex}`;
			const focusElement = document.getElementById(controlId);
			const fallbackElement = document.getElementById(`decisiontree-option-${focusIndex}`);
			const nextFocusElement = (
				focusElement
				&& 'disabled' in focusElement
				&& focusElement.disabled
				&& fallbackElement
			)
				? fallbackElement
				: focusElement || fallbackElement;

			if (nextFocusElement && typeof nextFocusElement.focus === 'function') {
				nextFocusElement.focus({ preventScroll: true });

				if (typeof nextFocusElement.scrollIntoView === 'function') {
					nextFocusElement.scrollIntoView({
						block: 'nearest',
						inline: 'nearest',
					});
				}
			}
		}

		const selectedQuestionSelfReferences = selfReferencingOptions.filter(
			(issue) => String(issue.questionId) === String(selectedQuestionId),
		);

		if (selectedQuestionSelfReferences.length > 0) {
			setEditorMessage(text('COM_DECISIONTREE_JS_NEXT_QUESTION_SELF_REFERENCE_WARNING'));
		}
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
			editorTree = normalizeEditorTree(JSON.parse(textarea.value));
			textarea.value = JSON.stringify(editorTree, null, 2);
			selectedQuestionId = hasQuestionsObject() && editorTree.questions[selectedQuestionId]
				? selectedQuestionId
				: editorTree.start || getQuestionIds()[0] || '';
			renderQuestionEditor();
			updatePathHealth();
		} catch (error) {
			editorTree = null;
			selectedQuestionId = '';
			renderQuestionEditor();
			setEditorMessage(text('COM_DECISIONTREE_JS_QUESTION_EDITOR_INVALID_JSON'));
		}
	};

	const initQuestionEditor = () => {
		const textarea = getJsonTextarea();
		const form = document.getElementById('tree-form');
		const {
			addOptionButton,
			addQuestionButton,
			deleteQuestionButton,
			duplicateQuestionButton,
			loadDemoButton,
			previewButton,
			questionSelect,
			questionText,
			setStartButton,
			showStepNumber,
		} = getEditorElements();

		if (
			!textarea
			|| !addOptionButton
			|| !addQuestionButton
			|| !deleteQuestionButton
			|| !duplicateQuestionButton
			|| !loadDemoButton
			|| !previewButton
			|| !questionSelect
			|| !questionText
			|| !setStartButton
			|| !showStepNumber
			|| !form
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
			populateQuestionSelect();
		});

		form.addEventListener('paste', (event) => {
			const target = event.target;

			if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
				return;
			}

			if (
				!target.closest('#decisiontree-question-editor')
				&& target.id !== 'jform_title'
				&& target.id !== 'jform_description'
			) {
				return;
			}

			const clipboardData = event.clipboardData || window.clipboardData;
			const pastedText = clipboardData?.getData('text/plain');

			if (typeof pastedText !== 'string' || pastedText === '') {
				return;
			}

			event.preventDefault();
			insertTextAtCursor(target, trimPastedText(pastedText));
		});

		addQuestionButton.addEventListener('click', () => {
			if (!editorTree || typeof editorTree !== 'object' || Array.isArray(editorTree)) {
				editorTree = {
					version: '1.1',
					start: 'q1',
					settings: {
						show_step_number: false,
					},
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
			normalizeEditorTree(editorTree);
			syncTextarea();
			renderQuestionEditor();
		});

		duplicateQuestionButton.addEventListener('click', () => {
			if (!duplicateSelectedQuestion()) {
				return;
			}

			syncTextarea();
			renderQuestionEditor();
			questionText.focus({ preventScroll: true });
			questionText.scrollIntoView({ block: 'nearest', inline: 'nearest' });
			questionText.select();
		});

		previewButton.addEventListener('click', openPreview);

		showStepNumber.addEventListener('change', () => {
			if (!editorTree || typeof editorTree !== 'object' || Array.isArray(editorTree)) {
				return;
			}

			if (!editorTree.settings || typeof editorTree.settings !== 'object' || Array.isArray(editorTree.settings)) {
				editorTree.settings = {};
			}

			editorTree.settings.show_step_number = showStepNumber.checked;
			editorTree.version = '1.1';
			syncTextarea();
		});

		loadDemoButton.addEventListener('click', () => {
			if (textarea.value.trim() !== '' && !window.confirm(text('COM_DECISIONTREE_JS_LOAD_DEMO_CONFIRM'))) {
				return;
			}

			editorTree = cloneDemoTree();
			selectedQuestionId = editorTree.start;
			syncTextarea();
			renderQuestionEditor();
		});

		deleteQuestionButton.addEventListener('click', () => {
			if (!hasQuestionsObject() || !selectedQuestionId || selectedQuestionId === editorTree.start) {
				return;
			}

			const referenceCount = countNextReferences(selectedQuestionId);
			const warning = referenceCount > 0
				? sprintf('COM_DECISIONTREE_JS_DELETE_QUESTION_REFERENCED_CONFIRM', selectedQuestionId, referenceCount)
				: sprintf('COM_DECISIONTREE_JS_DELETE_QUESTION_CONFIRM', selectedQuestionId);

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

		addOptionButton.addEventListener('click', (event) => {
			event.preventDefault();

			const question = getSelectedQuestion();

			if (!question) {
				return;
			}

			if (!Array.isArray(question.options)) {
				question.options = [];
			}

			const newOptionIndex = question.options.length;
			question.options.push({
				id: getNewOptionId(question),
				text: '',
				result: {
					text: '',
				},
			});
			syncTextarea();
			renderQuestionEditor();

			const optionInput = document.getElementById(`decisiontree-option-${newOptionIndex}`);

			if (optionInput instanceof HTMLInputElement) {
				optionInput.focus({ preventScroll: true });
				optionInput.scrollIntoView({ block: 'nearest', inline: 'nearest' });
				optionInput.select();
			}
		});

		form.addEventListener('submit', (event) => {
			const analysis = analyseTreePaths();

			if (analysis.errors.length === 0) {
				return;
			}

			event.preventDefault();
			const firstIssue = analysis.errors[0];
			selectedQuestionId = firstIssue.questionId || selectedQuestionId;
			renderQuestionEditor();
			setEditorMessage(firstIssue.message);
		});

		textarea.addEventListener('change', loadEditorFromTextarea);
		loadEditorFromTextarea();
	};

	const initAdmin = () => {
		initQuestionEditor();
	};
	const initAdminAfterDeferredExtensions = () => {
		window.setTimeout(initAdmin, 0);
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initAdminAfterDeferredExtensions, { once: true });
	} else {
		initAdminAfterDeferredExtensions();
	}
})();
