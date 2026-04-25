// @ts-check

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
	testDir: './tests/e2e',
	timeout: 30000,
	expect: {
		timeout: 10000,
	},
	use: {
		baseURL: process.env.DECISIONTREE_FRONTEND_BASE_URL || 'https://dev.docker',
		ignoreHTTPSErrors: true,
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
});
