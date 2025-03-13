from bs4 import BeautifulSoup
import pandas as pd
from tabulate import tabulate
import os

def get_bigpoint_products_from_local():
    # Path to the local HTML file
    file_path = "source-2.html"
    
    # Check if the file exists
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found in the current directory.")
        return []
    
    # Read the HTML content from the file
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            html_content = file.read()
    except Exception as e:
        print(f"Error reading the file: {e}")
        return []
    
    # Parse the HTML content
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Find all product items
    product_items = soup.find_all("div", class_="product-item")
    
    products_list = []
    
    for item in product_items:
        # Check if product is out of stock using multiple methods
        
        # Method 1: Check for product-out-of-stock class
        out_of_stock_div = item.find("div", class_="product-out-of-stock")
        
        # Method 2: Check for stock-off class in stock indicator
        stock_indicator = item.find("a", class_="stock-off")
        
        # Method 3: Check for passive icon
        passive_icon = item.find("i", class_="stock-in-icon passive")
        
        # Skip this product if any out-of-stock indicator is found
        if out_of_stock_div or stock_indicator or passive_icon:
            continue
        
        # Get product name
        product_name = item.find("h3", class_="product-title")
        if product_name:
            product_name = product_name.text.strip()
        else:
            product_name = "N/A"
        
        # Get product price
        price_element = item.find("a", class_="product-basket")
        price = "N/A"
        if price_element and 'data-price' in price_element.attrs:
            price = price_element['data-price']
        
        # Get product image URL
        img_element = item.find("img", class_="product-image")
        img_url = img_element['src'] if img_element else "N/A"
        
        # Get product link
        link_element = item.find("a", href=True)
        link = link_element['href'] if link_element else "N/A"
        
        # Add to products list
        products_list.append({
            "Name": product_name,
            "Price (TL)": price,
            "Image URL": img_url,
            "Link": link
        })
    
    return products_list

def display_products_table(products):
    if not products:
        print("No Bigpoint products found or all products are out of stock.")
        return
    
    # Create a DataFrame
    df = pd.DataFrame(products)
    
    # Display as a table
    print("\n=== BIGPOINT PRODUCTS (IN STOCK) ===\n")
    print(tabulate(df, headers="keys", tablefmt="grid", showindex=False))
    print(f"\nTotal products found: {len(products)}")

if __name__ == "__main__":
    print("Reading Bigpoint products from local file 'source-2.html'...")
    products = get_bigpoint_products_from_local()
    display_products_table(products)
    
    # Optionally save to CSV
    if products:
        df = pd.DataFrame(products)
        df.to_csv("bigpoint_products.csv", index=False)
        print("Results saved to bigpoint_products.csv")
