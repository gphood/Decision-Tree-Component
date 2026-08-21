(() => {
	'use strict';

	const text = (key) => (
		window.Joomla && Joomla.Text ? Joomla.Text._(key, key) : key
	);

	const fallbackCopy = (value) => {
		const textarea = document.createElement('textarea');
		textarea.value = value;
		textarea.setAttribute('readonly', '');
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);
		textarea.select();
		const copied = document.execCommand('copy');
		textarea.remove();

		if (!copied) {
			throw new Error('Clipboard copy failed.');
		}
	};

	const copyText = async (value) => {
		if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
			try {
				await Promise.race([
					navigator.clipboard.writeText(value),
					new Promise((resolve, reject) => {
						window.setTimeout(() => reject(new Error('Clipboard copy timed out.')), 750);
					}),
				]);

				return;
			} catch (error) {
				fallbackCopy(value);

				return;
			}
		}

		fallbackCopy(value);
	};

	document.addEventListener('click', async (event) => {
		const eventTarget = event.target;

		if (!(eventTarget instanceof Element)) {
			return;
		}

		const button = eventTarget.closest('[data-decisiontree-copy-embed]');

		if (!(button instanceof HTMLButtonElement)) {
			return;
		}

		const label = button.querySelector('[data-decisiontree-copy-label]');
		const originalLabel = label?.textContent || '';
		button.dataset.copyState = 'pending';

		try {
			await copyText(button.dataset.embedTag || '');
			button.dataset.copyState = 'success';
			if (label) {
				label.textContent = text('COM_DECISIONTREE_EMBED_TAG_COPIED');
			}
		} catch (error) {
			button.dataset.copyState = 'error';
			if (label) {
				label.textContent = text('COM_DECISIONTREE_EMBED_TAG_COPY_FAILED');
			}
		}

		window.setTimeout(() => {
			delete button.dataset.copyState;
			if (label) {
				label.textContent = originalLabel;
			}
		}, 2000);
	});
})();
