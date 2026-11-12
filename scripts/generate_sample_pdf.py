import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def create_sample_pdf(output_path: str):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=45,
        leftMargin=45,
        topMargin=40,
        bottomMargin=40,
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#111111")
    c_secondary = colors.HexColor("#444444")
    c_accent = colors.HexColor("#1d4ed8")
    c_bg_light = colors.HexColor("#f8fafc")
    c_border = colors.HexColor("#cbd5e1")
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=c_primary,
        alignment=0,
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_secondary,
    )
    
    section_h1 = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=c_accent,
        spaceBefore=10,
        spaceAfter=4,
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=c_primary,
    )
    
    meta_label = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=c_secondary,
    )
    
    meta_val = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=c_primary,
    )
    
    story = []
    
    # Header Hospital Banner
    header_data = [
        [
            Paragraph("<b>CHILDREN'S SPECIALTY HOSPITAL</b><br/>Division of Clinical Genetics & Dysmorphology", title_style),
            Paragraph("<b>CONFIDENTIAL MEDICAL RECORD</b><br/>Synthetic Validation Vignette", subtitle_style)
        ]
    ]
    t_header = Table(header_data, colWidths=[330, 192])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_primary, spaceBefore=0, spaceAfter=10))
    
    # Patient Info Box
    patient_data = [
        [Paragraph("Patient ID:", meta_label), Paragraph("SYN-PED-002", meta_val), Paragraph("DOB / Age:", meta_label), Paragraph("14 Years (Male)", meta_val)],
        [Paragraph("Consultant:", meta_label), Paragraph("Dr. S. Vance, MD", meta_val), Paragraph("Date:", meta_label), Paragraph("November 4, 2026", meta_val)],
        [Paragraph("Reason:", meta_label), Paragraph("Evaluation for connective tissue dysplasia & chest wall deformity", meta_val), Paragraph("Status:", meta_label), Paragraph("Inpatient Referral", meta_val)],
    ]
    t_patient = Table(patient_data, colWidths=[70, 190, 75, 187])
    t_patient.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_light),
        ('BOX', (0,0), (-1,-1), 0.5, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_patient)
    story.append(Spacer(1, 10))
    
    # Clinical Narrative
    story.append(Paragraph("CLINICAL HISTORY & PRESENT ILLNESS", section_h1))
    story.append(Paragraph(
        "The patient is a 14-year-old adolescent evaluated in dysmorphology clinic for tall stature, progressive anterior chest wall deformity, "
        "and reduced exercise tolerance. Parents report disproportionately long limbs since early childhood with accelerated height velocity over "
        "the past two years (current height > 97th percentile, arm span to height ratio 1.08). Ophthalmology examination 4 months prior confirmed "
        "bilateral ectopia lentis with upward subluxation of the crystalline lenses. Denies history of spontaneous pneumothorax. Negates epileptic "
        "seizures or developmental regression. Family history notable for maternal uncle with unexplained sudden cardiac event at age 32.",
        body_style
    ))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph("PHYSICAL EXAMINATION & OBJECTIVE FINDINGS", section_h1))
    story.append(Paragraph(
        "<b>General:</b> Alert, comfortable, asthenic habitus with slender limbs and reduced subcutaneous adipose tissue.<br/>"
        "<b>Craniofacial:</b> Dolichocephaly, downslanting palpebral fissures, malar hypoplasia, retrognathia, and high-arched narrow palate with dental crowding.<br/>"
        "<b>Ocular:</b> Slit-lamp biomicroscopy confirms bilateral ectopia lentis (superior-temporal crystalline lens subluxation).<br/>"
        "<b>Musculoskeletal:</b> Marked arachnodactyly of bilateral hands and feet. Positive Walker-Murdoch wrist sign and positive Steinberg thumb sign bilaterally. "
        "Severe pectus excavatum deformity causing moderate sternal depression. Generalized joint hypermobility with Beighton score 7/9 (bilateral thumbs, fifth digits, "
        "and knee hyperextension). Mild thoracolumbar scoliosis (Cobb angle 18 degrees). Bilateral pes planus with medial malleolar prominence.<br/>"
        "<b>Cardiovascular:</b> S1/S2 present, soft grade 2/6 early diastolic murmur heard best at left sternal border. Transthoracic echocardiogram performed this week "
        "reveals significant aortic root aneurysm at the sinuses of Valsalva (diameter 41 mm, Z-score +3.8) with mild aortic root regurgitation and mild mitral valve prolapse.<br/>"
        "<b>Integumentary & Respiratory:</b> Striae atrophicae across lumbosacral region without history of marked weight fluctuations. Clear breath sounds bilaterally.",
        body_style
    ))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph("GENETIC ASSESSMENT & RECOMMENDATIONS", section_h1))
    story.append(Paragraph(
        "The constellation of bilateral ectopia lentis, aortic root aneurysm (Z-score >= 2), systemic skeletal score > 7 (arachnodactyly, pectus excavatum, "
        "scoliosis, pes planus, high-arched palate), and joint hypermobility fulfills the revised Ghent criteria for <b>Marfan syndrome (OMIM:154700)</b>.<br/>"
        "<b>Plan:</b><br/>"
        "1. Order targeted NGS connective tissue sequencing panel (including <i>FBN1</i>, <i>TGFBR1</i>, <i>TGFBR2</i>, <i>SMAD3</i>).<br/>"
        "2. Initiate prophylactic beta-adrenergic blockade (atenolol) to reduce hemodynamic shear stress on the dilated aortic root.<br/>"
        "3. Serial echocardiographic surveillance every 6 months.<br/>"
        "4. Strict restriction from contact sports, isometric weightlifting, and competitive athletics.<br/>"
        "5. Urgent annual ophthalmology review for retinal detachment prophylaxis.",
        body_style
    ))
    
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=0.5, color=c_border, spaceBefore=4, spaceAfter=6))
    
    footer_text = Paragraph(
        "<i>Synthetic Pediatric Clinical Note &bull; For Local Phenora Air-Gapped OCR and Phenotype Extraction Testing Only &bull; Zero Protected Health Information</i>",
        subtitle_style
    )
    story.append(footer_text)
    
    doc.build(story)
    print(f"Successfully generated: {output_path} ({os.path.getsize(output_path)} bytes)")

if __name__ == "__main__":
    create_sample_pdf("frontend/public/sample_pediatric_consultation.pdf")
    create_sample_pdf("frontend/dist/sample_pediatric_consultation.pdf")
    create_sample_pdf("sample_pediatric_consultation.pdf")
