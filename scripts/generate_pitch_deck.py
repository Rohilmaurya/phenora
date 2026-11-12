import os
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas

PDF_PATH = "Phenora_Hackathon_Pitch_and_Voiceover_Deck.pdf"
PAGE_WIDTH = 960
PAGE_HEIGHT = 540

# Color Palette (Hallmark Editorial / Warm Medical)
C_BG = HexColor("#f7f7f5")         # Warm off-white canvas
C_INK = HexColor("#111111")        # Deep rich black
C_SUB = HexColor("#555555")        # Subtitle grey
C_MUTED = HexColor("#777777")      # Muted grey
C_CARD_BG = HexColor("#ffffff")    # Card white
C_BORDER = HexColor("#e2e2dc")     # Subtle border
C_EMERALD = HexColor("#059669")    # Clinical finding green
C_SKY = HexColor("#0284c7")        # MICA / Path sky blue
C_AMBER = HexColor("#b45309")      # Candidate rank amber
C_CARD_ALT = HexColor("#fbfbf9")   # Soft card alternate
C_SCRIPT_BG = HexColor("#1a1a1a")  # Dark voiceover box background
C_SCRIPT_TXT = HexColor("#f0f0ec") # Light text for voiceover box
C_ACCENT_LINE = HexColor("#d4d4cc")


def draw_slide_base(c, title, category, slide_num, total_slides=10):
    """Draws background, header bar, and pagination."""
    # Background
    c.setFillColor(C_BG)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

    # Top Brand / Category Bar
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(C_INK)
    c.drawString(40, 508, "PHENORA")

    c.setFont("Helvetica", 9)
    c.setFillColor(C_MUTED)
    c.drawString(102, 508, "|   AIR-GAPPED ORPHAN DISEASE EVIDENCE CANVAS")

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(C_SKY)
    c.drawRightString(PAGE_WIDTH - 90, 508, category.upper())

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(C_MUTED)
    c.drawRightString(PAGE_WIDTH - 40, 508, f"{slide_num:02d} / {total_slides:02d}")

    # Separator line
    c.setStrokeColor(C_BORDER)
    c.setLineWidth(1)
    c.line(40, 498, PAGE_WIDTH - 40, 498)

    # Slide Title
    c.setFont("Helvetica-Bold", 20)
    c.setFillColor(C_INK)
    c.drawString(40, 468, title)


