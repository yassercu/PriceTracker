from playwright.sync_api import sync_playwright
import os

html_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'index.html'))
file_url = f'file://{html_path}'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto(file_url)
    page.wait_for_load_state('networkidle')

    page.screenshot(path='/tmp/static_screenshot.png', full_page=True)
    print(f"Screenshot saved. Page title: {page.title()}")

    product_list = page.locator('#productsList')
    children = product_list.locator('> *').all()
    print(f"Products container has {len(children)} child elements")

    sort_select = page.locator('#sortSelect')
    options = sort_select.locator('option').all()
    for opt in options:
        print(f"  Sort option: {opt.inner_text()} (value={opt.get_attribute('value')})")

    browser.close()
