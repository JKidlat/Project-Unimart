"""
Canonical Ghanaian Tertiary Institution Directory (67 Institutions)
and idempotent database reconciliation helpers.
"""

from django.db import transaction

CATEGORY_PUBLIC = "Public Universities"
CATEGORY_TECHNICAL = "Public Technical Universities"
CATEGORY_PRIVATE = "Private Universities and University Colleges"

UNIVERSITY_CATEGORY_CHOICES = [
    (CATEGORY_PUBLIC, CATEGORY_PUBLIC),
    (CATEGORY_TECHNICAL, CATEGORY_TECHNICAL),
    (CATEGORY_PRIVATE, CATEGORY_PRIVATE),
]

CANONICAL_UNIVERSITIES = [
    # A. PUBLIC UNIVERSITIES (1-17)
    {"name": "University of Ghana", "short_name": "UG", "category": CATEGORY_PUBLIC},
    {"name": "Kwame Nkrumah University of Science and Technology", "short_name": "KNUST", "category": CATEGORY_PUBLIC},
    {"name": "University of Cape Coast", "short_name": "UCC", "category": CATEGORY_PUBLIC},
    {"name": "University of Education, Winneba", "short_name": "UEW", "category": CATEGORY_PUBLIC},
    {"name": "University for Development Studies", "short_name": "UDS", "category": CATEGORY_PUBLIC},
    {"name": "University of Mines and Technology", "short_name": "UMaT", "category": CATEGORY_PUBLIC},
    {"name": "University of Health and Allied Sciences", "short_name": "UHAS", "category": CATEGORY_PUBLIC},
    {"name": "University of Energy and Natural Resources", "short_name": "UENR", "category": CATEGORY_PUBLIC},
    {"name": "University of Professional Studies, Accra", "short_name": "UPSA", "category": CATEGORY_PUBLIC},
    {"name": "Ghana Institute of Management and Public Administration", "short_name": "GIMPA", "category": CATEGORY_PUBLIC},
    {"name": "Ghana Communication Technology University", "short_name": "GCTU", "category": CATEGORY_PUBLIC},
    {"name": "C. K. Tedam University of Technology and Applied Sciences", "short_name": "CKT-UTAS", "category": CATEGORY_PUBLIC},
    {"name": "S. D. Dombo University of Business and Integrated Development Studies", "short_name": "SDD-UBIDS", "category": CATEGORY_PUBLIC},
    {"name": "Akenten Appiah-Menka University of Skills Training and Entrepreneurial Development", "short_name": "AAMUSTED", "category": CATEGORY_PUBLIC},
    {"name": "University of Media, Arts and Communication", "short_name": "UniMAC", "category": CATEGORY_PUBLIC},
    {"name": "University of Environment and Sustainable Development", "short_name": "UESD", "category": CATEGORY_PUBLIC},
    {"name": "Regional Maritime University", "short_name": "RMU", "category": CATEGORY_PUBLIC},

    # B. PUBLIC TECHNICAL UNIVERSITIES (18-27)
    {"name": "Accra Technical University", "short_name": "ATU", "category": CATEGORY_TECHNICAL},
    {"name": "Kumasi Technical University", "short_name": "KsTU", "category": CATEGORY_TECHNICAL},
    {"name": "Takoradi Technical University", "short_name": "TTU", "category": CATEGORY_TECHNICAL},
    {"name": "Cape Coast Technical University", "short_name": "CCTU", "category": CATEGORY_TECHNICAL},
    {"name": "Koforidua Technical University", "short_name": "KTU", "category": CATEGORY_TECHNICAL},
    {"name": "Ho Technical University", "short_name": "HTU", "category": CATEGORY_TECHNICAL},
    {"name": "Sunyani Technical University", "short_name": "STU", "category": CATEGORY_TECHNICAL},
    {"name": "Tamale Technical University", "short_name": "TaTU", "category": CATEGORY_TECHNICAL},
    {"name": "Bolgatanga Technical University", "short_name": "BTU", "category": CATEGORY_TECHNICAL},
    {"name": "Dr. Hilla Limann Technical University", "short_name": "DHLTU", "category": CATEGORY_TECHNICAL},

    # C. PRIVATE UNIVERSITIES AND UNIVERSITY COLLEGES (28-67)
    {"name": "Academic City University", "short_name": "ACUC", "category": CATEGORY_PRIVATE},
    {"name": "Accra Business School", "short_name": "ABS", "category": CATEGORY_PRIVATE},
    {"name": "Accra Institute of Technology", "short_name": "AIT", "category": CATEGORY_PRIVATE},
    {"name": "Accra Metropolitan University", "short_name": "AMU", "category": CATEGORY_PRIVATE},
    {"name": "African University College of Communications", "short_name": "AUCC", "category": CATEGORY_PRIVATE},
    {"name": "All Nations University", "short_name": "ANU", "category": CATEGORY_PRIVATE},
    {"name": "Anglican University College of Technology", "short_name": "ANGUTECH", "category": CATEGORY_PRIVATE},
    {"name": "Akrofi-Christaller Institute of Theology, Mission and Culture", "short_name": "ACI", "category": CATEGORY_PRIVATE},
    {"name": "Ashesi University", "short_name": "Ashesi", "category": CATEGORY_PRIVATE},
    {"name": "Catholic University of Ghana", "short_name": "CUG", "category": CATEGORY_PRIVATE},
    {"name": "Central University", "short_name": "Central", "category": CATEGORY_PRIVATE},
    {"name": "Christian Service University", "short_name": "CSU", "category": CATEGORY_PRIVATE},
    {"name": "Christian University College", "short_name": "CUC", "category": CATEGORY_PRIVATE},
    {"name": "Dominion University College", "short_name": "DUC", "category": CATEGORY_PRIVATE},
    {"name": "Ensign Global University", "short_name": "Ensign", "category": CATEGORY_PRIVATE},
    {"name": "Evangelical Presbyterian University College", "short_name": "EPUC", "category": CATEGORY_PRIVATE},
    {"name": "Family Health University", "short_name": "FHUC", "category": CATEGORY_PRIVATE},
    {"name": "Garden City University", "short_name": "GCUC", "category": CATEGORY_PRIVATE},
    {"name": "Ghana Christian University College", "short_name": "GCUC-Ghana", "category": CATEGORY_PRIVATE},
    {"name": "Heritage Christian University", "short_name": "HCUC", "category": CATEGORY_PRIVATE},
    {"name": "KAAF University", "short_name": "KAAF", "category": CATEGORY_PRIVATE},
    {"name": "Klintaps University College of Health and Allied Sciences", "short_name": "KUCoHAS", "category": CATEGORY_PRIVATE},
    {"name": "Knutsford University", "short_name": "Knutsford", "category": CATEGORY_PRIVATE},
    {"name": "Lancaster University Ghana", "short_name": "Lancaster", "category": CATEGORY_PRIVATE},
    {"name": "Maranatha University College", "short_name": "MUC", "category": CATEGORY_PRIVATE},
    {"name": "Methodist University Ghana", "short_name": "MUG", "category": CATEGORY_PRIVATE},
    {"name": "Mountcrest University College", "short_name": "MUCG", "category": CATEGORY_PRIVATE},
    {"name": "Nobel International Business University", "short_name": "NIBS", "category": CATEGORY_PRIVATE},
    {"name": "Pentecost University", "short_name": "PU", "category": CATEGORY_PRIVATE},
    {"name": "Presbyterian University", "short_name": "PUG", "category": CATEGORY_PRIVATE},
    {"name": "Radford University College", "short_name": "RUC", "category": CATEGORY_PRIVATE},
    {"name": "Regent University College of Science and Technology", "short_name": "Regent", "category": CATEGORY_PRIVATE},
    {"name": "Regentropfen University College", "short_name": "RUCG", "category": CATEGORY_PRIVATE},
    {"name": "Spiritan University College", "short_name": "SUC", "category": CATEGORY_PRIVATE},
    {"name": "Trinity Theological Seminary", "short_name": "TTS", "category": CATEGORY_PRIVATE},
    {"name": "University of Gold Coast", "short_name": "UGC", "category": CATEGORY_PRIVATE},
    {"name": "Valley View University", "short_name": "VVU", "category": CATEGORY_PRIVATE},
    {"name": "West End University College", "short_name": "WEUC", "category": CATEGORY_PRIVATE},
    {"name": "Wisconsin International University College, Ghana", "short_name": "WIUC", "category": CATEGORY_PRIVATE},
    {"name": "Zenith University College", "short_name": "ZUC", "category": CATEGORY_PRIVATE},
]

