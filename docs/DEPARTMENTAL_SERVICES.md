# Departmental services (patient intake)

The enrollment **Department** and **Sub-category** fields are defined in code:

- `services/departmentalServicesCatalog.ts` — canonical list (`DEPARTMENTAL_SERVICES`)
- Stored on the patient as `department_service_id` and `department_subcategory_id` (Supabase)

## PDF copy

To produce a printable departmental services list for staff (similar to other project PDFs), generate a PDF from this file:

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
