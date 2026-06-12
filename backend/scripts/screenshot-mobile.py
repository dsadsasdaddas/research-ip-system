"""渲染移动端/桌面端截图,展示响应式布局。"""
import os
from playwright.sync_api import sync_playwright

OUT = r"D:\research-ip-system\docs\screenshots"
os.makedirs(OUT, exist_ok=True)
URL = "http://localhost:5173"


def login(page):
    page.goto(f"{URL}/login", wait_until="domcontentloaded")
    page.wait_for_selector('input[placeholder="用户名"]', timeout=15000)
    page.fill('input[placeholder="用户名"]', "admin")
    page.fill('input[type="password"]', "Admin@123")
    page.click("button.el-button--primary")
    page.wait_for_url("**/papers", timeout=15000)
    page.wait_for_timeout(1500)  # 等表格/数据渲染


def shoot(ctx, path_hash, full_page):
    page = ctx.new_page()
    login(page)
    # 论文管理(默认页):响应式工具条 + 表格 + 分页
    page.wait_for_timeout(800)
    page.screenshot(path=os.path.join(OUT, f"{path_hash}-papers.png"), full_page=full_page)
    # 统计看板:响应式卡片网格 + ECharts
    page.goto(f"{URL}/dashboard", wait_until="domcontentloaded")
    page.wait_for_timeout(2500)  # 等 ECharts canvas 渲染
    page.screenshot(path=os.path.join(OUT, f"{path_hash}-dashboard.png"), full_page=full_page)
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # 移动端:iPhone X 画像
    mobile = browser.new_context(
        viewport={"width": 375, "height": 812},
        device_scale_factor=2,
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        is_mobile=True,
        has_touch=True,
    )
    shoot(mobile, "mobile", full_page=True)

    # 桌面端
    desktop = browser.new_context(viewport={"width": 1440, "height": 900})
    shoot(desktop, "desktop", full_page=False)

    browser.close()

print("done")
for f in sorted(os.listdir(OUT)):
    fp = os.path.join(OUT, f)
    print(f"  {f}  ({os.path.getsize(fp)//1024} KB)")
