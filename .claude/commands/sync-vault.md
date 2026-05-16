Sync Space Vault products from Notion to data/products.json.

Steps:
1. Run `python sync/sync.py` from the space-vault directory.
2. Read the output and report back clearly:
   - How many total items are now in products.json
   - Any newly added items (list them with category)
   - Any items still missing images — remind user to paste the image URL in the Notion "Image URL" column (right-click Amazon product image → Copy image address)
   - Any items still missing affiliate links — remind user to generate via Amazon Associates SiteStripe
3. If products.json changed, ask if the user wants to commit and push to GitHub.