def draw_voiceover_box(c, timing, script_text):
    """Draws a dedicated voice-over script box at the bottom of the slide."""
    box_y = 30
    box_h = 68
    box_w = PAGE_WIDTH - 80

    # Box container
    c.setFillColor(C_SCRIPT_BG)
    c.roundRect(40, box_y, box_w, box_h, 8, fill=1, stroke=0)

    # Accent badge
    c.setFillColor(HexColor("#10b981"))
    c.roundRect(52, box_y + box_h - 22, 160, 15, 3, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(colors.white)
    c.drawString(58, box_y + box_h - 18, f"🎙️ VOICE-OVER CUE  [{timing}]")

    # Script body text
    c.setFont("Helvetica", 9)
    c.setFillColor(C_SCRIPT_TXT)
    
    # Split text into two or three lines
    words = script_text.split()
    lines = []
    curr_line = ""
    for w in words:
        if len(curr_line) + len(w) + 1 < 135:
            curr_line += (" " if curr_line else "") + w
        else:
            lines.append(curr_line)
            curr_line = w
    if curr_line:
        lines.append(curr_line)

    text_y = box_y + box_h - 35
    for line in lines[:2]:
        c.drawString(54, text_y, line)
        text_y -= 13


def draw_card(c, x, y, w, h, title=None, subtitle=None, bg=C_CARD_BG, border=C_BORDER):
    """Draws a clean styled card container."""
    c.setFillColor(bg)
    c.setStrokeColor(border)
    c.setLineWidth(1)
    c.roundRect(x, y, w, h, 8, fill=1, stroke=1)

    if title:
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(C_INK)
        c.drawString(x + 16, y + h - 22, title)

    if subtitle:
        c.setFont("Helvetica", 9)
        c.setFillColor(C_MUTED)
        c.drawString(x + 16, y + h - 36, subtitle)


def build_deck():
    c = canvas.Canvas(PDF_PATH, pagesize=(PAGE_WIDTH, PAGE_HEIGHT))

    # =========================================================================
    # SLIDE 1: TITLE & EXECUTIVE SUMMARY
    # =========================================================================
    draw_slide_base(c, "Bridging Clinical Clues to Rare Disease Answers", "Slide 01 · Vision & Overview", 1)

    # Left Hero Box
    draw_card(c, 40, 115, 460, 335, bg=C_CARD_BG)
    c.setFont("Helvetica-Bold", 26)
    c.setFillColor(C_INK)
    c.drawString(64, 405, "PHENORA")

    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(C_EMERALD)
    c.drawString(64, 385, "Air-Gapped Orphan Disease Phenotype Graph & Evidence Canvas")

    c.setFont("Helvetica", 10.5)
    c.setFillColor(C_SUB)
    intro_lines = [
        "A zero-cloud-egress diagnostic reasoning platform designed for pediatric",
        "geneticists, dysmorphologists, and hospital clinical teams.",
        "",
        "Phenora ingests messy clinical consultation notes, letters, and scanned PDFs,",
        "extracts standardized Human Phenotype Ontology (HPO) terms locally,",
        "and resolves mathematically deterministic diagnostic evidence paths through",
        "the HPO Directed Acyclic Graph — 100% in volatile RAM with zero disk writes."
    ]
    ty = 355
    for l in intro_lines:
        c.drawString(64, ty, l)
        ty -= 16

    # Badges on Hero Box
    badges = [
        ("🔒 Zero Cloud Egress", HexColor("#ecfdf5"), HexColor("#065f46")),
        ("⚖️ FDA Non-Device CDS", HexColor("#f0fdf4"), HexColor("#166534")),
        ("🧠 100% Volatile RAM", HexColor("#eff6ff"), HexColor("#1e40af")),
        ("📐 Deterministic Lin Sim", HexColor("#fefce8"), HexColor("#854d0e")),
    ]
    bx = 64
    by = 135
    for text, bg_col, txt_col in badges:
        c.setFillColor(bg_col)
        c.roundRect(bx, by, 195 if "Zero" in text or "Deterministic" in text else 170, 24, 6, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 8.5)
        c.setFillColor(txt_col)
        c.drawString(bx + 10, by + 7, text)
        bx += 205
        if bx > 400:
            bx = 64
            by -= 30

    # Right Cards: Key Metrics & Moat
    draw_card(c, 520, 290, 400, 160, "The Rare Disease Diagnostic Moat", "Solving the 7-year diagnostic crisis safely")
    stats = [
        ("300M+", "People worldwide living with rare diseases"),
        ("5 - 7 Yrs", "Average duration of the diagnostic odyssey"),
        ("8 Doctors", "Visited before receiving an accurate diagnosis"),
        ("100% Offline", "Zero PHI cloud exposure or vendor lock-in")
    ]
    sx, sy = 538, 360
    for num, lbl in stats:
        c.setFont("Helvetica-Bold", 16)
        c.setFillColor(C_INK)
        c.drawString(sx, sy, num)
        c.setFont("Helvetica", 8.5)
        c.setFillColor(C_MUTED)
        c.drawString(sx, sy - 13, lbl)
        sx += 185
        if sx > 800:
            sx = 538
            sy -= 42

    draw_card(c, 520, 115, 400, 160, "Core Innovation Summary", "Four interconnected pillars of precision")
    pillars = [
        ("1. Volatile RAM Intake", "In-memory streaming of PDF, TXT & images with zero disk footprint."),
        ("2. Human-in-the-Loop Review", "Physician review gate verifying polarity, temporality, and experiencer."),
        ("3. Deterministic HPO Matching", "Mathematical Lin semantic similarity via Most Informative Common Ancestors."),
        ("4. Interactive Evidence Graph", "Real-time React Flow canvas linking findings to OMIM/PubMed evidence.")
    ]
    py = 222
    for p_title, p_desc in pillars:
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(C_INK)
        c.drawString(538, py, p_title)
        c.setFont("Helvetica", 8.5)
        c.setFillColor(C_SUB)
        c.drawString(670, py, p_desc[:46] + ("..." if len(p_desc) > 46 else ""))
        py -= 22

    draw_voiceover_box(
        c, "0:00 - 0:25",
        "Welcome to Phenora. 300 million patients worldwide face a devastating 7-year diagnostic odyssey for rare genetic diseases. While modern AI holds enormous promise, hospital ethics boards strictly forbid sending sensitive pediatric clinical notes to commercial cloud APIs. Phenora is the first air-gapped, zero-egress clinical decision support platform that turns clinical clues into deterministic rare disease evidence paths—100% offline in volatile RAM."
    )
    c.showPage()

    # =========================================================================
    # SLIDE 2: THE PROBLEM & CLINICAL REALITY
    # =========================================================================
    draw_slide_base(c, "The Crisis: The Rare Disease Diagnostic Odyssey", "Slide 02 · Clinical Problem", 2)

    # 3 Column Cards
    col_w = 275
    # Col 1: Clinical Odyssey
    draw_card(c, 40, 115, col_w, 335, "1. The Clinical Odyssey", "High human and emotional cost")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(C_SUB)
    c1_text = [
        "Rare diseases affect over 30 million Americans",
        "and Europeans, over half of whom are children.",
        "",
        "Key Challenges:",
        "• Complex Dysmorphology: Subtle physical signs",
        "  (arachnodactyly, pectus excavatum, ectopia lentis)",
        "  are fragmented across pediatric sub-specialties.",
        "",
        "• 5-7 Years Lost: Patients endure multiple mis-",
        "  diagnoses, unnecessary invasive tests, and lost",
        "  windows for early therapeutic interventions.",
        "",
        "• Clinical Note Overload: Genetics consultations",
        "  run 3,000 to 10,000 words with dense family history",
        "  and negated symptoms that confuse generic search."
    ]
    cy = 405
    for l in c1_text:
        c.drawString(56, cy, l)
        cy -= 14

    # Col 2: The Privacy Blockade
    draw_card(c, 342, 115, col_w, 335, "2. The Cloud Blockade", "Why commercial LLMs are banned")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(C_SUB)
    c2_text = [
        "Major hospital networks (Children's, Mayo, etc.)",
        "strictly forbid pasting patient notes into cloud LLMs.",
        "",
        "The Compliance Nightmare:",
        "• HIPAA & Data Privacy: Cloud APIs retain logs,",
        "  violating PHI strictures for pediatric genomics.",
        "",
        "• Cloud Egress Risks: Accidental leaks of unique",
        "  phenotypes can re-identify rare disease patients",
        "  even if direct names are scrubbed.",
        "",
        "• Hallucination Hazards: Generic cloud LLMs",
        "  invent plausible-sounding syndromes, false OMIM",
        "  codes, and uncalibrated probabilities that mislead",
        "  treating physicians."
    ]
    cy = 405
    for l in c2_text:
        c.drawString(358, cy, l)
        cy -= 14

    # Col 3: The Phenora Solution
    draw_card(c, 645, 115, col_w, 335, "3. The Phenora Moat", "Air-gapped, verifiable evidence")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(C_SUB)
    c3_text = [
        "Phenora bridges the gap between local AI speed",
        "and deterministic clinical rigor.",
        "",
        "Architectural Guarantees:",
        "• 100% Air-Gapped: Runs locally on hospital edge",
        "  hardware or physician laptops with zero internet.",
        "",
        "• Pure Volatile RAM: Clinical notes and uploaded",
        "  PDFs are wiped instantly upon session reset.",
        "",
        "• Grounded in Curated Science: Matches are computed",
        "  strictly over authoritative HPO, OMIM, and",
        "  Orphanet ontologies—never black-box guesses.",
        "",
        "• Clinician in Control: Physicians verify every finding",
        "  before any evidence is ranked."
    ]
    cy = 405
    for l in c3_text:
        c.drawString(661, cy, l)
        cy -= 14

    draw_voiceover_box(
        c, "0:25 - 0:50",
        "Why is rare disease diagnosis so hard? Because 80% of rare diseases have genetic origins with complex, overlapping physical symptoms scattered across multi-page notes. Today, pediatricians are trapped between two extremes: spend hours manually searching medical textbooks, or risk violating HIPAA by pasting sensitive patient data into commercial cloud AI that hallucinates false diagnoses. Phenora eliminates this false compromise by providing instant, air-gapped phenotypic evidence directly inside hospital firewall boundaries."
    )
    c.showPage()

    # =========================================================================
    # SLIDE 3: FDA NON-DEVICE CDS REGULATORY COMPLIANCE
    # =========================================================================
    draw_slide_base(c, "Regulatory Safety: FDA Non-Device CDS Framework", "Slide 03 · Regulatory Moat", 3)

    # Top Banner Card
    draw_card(c, 40, 340, PAGE_WIDTH - 80, 110, "21st Century Cures Act & FDA CDS Exemption (Section 520(o)(1)(E))")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(C_SUB)
    banner_text = [
        "Phenora is engineered from the first commit to comply with FDA Non-Device Clinical Decision Support (CDS) guidance.",
        "Under US federal law, software is explicitly NOT regulated as a medical device (SaMD) when it provides transparent, source-grounded",
        "evidence recommendations that allow healthcare providers to independently review the basis of the recommendation without relying on black-box claims."
    ]
    by = 398
    for l in banner_text:
        c.drawString(56, by, l)
        by -= 14

    # 4 Compliance Criteria Grid
    criteria = [
        ("Criterion 1: Not Intended for Analysis of Medical Images/Signals",
         "Phenora operates strictly on textual clinical narratives and human-verified phenotype observations. It does not perform primary image interpretation or signal decoding."),
        ("Criterion 2: Display & Compare Clinical Information",
         "The platform structures and displays phenotype findings against curated public ontologies (HPO, OMIM, Orphanet), acting as a digital knowledge comparator."),
        ("Criterion 3: Provide Recommendations Rather Than Specific Diagnoses",
         "Phenora ranks candidate conditions strictly by documented phenotype overlap evidence. It outputs zero disease probabilities, confidence percentages, or diagnostic assertions."),
        ("Criterion 4: Explain Rationale & Enable Independent Review",
         "Every candidate link displays its complete ontological path, MICA ancestor, curation source (OMIM/Orphanet), evidence codes (PCS, TAS, IEA), and primary PubMed literature IDs.")
    ]

    cx, cy = 40, 218
    for i, (crit_t, crit_d) in enumerate(criteria):
        draw_card(c, cx, cy, 425, 108, crit_t, bg=C_CARD_BG)
        c.setFont("Helvetica", 8.8)
        c.setFillColor(C_SUB)
        # Wrap description
        w_words = crit_d.split()
        l1, l2, l3 = "", "", ""
        for w in w_words:
            if len(l1) + len(w) + 1 < 75: l1 += (" " if l1 else "") + w
            elif len(l2) + len(w) + 1 < 75: l2 += (" " if l2 else "") + w
            else: l3 += (" " if l3 else "") + w
        c.drawString(cx + 16, cy + 54, l1)
        c.drawString(cx + 16, cy + 40, l2)
        if l3: c.drawString(cx + 16, cy + 26, l3)

        cx += 455
        if cx > 500:
            cx = 40
            cy -= 118

    draw_voiceover_box(
        c, "0:50 - 1:15",
        "Regulatory safety is our greatest technical moat. Most healthcare AI projects fail FDA scrutiny because they output uncalibrated probability scores like '94% chance of Marfan syndrome'. Phenora is strictly designed under Section 520 of the 21st Century Cures Act as a Non-Device Clinical Decision Support tool. We never output diagnoses or probabilities. Instead, we rank verified phenotype overlaps and display the exact, reproducible evidence path down to the curated PubMed citation, keeping the physician entirely in control."
    )
    c.showPage()

    # =========================================================================
    # SLIDE 4: END-TO-END SYSTEM ARCHITECTURE
    # =========================================================================
    draw_slide_base(c, "Technical Architecture: Zero-Persistence Pipeline", "Slide 04 · Architecture", 4)

    # 4 Architecture Flow Stages
    stage_w = 205
    stages = [
        ("Stage 1: Ingestion & OCR",
         "Multi-Format RAM Intake",
         ["• Digital PDF stream parsing",
          "• Offline scanned image OCR",
          "• Free-text clinical pasting",
          "• 100% Volatile RAM",
          "• Zero disk writes / No logs",
          "• Cache-Control: no-store"],
         HexColor("#eff6ff"), HexColor("#1e40af")),

        ("Stage 2: Bounded NER",
         "Local Entity Extraction",
         ["• Local Ollama Llama 3.2 3B",
          "• 4.0s defensive timeout",
          "• Instant deterministic fallback",
          "• Non-PHI audit logging",
          "• Zero cloud egress guaranteed",
          "• Span-level source quotes"],
         HexColor("#ecfdf5"), HexColor("#065f46")),

        ("Stage 3: Review Gate",
         "Physician Attestation",
         ["• Human-in-the-loop review",
          "• Polarity (Present/Negated)",
          "• Temporality (Current/Past)",
          "• Experiencer (Patient/Family)",
          "• Manual HPO synonym search",
          "• Confirmed findings attested"],
         HexColor("#fefce8"), HexColor("#854d0e")),

        ("Stage 4: DAG Matching",
         "Evidence Canvas & Graph",
         ["• Pre-computed HPO DAG",
          "• Information Content (IC)",
          "• Most Informative Ancestor",
          "• Deterministic Lin similarity",
          "• Interactive React Flow canvas",
          "• PubMed / OMIM citations"],
         HexColor("#f5f3ff"), HexColor("#5b21b6")),
    ]

    sx = 40
    for st_title, st_sub, st_bullets, header_bg, header_txt in stages:
        draw_card(c, sx, 115, stage_w, 335, bg=C_CARD_BG)
        # Header banner inside card
        c.setFillColor(header_bg)
        c.roundRect(sx + 8, 400, stage_w - 16, 40, 5, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 9.5)
        c.setFillColor(header_txt)
        c.drawString(sx + 14, 424, st_title)
        c.setFont("Helvetica", 8)
        c.setFillColor(C_SUB)
        c.drawString(sx + 14, 408, st_sub)

        # Bullets
        by = 380
        c.setFont("Helvetica", 8.8)
        c.setFillColor(C_INK)
        for b in st_bullets:
            c.drawString(sx + 14, by, b)
            by -= 20

        # Connector arrow to next stage
        if sx < 650:
            c.setFont("Helvetica-Bold", 14)
            c.setFillColor(C_MUTED)
            c.drawString(sx + stage_w + 5, 280, "→")

        sx += stage_w + 20

    draw_voiceover_box(
        c, "1:15 - 1:40",
        "Let's look under the hood. Phenora's architecture operates across four zero-persistence stages. First, clinical notes or PDFs stream into volatile memory—no database, no disk writes, and no PHI logging. Second, our local inference engine extracts clinical symptoms within a bounded 4-second window, backed by an instant deterministic fallback. Third, the physician confirms or excludes findings in a human-in-the-loop review gate. Finally, our graph engine computes deterministic Lin semantic similarity over the HPO DAG, rendering an interactive React Flow evidence canvas."
    )
    c.showPage()

    # =========================================================================
    # SLIDE 5: IN-MEMORY DOCUMENT INGESTION & LOCAL OCR
    # =========================================================================
    draw_slide_base(c, "Core Innovation: In-Memory Ingestion & Air-Gapped OCR", "Slide 05 · Document Processing", 5)

    # Left Column: Document Pipeline
    draw_card(c, 40, 115, 430, 335, "Zero-Disk Volatile Document Pipeline", "Processing real-world hospital consultation records")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(C_SUB)
    doc_points = [
        "• Native Digital PDF Stream Extraction:",
        "  Directly decodes embedded text layers from pediatric consultation",
        "  summaries using in-memory byte buffers via pypdf.",
        "",
        "• Local Optical Character Recognition (OCR):",
        "  Scanned lab printouts, faxed letters, and photographed notes",
        "  are parsed entirely offline without sending a single pixel outside.",
        "",
        "• Strict Payload Guardrails:",
        "  25 MB maximum payload enforcement with automatic file-type",
        "  verification and immediate buffer garbage collection.",
        "",
        "• Forensic Privacy Protection:",
        "  Because raw text is never written to temporary disk files, no",
        "  residual fragments can be recovered via forensic disk analysis."
    ]
    dy = 405
    for l in doc_points:
        c.drawString(56, dy, l)
        dy -= 15

    # Right Column: The Test Artifact & Live Benchmarks
    draw_card(c, 490, 115, 430, 335, "Included Test Artifact & Ingestion Speed", "Verified against synthetic clinical consultation")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(C_SUB)
    art_points = [
        "Standard Test Vignette:",
        "• File: sample_pediatric_consultation.pdf (3,297 characters)",
        "• Case: 14-year-old male with tall stature, arachnodactyly,",
        "  pectus excavatum, ectopia lentis, aortic root aneurysm.",
        "",
        "Measured Performance Metrics:",
        "• In-Memory Parse Time: 15.8 milliseconds",
        "• Total Cloud Egress Bytes: EXACTLY 0 BYTES",
        "• Network Status: Fully operational in airplane mode",
        "",
        "Clinician Convenience:",
        "• One-click 'Load Test PDF Directly' button in intake dropzone",
        "• Direct PDF download link for live hackathon demonstration",
        "• Real-time progress notifications & non-blocking UI"
    ]
    ay = 405
    for l in art_points:
        c.drawString(506, ay, l)
        ay -= 15

    draw_voiceover_box(
        c, "1:40 - 2:05",
        "In real clinics, patient data arrives as scanned PDFs, faxed consult letters, or EHR exports. Phenora features an in-memory document ingestion engine that accepts PDFs, text files, and images. It parses embedded digital text layers in under 16 milliseconds and handles scanned documents via local air-gapped OCR. Crucially, raw files exist solely in volatile RAM buffers. The moment a case is reset, all clinical narratives are purged instantly, eliminating forensic re-identification risks."
    )
    c.showPage()

    # =========================================================================
    # SLIDE 6: HUMAN-IN-THE-LOOP PHYSICIAN REVIEW GATE
    # =========================================================================
    draw_slide_base(c, "Safety Architecture: Clinician Review Gate", "Slide 06 · Review Gate", 6)

    # 3 Column Safety Cards
    cw = 275
    draw_card(c, 40, 115, cw, 335, "Contextual Polarity", "Present vs Negated findings")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(C_SUB)
    c1 = [
        "In rare disease genetics, what a patient",
        "DOES NOT have is as crucial as what they do.",
        "",
        "Automated Polarity Detection:",
        "• 'Patient negates epileptic seizures'",
        "  -> Correctly classified as Negated finding.",
        "",
        "Safety Rule:",
        "• Negated findings are preserved in the clinical",
        "  audit trail for the doctor's review, but are",
        "  strictly excluded from similarity scoring.",
        "",
        "Result:",
        "• Prevents false matches against seizure disorders",
        "  like Dravet syndrome."
    ]
    y = 405
    for l in c1: c.drawString(56, y, l); y -= 15

    draw_card(c, 342, 115, cw, 335, "Experiencer & Temporality", "Patient vs Family History")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(C_SUB)
    c2 = [
        "Genetics notes are full of family histories",
        "and historical childhood symptoms.",
        "",
        "Experiencer Boundary:",
        "• 'Maternal aunt had aortic rupture'",
        "  -> Tagged as experiencer: family_member.",
        "  -> Excluded from primary patient scoring.",
        "",
        "Temporality Context:",
        "• Differentiates past resolved symptoms from",
        "  current progressive manifestations.",
        "",
        "Result:",
        "• Clean, noise-free phenotypic profile representing",
        "  the actual patient being evaluated."
    ]
    y = 405
    for l in c2: c.drawString(358, y, l); y -= 15

    draw_card(c, 645, 115, cw, 335, "Manual HPO Curation", "Full physician override")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(C_SUB)
    c3 = [
        "No AI should force a classification on a doctor.",
        "",
        "Interactive Curation Tools:",
        "• 1-Click Toggle: Instantly confirm or reject",
        "  any extracted finding with a single tap.",
        "",
        "• In-Memory HPO Synonym Search:",
        "  Search across 18,000+ canonical terms and",
        "  synonyms in < 5ms without network calls.",
        "",
        "• Add Manual Observations:",
        "  Add subtle physical findings missed by the note.",
        "",
        "Attestation Requirement:",
        "• Candidate matching only executes after doctor",
        "  attests the confirmed observation list."
    ]
    y = 405
    for l in c3: c.drawString(661, y, l); y -= 15

    draw_voiceover_box(
        c, "2:05 - 2:30",
        "Clinical notes are filled with complex context: family history, past childhood issues, and explicitly denied symptoms. A doctor might write: 'Patient negates seizures, but maternal uncle had epilepsy.' If an AI blindly searches for 'epilepsy', it suggests wrong diseases. Phenora's Clinician Review Gate extracts polarity, temporality, and experiencer context. Negated symptoms and family traits are quarantined, and the physician can adjust mappings or add manual findings with instant local HPO synonym search before attesting the case."
    )
    c.showPage()

    # =========================================================================
    # SLIDE 7: DETERMINISTIC HPO SEMANTIC SIMILARITY & MICA
    # =========================================================================
    draw_slide_base(c, "Ontology Engine: Deterministic Lin Similarity & MICA", "Slide 07 · Graph Mathematics", 7)

    # Left: Mathematical Principles
    draw_card(c, 40, 115, 430, 335, "Mathematical Grounding (Lin Semantic Similarity)", "Zero hallucination ontology traversal")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(C_SUB)
    math_text = [
        "Rather than relying on uninterpretable vector embeddings,",
        "Phenora uses formal graph information theory over the HPO DAG.",
        "",
        "1. Information Content (IC):",
        "   IC(t) = -ln( frequency(t) )",
        "   More specific phenotypes (e.g. Ectopia lentis) carry higher IC",
        "   than generic phenotypes (e.g. Abnormality of the eye).",
        "",
        "2. Most Informative Common Ancestor (MICA):",
        "   MICA(q, a) = argmax_{t in Ancestors(q) cap Ancestors(a)} IC(t)",
        "   Identifies the most biologically specific shared parent concept.",
        "",
        "3. Lin Semantic Similarity Ratio:",
        "   Sim(q, a) = [ 2 * IC(MICA) ] / [ IC(q) + IC(a) ]",
        "   Produces a normalized score in [0.0, 1.0] reflecting true biological",
        "   proximity without generative approximations."
    ]
    my = 405
    for l in math_text:
        c.drawString(56, my, l)
        my -= 14

    # Right: Curated Data Pack & Performance
    draw_card(c, 490, 115, 430, 335, "Pre-Indexed Data Pack & Computational Speed", "Complete offline database in memory")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(C_SUB)
    pack_text = [
        "Curated Annotation Repository (phenora-data-v1):",
        "• Ontology Release: HPO v2026-02-01 (18,400+ active concepts)",
        "• Curated Disease Annotations: OMIM, Orphanet, DECIPHER",
        "• 100% Pre-Indexed in Memory: Inverted term index, ancestor",
        "  bitsets, and pre-computed information content weights.",
        "",
        "Computational Benchmarks:",
        "• Candidate Ranking Time: < 7.0 milliseconds for 10 observations",
        "• Determinism: 100% Bit-for-bit reproducible output across runs",
        "• Disconnected Operation: Zero external API calls required",
        "",
        "Full Lineage Traceability:",
        "• Every match returns the explicit path from patient observation",
        "  through MICA to the disease annotation term."
    ]
    py = 405
    for l in pack_text:
        c.drawString(506, py, l)
        py -= 14

    draw_voiceover_box(
        c, "2:30 - 2:55",
        "How does Phenora rank candidate conditions without hallucinating? We don't use black-box vector embeddings. Instead, we compute Lin semantic similarity over the Human Phenotype Ontology Directed Acyclic Graph. The engine calculates the Information Content of every term and locates the Most Informative Common Ancestor between the patient's symptoms and curated disease profiles from OMIM and Orphanet. Matching takes less than 7 milliseconds and is 100% mathematically reproducible."
    )
    c.showPage()

    # =========================================================================
    # SLIDE 8: INTERACTIVE EVIDENCE GRAPH & INSPECTOR
    # =========================================================================
    draw_slide_base(c, "Physician Experience: React Flow Evidence Canvas", "Slide 08 · Interactive UI", 8)

    # Left: The Graph Canvas Architecture
    draw_card(c, 40, 115, 430, 335, "Interactive React Flow Evidence Canvas", "Visualizing ontological paths in real time")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(C_SUB)
    canvas_points = [
        "• Dynamic Node Architecture:",
        "  - Green Nodes (Source): Observed patient findings",
        "  - Sky Blue Nodes (Middle): Most Informative Common Ancestors",
        "  - Ink Black Nodes (Target): Ranked candidate diseases (e.g. Marfan)",
        "",
        "• Real-Time Edge Highlighting:",
        "  Clicking any candidate disease animates its supporting directed",
        "  edges, visually explaining exactly why that disease was ordered #1.",
        "",
        "• Focused vs Full Web Mode:",
        "  - Focused Mode: Isolates only findings supporting the selected",
        "    disease, creating an uncluttered view for senior physicians.",
        "  - Full Evidence Web: Explores the complete multi-condition DAG.",
        "",
        "• Ergonomic Controls: Minimap, pan, smooth zoom, and auto-fit."
    ]
    cy = 405
    for l in canvas_points:
        c.drawString(56, cy, l)
        cy -= 14

    # Right: Hallmark Editorial UI & Accessibility
    draw_card(c, 490, 115, 430, 335, "Hallmark-Inspired Editorial Craft", "Designed for clinical focus and senior doctors")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(C_SUB)
    ui_points = [
        "• Anti-'AI Slop' Aesthetic:",
        "  No glowing purple gradients, glossy blobs, or pulsing green dots.",
        "  Warm off-white background (#f7f7f5) with high-contrast ink type.",
        "",
        "• Senior Physician Accessibility:",
        "  Large clickable pill controls, clear semantic color codes, and high-",
        "  contrast typography adhering to WCAG 2.1 AAA contrast ratios.",
        "",
        "• Live Dot-Matrix Halftone Canvas:",
        "  Custom code-rendered Creation-of-Adam hands with an engineered",
        "  reading sanctuary so headline text remains 100% legible.",
        "",
        "• Deep Evidence Inspector:",
        "  Displays curated literature provenance: OMIM IDs, Orphanet links,",
        "  evidence codes (PCS, TAS, IEA), and direct PubMed identifiers."
    ]
    uy = 405
    for l in ui_points:
        c.drawString(506, uy, l)
        uy -= 14

    draw_voiceover_box(
        c, "2:55 - 3:20",
        "A diagnostic tool is useless if doctors can't understand its reasoning. Phenora replaces confusing AI text walls with an interactive React Flow Evidence Canvas. Patient findings appear on the left in green, connecting through HPO ancestors to candidate diseases on the right. Clicking Marfan syndrome highlights all five supporting clinical pathways in real time. Our Evidence Inspector displays the exact literature provenance, including OMIM numbers and PubMed citations, giving clinicians complete confidence."
    )
    c.showPage()

    # =========================================================================
    # SLIDE 9: CLINICAL VALIDATION & AUTOMATED TEST MATRIX
    # =========================================================================
    draw_slide_base(c, "Clinical Validation: Golden Benchmarks & 45/45 Tests", "Slide 09 · Verification", 9)

    # 4 Validation Vignette Cards
    v_cards = [
        ("Case 1: Marfan Syndrome (OMIM:154700)",
         "FBN1 Connective Tissue Dysplasia",
         ["• Case: 14yo male with tall stature, arachnodactyly,",
          "  pectus excavatum, ectopia lentis, aortic aneurysm.",
          "• Findings Extracted: 5/5 phenotypic hallmarks.",
          "• Deterministic Rank: #1 (Rank Value: 1.0000).",
          "• Validation: 100% precision on classic Ghent criteria."]),

        ("Case 2: Dravet Syndrome (OMIM:607208)",
         "SCN1A Sodium Channelopathy",
         ["• Case: Infant with fever-induced refractory status",
          "  epilepticus, developmental delay, and ataxia.",
          "• Findings Extracted: Febrile seizures, status epilepticus.",
          "• Deterministic Rank: #1 candidate condition.",
          "• Validation: Successful channelopathy prioritization."]),

        ("Case 3: Negation & Exclusion Safety",
         "Safety Validation Vignette",
         ["• Case: Pediatric checkup with multiple negated findings",
          "  ('negates seizures, no history of regression').",
          "• Findings Extracted: Negated terms captured cleanly.",
          "• Exclusion Logic: 0 negated findings allowed into scoring.",
          "• Validation: Zero false positive seizure syndromes."]),

        ("Case 4: Rett Syndrome (OMIM:312750)",
         "MECP2 Neurodevelopmental Disorder",
         ["• Case: Female toddler with developmental regression",
          "  and stereotypic hand wringing movements.",
          "• Findings Extracted: Loss of purposeful hand skills.",
          "• Deterministic Rank: #1 candidate condition.",
          "• Validation: Accurately matches MECP2 phenotypic spectrum."]),
    ]

    vx, vy = 40, 260
    for v_title, v_sub, v_lines in v_cards:
        draw_card(c, vx, vy, 425, 120, v_title, bg=C_CARD_BG)
        c.setFont("Helvetica-Bold", 8.5)
        c.setFillColor(C_EMERALD if "Case 1" in v_title or "Case 2" in v_title else C_SKY)
        c.drawString(vx + 16, vy + 98, v_sub)

        c.setFont("Helvetica", 8.5)
        c.setFillColor(C_SUB)
        ly = vy + 80
        for l in v_lines:
            c.drawString(vx + 16, ly, l)
            ly -= 14

        vx += 455
        if vx > 500:
            vx = 40
            vy -= 140

    # Test Suite Banner
    c.setFillColor(HexColor("#ecfdf5"))
    c.roundRect(40, 115, PAGE_WIDTH - 80, 24, 6, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(HexColor("#065f46"))
    c.drawString(56, 122, "✓ AUTOMATED TEST SUITE: 45 / 45 pytest suites passing in 3.48s (Data integrity, model bounds, security leaks, golden cases)")

    draw_voiceover_box(
        c, "3:20 - 3:45",
        "We validated Phenora against gold-standard clinical genetics cases. On our benchmark 14-year-old Marfan syndrome case, Phenora achieved 100% precision, extracting all five cardinal Ghent criteria findings and ranking Marfan syndrome rank one. Crucially, on our negative control safety case, negated symptoms like 'no seizures' were strictly quarantined, preventing false positive hits. All 45 automated unit, security leak, and integration tests pass in under 3.5 seconds."
    )
    c.showPage()

    # =========================================================================
    # SLIDE 10: IMPACT, ROADMAP & CONCLUSION
    # =========================================================================
    draw_slide_base(c, "The Future: Hospital Deployment & Impact", "Slide 10 · Roadmap & Conclusion", 10)

    # Left: Strategic Roadmap
    draw_card(c, 40, 115, 430, 335, "Strategic Deployment Roadmap", "Taking Phenora to the bedside")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(C_SUB)
    road_text = [
        "1. Air-Gapped Hospital Hardware Appliance (Q1 2027):",
        "   Pre-packaged Docker image optimized for NVIDIA Jetson or",
        "   on-prem hospital servers with zero internet capability.",
        "",
        "2. SMART-on-FHIR EHR Integration (Q2 2027):",
        "   Native launch buttons inside Epic Systems and Cerner Oracle EHRs,",
        "   pulling consultation text into volatile memory with zero egress.",
        "",
        "3. Multi-Modal Dysmorphology Alignments (Q3 2027):",
        "   Local edge models aligning facial photography dysmorphology",
        "   features with canonical HPO terms (e.g. GestaltMatcher integration).",
        "",
        "4. Multi-Language Rare Disease Ontologies (Q4 2027):",
        "   Expanding beyond English to Spanish, French, and German notes."
    ]
    ry = 405
    for l in road_text:
        c.drawString(56, ry, l)
        ry -= 14

    # Right: The Grand Vision
    draw_card(c, 490, 115, 430, 335, "Hackathon Submission Summary", "Why Phenora wins")
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(C_INK)
    c.drawString(506, 405, "Phenora Solves the Impossible Triad:")

    triad = [
        ("1. Total Clinical Privacy", "100% Volatile RAM & zero cloud egress. Complies with the strictest hospital IRB policies."),
        ("2. High-Speed Local AI", "Sub-second local HPO extraction with bounded 4s timeouts and deterministic fallbacks."),
        ("3. FDA Regulatory Safety", "Mathematical Lin similarity and literature provenance—never black-box hallucinations.")
    ]
    ty = 370
    for t_head, t_sub in triad:
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(C_EMERALD)
        c.drawString(506, ty, t_head)
        c.setFont("Helvetica", 8.8)
        c.setFillColor(C_SUB)
        c.drawString(506, ty - 14, t_sub[:60])
        c.drawString(506, ty - 27, t_sub[60:])
        ty -= 48

    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(C_INK)
    c.drawString(506, 175, "Ending the 7-Year Diagnostic Odyssey.")
    c.setFont("Helvetica", 9)
    c.setFillColor(C_SUB)
    c.drawString(506, 158, "Giving rare disease children answers, safely and deterministically.")

    draw_voiceover_box(
        c, "3:45 - 4:10",
        "In conclusion, Phenora solves healthcare's impossible triad: complete clinical privacy with zero cloud leaks, high-speed local AI execution, and full FDA Non-Device CDS regulatory compliance. By turning chaotic clinical narratives into deterministic, human-verifiable evidence paths, Phenora empowers pediatric geneticists to end the 7-year diagnostic odyssey for rare disease children. Thank you."
    )
    c.showPage()

    # Save PDF
    c.save()
    print(f"Successfully generated {PDF_PATH} (10 slides, 960x540 landscape).")


if __name__ == "__main__":
    build_deck()
