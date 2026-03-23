# Inventory reference: Price list layout sample

This folder includes a **reference screenshot** (and a full PDF price list) showing a professional **price list** layout commonly used by pharmacies and distributors.

It is included to help teams keep the same **code + product + numeric columns** feel when updating stock and when exporting MamaSafe inventory to PDF for audits/reorder sheets.

## Files

| File | Purpose |
|---|---|
| [assets/price-list-layout-reference.png](./assets/price-list-layout-reference.png) | Reference image (sample “PRICE LIST” layout) |
| [COMPREHENSIVE_PRICE_LIST_2023.pdf](./COMPREHENSIVE_PRICE_LIST_2023.pdf) | Full comprehensive price list PDF (2023) — use for reconciling product names/codes when maintaining your stock sheet |

The same image/PDF are also available under `public/inventory-reference/` so the in-app **Inventory** page can open them in a new tab.

## How MamaSafe maps to this layout

| Reference column | MamaSafe inventory export |
|---|---|
| CODE | Short code derived from inventory row id |
| PRODUCT | Item name and unit |
| Numeric column | **Current stock** and **min level** (for restocking), not trade price (unless you extend the schema) |

Your **Download PDF** on the Stock & inventory page uses the same header + bordered table idea so printed lists stay familiar to pharmacy and clinic teams.

## Disclaimer

This is provided as an example layout and reconciliation aid. The product names/codes/prices inside the reference content belong to the original document’s publisher. MamaSafe does not claim affiliation with the referenced supplier.

