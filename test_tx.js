const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.text().includes('TX_UPDATE') || msg.text().includes('Message delivered')) {
            console.log('BROWSER:', msg.text());
        }
    });

    try {
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

        // Wait for Message Panel
        await page.waitForSelector('textarea');
        await page.fill('textarea', 'Test payload from automated script');

        // Click Transmit
        const submitBtn = await page.evaluateHandle(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.find(b => b.textContent.includes('Transmit'));
        });

        if (submitBtn) {
            await submitBtn.click();
            console.log('Clicked transmit...');

            // Wait for 3 seconds to see the logs
            await page.waitForTimeout(3000);

            // Extract the TX queue item texts
            const items = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('div')).filter(d => {
                    const html = d.innerHTML;
                    return html.includes('Test payload from automated script');
                });
                return rows.map(r => r.innerText);
            });
            console.log('TX Queue Items Rendered:', items);
        } else {
            console.log('Could not find transmit button');
        }
    } catch (e) {
        console.error('Test error:', e);
    } finally {
        await browser.close();
    }
})();
