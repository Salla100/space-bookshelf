Sync Space Vault products from Notion to data/products.json.

Steps:
1. Check that `node_modules` exists in the space-vault directory. If not, run `npm install` first.
2. Run `npm run sync` from the space-vault directory.
3. Read the script output and report back clearly:
   - How many total items are now in products.json
   - Any newly added items (list them)
   - Any items still missing images (list them with a tip on how to add the image URL in Notion)
   - Any items still missing affiliate links (list them)
4. Ask if the user wants to commit and push the updated products.json to GitHub.
