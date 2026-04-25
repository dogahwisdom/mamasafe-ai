# Departmental services (patient intake)

The enrollment **Department** and **Sub-category** fields are defined in code:

- `services/departmentalServicesCatalog.ts` — canonical list (`DEPARTMENTAL_SERVICES`)
- Stored on the patient as `department_service_id` and `department_subcategory_id` (Supabase)

## PDF copy

If your facility keeps a branded departmental services PDF in the repo (for example `docs/Departmental Services.pdf`), keep it alongside this markdown; the **in-app** intake list is driven by `departmentalServicesCatalog.ts`, which should stay aligned with that document.

To produce a printable list from this markdown (similar to other project PDFs), run:

```bash
cd /path/to/mamasafe-ai
pandoc docs/DEPARTMENTAL_SERVICES.md -o docs/DEPARTMENTAL_SERVICES.pdf \
  -V geometry:margin=1in \
  -V fontsize=11pt
```

See [PDF_GENERATION.md](./PDF_GENERATION.md) for tooling options.

## Departments (summary)

| Department | Example sub-categories |
|------------|-------------------------|
| Reception & triage | Registration & intake, Emergency triage |
| Outpatient (OPD) | General clinic, Chronic review, Pediatric, ENT & eye |
| Maternity & reproductive health | ANC, PNC, Labour & delivery, Family planning |
| Laboratory | Haematology, Microbiology, Other investigations |
| Pharmacy | Dispensing, PMTCT |
| Radiology / imaging | Ultrasound, X-ray / CT |
| Mental health | Counselling, Support groups |
| TB & HIV care | TB clinic, HIV / CCC |
| Other / specialist | General specialist |

ANC (Antenatal care) uses the pregnancy-specific enrollment step (LMP, gestational age, etc.). Other streams use visit/diagnosis date.
