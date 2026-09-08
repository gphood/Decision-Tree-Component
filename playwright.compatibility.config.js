const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
	testDir: './tests/compatibility',
	workers: 1,
	retries: 0,
	timeout: 240000,
	expect: { timeout: 15000 },
	use: {
		...devices['Desktop Chrome'],
		actionTimeout: 15000,
		navigationTimeout: 30000,
		ignoreHTTPSErrors: true,
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
});
