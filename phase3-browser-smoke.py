"""Production navigation regression. Build, run Vite preview, then execute this file.
Requires Python Playwright and Chromium. All external requests are blocked.
"""
import asyncio
import json
import os
from urllib.parse import urlsplit
from playwright.async_api import async_playwright

BASE = os.environ.get('GAME_PREVIEW_URL', 'http://127.0.0.1:3001')

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
            args=['--no-sandbox', '--no-proxy-server'],
        )
        page = await browser.new_page(viewport={'width': 1280, 'height': 900})
        errors, chunks = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda response: chunks.append(response.url) if '/assets/' in response.url and '.js' in response.url else None)
        async def route(request):
            if urlsplit(request.request.url).netloc == urlsplit(BASE).netloc:
                await request.continue_()
            else:
                await request.abort()
        await page.route('**/*', route)
        response = await page.goto(BASE, wait_until='networkidle')
        assert response.status == 200
        await page.wait_for_function("document.querySelector('main')?.innerText.trim().length > 20")
        # Seed this isolated browser's save so the existing empty-gallery return
        # does not hide the gallery rendering checks.
        await page.evaluate('''() => new Promise((resolve, reject) => {
            const request = indexedDB.open('CineTechVault', 4);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const database = request.result;
                const transaction = database.transaction('cards', 'readwrite');
                transaction.objectStore('cards').put({
                    id: 'phase3-fixture', name: 'Regression Character', faction: 'CyberCore',
                    element: 'Fire', role: 'Striker', cardClass: 'N', level: 1,
                    hp: 1000, attack: 100, defense: 0, speed: 100, timestamp: 1,
                    lore: 'Offline test fixture', gender: 'Female', universe: 'Test',
                    imageUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
                });
                transaction.oncomplete = () => { database.close(); resolve(); };
                transaction.onabort = () => reject(transaction.error);
            };
        })''')
        chunks.clear()
        await page.reload(wait_until='networkidle')
        await page.wait_for_function("document.querySelector('main')?.innerText.trim().length > 20")
        initial_chunks = list(chunks)
        assert not any('CombatView-' in url or 'ForgeTabView-' in url for url in chunks), 'Inactive heavy views loaded at startup'
        buttons = page.locator('nav button')
        labels = [label for label in await buttons.all_text_contents() if label.strip() not in ['SỔ TAY', 'CÀI ĐẶT']]
        assert len(labels) == 14, labels
        visited = []
        previous = await page.locator('main').inner_text()
        for index, label in enumerate(labels):
            await buttons.nth(index).click()
            await page.wait_for_timeout(350)  # Existing tab transition lasts 200ms.
            try:
                await page.wait_for_function(
                    "previous => { const text = document.querySelector('main')?.innerText.trim(); return text?.length > 20 && text !== previous; }",
                    arg=previous, timeout=10000,
                )
            except Exception:
                print(json.dumps({'failed_tab': label, 'main_text': await page.locator('main').inner_text(), 'errors': errors, 'chunks': chunks}, ensure_ascii=False))
                raise
            previous = await page.locator('main').inner_text()
            visited.append(label.strip())
        # Revisit cached tabs without fetching the lazy module a second time.
        before_revisit = len(chunks)
        await buttons.nth(3).click()
        await page.wait_for_timeout(350)
        await page.wait_for_function("document.querySelector('main')?.innerText.trim().length > 20")
        assert len(chunks) == before_revisit, 'Previously loaded tab fetched again'
        assert not errors, errors
        assert any('CombatView-' in url for url in chunks)
        assert any('ForgeTabView-' in url for url in chunks)
        print(json.dumps({'http': response.status, 'tabs_rendered': visited, 'initial_js_chunks': len(initial_chunks), 'js_chunks_after_navigation': len(chunks), 'revisit_cached': True, 'page_errors': errors}, ensure_ascii=False, indent=2))
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
