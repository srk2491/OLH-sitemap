import json
import time
import difflib
import os

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from webdriver_manager.chrome import ChromeDriverManager


# -----------------------------
# LOAD SITES REFERENCE DATA
# -----------------------------

sites_path = os.path.join('data', 'sites.json')

try:
    with open(sites_path, 'r', encoding='utf-8') as f:
        sites_reference = json.load(f)
except FileNotFoundError:
    print("sites.json not found")
    sites_reference = []


def get_matched_english_name(kannada_name):

    if not sites_reference:
        return f"Unknown ({kannada_name})"

    ref_names = [item['grama_name_kn'] for item in sites_reference]

    matches = difflib.get_close_matches(kannada_name, ref_names, n=1, cutoff=0.6)

    if matches:
        matched_kn = matches[0]

        for item in sites_reference:
            if item['grama_name_kn'] == matched_kn:
                return item['grama_name_en']

    return f"Unknown ({kannada_name})"


# -----------------------------
# SETUP HEADLESS CHROME
# -----------------------------

chrome_options = Options()

chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--remote-debugging-port=9222")

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=chrome_options
)

driver.set_page_load_timeout(300)

wait = WebDriverWait(driver, 20)


def scrape_sub_table():

    rows = []

    idx = 0

    while True:

        try:

            loc_id = f"grdLocationwise_LinkButton1_{idx}"

            location_el = WebDriverWait(driver, 3).until(
                EC.presence_of_element_located((By.ID, loc_id))
            )

            original_kn_name = location_el.text

            english_name = get_matched_english_name(original_kn_name)

            row = {
                "location_kn": original_kn_name,
                "location_en": english_name,
                "SC flats": driver.find_element(By.ID, f"grdLocationwise_lbPublic_SC_Available_{idx}").text,
                "GEN flats": driver.find_element(By.ID, f"grdLocationwise_lblPublic_Gen_Available_{idx}").text,
                "Min Flats": driver.find_element(By.ID, f"grdLocationwise_lblPublic_Mino_Available_{idx}").text,
                "Total": driver.find_element(By.ID, f"grdLocationwise_lblPublic_Total_Available_{idx}").text
            }

            rows.append(row)

            idx += 1

        except:
            break

    return rows


try:

    url = "https://ashraya.karnataka.gov.in/cm_selection_flat/frmConstwise_Report_Available.aspx"

    for attempt in range(3):

        try:

            print(f"Opening website (attempt {attempt+1})")

            driver.get(url)

            break

        except Exception as e:

            print("Page load failed, retrying...")

            time.sleep(10)

            if attempt == 2:
                raise e


    all_master_data = []

    main_links = driver.find_elements(By.XPATH, '//a[contains(@id,"grdConstwise_LinkButton1_")]')

    main_count = len(main_links)

    for i in range(main_count):

        link = wait.until(
            EC.element_to_be_clickable((By.ID, f"grdConstwise_LinkButton1_{i}"))
        )

        category_name = link.text

        print("Scraping:", category_name)

        link.click()

        time.sleep(2)

        table_data = scrape_sub_table()

        all_master_data.append({
            "category_name": category_name,
            "data": table_data
        })

        driver.back()

        wait.until(
            EC.presence_of_element_located((By.ID, "grdConstwise_LinkButton1_0"))
        )

    with open('ashraya_master_report.json', 'w', encoding='utf-8') as f:

        json.dump(all_master_data, f, ensure_ascii=False, indent=4)

    print("Scraping completed successfully")


finally:

    driver.quit()