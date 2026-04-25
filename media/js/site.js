(() => {
	'use strict';

	document.querySelectorAll('.com-decisiontree').forEach((tree) => {
		const data = tree.querySelector('script[type="application/json"]');

		if (!data) {
			return;
		}

		try {
			tree.decisionTreeData = JSON.parse(data.textContent || '{}');
		} catch (error) {
			tree.decisionTreeData = {};
		}
	});
})();