# Maps common former names, alternate spellings, and legacy formatted labels -> canonical short_name
ALIAS_TO_SHORT_NAME = {
    "ug": "UG",
    "ug legon": "UG",
    "ug - legon": "UG",
    "university of ghana - legon": "UG",
    "university of ghana legon": "UG",
    "university of ghana (ug)": "UG",
    "knust - kumasi": "KNUST",
    "kwame nkrumah university of science & technology": "KNUST",
    "kwame nkrumah university of science and technology (knust)": "KNUST",
    "ucc - cape coast": "UCC",
    "university of cape coast (ucc)": "UCC",
    "upsa - accra": "UPSA",
    "university of professional studies": "UPSA",
    "university of professional studies, accra (upsa)": "UPSA",
    "ghana technology university college": "GCTU",
    "gtuc": "GCTU",
    "ghana communication technology university (gctu)": "GCTU",
    "ghana institute of journalism": "UniMAC",
    "gij": "UniMAC",
    "nafti": "UniMAC",
    "gil": "UniMAC",
    "university of media, arts and communication (unimac)": "UniMAC",
    "academic city university college": "ACUC",
    "academic city university (acuc)": "ACUC",
    "all nations university college": "ANU",
    "ashesi university college": "Ashesi",
    "ashesi university (ashesi)": "Ashesi",
    "catholic university college of ghana": "CUG",
    "central university college": "Central",
    "central university (central)": "Central",
    "christian service university college": "CSU",
    "ensign college of public health": "Ensign",
    "family health university college": "FHUC",
    "family health medical school": "FHUC",
    "garden city university college": "GCUC",
    "heritage christian university college": "HCUC",
    "kaaf university college": "KAAF",
    "knutsford university college": "Knutsford",
    "methodist university college ghana": "MUG",
    "nobel international business school": "NIBS",
    "pentecost university college": "PU",
    "presbyterian university college": "PUG",
    "presbyterian university college, ghana": "PUG",
    "presbyterian university, ghana": "PUG",
    "wisconsin international university college": "WIUC",
    "wisconsin international university college (wiuc)": "WIUC",
    "accra technical university (atu)": "ATU",
    "kumasi technical university (kstu)": "KsTU",
    "kumasi polytechnic": "KsTU",
    "accra polytechnic": "ATU",
    "takoradi polytechnic": "TTU",
    "cape coast polytechnic": "CCTU",
    "koforidua polytechnic": "KTU",
    "ho polytechnic": "HTU",
    "sunyani polytechnic": "STU",
    "tamale polytechnic": "TaTU",
    "bolgatanga polytechnic": "BTU",
    "wa polytechnic": "DHLTU",
    "uew - kumasi": "AAMUSTED",
    "coltek": "AAMUSTED",
    "uds - navrongo": "CKT-UTAS",
    "uds - wa": "SDD-UBIDS",
    "klintaps university college": "KUCoHAS",
}


