from playwright.sync_api import sync_playwright

logs = []
errors = []

def handle_console(msg):
    if msg.type == 'error':
        errors.append(msg.text)
    else:
        logs.append(f"[{msg.type}] {msg.text}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    page.on('console', handle_console)

    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')

    print(f"Console logs captured: {len(logs)}")
    for log in logs[-10:]:
        print(f"  {log}")

    if errors:
        print(f"\nErrors ({len(errors)}):")
        for err in errors:
            print(f"  {err}")

    page.evaluate('console.log("Page title:", document.title)')
    page.evaluate('console.log("Product count:", document.querySelectorAll(".product-card").length)')

    browser.close()
