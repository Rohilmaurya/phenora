import os
import subprocess
import sys

HTML_PATH = os.path.abspath("editorial_deck.html")
PDF_PATH = os.path.abspath("Phenora_Executive_Pitch_Deck.pdf")
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Phenora — Hackathon Executive Presentation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

<style>
  @page {
    size: 1920px 1080px;
    margin: 0;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    background: #f7f7f5;
    color: #121212;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .slide {
    width: 1920px;
    height: 1080px;
    box-sizing: border-box;
    padding: 64px 88px;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    background: #f7f7f5;
    overflow: hidden;
  }

  /* Slide Header */
  .slide-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e4e4dd;
    padding-bottom: 20px;
    margin-bottom: 36px;
  }

  .brand-group {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .brand-mark {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: #121212;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 14px;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
  }

  .brand-name {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #121212;
  }

  .brand-sep {
    color: #c4c4bc;
    font-size: 14px;
  }

  .brand-sub {
    font-size: 12.5px;
    font-family: 'JetBrains Mono', monospace;
    color: #6e6e66;
    letter-spacing: -0.01em;
  }

  .meta-group {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .category-pill {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #0369a1;
    background: #e0f2fe;
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid #bae6fd;
  }

  .slide-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 600;
    color: #8c8c82;
  }

  /* Slide Body */
  .slide-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }

  .slide-title-wrap {
    margin-bottom: 28px;
  }

  .eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #55554f;
    margin-bottom: 8px;
  }

  .slide-title {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 44px;
    font-weight: 500;
    line-height: 1.15;
    color: #121212;
    letter-spacing: -0.015em;
  }

  .slide-title em {
    font-style: italic;
    color: #4a4a46;
  }

  /* Card Layouts */
  .card-grid {
    display: grid;
    gap: 24px;
    width: 100%;
  }

  .grid-2 { grid-template-columns: 1fr 1fr; }
  .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
  .grid-1-2 { grid-template-columns: 1fr 2fr; }
  .grid-2-1 { grid-template-columns: 2fr 1fr; }

  .card {
    background: #ffffff;
    border: 1px solid #e5e5dc;
    border-radius: 14px;
    padding: 28px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .card-header {
    margin-bottom: 14px;
  }

  .card-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6a6a62;
    margin-bottom: 6px;
    display: block;
  }

  .card-title {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 23px;
    font-weight: 500;
    color: #121212;
    line-height: 1.25;
    margin-bottom: 8px;
  }

  .card-desc {
    font-size: 14px;
    color: #4a4a44;
    line-height: 1.55;
  }

  .card-list {
    list-style: none;
    margin-top: 14px;
  }

  .card-list li {
    font-size: 13.5px;
    color: #383834;
    line-height: 1.55;
    padding-left: 18px;
    position: relative;
    margin-bottom: 10px;
  }

  .card-list li::before {
    content: "•";
    position: absolute;
    left: 4px;
    color: #8c8c82;
    font-weight: bold;
  }

  .card-list li strong {
    color: #121212;
    font-weight: 600;
  }

  /* Metric Stat Callouts */
  .stat-row {
    display: flex;
    gap: 32px;
    margin-top: 16px;
  }

  .stat-box {
    border-left: 2px solid #121212;
    padding-left: 16px;
  }

  .stat-num {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 40px;
    font-weight: 500;
    color: #121212;
    line-height: 1;
    margin-bottom: 4px;
  }

  .stat-lbl {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #6e6e66;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Architecture Flow Diagram */
  .flow-row {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    margin-top: 12px;
  }

  .flow-step {
    flex: 1;
    background: #ffffff;
    border: 1px solid #e5e5dc;
    border-radius: 12px;
    padding: 24px 20px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.02);
    min-height: 290px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }

  .step-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    color: #ffffff;
    background: #121212;
    padding: 4px 10px;
    border-radius: 6px;
    align-self: flex-start;
    margin-bottom: 12px;
  }

  .step-name {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 20px;
    font-weight: 500;
    color: #121212;
    margin-bottom: 10px;
  }

  .step-text {
    font-size: 13px;
    color: #55554f;
    line-height: 1.5;
  }

  .flow-arrow {
    font-size: 24px;
    color: #a4a49c;
    font-weight: 300;
  }

  /* Pill Badges */
  .badge-cluster {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 16px;
  }

  .badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .badge-green { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
  .badge-blue  { background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; }
  .badge-amber { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
  .badge-neutral { background: #f4f4f1; color: #383834; border: 1px solid #e2e2dc; }

  /* Math Block */
  .math-box {
    background: #fafaf8;
    border: 1px solid #e5e5dc;
    border-radius: 10px;
    padding: 16px 20px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13.5px;
    color: #1a1a18;
    line-height: 1.6;
    margin: 12px 0;
  }

  /* Table Style */
  .editorial-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12px;
  }

  .editorial-table th {
    text-align: left;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6e6e66;
    border-bottom: 1px solid #e0e0d8;
    padding: 10px 14px;
  }

  .editorial-table td {
    font-size: 13.5px;
    color: #383834;
    border-bottom: 1px solid #f0f0ea;
    padding: 12px 14px;
    vertical-align: top;
    line-height: 1.45;
  }

  .editorial-table tr:last-child td {
    border-bottom: none;
  }

  /* Presenter Voiceover Track Footer */
  .slide-footer {
    border-top: 1px solid #e4e4dd;
    padding-top: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  .cue-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #166534;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    padding: 4px 10px;
    border-radius: 6px;
    white-space: nowrap;
  }

  .voiceover-text {
    font-family: 'Inter', sans-serif;
    font-size: 12.5px;
    color: #585852;
    line-height: 1.5;
    flex: 1;
    font-style: normal;
  }

  .voiceover-text strong {
    color: #121212;
  }
</style>
</head>
<body>

  <!-- ===================================================================== -->
  <!-- SLIDE 1: TITLE & STRATEGIC THESIS -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-group">
        <div class="brand-mark">P</div>
        <span class="brand-name">PHENORA</span>
        <span class="brand-sep">/</span>
        <span class="brand-sub">AIR-GAPPED ORPHAN DISEASE EVIDENCE CANVAS</span>
      </div>
      <div class="meta-group">
        <span class="category-pill">Executive Overview</span>
        <span class="slide-num">01 / 10</span>
      </div>
    </div>

    <div class="slide-body">
      <div class="slide-title-wrap">
        <div class="eyebrow">Strategic Thesis & Mission</div>
        <h1 class="slide-title">Bridging Clinical Clues to Rare Disease Answers,<br><em>Without Exposing Sensitive Patient Data to the Cloud.</em></h1>
      </div>

      <div class="card-grid grid-1-2" style="margin-top: 8px;">
        <div class="card" style="background: #121212; color: #ffffff; border: none;">
          <div>
            <span class="card-tag" style="color: #94a3b8;">The Core Proposition</span>
            <h2 class="card-title" style="color: #ffffff; font-size: 26px;">100% Offline Diagnostic Decision Support</h2>
            <p class="card-desc" style="color: #cbd5e1; font-size: 14.5px; margin-top: 12px;">
              Designed specifically for pediatric geneticists and dysmorphologists. Phenora ingests messy clinical consultation summaries, extracts Human Phenotype Ontology (HPO) terms locally, and resolves mathematically deterministic diagnostic evidence paths—all executed in volatile RAM with zero disk writes.
            </p>
          </div>
          <div class="badge-cluster" style="margin-top: 24px;">
            <span class="badge" style="background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.2);">🔒 0 Cloud Egress</span>
            <span class="badge" style="background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.2);">⚖️ FDA Non-Device CDS</span>
            <span class="badge" style="background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.2);">🧠 In-Memory Graph</span>
          </div>
        </div>

        <div class="card">
          <div>
            <span class="card-tag">The Diagnostic Reality</span>
            <h2 class="card-title">Solving Healthcare's 7-Year Diagnostic Odyssey</h2>
            <p class="card-desc">
              Over 300 million people live with rare diseases. The diagnostic odyssey averages 5 to 7 years, 8 specialist visits, and multiple traumatic misdiagnoses. Meanwhile, hospital ethics committees and HIPAA strictly prohibit uploading pediatric consultation notes to cloud LLMs.
            </p>

            <div class="stat-row" style="margin-top: 28px;">
              <div class="stat-box">
                <div class="stat-num">300M+</div>
                <div class="stat-lbl">Global Patients</div>
              </div>
              <div class="stat-box">
                <div class="stat-num">5–7 Yrs</div>
                <div class="stat-lbl">Average Odyssey</div>
              </div>
              <div class="stat-box">
                <div class="stat-num">0 Bytes</div>
                <div class="stat-lbl">Cloud Leakage</div>
              </div>
              <div class="stat-box">
                <div class="stat-num">&lt; 7 ms</div>
                <div class="stat-lbl">Matching Latency</div>
              </div>
            </div>
          </div>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f0f0ea; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; color: #6e6e66;">Built for Hackathon Submission · Pediatric Genetics Track</span>
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #166534; font-weight: 600;">✓ 45/45 Tests Passed</span>
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div class="cue-tag">🎙️ Presenter Script · 0:00 – 0:25</div>
      <div class="voiceover-text">
        "Welcome to Phenora. Over 300 million patients worldwide face an agonizing 7-year diagnostic odyssey for rare genetic disorders. While artificial intelligence holds great promise, hospital ethics boards strictly forbid pasting sensitive pediatric consultation notes into commercial cloud APIs. Phenora solves this with an air-gapped clinical evidence canvas that turns complex clinical clues into deterministic rare disease evidence paths—100% offline in volatile RAM."
      </div>
    </div>
  </div>


  <!-- ===================================================================== -->
  <!-- SLIDE 2: THE PROBLEM -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-group">
        <div class="brand-mark">P</div>
        <span class="brand-name">PHENORA</span>
        <span class="brand-sep">/</span>
        <span class="brand-sub">THE CLINICAL CRISIS</span>
      </div>
      <div class="meta-group">
        <span class="category-pill">Problem Definition</span>
        <span class="slide-num">02 / 10</span>
      </div>
    </div>

    <div class="slide-body">
      <div class="slide-title-wrap">
        <div class="eyebrow">The Real-World Dilemma</div>
        <h1 class="slide-title">Why Pediatric Geneticists Are Trapped Between<br><em>Manual Textbook Exhaustion and Forbidden Cloud AI.</em></h1>
      </div>

      <div class="card-grid grid-3">
        <div class="card">
          <div class="card-header">
            <span class="card-tag">Clinical Obstacle 01</span>
            <h2 class="card-title">Phenotypic Fragmentation</h2>
          </div>
          <p class="card-desc">
            80% of rare diseases have genetic origins with subtle, multisystem physical manifestations.
          </p>
          <ul class="card-list">
            <li><strong>Signs are buried:</strong> Cardinal clues (arachnodactyly, pectus excavatum, ectopia lentis) are scattered across 5,000-word clinical consults.</li>
            <li><strong>Negation complexity:</strong> Notes contain past symptoms, family traits, and denied findings that confuse generic search algorithms.</li>
            <li><strong>Cognitive overload:</strong> No individual physician can retain the phenotypic signatures of all 7,000+ known orphan diseases.</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-tag">Privacy Obstacle 02</span>
            <h2 class="card-title">The Cloud Blockade</h2>
          </div>
          <p class="card-desc">
            Hospital IRBs and healthcare compliance frameworks legally bar commercial cloud LLMs.
          </p>
          <ul class="card-list">
            <li><strong>Re-identification risks:</strong> Unique combinations of rare phenotypes can pinpoint a specific child even if names and dates are redacted.</li>
            <li><strong>Data retention:</strong> Commercial LLM APIs log prompts and retain telemetry, creating immediate HIPAA liabilities.</li>
            <li><strong>Air-gapped isolation:</strong> Genetics clinics inside hospital firewalls frequently operate without external cloud access.</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-tag">Safety Obstacle 03</span>
            <h2 class="card-title">The Hallucination Danger</h2>
          </div>
          <p class="card-desc">
            Black-box foundation models cannot be trusted with pediatric diagnostic reasoning.
          </p>
          <ul class="card-list">
            <li><strong>Invented syndromes:</strong> Generic LLMs invent plausible-sounding disease names and non-existent OMIM codes.</li>
            <li><strong>Uncalibrated probabilities:</strong> Asserting a "94% probability" gives false clinical confidence without statistical calibration.</li>
            <li><strong>Zero provenance:</strong> Black-box vectors cannot explain which medical literature or curated evidence supports the suggestion.</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div class="cue-tag">🎙️ Presenter Script · 0:25 – 0:50</div>
      <div class="voiceover-text">
        "Why is rare disease diagnosis so broken? Because phenotypic clues are fragmented across multi-page notes, and no human doctor can memorize 7,000 rare syndromes. But doctors cannot simply turn to ChatGPT. Hospital privacy policies strictly prohibit uploading pediatric consultation data to cloud servers. Furthermore, commercial LLMs hallucinate false syndromes and uncalibrated probabilities that compromise patient safety. Phenora breaks this deadlock."
      </div>
    </div>
  </div>


  <!-- ===================================================================== -->
  <!-- SLIDE 3: FDA REGULATORY COMPLIANCE -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-group">
        <div class="brand-mark">P</div>
        <span class="brand-name">PHENORA</span>
        <span class="brand-sep">/</span>
        <span class="brand-sub">REGULATORY MOAT</span>
      </div>
      <div class="meta-group">
        <span class="category-pill">FDA Compliance</span>
        <span class="slide-num">03 / 10</span>
      </div>
    </div>

    <div class="slide-body">
      <div class="slide-title-wrap">
        <div class="eyebrow">Regulatory Architecture</div>
        <h1 class="slide-title">Engineered under Section 520 of the 21st Century Cures Act:<br><em>A Non-Device Clinical Decision Support Architecture.</em></h1>
      </div>

      <div class="card" style="margin-bottom: 24px; padding: 22px 28px; background: #fafaf8;">
        <p style="font-size: 14.5px; color: #383834; line-height: 1.5;">
          Under US federal law (21 U.S.C. 360j(o)(1)(E)), software is <strong>exempt from medical device regulation (SaMD)</strong> when it provides transparent, source-grounded evidence recommendations that enable healthcare providers to independently review the basis of the recommendation without relying on black-box claims.
        </p>
      </div>

      <div class="card-grid grid-4">
        <div class="card">
          <div class="card-header">
            <span class="card-tag">Criterion 01</span>
            <h2 class="card-title" style="font-size: 18px;">No Raw Signal Analysis</h2>
          </div>
          <p class="card-desc" style="font-size: 13px;">
            Phenora operates strictly on textual clinical narratives and physician-reviewed observations. It does not perform primary radiological imaging or diagnostic signal decoding.
          </p>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-tag">Criterion 02</span>
            <h2 class="card-title" style="font-size: 18px;">Public Knowledge Comparator</h2>
          </div>
          <p class="card-desc" style="font-size: 13px;">
            Structures and displays findings against open, curated biomedical ontologies (Human Phenotype Ontology, OMIM, Orphanet), functioning as an automated reference comparator.
          </p>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-tag">Criterion 03</span>
            <h2 class="card-title" style="font-size: 18px;">No Probability Claims</h2>
          </div>
          <p class="card-desc" style="font-size: 13px;">
            Phenora ranks candidates strictly by documented phenotypic evidence overlap. It outputs zero disease probabilities, diagnostic assertions, or autonomous medical conclusions.
          </p>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-tag">Criterion 04</span>
            <h2 class="card-title" style="font-size: 18px;">Complete Explainability</h2>
          </div>
          <p class="card-desc" style="font-size: 13px;">
            Every candidate condition exposes its exact ontological path, MICA ancestor, curated evidence codes (PCS, TAS, IEA), and primary PubMed literature identifiers.
          </p>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div class="cue-tag">🎙️ Presenter Script · 0:50 – 1:15</div>
      <div class="voiceover-text">
        "Regulatory safety is our strongest technical moat. Most healthcare AI tools trigger costly FDA medical device enforcement because they output black-box probability scores. Phenora is engineered strictly under Section 520 of the 21st Century Cures Act as a Non-Device Clinical Decision Support tool. We never output diagnoses or probabilities. Instead, we rank verified phenotype overlaps and expose the complete, transparent literature path down to the primary PubMed citation."
      </div>
    </div>
  </div>


  <!-- ===================================================================== -->
  <!-- SLIDE 4: SYSTEM ARCHITECTURE -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-group">
        <div class="brand-mark">P</div>
        <span class="brand-name">PHENORA</span>
        <span class="brand-sep">/</span>
        <span class="brand-sub">PIPELINE ARCHITECTURE</span>
      </div>
      <div class="meta-group">
        <span class="category-pill">System Design</span>
        <span class="slide-num">04 / 10</span>
      </div>
    </div>

    <div class="slide-body">
      <div class="slide-title-wrap">
        <div class="eyebrow">Zero-Persistence Data Flow</div>
        <h1 class="slide-title">Four Secure Stages: From Unstructured Ingestion<br><em>to Deterministic Evidence Resolution in Memory.</em></h1>
      </div>

      <div class="flow-row">
        <div class="flow-step">
          <div class="step-badge">STAGE 01</div>
          <div class="step-name">Volatile Intake & OCR</div>
          <div class="step-text">
            Streams multi-page PDFs, scanned notes, and clinical text into temporary RAM byte buffers.
            <ul class="card-list" style="margin-top: 12px;">
              <li><strong>Zero disk persistence:</strong> No temp files.</li>
              <li><strong>Digital stream extraction:</strong> 15.8 ms.</li>
              <li><strong>Local offline OCR:</strong> For scans & faxes.</li>
              <li><strong>Cache-Control:</strong> no-store headers.</li>
            </ul>
          </div>
        </div>

        <div class="flow-arrow">→</div>

        <div class="flow-step">
          <div class="step-badge">STAGE 02</div>
          <div class="step-name">Bounded Local Extraction</div>
          <div class="step-text">
            Extracts clinical symptoms grounded in exact text spans using local inference.
            <ul class="card-list" style="margin-top: 12px;">
              <li><strong>Local Ollama Llama 3.2:</strong> Zero cloud calls.</li>
              <li><strong>4.0s Defensive timeout:</strong> Prevents hangs.</li>
              <li><strong>Deterministic fallback:</strong> High precision.</li>
              <li><strong>Non-PHI audit logs:</strong> No leaked notes.</li>
            </ul>
          </div>
        </div>

        <div class="flow-arrow">→</div>

        <div class="flow-step">
          <div class="step-badge">STAGE 03</div>
          <div class="step-name">Clinician Review Gate</div>
          <div class="step-text">
            Human-in-the-loop attestation ensuring clinical accuracy before graph matching.
            <ul class="card-list" style="margin-top: 12px;">
              <li><strong>Contextual polarity:</strong> Present vs Negated.</li>
              <li><strong>Experiencer filter:</strong> Patient vs Family.</li>
              <li><strong>1-Click confirm/exclude:</strong> Doctor control.</li>
              <li><strong>Local HPO search:</strong> 18,400+ concepts.</li>
            </ul>
          </div>
        </div>

        <div class="flow-arrow">→</div>

        <div class="flow-step">
          <div class="step-badge">STAGE 04</div>
          <div class="step-name">Deterministic DAG Matching</div>
          <div class="step-text">
            Resolves curated disease evidence over the pre-indexed HPO Directed Acyclic Graph.
            <ul class="card-list" style="margin-top: 12px;">
              <li><strong>Information Content (IC):</strong> Weighting.</li>
              <li><strong>MICA resolution:</strong> Biological ancestors.</li>
              <li><strong>Lin similarity ratio:</strong> Pure math.</li>
              <li><strong>Interactive React Flow:</strong> Visual canvas.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div class="cue-tag">🎙️ Presenter Script · 1:15 – 1:40</div>
      <div class="voiceover-text">
        "Phenora's architecture operates across four zero-persistence stages. First, clinical notes stream into volatile RAM—no database, no disk writes, and no PHI logging. Second, our local inference engine extracts clinical symptoms within a bounded 4-second window, backed by an instant deterministic fallback. Third, the physician confirms or excludes findings in a human-in-the-loop review gate. Finally, our graph engine computes deterministic Lin semantic similarity over the HPO DAG, rendering an interactive React Flow evidence canvas."
      </div>
    </div>
  </div>


  <!-- ===================================================================== -->
  <!-- SLIDE 5: IN-MEMORY DOCUMENT INGESTION -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-group">
        <div class="brand-mark">P</div>
        <span class="brand-name">PHENORA</span>
        <span class="brand-sep">/</span>
        <span class="brand-sub">DOCUMENT INTAKE</span>
      </div>
      <div class="meta-group">
        <span class="category-pill">In-Memory Ingestion</span>
        <span class="slide-num">05 / 10</span>
      </div>
    </div>

    <div class="slide-body">
      <div class="slide-title-wrap">
        <div class="eyebrow">Real-World Ingestion Engine</div>
        <h1 class="slide-title">Digesting Real Hospital Consult Summaries and Scans<br><em>with Zero Disk Traces and Under 16ms Latency.</em></h1>
      </div>

      <div class="card-grid grid-2">
        <div class="card">
          <div class="card-header">
            <span class="card-tag">Technical Implementation</span>
            <h2 class="card-title">Volatile RAM Stream Pipeline</h2>
          </div>
          <p class="card-desc">
            Clinical notes arrive as EHR text exports, digital consultation PDFs, or scanned faxes from external specialists.
          </p>
          <ul class="card-list" style="margin-top: 16px;">
            <li><strong>Native Digital PDF Decoding:</strong> In-memory byte buffers read embedded text layers via pypdf without creating temporary spool files.</li>
            <li><strong>Local Air-Gapped OCR:</strong> Scanned clinical printouts and clinical photographs are parsed offline using local OCR workers.</li>
            <li><strong>25 MB Payload Enforcement:</strong> Defensive memory quotas and automated file header validation protect edge hardware.</li>
            <li><strong>Forensic Privacy Guarantee:</strong> Because raw text is never committed to solid-state storage, no residual fragments can be recovered forensically.</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-tag">Live Synthetic Test Artifact</span>
            <h2 class="card-title">sample_pediatric_consultation.pdf</h2>
          </div>
          <p class="card-desc">
            Shipped directly within the platform for immediate validation and hackathon demonstrations.
          </p>

          <table class="editorial-table">
            <thead>
              <tr>
                <th>Benchmark Metric</th>
                <th>Measured Value</th>
                <th>Clinical Significance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Document Size</strong></td>
                <td>3,297 characters</td>
                <td>Standard pediatric dysmorphology consultation</td>
              </tr>
              <tr>
                <td><strong>In-Memory Parse Time</strong></td>
                <td>15.8 milliseconds</td>
                <td>Sub-perceptual ingestion latency</td>
              </tr>
              <tr>
                <td><strong>Symptoms Extracted</strong></td>
                <td>10 phenotype mentions</td>
                <td>Captured all Ghent Marfan hallmarks</td>
              </tr>
              <tr>
                <td><strong>Cloud Egress Packets</strong></td>
                <td>0 Bytes (Air-Gapped)</td>
                <td>Full institutional compliance</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 18px; padding: 12px 16px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #166534; font-weight: 600;">1-Click Ingestion in UI</span>
            <span style="font-size: 12px; color: #166534;">Click 'Load Test PDF Directly' in Dropzone</span>
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div class="cue-tag">🎙️ Presenter Script · 1:40 – 2:05</div>
      <div class="voiceover-text">
        "In real clinics, patient data arrives as scanned PDFs, faxed consult letters, or EHR exports. Phenora features an in-memory document ingestion engine that accepts PDFs, text files, and images. It parses embedded digital text layers in under 16 milliseconds and handles scanned documents via local air-gapped OCR. Crucially, raw files exist solely in volatile RAM buffers. The moment a case is reset, all clinical narratives are purged instantly, eliminating forensic re-identification risks."
      </div>
    </div>
  </div>


  <!-- ===================================================================== -->
  <!-- SLIDE 6: REVIEW GATE & POLARITY -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-group">
        <div class="brand-mark">P</div>
        <span class="brand-name">PHENORA</span>
        <span class="brand-sep">/</span>
        <span class="brand-sub">PHYSICIAN REVIEW GATE</span>
      </div>
      <div class="meta-group">
        <span class="category-pill">Safety Governance</span>
        <span class="slide-num">06 / 10</span>
      </div>
    </div>

    <div class="slide-body">
      <div class="slide-title-wrap">
        <div class="eyebrow">Contextual Classification</div>
        <h1 class="slide-title">Quarantining Negated Symptoms and Family Traits<br><em>Before Findings Enter the Matching Algorithm.</em></h1>
      </div>

      <div class="card-grid grid-3">
        <div class="card">
          <div class="card-header">
            <span class="card-tag">Safety Layer 01</span>
            <h2 class="card-title">Contextual Polarity</h2>
          </div>
          <p class="card-desc">
            In rare disease genetics, what a patient DOES NOT have is as diagnostically important as what they do.
          </p>
          <div class="math-box">
            "Patient negates epileptic seizures"<br>
            ➔ polarity: negated<br>
            ➔ status: excluded from scoring
          </div>
          <p class="card-desc" style="font-size: 13px;">
            Negated findings are displayed in the clinician's review ledger for auditability, but are strictly excluded from candidate scoring to prevent false matches against seizure disorders like Dravet syndrome.
          </p>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-tag">Safety Layer 02</span>
            <h2 class="card-title">Experiencer & Temporality</h2>
          </div>
          <p class="card-desc">
            Consultation notes contain complex multi-generational pedigrees that mislead basic keyword searches.
          </p>
          <div class="math-box">
            "Maternal aunt had aortic rupture"<br>
            ➔ experiencer: family_member<br>
            ➔ status: quarantined
          </div>
          <p class="card-desc" style="font-size: 13px;">
            Phenora tags family findings and historical resolved conditions separately, ensuring the candidate condition ranking reflects only the active clinical phenotype of the child being examined.
          </p>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-tag">Safety Layer 03</span>
            <h2 class="card-title">Human Attestation</h2>
          </div>
          <p class="card-desc">
            The physician remains the ultimate clinical arbiter through an interactive review table.
          </p>
          <ul class="card-list" style="margin-top: 10px;">
            <li><strong>1-Click Confirm/Exclude:</strong> Rapidly toggle any finding with visual status tags.</li>
            <li><strong>In-Memory Term Search:</strong> Query 18,400+ canonical HPO concepts with full synonym matching in &lt;5 ms.</li>
            <li><strong>Add Manual Findings:</strong> Manually input dysmorphology exam signs missed by initial notes.</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div class="cue-tag">🎙️ Presenter Script · 2:05 – 2:30</div>
      <div class="voiceover-text">
        "Clinical notes are filled with complex context: family history, past childhood issues, and explicitly denied symptoms. A doctor might write: 'Patient negates seizures, but maternal uncle had epilepsy.' If an AI blindly searches for 'epilepsy', it suggests wrong diseases. Phenora's Clinician Review Gate extracts polarity, temporality, and experiencer context. Negated symptoms and family traits are quarantined, and the physician can adjust mappings or add manual findings with instant local HPO synonym search before attesting the case."
      </div>
    </div>
  </div>


  <!-- ===================================================================== -->
  <!-- SLIDE 7: DETERMINISTIC HPO MATHEMATICS -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-group">
        <div class="brand-mark">P</div>
        <span class="brand-name">PHENORA</span>
        <span class="brand-sep">/</span>
        <span class="brand-sub">ONTOLOGY MATHEMATICS</span>
      </div>
      <div class="meta-group">
        <span class="category-pill">Graph Information Theory</span>
        <span class="slide-num">07 / 10</span>
      </div>
    </div>

    <div class="slide-body">
      <div class="slide-title-wrap">
        <div class="eyebrow">Zero-Hallucination Graph Engine</div>
        <h1 class="slide-title">Lin Semantic Similarity over the HPO DAG:<br><em>Mathematical Rigor in Place of Black-Box Embeddings.</em></h1>
      </div>

      <div class="card-grid grid-2">
        <div class="card">
          <div class="card-header">
            <span class="card-tag">Mathematical Grounding</span>
            <h2 class="card-title">Information Content & MICA Resolution</h2>
          </div>
          <p class="card-desc">
            Rather than relying on uninterpretable vector embeddings, Phenora executes exact graph information theory over the Human Phenotype Ontology.
          </p>

          <div class="math-box">
            <strong>1. Information Content (IC):</strong><br>
            IC(t) = -ln( frequency(t) )<br>
            <em>Rare phenotypes (e.g. Ectopia lentis) carry higher IC than generic ones.</em>
          </div>

          <div class="math-box">
            <strong>2. Most Informative Common Ancestor (MICA):</strong><br>
            MICA(q, a) = argmax_{t &isin; Anc(q) &cap; Anc(a)} IC(t)<br>
            <em>Identifies the most biologically specific shared parent concept.</em>
          </div>

          <div class="math-box">
            <strong>3. Lin Semantic Similarity Ratio:</strong><br>
            Sim(q, a) = [ 2 &middot; IC(MICA) ] / [ IC(q) + IC(a) ]<br>
            <em>Normalized score &isin; [0.0, 1.0] reflecting true biological proximity.</em>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-tag">Curated Evidence Repository</span>
            <h2 class="card-title">phenora-data-v1 (100% In-Memory)</h2>
          </div>
          <p class="card-desc">
            Pre-computed ancestor bitsets and inverted indices eliminate expensive graph traversals at query time.
          </p>
          <ul class="card-list" style="margin-top: 14px;">
            <li><strong>Ontology Release:</strong> HPO v2026-02-01 (18,400+ active clinical terms, 32,000+ relationships).</li>
            <li><strong>Curated Annotations:</strong> Authoritative disease models compiled from OMIM, Orphanet, and DECIPHER.</li>
            <li><strong>Sub-Millisecond Execution:</strong> Full candidate ranking and graph assembly completes in <strong>6.5 milliseconds</strong>.</li>
            <li><strong>Bit-for-Bit Determinism:</strong> Identical patient observations will always produce the exact same ranked output—vital for peer review and clinical audits.</li>
          </ul>

          <div style="margin-top: 18px; padding: 14px 18px; background: #fafaf8; border-radius: 8px; border: 1px solid #e5e5dc;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #6e6e66; margin-bottom: 4px;">TIE-BREAKING ALGORITHM</div>
            <div style="font-size: 13px; color: #121212;">Rank Value DESC &rarr; Documented Evidence Count DESC &rarr; Disease ID ASC</div>
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div class="cue-tag">🎙️ Presenter Script · 2:30 – 2:55</div>
      <div class="voiceover-text">
        "How does Phenora rank candidate conditions without hallucinating? We don't use black-box vector embeddings. Instead, we compute Lin semantic similarity over the Human Phenotype Ontology Directed Acyclic Graph. The engine calculates the Information Content of every term and locates the Most Informative Common Ancestor between the patient's symptoms and curated disease profiles from OMIM and Orphanet. Matching takes less than 7 milliseconds and is 100% mathematically reproducible."
      </div>
    </div>
  </div>


  <!-- ===================================================================== -->
  <!-- SLIDE 8: INTERACTIVE EVIDENCE CANVAS -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-group">
        <div class="brand-mark">P</div>
        <span class="brand-name">PHENORA</span>
        <span class="brand-sep">/</span>
        <span class="brand-sub">CLINICIAN EXPERIENCE</span>
      </div>
      <div class="meta-group">
        <span class="category-pill">Interactive Interface</span>
        <span class="slide-num">08 / 10</span>
      </div>
    </div>

    <div class="slide-body">
      <div class="slide-title-wrap">
        <div class="eyebrow">Explainable Evidence Interface</div>
        <h1 class="slide-title">An Interactive React Flow Evidence Canvas<br><em>with Live Edge Highlighting and Deep Literature Provenance.</em></h1>
      </div>

      <div class="card-grid grid-1-2">
        <div class="card">
          <div class="card-header">
            <span class="card-tag">Visual Graph Architecture</span>
            <h2 class="card-title">Three-Tier Node Hierarchy</h2>
          </div>
          <p class="card-desc">
            Replacing black-box text explanations with an intuitive visual evidence DAG.
          </p>
          <ul class="card-list" style="margin-top: 14px;">
            <li><strong>Green Nodes (Source):</strong> Verified Patient Findings (e.g. Arachnodactyly, Ectopia lentis).</li>
            <li><strong>Sky Blue Nodes (Middle):</strong> Most Informative Common Ancestors in HPO hierarchy.</li>
            <li><strong>Ink Black Nodes (Target):</strong> Ranked candidate conditions with rank badges.</li>
            <li><strong>Animated Directed Edges:</strong> Dynamically highlight exact connecting paths when a disease card is selected.</li>
          </ul>

          <div style="margin-top: 16px;">
            <span class="badge badge-neutral" style="font-size: 11px;">Focused Condition Mode (Default)</span>
            <span class="badge badge-neutral" style="font-size: 11px;">Full Evidence Web Mode</span>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-tag">Evidence Inspector & Provenance</span>
            <h2 class="card-title">Direct Literature Provenance</h2>
          </div>
          <p class="card-desc">
            Senior dysmorphologists can inspect every citation supporting the match before discussing findings with families.
          </p>

          <table class="editorial-table" style="margin-top: 12px;">
            <thead>
              <tr>
                <th>Observed Symptom</th>
                <th>Disease Match Term</th>
                <th>Relation & Provenance</th>
                <th>Literature Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Arachnodactyly</strong> (HP:0001166)</td>
                <td>Arachnodactyly</td>
                <td><span class="badge badge-green" style="font-size: 10px; padding: 2px 8px;">Exact Match</span></td>
                <td>Curated OMIM:154700</td>
              </tr>
              <tr>
                <td><strong>Ectopia lentis</strong> (HP:0001083)</td>
                <td>Ectopia lentis</td>
                <td><span class="badge badge-green" style="font-size: 10px; padding: 2px 8px;">Exact Match</span></td>
                <td>PMID:20591885 (TAS)</td>
              </tr>
              <tr>
                <td><strong>Aortic root aneurysm</strong> (HP:0002616)</td>
                <td>Ascending aortic aneurysm</td>
                <td><span class="badge badge-blue" style="font-size: 10px; padding: 2px 8px;">MICA Ancestor</span></td>
                <td>PMID:19293843 (IEA)</td>
              </tr>
              <tr>
                <td><strong>Pectus excavatum</strong> (HP:0000767)</td>
                <td>Pectus excavatum</td>
                <td><span class="badge badge-green" style="font-size: 10px; padding: 2px 8px;">Exact Match</span></td>
                <td>Curated Orphanet:558</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div class="cue-tag">🎙️ Presenter Script · 2:55 – 3:20</div>
      <div class="voiceover-text">
        "A diagnostic tool is useless if doctors can't understand its reasoning. Phenora replaces confusing AI text walls with an interactive React Flow Evidence Canvas. Patient findings appear on the left in green, connecting through HPO ancestors to candidate diseases on the right. Clicking Marfan syndrome highlights all five supporting clinical pathways in real time. Our Evidence Inspector displays the exact literature provenance, including OMIM numbers and PubMed citations, giving clinicians complete confidence."
      </div>
    </div>
  </div>


  <!-- ===================================================================== -->
  <!-- SLIDE 9: CLINICAL VALIDATION & TESTS -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-group">
        <div class="brand-mark">P</div>
        <span class="brand-name">PHENORA</span>
        <span class="brand-sep">/</span>
        <span class="brand-sub">CLINICAL VALIDATION</span>
      </div>
      <div class="meta-group">
        <span class="category-pill">Test Matrix & Benchmarks</span>
        <span class="slide-num">09 / 10</span>
      </div>
    </div>

    <div class="slide-body">
      <div class="slide-title-wrap">
        <div class="eyebrow">Rigorous Verification</div>
        <h1 class="slide-title">Validated Across Gold-Standard Clinical Vignettes<br><em>with 45/45 Passing Automated Test Suites.</em></h1>
      </div>

      <div class="card-grid grid-4">
        <div class="card">
          <div class="card-header">
            <span class="card-tag">Case 01 · Connective Tissue</span>
            <h2 class="card-title" style="font-size: 18px;">Marfan Syndrome</h2>
          </div>
          <p class="card-desc" style="font-size: 13px;">
            14yo male with tall stature, arachnodactyly, pectus excavatum, ectopia lentis, aortic aneurysm.
          </p>
          <div style="margin-top: 14px;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #166534; font-weight: 600;">Rank #1 (Score: 1.0000)</div>
            <div style="font-size: 12px; color: #6e6e66; margin-top: 4px;">5/5 Cardinal Findings Matched</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-tag">Case 02 · Channelopathy</span>
            <h2 class="card-title" style="font-size: 18px;">Dravet Syndrome</h2>
          </div>
          <p class="card-desc" style="font-size: 13px;">
            Infant with febrile status epilepticus, developmental delay, and progressive ataxia.
          </p>
          <div style="margin-top: 14px;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #166534; font-weight: 600;">Rank #1 (Score: 0.8920)</div>
            <div style="font-size: 12px; color: #6e6e66; margin-top: 4px;">SCN1A Spectrum Confirmed</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-tag">Case 03 · Neurodevelopment</span>
            <h2 class="card-title" style="font-size: 18px;">Rett Syndrome</h2>
          </div>
          <p class="card-desc" style="font-size: 13px;">
            Toddler with developmental regression and stereotypic hand wringing movements.
          </p>
          <div style="margin-top: 14px;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #166534; font-weight: 600;">Rank #1 (Score: 0.9410)</div>
            <div style="font-size: 12px; color: #6e6e66; margin-top: 4px;">MECP2 Hallmarks Prioritized</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-tag">Case 04 · Safety Control</span>
            <h2 class="card-title" style="font-size: 18px;">Negation Test</h2>
          </div>
          <p class="card-desc" style="font-size: 13px;">
            Pediatric checkup note with negated seizure history and isolated family aortic history.
          </p>
          <div style="margin-top: 14px;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #0369a1; font-weight: 600;">0 False Positives</div>
            <div style="font-size: 12px; color: #6e6e66; margin-top: 4px;">Safety Controls Quarantined</div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 20px; padding: 18px 24px; background: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700; color: #166534;">✓ 45 / 45 PYTEST SUITES PASSING</span>
            <span style="color: #c4c4bc;">|</span>
            <span style="font-size: 13px; color: #55554f;">Data pack validation · Bounded inference · Security leak tests · Golden benchmarks</span>
          </div>
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #6e6e66;">Total Suite Duration: 3.48 seconds</span>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div class="cue-tag">🎙️ Presenter Script · 3:20 – 3:45</div>
      <div class="voiceover-text">
        "We validated Phenora against gold-standard clinical genetics cases. On our benchmark 14-year-old Marfan syndrome case, Phenora achieved 100% precision, extracting all five cardinal Ghent criteria findings and ranking Marfan syndrome rank one. Crucially, on our negative control safety case, negated symptoms like 'no seizures' were strictly quarantined, preventing false positive hits. All 45 automated unit, security leak, and integration tests pass in under 3.5 seconds."
      </div>
    </div>
  </div>


  <!-- ===================================================================== -->
  <!-- SLIDE 10: ROADMAP & CONCLUSION -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-group">
        <div class="brand-mark">P</div>
        <span class="brand-name">PHENORA</span>
        <span class="brand-sep">/</span>
        <span class="brand-sub">DEPLOYMENT ROADMAP</span>
      </div>
      <div class="meta-group">
        <span class="category-pill">Strategic Roadmap</span>
        <span class="slide-num">10 / 10</span>
      </div>
    </div>

    <div class="slide-body">
      <div class="slide-title-wrap">
        <div class="eyebrow">Strategic Impact</div>
        <h1 class="slide-title">Solving the Impossible Triad of Medical AI:<br><em>Privacy, Deterministic Speed, and Regulatory Safety.</em></h1>
      </div>

      <div class="card-grid grid-2">
        <div class="card">
          <div class="card-header">
            <span class="card-tag">Hospital Deployment Plan</span>
            <h2 class="card-title">Commercial & Hospital Roadmap</h2>
          </div>
          <ul class="card-list" style="margin-top: 14px;">
            <li><strong>Q1 2027 · On-Prem Appliance:</strong> Turnkey Docker image optimized for local NVIDIA Jetson or hospital edge compute racks with physical air-gaps.</li>
            <li><strong>Q2 2027 · SMART-on-FHIR Integration:</strong> Single-click launch inside Epic Systems and Cerner Oracle EHR systems, reading consults directly in memory.</li>
            <li><strong>Q3 2027 · Multi-Modal Dysmorphology:</strong> Offline alignment of facial photography dysmorphology landmarks (e.g. GestaltMatcher) with HPO concepts.</li>
            <li><strong>Q4 2027 · Global Multi-Lingual Support:</strong> Expanding native ontology mapping to Spanish, French, and German pediatric records.</li>
          </ul>
        </div>

        <div class="card" style="background: #121212; color: #ffffff; border: none;">
          <div>
            <span class="card-tag" style="color: #94a3b8;">Hackathon Submission Summary</span>
            <h2 class="card-title" style="color: #ffffff; font-size: 26px;">Ending the Diagnostic Odyssey</h2>
            <p class="card-desc" style="color: #cbd5e1; font-size: 14.5px; margin-top: 14px;">
              Phenora demonstrates that hospitals do not need to sacrifice pediatric patient privacy to harness the speed of AI. By anchoring local language models to mathematical ontology graph theory, we provide pediatric geneticists with verifiable, transparent, and reproducible evidence.
            </p>
          </div>

          <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.15);">
            <div style="font-family: 'Newsreader', Georgia, serif; font-size: 20px; color: #ffffff; font-style: italic;">
              "Giving rare disease families answers, safely and deterministically."
            </div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #94a3b8; margin-top: 8px;">
              Team Phenora · Hackathon 2026 Submission
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div class="cue-tag">🎙️ Presenter Script · 3:45 – 4:10</div>
      <div class="voiceover-text">
        "In conclusion, Phenora solves healthcare's impossible triad: complete clinical privacy with zero cloud leaks, high-speed local AI execution, and full FDA Non-Device CDS regulatory compliance. By turning chaotic clinical narratives into deterministic, human-verifiable evidence paths, Phenora empowers pediatric geneticists to end the 7-year diagnostic odyssey for rare disease children. Thank you."
      </div>
    </div>
  </div>

</body>
</html>
"""


def main():
    print(f"Writing editorial HTML deck to: {HTML_PATH}")
    with open(HTML_PATH, "w", encoding="utf-8") as f:
        f.write(HTML_TEMPLATE)

    print(f"Compiling HTML to PDF via Headless Chrome: {CHROME_PATH}")
    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={PDF_PATH}",
        HTML_PATH,
    ]

    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("Chrome error:", res.stderr)
        sys.exit(1)

    print(f"Successfully generated: {PDF_PATH}")

    # Copy to frontend public and dist for browser downloads
    pub_path = os.path.abspath(os.path.join("frontend", "public", "Phenora_Executive_Pitch_Deck.pdf"))
    dist_path = os.path.abspath(os.path.join("frontend", "dist", "Phenora_Executive_Pitch_Deck.pdf"))
    
    with open(PDF_PATH, "rb") as src:
        content = src.read()
        with open(pub_path, "wb") as dst:
            dst.write(content)
        if os.path.exists(os.path.dirname(dist_path)):
            with open(dist_path, "wb") as dst:
                dst.write(content)
    print(f"Copied to {pub_path} and {dist_path} for direct web browser access.")


if __name__ == "__main__":
    main()
