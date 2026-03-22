# Inventory reference: Nila Pharmaceuticals layout

This folder includes a **reference screenshot** (not affiliated with MamaSafe) showing a professional **price list** layout used by many pharmacies and distributors—**Nila Pharmaceuticals Ltd.** style: branded header, boxed facility details, and a clear **three-column table** (code, product description, numeric column).

## Why this is in docs

Clinics and pharmacies use this as a **visual guide** when:

- Setting up **stock lists** and reorder points
- Aligning **exported PDFs** from MamaSafe with a layout staff already recognize
- Training staff on **CODE + PRODUCT + quantity/price** style reporting

## Files

| File | Purpose |
|------|---------|
| [assets/nila-pharmaceuticals-price-list-reference.png](./assets/nila-pharmaceuticals-price-list-reference.png) | Reference image (sample “PRICE LIST” layout) |

The same image is copied to `public/inventory-reference/` so the **Inventory** screen in the app can display it beside your live stock table.

## How MamaSafe maps to this layout

| Reference column | MamaSafe inventory export |
|------------------|-----------------------------|
| CODE | Short code derived from inventory row id |
| PRODUCT | Item name and unit |
| Price / numeric column | **Current stock** and **min level** (for restocking), not trade price—unless you extend the schema |

Your **Download PDF** on the Stock & inventory page uses the same **header + bordered table** idea so printed lists stay familiar to pharmacy and clinic teams.

## Disclaimer

The reference image is **example layout only**. Product names, codes, and prices in the screenshot belong to the original document’s publisher. MamaSafe does not claim affiliation with Nila Pharmaceuticals Ltd.
