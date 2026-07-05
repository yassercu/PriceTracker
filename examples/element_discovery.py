from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')

    buttons = page.locator('button').all()
    links = page.locator('a').all()
    inputs = page.locator('input, select, textarea').all()

    print(f"Found {len(buttons)} buttons:")
    for btn in buttons:
        print(f"  - <button> text='{btn.inner_text().strip()}' id='{btn.get_attribute('id') or ''}'")

    print(f"\nFound {len(inputs)} inputs:")
    for inp in inputs:
        name = inp.get_attribute('id') or inp.get_attribute('name') or ''
        placeholder = inp.get_attribute('placeholder') or ''
        print(f"  - <input> id='{name}' placeholder='{placeholder}'")

    print(f"\nPage title: {page.title()}")
    print(f"URL: {page.url}")

    browser.close()
