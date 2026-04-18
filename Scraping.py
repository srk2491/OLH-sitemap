import json
import time
import difflib
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# --- STEP 1: LOAD REFERENCE DATA FROM SUBFOLDER ---
# Using os.path.join for cross-platform compatibility (Windows/Mac/Linux)
sites_path = os.path.join('data', 'sites.json')

try:
    with open(sites_path, 'r', encoding='utf-8') as f:
        sites_reference = json.load(f)
except FileNotFoundError:
    print(f"Error: Could not find {sites_path}. Please ensure the 'data' folder exists.")
    sites_reference = []

def get_matched_english_name(kannada_name_from_web):
    """Matches scraped Kannada name to sites.json and returns the English name."""
    if not sites_reference:
        return f"Unknown ({kannada_name_from_web})"

    # Create a list of all Kannada names from sites.json for comparison
    ref_kannada_names = [item['grama_name_kn'] for item in sites_reference]
    
    # Fuzzy matching to handle vowel length differences (e.g., ಆನೇಕಲ್ vs ಅನೆಕಲ್)
    matches = difflib.get_close_matches(kannada_name_from_web, ref_kannada_names, n=1, cutoff=0.6)
    
    if matches:
        matched_kn = matches[0]
        # Find the specific entry to extract the 'grama_name_en'
        for item in sites_reference:
            if item['grama_name_kn'] == matched_kn:
                return item['grama_name_en']
    
    return f"Unknown ({kannada_name_from_web})"

# --- STEP 2: SCRAPER SETUP ---
driver = webdriver.Chrome()
wait = WebDriverWait(driver, 15)

def scrape_sub_table():
    rows = []
    idx = 0
    while True:
        try:
            # Anchor element for each row
            loc_id = f"grdLocationwise_LinkButton1_{idx}"
            location_el = WebDriverWait(driver, 3).until(EC.presence_of_element_located((By.ID, loc_id)))
            
            original_kn_name = location_el.text
            # Synchronize with sites.json
            english_name = get_matched_english_name(original_kn_name)
            
            row_entry = {
                "location_kn": original_kn_name,
                "location_en": english_name, 
                "SC flats": driver.find_element(By.ID, f"grdLocationwise_lbPublic_SC_Available_{idx}").text,
                "GEN flats": driver.find_element(By.ID, f"grdLocationwise_lblPublic_Gen_Available_{idx}").text,
                "Min Flats": driver.find_element(By.ID, f"grdLocationwise_lblPublic_Mino_Available_{idx}").text,
                "Total": driver.find_element(By.ID, f"grdLocationwise_lblPublic_Total_Available_{idx}").text
            }
            rows.append(row_entry)
            idx += 1
        except Exception:
            break
    return rows

# --- STEP 3: MAIN EXECUTION ---
try:
    driver.get("https://ashraya.karnataka.gov.in/cm_selection_flat/frmConstwise_Report_Available.aspx")
    all_master_data = []
    
    # Identify all main LinkButtons
    main_links = driver.find_elements(By.XPATH, '//a[contains(@id, "grdConstwise_LinkButton1_")]')
    main_links_count = len(main_links)

    for i in range(main_links_count):
        # Re-fetch link to avoid stale elements
        link = wait.until(EC.element_to_be_clickable((By.ID, f"grdConstwise_LinkButton1_{i}")))
        category_name = link.text
        print(f"Scraping category: {category_name}")
        link.click()
        
        # Scrape the horizontal data for this category
        table_data = scrape_sub_table()
        
        all_master_data.append({
            "category_name": category_name,
            "data": table_data
        })
        
        # Return to main list
        driver.back()
        wait.until(EC.presence_of_element_located((By.ID, "grdConstwise_LinkButton1_0")))

    # Save final synchronized report
    with open('ashraya_master_report.json', 'w', encoding='utf-8') as f:
        json.dump(all_master_data, f, ensure_ascii=False, indent=4)
    
    print("\nSuccess! Report saved as ashraya_master_report.json using names from data/sites.json")

finally:
    driver.quit()