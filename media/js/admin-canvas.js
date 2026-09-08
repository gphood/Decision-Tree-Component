(() => {
	'use strict';

	const text = (key) => (
		window.Joomla && Joomla.Text ? Joomla.Text._(key, key) : key
	);
	const sprintf = (key, ...values) => values.reduce(
		(output, value) => output.replace(/%s|%d/, value),
		text(key),
	);
	const svgNamespace = 'http://www.w3.org/2000/svg';
	const minimumScale = 0.35;
	const maximumScale = 1.8;
	const questionSize = { width: 270, height: 160 };
	const outcomeSize = { width: 238, height: 154 };
	const missingSize = { width: 238, height: 92 };
	const viewStorageKey = 'com_decisiontree.builderView';
	const scrollStorageKey = 'com_decisiontree.builderScroll';
	const scrollStorageLifetime = 2 * 60 * 1000;
	let bridge = null;
	let elements = null;
	let graph = { nodes: [], edges: [] };
	let positions = {};
	let scale = 1;
	let offset = { x: 20, y: 20 };
	let selectedNodeId = '';
	let initialized = false;
	let hasOpenedCanvas = false;
	let lastDragFinishedAt = 0;
	let activeIssuePopover = null;
	let pendingScrollPosition = null;

	const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
	const getSavedView = () => {
		try {
			const savedView = window.sessionStorage.getItem(viewStorageKey);

			return savedView === 'canvas' ? 'canvas' : 'form';
		} catch (error) {
			return 'form';
		}
	};
	const saveView = (view) => {
		try {
			window.sessionStorage.setItem(viewStorageKey, view);
		} catch (error) {
			// The editor still works when browser storage is unavailable.
		}
	};
	const getScrollPosition = () => {
		const canvasView = document.getElementById('decisiontree-canvas-view');
		const anchor = canvasView && !canvasView.hidden
			? canvasView
			: document.getElementById('decisiontree-form-view');

		return {
			anchorId: anchor?.id || '',
			anchorTop: anchor?.getBoundingClientRect().top ?? null,
			canvasViewport: {
				offset: { ...offset },
				scale,
			},
			timestamp: Date.now(),
			x: window.scrollX,
			y: window.scrollY,
		};
	};
	const saveScrollPosition = (position = getScrollPosition()) => {
		try {
			window.sessionStorage.setItem(scrollStorageKey, JSON.stringify(position));
		} catch (error) {
			// The editor still works when browser storage is unavailable.
		}
	};
	const readSavedPosition = () => {
		let savedPosition = null;

		try {
			const storedPosition = window.sessionStorage.getItem(scrollStorageKey);
			window.sessionStorage.removeItem(scrollStorageKey);

			if (storedPosition) {
				savedPosition = JSON.parse(storedPosition);
			}
		} catch (error) {
			return null;
		}

		if (
			!savedPosition
			|| !Number.isFinite(savedPosition.x)
			|| !Number.isFinite(savedPosition.y)
			|| !Number.isFinite(savedPosition.timestamp)
			|| Date.now() - savedPosition.timestamp > scrollStorageLifetime
		) {
			return null;
		}

		return savedPosition;
	};
	const restoreCanvasViewport = (savedPosition) => {
		const savedViewport = savedPosition?.canvasViewport;

		if (
			!savedViewport
			|| !Number.isFinite(savedViewport.scale)
			|| !Number.isFinite(savedViewport.offset?.x)
			|| !Number.isFinite(savedViewport.offset?.y)
		) {
			return false;
		}

		scale = clamp(savedViewport.scale, minimumScale, maximumScale);
		offset = {
			x: savedViewport.offset.x,
			y: savedViewport.offset.y,
		};

		return true;
	};
	const restoreScrollPosition = (savedPosition) => {
		if (!savedPosition) {
			return;
		}

		window.requestAnimationFrame(() => {
			window.requestAnimationFrame(() => {
				const anchor = savedPosition.anchorId
					? document.getElementById(savedPosition.anchorId)
					: null;
				const targetY = anchor && Number.isFinite(savedPosition.anchorTop)
					? window.scrollY + anchor.getBoundingClientRect().top - savedPosition.anchorTop
					: savedPosition.y;

				window.scrollTo(savedPosition.x, targetY);
			});
		});
	};
	const initScrollPersistence = () => {
		const form = document.getElementById('tree-form');

		if (!(form instanceof HTMLFormElement)) {
			return;
		}

		const captureForApply = (task) => {
			if (task === 'tree.apply') {
				pendingScrollPosition = getScrollPosition();
			}
		};
		const saveForApply = () => {
			const task = form.querySelector('input[name="task"]')?.value || '';

			if (pendingScrollPosition || task === 'tree.apply') {
				saveScrollPosition(pendingScrollPosition || getScrollPosition());
			}
		};

		form.addEventListener('submit', (event) => {
			if (!event.defaultPrevented) {
				captureForApply(form.querySelector('input[name="task"]')?.value || '');
			}
		});

		if (typeof window.Joomla?.submitbutton === 'function') {
			const submitButton = window.Joomla.submitbutton;

			window.Joomla.submitbutton = function decisionTreeSubmitButton(task, ...args) {
				captureForApply(task);

				return submitButton.call(this, task, ...args);
			};
		}

		window.addEventListener('pagehide', saveForApply, { once: true });
	};
	const normaliseText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
	const truncate = (value, maximumLength) => {
		const output = normaliseText(value);

		if (output.length <= maximumLength) {
			return output;
		}

		return `${output.slice(0, maximumLength - 3).trimEnd()}...`;
	};
	const getNodeSize = (node) => {
		if (node.type === 'outcome') {
			return outcomeSize;
		}

		if (node.type === 'missing') {
			return missingSize;
		}

		return questionSize;
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
	const getResultPreview = (result) => {
		if (typeof result === 'string' || typeof result === 'number') {
			return normaliseText(result);
		}

		if (Array.isArray(result)) {
			for (const block of result) {
				if (!block || typeof block !== 'object') {
					continue;
				}

				const value = block.text || block.content || block.heading || block.title || block.alt || block.caption;

				if (normaliseText(value) !== '') {
					return normaliseText(value);
				}
			}

			return '';
		}

		if (result && typeof result === 'object') {
			const richBlockPreview = Array.isArray(result.blocks) ? getResultPreview(result.blocks) : '';

			return richBlockPreview || normaliseText(result.text || result.content || result.heading || result.title);
		}

		return '';
	};
	const getSavedPositions = (tree) => {
		const saved = tree?.layout?.canvas?.positions;

		if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
			return {};
		}

		return Object.fromEntries(Object.entries(saved).flatMap(([nodeId, position]) => {
			const x = Number(position?.x);
			const y = Number(position?.y);

			return Number.isFinite(x) && Number.isFinite(y)
				? [[nodeId, { x: Math.max(20, x), y: Math.max(20, y) }]]
				: [];
		}));
	};

	const buildGraph = (tree, validation = { errors: [], warnings: [] }) => {
		const questions = tree?.questions && typeof tree.questions === 'object' && !Array.isArray(tree.questions)
			? tree.questions
			: {};
		const questionIds = Object.keys(questions);
		const questionIdSet = new Set(questionIds);
		const validationErrors = Array.isArray(validation?.errors) ? validation.errors : [];
		const validationWarnings = Array.isArray(validation?.warnings) ? validation.warnings : [];
		const reachable = new Set();
		const pending = questionIdSet.has(String(tree?.start || '')) ? [String(tree.start)] : [];

		while (pending.length > 0) {
			const questionId = pending.shift();

			if (reachable.has(questionId)) {
				continue;
			}

			reachable.add(questionId);
			const options = Array.isArray(questions[questionId]?.options) ? questions[questionId].options : [];

			options.forEach((option) => {
				const nextQuestionId = normaliseText(option?.next);

				if (questionIdSet.has(nextQuestionId) && !reachable.has(nextQuestionId)) {
					pending.push(nextQuestionId);
				}
			});
		}

		const nodes = questionIds.map((questionId) => {
			const question = questions[questionId] || {};
			const options = Array.isArray(question.options) ? question.options : [];
			const errors = validationErrors.filter((item) => String(item?.questionId) === questionId);
			const warnings = validationWarnings.filter((item) => String(item?.questionId) === questionId);
			let issue = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : '';

			if (issue === '' && options.length === 0) {
				issue = 'warning';
			} else if (issue === '' && options.some((option) => {
				const hasNext = normaliseText(option?.next) !== '';
				const hasResult = option && Object.prototype.hasOwnProperty.call(option, 'result') && resultHasContent(option.result);

				return hasNext === hasResult || (hasNext && !questionIdSet.has(normaliseText(option.next)));
			})) {
				issue = 'error';
			} else if (issue === '' && !reachable.has(questionId)) {
				issue = 'warning';
			}

			return {
				id: questionId,
				type: 'question',
				title: normaliseText(question.question_text) || text('COM_DECISIONTREE_CANVAS_UNTITLED_QUESTION'),
				meta: sprintf('COM_DECISIONTREE_CANVAS_OPTION_COUNT', options.length),
				isStart: questionId === String(tree?.start || ''),
				issue,
				issueMessages: [...errors, ...warnings].map((item) => item.message).filter(Boolean),
			};
		});
		const nodeIds = new Set(nodes.map((node) => node.id));
		const edges = [];

		questionIds.forEach((questionId) => {
			const options = Array.isArray(questions[questionId]?.options) ? questions[questionId].options : [];

			options.forEach((option, optionIndex) => {
				const nextQuestionId = normaliseText(option?.next);
				const hasResult = option && Object.prototype.hasOwnProperty.call(option, 'result') && resultHasContent(option.result);
				const optionKey = normaliseText(option?.id) || `option${optionIndex + 1}`;
				const edgeId = `${questionId}:${optionKey}`;
				const label = truncate(option?.text || sprintf('COM_DECISIONTREE_JS_OPTION_HEADING', optionIndex + 1), 34);

				if (nextQuestionId !== '') {
					let targetId = nextQuestionId;

					if (!questionIdSet.has(nextQuestionId)) {
						targetId = `missing:${nextQuestionId}`;

						if (!nodeIds.has(targetId)) {
							const sourceTitle = normaliseText(questions[questionId]?.question_text)
								|| text('COM_DECISIONTREE_CANVAS_UNTITLED_QUESTION');
							nodes.push({
								id: targetId,
								type: 'missing',
								title: sprintf('COM_DECISIONTREE_CANVAS_MISSING_QUESTION', nextQuestionId),
								meta: text('COM_DECISIONTREE_CANVAS_BROKEN_CONNECTION'),
								issue: 'error',
								issueMessages: [sprintf('COM_DECISIONTREE_CANVAS_NEXT_QUESTION_MISSING', sourceTitle)],
							});
							nodeIds.add(targetId);
						}
					}

					edges.push({
						id: edgeId,
						source: questionId,
						target: targetId,
						label,
						issue: targetId.startsWith('missing:') || hasResult ? 'error' : '',
					});

					return;
				}

				if (!hasResult) {
					return;
				}

				const outcomeId = `outcome:${questionId}:${optionKey}`;
				nodes.push({
					id: outcomeId,
					type: 'outcome',
					title: getResultPreview(option.result) || text('COM_DECISIONTREE_CANVAS_OUTCOME_FALLBACK'),
					meta: label,
					optionId: optionKey,
					optionIndex,
					parentQuestionId: questionId,
					result: option.result,
				});
				nodeIds.add(outcomeId);
				edges.push({
					id: edgeId,
					source: questionId,
					target: outcomeId,
					label,
					issue: '',
				});
			});
		});

		return { nodes, edges };
	};

	const createAutomaticPositions = (tree, currentGraph) => {
		const levels = {};
		const startId = String(tree?.start || '');
		const pending = currentGraph.nodes.some((node) => node.id === startId) ? [startId] : [];
		levels[startId] = 0;

		while (pending.length > 0) {
			const sourceId = pending.shift();
			const sourceLevel = levels[sourceId] || 0;

			currentGraph.edges.filter((edge) => edge.source === sourceId).forEach((edge) => {
				if (levels[edge.target] === undefined || levels[edge.target] > sourceLevel + 1) {
					levels[edge.target] = sourceLevel + 1;
					if (!edge.target.startsWith('outcome:') && !edge.target.startsWith('missing:')) {
						pending.push(edge.target);
					}
				}
			});
		}

		const knownLevels = Object.values(levels).filter(Number.isFinite);
		let fallbackLevel = knownLevels.length > 0 ? Math.max(...knownLevels) + 1 : 0;

		currentGraph.nodes.forEach((node) => {
			if (levels[node.id] === undefined) {
				levels[node.id] = fallbackLevel;
			}
		});

		const layers = new Map();

		currentGraph.nodes.forEach((node) => {
			const level = levels[node.id] || 0;

			if (!layers.has(level)) {
				layers.set(level, []);
			}

			layers.get(level).push(node);
		});

		const automaticPositions = {};

		[...layers.entries()].sort(([levelA], [levelB]) => levelA - levelB).forEach(([level, nodes]) => {
			nodes.sort((nodeA, nodeB) => {
				const typeOrder = { question: 0, outcome: 1, missing: 2 };

				return (typeOrder[nodeA.type] || 0) - (typeOrder[nodeB.type] || 0);
			});
			nodes.forEach((node, index) => {
				automaticPositions[node.id] = {
					x: 70 + (level * 360),
				y: 55 + (index * 206),
				};
			});
		});

		return automaticPositions;
	};

	const getGraphBounds = () => {
		if (graph.nodes.length === 0) {
			return { minX: 0, minY: 0, maxX: 800, maxY: 500, width: 800, height: 500 };
		}

		const bounds = graph.nodes.reduce((output, node) => {
			const position = positions[node.id] || { x: 20, y: 20 };
			const size = getNodeSize(node);

			return {
				minX: Math.min(output.minX, position.x),
				minY: Math.min(output.minY, position.y),
				maxX: Math.max(output.maxX, position.x + size.width),
				maxY: Math.max(output.maxY, position.y + size.height),
			};
		}, {
			minX: Number.POSITIVE_INFINITY,
			minY: Number.POSITIVE_INFINITY,
			maxX: 0,
			maxY: 0,
		});

		return {
			...bounds,
			width: Math.max(1, bounds.maxX - bounds.minX),
			height: Math.max(1, bounds.maxY - bounds.minY),
		};
	};

	const updateTransform = () => {
		if (!elements?.stage) {
			return;
		}

		elements.stage.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;
		elements.zoom.textContent = `${Math.round(scale * 100)}%`;
	};
	const updateStageSize = () => {
		const bounds = getGraphBounds();
		const width = Math.max(1000, bounds.maxX + 180);
		const height = Math.max(620, bounds.maxY + 160);

		elements.stage.style.width = `${width}px`;
		elements.stage.style.height = `${height}px`;
		elements.edges.setAttribute('width', String(width));
		elements.edges.setAttribute('height', String(height));
		elements.edges.setAttribute('viewBox', `0 0 ${width} ${height}`);
	};

	const createSvgElement = (name, attributes = {}) => {
		const element = document.createElementNS(svgNamespace, name);

		Object.entries(attributes).forEach(([attribute, value]) => element.setAttribute(attribute, String(value)));

		return element;
	};
	const drawEdges = () => {
		if (!elements?.edges) {
			return;
		}

		elements.edges.replaceChildren();
		const definitions = createSvgElement('defs');
		const marker = createSvgElement('marker', {
			id: 'decisiontree-canvas-arrow',
			markerWidth: 8,
			markerHeight: 8,
			refX: 7,
			refY: 4,
			orient: 'auto',
			markerUnits: 'strokeWidth',
		});
		marker.appendChild(createSvgElement('path', { d: 'M 0 0 L 8 4 L 0 8 z' }));
		definitions.appendChild(marker);
		elements.edges.appendChild(definitions);
		const nodesById = Object.fromEntries(graph.nodes.map((node) => [node.id, node]));

		graph.edges.forEach((edge) => {
			const sourceNode = nodesById[edge.source];
			const targetNode = nodesById[edge.target];

			if (!sourceNode || !targetNode || !positions[edge.source] || !positions[edge.target]) {
				return;
			}

			const sourcePosition = positions[edge.source];
			const targetPosition = positions[edge.target];
			const sourceSize = getNodeSize(sourceNode);
			const targetSize = getNodeSize(targetNode);
			const source = {
				x: sourcePosition.x + sourceSize.width,
				y: sourcePosition.y + (sourceSize.height / 2),
			};
			const target = {
				x: targetPosition.x,
				y: targetPosition.y + (targetSize.height / 2),
			};
			const horizontalDistance = Math.max(70, Math.abs(target.x - source.x) * 0.48);
			const direction = target.x >= source.x ? 1 : -1;
			const pathData = `M ${source.x} ${source.y} C ${source.x + (horizontalDistance * direction)} ${source.y}, ${target.x - (horizontalDistance * direction)} ${target.y}, ${target.x} ${target.y}`;
			const path = createSvgElement('path', {
				d: pathData,
				class: `com-decisiontree-canvas-edge${edge.issue ? ` is-${edge.issue}` : ''}`,
				'marker-end': 'url(#decisiontree-canvas-arrow)',
			});
			elements.edges.appendChild(path);

			if (edge.label !== '') {
				const label = createSvgElement('text', {
					x: (source.x + target.x) / 2,
					y: ((source.y + target.y) / 2) - 8,
					class: 'com-decisiontree-canvas-edge-label',
					'text-anchor': 'middle',
				});
				label.textContent = edge.label;
				elements.edges.appendChild(label);
			}
		});
	};

	const persistPositions = () => {
		const tree = bridge?.getTree();

		if (!tree || typeof tree !== 'object') {
			return;
		}

		if (!tree.layout || typeof tree.layout !== 'object' || Array.isArray(tree.layout)) {
			tree.layout = {};
		}

		if (!tree.layout.canvas || typeof tree.layout.canvas !== 'object' || Array.isArray(tree.layout.canvas)) {
			tree.layout.canvas = {};
		}

		tree.layout.canvas.positions = Object.fromEntries(graph.nodes.map((node) => {
			const position = positions[node.id] || { x: 20, y: 20 };

			return [node.id, {
				x: Math.round(position.x),
				y: Math.round(position.y),
			}];
		}));
		bridge.sync();
	};
	const updateNodeElementPosition = (nodeId) => {
		const nodeElement = [...elements.nodes.children].find((item) => item.dataset.nodeId === nodeId);
		const position = positions[nodeId];

		if (!nodeElement || !position) {
			return;
		}

		nodeElement.style.left = `${position.x}px`;
		nodeElement.style.top = `${position.y}px`;
	};
	const moveNode = (nodeId, x, y, persist = false) => {
		positions[nodeId] = {
			x: Math.max(20, x),
			y: Math.max(20, y),
		};
		updateNodeElementPosition(nodeId);
		updateStageSize();
		drawEdges();

		if (persist) {
			persistPositions();
		}
	};
	const selectNode = (nodeId) => {
		selectedNodeId = nodeId;
		[...elements.nodes.children].forEach((nodeElement) => {
			nodeElement.classList.toggle('is-selected', nodeElement.dataset.nodeId === nodeId);
		});
	};
	const hideIssuePopover = () => {
		if (!activeIssuePopover) {
			return;
		}

		activeIssuePopover.trigger.removeAttribute('aria-describedby');
		activeIssuePopover.trigger.setAttribute('aria-expanded', 'false');
		activeIssuePopover.element.remove();
		activeIssuePopover = null;
	};
	const showIssuePopover = (trigger, heading, message, severity = 'warning') => {
		if (activeIssuePopover?.trigger === trigger) {
			hideIssuePopover();
			return;
		}

		hideIssuePopover();
		const popover = document.createElement('div');
		const popoverId = `decisiontree-canvas-issue-${Date.now()}`;
		popover.className = `alert alert-${severity === 'error' ? 'danger' : 'warning'} show mb-0 com-decisiontree-canvas-issue-popover`;
		popover.id = popoverId;
		popover.setAttribute('role', 'tooltip');
		popover.style.position = 'absolute';
		popover.style.zIndex = '20';

		const title = document.createElement('strong');
		title.className = 'com-decisiontree-canvas-issue-popover__title';
		title.textContent = heading;
		const content = document.createElement('span');
		content.textContent = message;
		popover.append(title, content);
		elements.viewport.appendChild(popover);

		const triggerRect = trigger.getBoundingClientRect();
		const viewportRect = elements.viewport.getBoundingClientRect();
		const popoverRect = popover.getBoundingClientRect();
		const margin = 12;
		const left = clamp(
			triggerRect.right - viewportRect.left - popoverRect.width,
			margin,
			Math.max(margin, viewportRect.width - popoverRect.width - margin),
		);
		let top = triggerRect.top - viewportRect.top - popoverRect.height - 9;

		if (top < margin) {
			top = triggerRect.bottom - viewportRect.top + 9;
		}

		popover.style.left = `${Math.round(left)}px`;
		popover.style.top = `${Math.round(top)}px`;
		trigger.setAttribute('aria-describedby', popoverId);
		trigger.setAttribute('aria-expanded', 'true');
		activeIssuePopover = { element: popover, trigger };
		window.setTimeout(() => {
			document.addEventListener('pointerdown', (event) => {
				if (!popover.contains(event.target) && event.target !== trigger) {
					hideIssuePopover();
				}
			}, { once: true });
		}, 0);
	};
	const focusOutcomeEditor = (optionId, optionIndex) => {
		const optionCards = [...elements.questionPanel.querySelectorAll('.com-decisiontree-option-editor')];
		const optionCard = optionCards.find((card) => card.dataset.optionId === String(optionId || ''))
			|| (Number.isInteger(optionIndex) ? optionCards[optionIndex] : null);

		if (!optionCard) {
			return;
		}

		const detail = optionCard.querySelector('.com-decisiontree-option-editor__detail');
		const focusTarget = detail?.querySelector('.com-decisiontree-rich-blocks__fallback[open] textarea')
			|| detail?.querySelector('.com-decisiontree-rich-block select:not(:disabled)')
			|| detail?.querySelector('.com-decisiontree-rich-block textarea:not(:disabled)')
			|| detail?.querySelector('.com-decisiontree-rich-block input:not([type="hidden"]):not(:disabled)')
			|| detail?.querySelector('.com-decisiontree-rich-blocks__add')
			|| detail?.querySelector('textarea:not(:disabled), input:not([type="hidden"]):not(:disabled), select:not(:disabled), button:not(:disabled)');

		if (!focusTarget) {
			return;
		}

		focusTarget.focus({ preventScroll: true });
		focusTarget.scrollIntoView({ block: 'center', inline: 'nearest' });
	};
	const editQuestion = (questionId, target = {}) => {
		if (!questionId) {
			return;
		}

		const isOutcome = target.mode === 'outcome';
		const selected = isOutcome
			? bridge.selectOutcome?.(questionId, target.optionId, target.optionIndex)
			: bridge.selectQuestion(questionId);

		if (!selected) {
			return;
		}

		const returnNodeId = target.nodeId || questionId;
		selectNode(returnNodeId);
		elements.questionModalTitle.textContent = text(isOutcome
			? 'COM_DECISIONTREE_CANVAS_OUTCOME_MODAL_HEADING'
			: 'COM_DECISIONTREE_CANVAS_QUESTION_MODAL_HEADING');
		elements.questionModalHelp.textContent = text(isOutcome
			? 'COM_DECISIONTREE_CANVAS_OUTCOME_MODAL_HELP'
			: 'COM_DECISIONTREE_CANVAS_QUESTION_MODAL_HELP');
		const focusEditor = () => {
			if (isOutcome) {
				focusOutcomeEditor(target.optionId, target.optionIndex);

				return;
			}

			const questionText = document.getElementById('decisiontree-question-text');
			questionText?.focus({ preventScroll: true });
			questionText?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
			questionText?.select();
		};

		if (!window.bootstrap?.Modal || !elements.questionModal || !elements.questionPanel) {
			setView('form');
			window.requestAnimationFrame(focusEditor);

			return;
		}

		elements.questionModalBody.appendChild(elements.questionPanel);
		const modal = window.bootstrap.Modal.getOrCreateInstance(elements.questionModal);
		const restoreQuestionPanel = () => {
			elements.questionPanelHome.appendChild(elements.questionPanel);
			renderCanvas();
			window.requestAnimationFrame(() => {
				const editButton = [...elements.nodes.children]
					.find((item) => item.dataset.nodeId === returnNodeId)
					?.querySelector(isOutcome
						? '.com-decisiontree-canvas-node__edit-outcome'
						: '.com-decisiontree-canvas-node__edit');

				editButton?.focus({ preventScroll: true });
			});
		};

		elements.questionModal.addEventListener('hidden.bs.modal', restoreQuestionPanel, { once: true });
		elements.questionModal.addEventListener('shown.bs.modal', () => {
			window.requestAnimationFrame(focusEditor);
		}, { once: true });
		modal.show();
	};
	const createNodeActionButton = ({ className = '', disabled = false, iconClass = '', label, symbol = '', onClick }) => {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = `btn btn-sm ${className} com-decisiontree-canvas-node__action`;
		button.disabled = disabled;

		if (iconClass !== '') {
			const icon = document.createElement('span');
			icon.className = iconClass;
			icon.setAttribute('aria-hidden', 'true');
			button.appendChild(icon);
		} else {
			button.textContent = symbol;
		}

		button.title = label;
		button.setAttribute('aria-label', label);
		button.addEventListener('click', (event) => {
			event.stopPropagation();
			onClick(button);
		});

		return button;
	};

	const createNodeElement = (node) => {
		const nodeElement = document.createElement('article');
		const size = getNodeSize(node);
		const position = positions[node.id] || { x: 20, y: 20 };
		nodeElement.className = `com-decisiontree-canvas-node is-${node.type}${node.issue ? ` has-${node.issue}` : ''}`;
		nodeElement.dataset.nodeId = node.id;
		nodeElement.tabIndex = 0;
		nodeElement.style.left = `${position.x}px`;
		nodeElement.style.top = `${position.y}px`;
		nodeElement.style.width = `${size.width}px`;
		nodeElement.style.height = `${size.height}px`;
		nodeElement.setAttribute('aria-label', node.type === 'question'
			? sprintf('COM_DECISIONTREE_CANVAS_QUESTION_ARIA', node.title)
			: node.title);

		const header = document.createElement('header');
		header.className = 'com-decisiontree-canvas-node__header';
		const type = document.createElement('span');
		type.className = 'com-decisiontree-canvas-node__type';
		type.textContent = node.type === 'question'
			? text('COM_DECISIONTREE_CANVAS_QUESTION')
			: node.type === 'outcome'
				? text('COM_DECISIONTREE_CANVAS_OUTCOME')
				: text('COM_DECISIONTREE_CANVAS_ERROR');
		header.appendChild(type);

		if (node.isStart) {
			const start = document.createElement('span');
			start.className = 'badge bg-success';
			start.textContent = text('COM_DECISIONTREE_CANVAS_START');
			header.appendChild(start);
		}

		if (node.issue) {
			const issueMessages = Array.isArray(node.issueMessages) ? [...new Set(node.issueMessages)] : [];
			const issue = document.createElement(issueMessages.length > 0 ? 'button' : 'span');
			issue.className = `com-decisiontree-canvas-node__issue is-${node.issue}`;
			const issueLabel = node.issue === 'error'
				? text('COM_DECISIONTREE_CANVAS_ERROR')
				: text('COM_DECISIONTREE_CANVAS_WARNING');
			issue.textContent = issueLabel;

			if (issue instanceof HTMLButtonElement) {
				const issueText = issueMessages.join(' ');
				issue.type = 'button';
				issue.title = issueText;
				issue.setAttribute('aria-label', `${issueLabel}: ${issueText}`);
				issue.setAttribute('aria-expanded', 'false');
				issue.addEventListener('click', (event) => {
					event.stopPropagation();
					showIssuePopover(issue, issueLabel, issueText, node.issue);
				});
				issue.addEventListener('keydown', (event) => {
					if (event.key === 'Escape') {
						event.preventDefault();
						hideIssuePopover();
					}
				});
			}

			header.appendChild(issue);
		}

		const title = document.createElement('div');
		title.className = 'com-decisiontree-canvas-node__title';
		title.textContent = truncate(node.title, node.type === 'question' ? 88 : 74);
		title.title = node.title;
		const meta = document.createElement('div');
		meta.className = 'com-decisiontree-canvas-node__meta';
		meta.textContent = node.meta || '';
		nodeElement.append(header, title, meta);
		const extensionActions = Array.isArray(node.extensionActions) ? node.extensionActions : [];

		if (node.type === 'question' || node.type === 'outcome' || extensionActions.length > 0) {
			const actions = document.createElement('div');
			actions.className = 'com-decisiontree-canvas-node__actions';
			actions.setAttribute('role', 'group');
			actions.setAttribute('aria-label', node.type === 'question'
				? sprintf('COM_DECISIONTREE_CANVAS_QUESTION_ACTIONS', node.title)
				: sprintf('COM_DECISIONTREE_CANVAS_OUTCOME_ACTIONS', node.title));

			if (node.type === 'question') {
				const editButton = document.createElement('button');
				editButton.type = 'button';
				editButton.className = 'btn btn-sm btn-outline-primary com-decisiontree-canvas-node__edit';
				editButton.textContent = text('COM_DECISIONTREE_CANVAS_EDIT_QUESTION');
				editButton.addEventListener('click', (event) => {
					event.stopPropagation();
					editQuestion(node.id);
				});
				const duplicateButton = createNodeActionButton({
					className: 'btn-outline-secondary is-duplicate',
					label: text('COM_DECISIONTREE_BUTTON_DUPLICATE_QUESTION'),
					symbol: '⧉',
					onClick: () => {
						const copyId = bridge.duplicateQuestion(node.id);

						if (!copyId) {
							return;
						}

						selectedNodeId = copyId;
						renderCanvas({ fit: true });
						editQuestion(copyId);
					},
				});
				const startButton = createNodeActionButton({
					className: 'btn-outline-secondary is-start',
					disabled: node.isStart,
					label: text('COM_DECISIONTREE_BUTTON_SET_START_QUESTION'),
					symbol: '★',
					onClick: () => {
						if (!bridge.setStartQuestion(node.id)) {
							return;
						}

						selectedNodeId = node.id;
						renderCanvas();
					},
				});
				const deleteButton = createNodeActionButton({
					className: 'btn-outline-danger is-delete',
					disabled: node.isStart,
					label: text('COM_DECISIONTREE_BUTTON_DELETE_QUESTION'),
					symbol: '×',
					onClick: () => {
						if (!bridge.deleteQuestion(node.id)) {
							return;
						}

						selectedNodeId = bridge.getSelectedQuestionId() || '';
						renderCanvas();
					},
				});
				actions.append(editButton, duplicateButton, startButton, deleteButton);
			} else if (node.type === 'outcome') {
				const editOutcomeButton = document.createElement('button');
				editOutcomeButton.type = 'button';
				editOutcomeButton.className = 'btn btn-sm btn-outline-primary com-decisiontree-canvas-node__edit com-decisiontree-canvas-node__edit-outcome';
				editOutcomeButton.textContent = text('COM_DECISIONTREE_CANVAS_EDIT_OUTCOME');
				editOutcomeButton.addEventListener('click', (event) => {
					event.stopPropagation();
					editQuestion(node.parentQuestionId, {
						mode: 'outcome',
						nodeId: node.id,
						optionId: node.optionId,
						optionIndex: node.optionIndex,
					});
				});
				actions.appendChild(editOutcomeButton);
			}

			extensionActions.forEach((action) => {
				if (!action || typeof action.onClick !== 'function') {
					return;
				}

				actions.appendChild(createNodeActionButton(action));
			});
			nodeElement.appendChild(actions);
		}

		nodeElement.addEventListener('click', () => selectNode(node.id));
		nodeElement.addEventListener('dblclick', () => {
			if (node.type === 'question' && Date.now() - lastDragFinishedAt > 300) {
				editQuestion(node.id);
			}
		});
		nodeElement.addEventListener('keydown', (event) => {
			if (event.target.closest('button')) {
				return;
			}

			if (event.key === 'Enter' && node.type === 'question') {
				event.preventDefault();
				editQuestion(node.id);
				return;
			}

			const movements = {
				ArrowLeft: [-1, 0],
				ArrowRight: [1, 0],
				ArrowUp: [0, -1],
				ArrowDown: [0, 1],
			};

			if (!movements[event.key]) {
				return;
			}

			event.preventDefault();
			const distance = event.shiftKey ? 40 : 10;
			const [horizontal, vertical] = movements[event.key];
			const current = positions[node.id] || { x: 20, y: 20 };
			moveNode(node.id, current.x + (horizontal * distance), current.y + (vertical * distance), true);
		});
		nodeElement.addEventListener('pointerdown', (event) => {
			if (event.button !== 0 || event.target.closest('button')) {
				return;
			}

			event.preventDefault();
			selectNode(node.id);
			nodeElement.classList.add('is-dragging');
			nodeElement.setPointerCapture(event.pointerId);
			const startPosition = { ...(positions[node.id] || { x: 20, y: 20 }) };
			const startPointer = { x: event.clientX, y: event.clientY };
			let moved = false;

			const handleMove = (moveEvent) => {
				const deltaX = (moveEvent.clientX - startPointer.x) / scale;
				const deltaY = (moveEvent.clientY - startPointer.y) / scale;

				if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
					moved = true;
				}

				moveNode(node.id, startPosition.x + deltaX, startPosition.y + deltaY);
			};
			const handleUp = () => {
				nodeElement.classList.remove('is-dragging');
				nodeElement.removeEventListener('pointermove', handleMove);
				nodeElement.removeEventListener('pointerup', handleUp);
				nodeElement.removeEventListener('pointercancel', handleUp);

				if (moved) {
					lastDragFinishedAt = Date.now();
					persistPositions();
				}
			};

			nodeElement.addEventListener('pointermove', handleMove);
			nodeElement.addEventListener('pointerup', handleUp);
			nodeElement.addEventListener('pointercancel', handleUp);
		});

		return nodeElement;
	};

	const fitCanvas = () => {
		const viewportWidth = elements.viewport.clientWidth;
		const viewportHeight = elements.viewport.clientHeight;

		if (viewportWidth <= 0 || viewportHeight <= 0 || graph.nodes.length === 0) {
			return;
		}

		const bounds = getGraphBounds();
		const padding = 70;
		scale = clamp(Math.min(
			(viewportWidth - padding) / bounds.width,
			(viewportHeight - padding) / bounds.height,
		), minimumScale, 1.35);
		offset = {
			x: ((viewportWidth - (bounds.width * scale)) / 2) - (bounds.minX * scale),
			y: ((viewportHeight - (bounds.height * scale)) / 2) - (bounds.minY * scale),
		};
		updateTransform();
	};
	const positionCanvasAtTopLeft = () => {
		if (graph.nodes.length === 0) {
			fitCanvas();
			return;
		}

		const viewportWidth = elements.viewport.clientWidth;
		const bounds = getGraphBounds();
		scale = viewportWidth < 900 ? 0.72 : 0.9;
		offset = {
			x: 45 - (bounds.minX * scale),
			y: 45 - (bounds.minY * scale),
		};
		updateTransform();
	};
	const setScale = (nextScale) => {
		scale = clamp(nextScale, minimumScale, maximumScale);
		updateTransform();
	};

	const renderCanvas = ({ fit = false, initialPosition = false, automatic = false } = {}) => {
		const tree = bridge?.getTree();
		const validation = typeof bridge?.analyseTree === 'function' ? bridge.analyseTree() : null;
		hideIssuePopover();
		graph = buildGraph(tree, validation);
		graph.nodes.forEach((node) => {
			node.extensionActions = [];

			if (typeof window.DecisionTreeCanvasExtensions?.getNodeActions !== 'function') {
				return;
			}

			try {
				node.extensionActions = window.DecisionTreeCanvasExtensions.getNodeActions({
					bridge,
					node,
					text,
				}) || [];
			} catch (error) {
				console.error('Decision Tree canvas extension failed.', error);
			}
		});
		elements.nodes.replaceChildren();
		elements.empty.hidden = graph.nodes.length > 0;
		elements.stage.hidden = graph.nodes.length === 0;

		if (graph.nodes.length === 0) {
			elements.edges.replaceChildren();
			return;
		}

		const automaticPositions = createAutomaticPositions(tree, graph);
		positions = automatic
			? automaticPositions
			: { ...automaticPositions, ...getSavedPositions(tree) };
		graph.nodes.forEach((node) => elements.nodes.appendChild(createNodeElement(node)));
		updateStageSize();
		drawEdges();
		selectNode(selectedNodeId || bridge.getSelectedQuestionId() || String(tree?.start || ''));

		if (automatic) {
			persistPositions();
		}

		if (initialPosition) {
			window.requestAnimationFrame(positionCanvasAtTopLeft);
		} else if (fit) {
			window.requestAnimationFrame(fitCanvas);
		} else {
			updateTransform();
		}
	};

	const setView = (view, { persist = true } = {}) => {
		const showCanvas = view === 'canvas';
		elements.formView.hidden = showCanvas;
		elements.canvasView.hidden = !showCanvas;
		elements.formButton.classList.toggle('active', !showCanvas);
		elements.canvasButton.classList.toggle('active', showCanvas);
		elements.formButton.setAttribute('aria-pressed', String(!showCanvas));
		elements.canvasButton.setAttribute('aria-pressed', String(showCanvas));

		if (persist) {
			saveView(showCanvas ? 'canvas' : 'form');
		}

		if (showCanvas) {
			renderCanvas({ initialPosition: !hasOpenedCanvas });
			hasOpenedCanvas = true;
		}
	};

	const initPanning = () => {
		elements.viewport.addEventListener('pointerdown', (event) => {
			if (event.button !== 0 || event.target.closest('.com-decisiontree-canvas-node')) {
				return;
			}

			elements.viewport.classList.add('is-panning');
			elements.viewport.setPointerCapture(event.pointerId);
			const startPointer = { x: event.clientX, y: event.clientY };
			const startOffset = { ...offset };
			const handleMove = (moveEvent) => {
				offset = {
					x: startOffset.x + moveEvent.clientX - startPointer.x,
					y: startOffset.y + moveEvent.clientY - startPointer.y,
				};
				updateTransform();
			};
			const handleUp = () => {
				elements.viewport.classList.remove('is-panning');
				elements.viewport.removeEventListener('pointermove', handleMove);
				elements.viewport.removeEventListener('pointerup', handleUp);
				elements.viewport.removeEventListener('pointercancel', handleUp);
			};

			elements.viewport.addEventListener('pointermove', handleMove);
			elements.viewport.addEventListener('pointerup', handleUp);
			elements.viewport.addEventListener('pointercancel', handleUp);
		});
		elements.viewport.addEventListener('wheel', (event) => {
			if (!event.ctrlKey && !event.metaKey) {
				return;
			}

			event.preventDefault();
			setScale(scale + (event.deltaY < 0 ? 0.1 : -0.1));
		}, { passive: false });
	};

	const init = (editorBridge) => {
		if (initialized || !editorBridge) {
			return;
		}

		bridge = editorBridge;
		elements = {
			autoLayout: document.getElementById('decisiontree-canvas-auto-layout'),
			addQuestion: document.getElementById('decisiontree-canvas-add-question'),
			canvasButton: document.getElementById('decisiontree-canvas-view-button'),
			canvasView: document.getElementById('decisiontree-canvas-view'),
			edges: document.getElementById('decisiontree-canvas-edges'),
			empty: document.getElementById('decisiontree-canvas-empty'),
			fit: document.getElementById('decisiontree-canvas-fit'),
			formButton: document.getElementById('decisiontree-form-view-button'),
			formView: document.getElementById('decisiontree-form-view'),
			nodes: document.getElementById('decisiontree-canvas-nodes'),
			questionModal: document.getElementById('decisiontree-question-modal'),
			questionModalBody: document.getElementById('decisiontree-question-modal-body'),
			questionModalHelp: document.querySelector('.com-decisiontree-question-modal__help'),
			questionModalTitle: document.getElementById('decisiontree-question-modal-title'),
			questionPanel: document.getElementById('decisiontree-selected-question-panel'),
			questionPanelHome: document.getElementById('decisiontree-selected-question-home'),
			stage: document.getElementById('decisiontree-canvas-stage'),
			viewport: document.getElementById('decisiontree-canvas-viewport'),
			zoom: document.getElementById('decisiontree-canvas-zoom'),
			zoomIn: document.getElementById('decisiontree-canvas-zoom-in'),
			zoomOut: document.getElementById('decisiontree-canvas-zoom-out'),
		};

		if (Object.values(elements).some((element) => !element)) {
			return;
		}

		initialized = true;
		elements.formButton.addEventListener('click', () => setView('form'));
		elements.canvasButton.addEventListener('click', () => setView('canvas'));
		elements.fit.addEventListener('click', fitCanvas);
		elements.zoomIn.addEventListener('click', () => setScale(scale + 0.15));
		elements.zoomOut.addEventListener('click', () => setScale(scale - 0.15));
		elements.autoLayout.addEventListener('click', () => renderCanvas({ automatic: true, fit: true }));
		elements.addQuestion.addEventListener('click', () => {
			const questionId = bridge.addQuestion();
			selectedNodeId = questionId || selectedNodeId;
			renderCanvas({ fit: false });

			if (questionId) {
				editQuestion(questionId);
			}
		});
		initPanning();
		initScrollPersistence();
		const savedPosition = readSavedPosition();
		const savedView = getSavedView();

		if (savedView === 'canvas' && restoreCanvasViewport(savedPosition)) {
			hasOpenedCanvas = true;
		}

		setView(savedView, { persist: false });
		restoreScrollPosition(savedPosition);
	};

	window.DecisionTreeCanvas = Object.assign(window.DecisionTreeCanvas || {}, { init });
})();