def _normalize_text(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


def resolve_canonical_short_name(raw_name: str, raw_short_name: str = "") -> str | None:
    """Resolve a University row or string input to a canonical short_name if known."""
    by_name = {_normalize_text(item["name"]): item["short_name"] for item in CANONICAL_UNIVERSITIES}
    by_short = {_normalize_text(item["short_name"]): item["short_name"] for item in CANONICAL_UNIVERSITIES}

    for candidate in (raw_name, raw_short_name):
        norm = _normalize_text(candidate)
        if not norm:
            continue
        if norm in by_name:
            return by_name[norm]
        if norm in by_short:
            return by_short[norm]
        if norm in ALIAS_TO_SHORT_NAME:
            return ALIAS_TO_SHORT_NAME[norm]
        if "(" in candidate and candidate.strip().endswith(")"):
            base, inner = candidate.rsplit("(", 1)
            inner_norm = _normalize_text(inner.rstrip(")"))
            base_norm = _normalize_text(base)
            if inner_norm in by_short:
                return by_short[inner_norm]
            if inner_norm in ALIAS_TO_SHORT_NAME:
                return ALIAS_TO_SHORT_NAME[inner_norm]
            if base_norm in by_name:
                return by_name[base_norm]
            if base_norm in ALIAS_TO_SHORT_NAME:
                return ALIAS_TO_SHORT_NAME[base_norm]
    return None


@transaction.atomic
def sync_ghana_universities(UniversityModel=None, ProfileModel=None, ProductModel=None):
    """
    Safely reconcile and seed the 67 canonical Ghanaian tertiary institutions.

    - Preserves existing University primary keys (`id`) whenever a row matches by
      name, short_name, or known alias/former name.
    - Consolidates duplicates cleanly by reassigning Profile and Product foreign keys
      to the retained record before removing duplicate rows.
    - Deactivates any unknown non-canonical institution with existing users/products
      instead of deleting user/product relationships.
    - Completely idempotent: running repeatedly produces no duplicates.
    """
    if UniversityModel is None:
        from universities.models import University as UniversityModel
    if ProfileModel is None:
        from accounts.models import Profile as ProfileModel
    if ProductModel is None:
        from marketplace.models import Product as ProductModel

    existing_rows = list(UniversityModel.objects.all().order_by("id"))
    canonical_by_short = {item["short_name"]: item for item in CANONICAL_UNIVERSITIES}

    grouped_rows: dict[str, list] = {item["short_name"]: [] for item in CANONICAL_UNIVERSITIES}
    unmapped_rows = []

    for row in existing_rows:
        short = resolve_canonical_short_name(row.name, row.short_name)
        if short and short in grouped_rows:
            grouped_rows[short].append(row)
        else:
            unmapped_rows.append(row)

    stats = {"created": 0, "updated": 0, "merged": 0, "deactivated": 0, "removed_unused": 0}

    # First pass: merge duplicates & temporarily clear conflicting names if swapping
    retained_by_short = {}
    for item in CANONICAL_UNIVERSITIES:
        short = item["short_name"]
        matches = grouped_rows.get(short, [])
        if not matches:
            continue

        # Prefer row whose name or short_name already matches canonical cleanly
        primary = next(
            (m for m in matches if _normalize_text(m.name) == _normalize_text(item["name"])),
            matches[0],
        )
        for dup in matches:
            if dup.pk == primary.pk:
                continue
            ProfileModel.objects.filter(university_id=dup.pk).update(university_id=primary.pk)
            ProductModel.objects.filter(university_id=dup.pk).update(university_id=primary.pk)
            dup.delete()
            stats["merged"] += 1

        retained_by_short[short] = primary

    # Second pass: safely rename/categorize retained rows, creating missing canonical rows
    for item in CANONICAL_UNIVERSITIES:
        short = item["short_name"]
        name = item["name"]
        category = item["category"]

        row = retained_by_short.get(short)
        if row is None:
            UniversityModel.objects.create(
                name=name,
                short_name=short,
                category=category,
                is_active=True,
            )
            stats["created"] += 1
        else:
            changed = (
                row.name != name
                or row.short_name != short
                or getattr(row, "category", None) != category
                or not getattr(row, "is_active", True)
            )
            if changed:
                row.name = name
                row.short_name = short
                row.category = category
                row.is_active = True
                row.save(update_fields=["name", "short_name", "category", "is_active"])
                stats["updated"] += 1

    # Third pass: handle any non-canonical legacy rows without breaking FK relationships
    for row in unmapped_rows:
        has_users = ProfileModel.objects.filter(university_id=row.pk).exists()
        has_products = ProductModel.objects.filter(university_id=row.pk).exists()
        if not has_users and not has_products:
            row.delete()
            stats["removed_unused"] += 1
        elif getattr(row, "is_active", True):
            row.is_active = False
            row.save(update_fields=["is_active"])
            stats["deactivated"] += 1

    return stats


def resolve_university_by_text(UniversityModel, university_id=None, university_name=""):
    """Look up a University instance by ID, exact name/short_name, '(CODE)' format, or canonical alias."""
    if university_id:
        uni = UniversityModel.objects.filter(id=university_id).first()
        if uni:
            return uni
    clean = (university_name or "").strip()
    if not clean:
        return None
    uni = UniversityModel.objects.filter(name__iexact=clean).first() or UniversityModel.objects.filter(short_name__iexact=clean).first()
    if uni:
        return uni
    canonical_short = resolve_canonical_short_name(clean)
    if canonical_short:
        uni = UniversityModel.objects.filter(short_name__iexact=canonical_short).first()
        if uni:
            return uni
    base_name = clean.split("(", 1)[0].strip()
    if base_name:
        return (
            UniversityModel.objects.filter(name__iexact=base_name).first()
            or UniversityModel.objects.filter(short_name__iexact=base_name).first()
        )
    return None

