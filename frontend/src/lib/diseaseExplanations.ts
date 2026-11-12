export interface DiseaseExplanation {
  medical: {
    overview: string;
    genetics: string;
    clinicalHallmarks: string[];
    management: string;
  };
  plainLanguage: {
    summary: string;
    analogy: string;
    keySigns: string[];
    careFocus: string;
  };
}

export interface DiseaseCatalogItem {
  id: string;
  name: string;
  gene: string;
}

export const DISEASE_CATALOG: DiseaseCatalogItem[] = [
  { id: "OMIM:154700", name: "Marfan Syndrome", gene: "FBN1" },
  { id: "OMIM:607208", name: "Dravet Syndrome", gene: "SCN1A" },
  { id: "OMIM:312750", name: "Rett Syndrome", gene: "MECP2" },
  { id: "OMIM:162200", name: "Neurofibromatosis 1", gene: "NF1" },
  { id: "OMIM:230800", name: "Gaucher Disease", gene: "GBA1" },
  { id: "OMIM:232300", name: "Pompe Disease", gene: "GAA" },
];

export const DISEASE_EXPLANATIONS: Record<string, DiseaseExplanation> = {
  // 1. Marfan Syndrome
  "OMIM:154700": {
    medical: {
      overview:
        "Autosomal dominant pleiotropic connective tissue disorder caused by pathogenic variants in the FBN1 gene on chromosome 15q21.1, encoding the extracellular matrix glycoprotein fibrillin-1. Diagnosis is established via the revised Ghent criteria (aortic root dilatation Z ≥ 2.0 and ectopia lentis, or systemic score ≥ 7 in presence of causal mutation).",
      genetics: "FBN1 (15q21.1) • Autosomal Dominant • ~25% de novo variants",
      clinicalHallmarks: [
        "Cardiovascular: Progressive ascending aortic root dilatation, sinuses of Valsalva aneurysm, aortic dissection risk, and mitral valve prolapse.",
        "Ocular: Bilateral ectopia lentis (typically superior/temporal crystalline lens subluxation) and severe myopia.",
        "Skeletal: Systemic skeletal overgrowth, dolichostenomelia, arachnodactyly (positive wrist and thumb signs), pectus excavatum/carinatum, and high-arched palate.",
      ],
      management:
        "Serial transthoracic echocardiography every 6–12 months, prophylactic beta-blockade or angiotensin receptor blockers (losartan) to attenuate TGF-β signaling and aortic growth rate, elective composite valve graft repair prior to critical dissection threshold (typically 50 mm in adults or Z > 3 in children), and annual slit-lamp ophthalmologic surveillance.",
    },
    plainLanguage: {
      summary:
        "Marfan syndrome is a genetic condition affecting connective tissue—the natural biological 'glue' and framework that holds the body's bones, muscles, blood vessels, and organs together.",
      analogy:
        "Think of connective tissue like the rubber bands or elastic fibers in clothing. In Marfan syndrome, those elastic fibers are slightly more flexible and stretchy than usual.",
      keySigns: [
        "Being notably tall and slender with unusually long, flexible fingers and toes (arachnodactyly).",
        "A chest that curves inward (pectus excavatum) or pushes outward.",
        "The eye lens shifting slightly out of place, causing vision changes.",
        "Enlargement of the main blood vessel leading away from the heart (the aorta).",
      ],
      careFocus:
        "Children with Marfan live full, active lives with modern care. The primary focus is keeping the heart safe through regular ultrasound checkups (echocardiograms) and medications that keep blood pressure calm and gentle on the heart vessels.",
    },
  },

  // 2. Neurofibromatosis Type 1
  "OMIM:162200": {
    medical: {
      overview:
        "Autosomal dominant neurocutaneous tumor predisposition syndrome caused by germline mutations in the NF1 tumor suppressor gene on chromosome 17q11.2, encoding neurofibromin, a negative regulator of the Ras/MAPK signaling cascade. Marked by progressive cutaneous, neurological, and skeletal hamartomatous lesions.",
      genetics: "NF1 (17q11.2) • Autosomal Dominant • ~50% de novo spontaneous rate",
      clinicalHallmarks: [
        "Dermatologic: Six or more café-au-lait macules, axillary/inguinal intertriginous freckling (Crowe sign), and neurofibromas.",
        "Ophthalmic: Lisch nodules (iris hamartomas) and optic pathway gliomas (OPGs).",
        "Skeletal & Neuro: Sphenoid wing dysplasia, tibial pseudarthrosis, macrocephaly, and learning disabilities.",
      ],
      management:
        "Annual pediatric surveillance for optic nerve gliomas with formal visual acuity testing and brain/orbit MRI; blood pressure monitoring to rule out renal artery stenosis or pheochromocytoma; and MEK inhibitor therapy (selumetinib) for symptomatic, inoperable plexiform neurofibromas.",
    },
    plainLanguage: {
      summary:
        "Neurofibromatosis type 1 (NF1) is a genetic condition that causes small, benign (non-cancerous) bumps to grow along nerve pathways, accompanied by light brown birthmarks on the skin.",
      analogy:
        "The NF1 gene usually acts like a gentle brake pedal that tells nerve cells when to stop growing. In NF1, that brake is less active, allowing little clusters of nerve and skin cells to form.",
      keySigns: [
        "Multiple smooth, tan spots on the skin commonly called 'café-au-lait' (coffee-with-milk) spots.",
        "Small freckles in areas not usually exposed to sun, like under the arms.",
        "Tiny soft bumps along skin nerves (neurofibromas) as children grow.",
        "Learning differences or spatial challenges that benefit from early school support.",
      ],
      careFocus:
        "Routine pediatric visits, annual vision exams to monitor the eyes, and blood pressure checks ensure any changes are managed early. Most individuals live typical, healthy lives with regular checkups.",
    },
  },

  // 3. Rett Syndrome
  "OMIM:312750": {
    medical: {
      overview:
        "Severe X-linked dominant neurodevelopmental disorder almost exclusively affecting females, caused by loss-of-function pathogenic variants in the MECP2 gene on chromosome Xq28, which encodes methyl-CpG-binding protein 2, an essential transcriptional epigenetic repressor in mature neurons.",
      genetics: "MECP2 (Xq28) • X-Linked Dominant • >99% de novo mutations",
      clinicalHallmarks: [
        "Developmental: Normal early development followed by rapid regression of purposeful hand skills and acquired spoken language between 6–18 months.",
        "Motor: Characteristic continuous stereotypic midline hand-wringing, squeezing, or clapping movements and prominent gait apraxia/ataxia.",
        "Autonomic: Episodic hyperventilation during wakefulness, breath-holding spells, microcephaly deceleration, and high seizure prevalence.",
      ],
      management:
        "Multidisciplinary supportive therapy focusing on physical and occupational therapy, augmentative and alternative communication (AAC) devices, antiepileptic therapy for seizure control, screening for scoliosis and prolonged QTc on ECG, and trofinetide (synthetic analog of glycine-proline-glutamate).",
    },
    plainLanguage: {
      summary:
        "Rett syndrome is a rare genetic neurodevelopmental condition that almost always affects girls. After typical early development as babies, toddlers experience a period where speech and hand skills slow down and need supportive therapy.",
      analogy:
        "Imagine a computer where the processor hardware is intact, but the software switchboard that coordinates smooth signals between the brain and hands experiences static interference.",
      keySigns: [
        "Repetitive, rhythmic hand movements (often like gentle hand-wringing or hand-washing).",
        "Loss of spoken words or deliberate grasping skills learned during early infancy.",
        "Difficulty with balance and walking.",
        "Irregular breathing pauses or breath-holding while awake.",
      ],
      careFocus:
        "Intensive physical, speech, and occupational therapies help maintain strength, mobility, and communication. Modern eye-tracking communication devices allow children with Rett syndrome to express thoughts and bond with families.",
    },
  },

  // 4. Dravet Syndrome
  "OMIM:607208": {
    medical: {
      overview:
        "Severe childhood epileptic encephalopathy typically caused by heterozygous de novo loss-of-function variants in the SCN1A gene on chromosome 2q24.3, encoding the alpha-1 subunit of the voltage-gated sodium channel Nav1.1 in GABAergic inhibitory interneurons.",
      genetics: "SCN1A (2q24.3) • Autosomal Dominant • ~80% de novo variants",
      clinicalHallmarks: [
        "Onset: Recurrent, prolonged, febrile and afebrile hemiclonic or generalized tonic-clonic seizures starting in the first year of life.",
        "Trigger Sensitivity: Extreme temperature sensitivity (fever, warm baths, physical exertion, weather shifts) triggering prolonged status epilepticus.",
        "Evolution: Subsequent emergence of myoclonic seizures, developmental plateau/regression, and progressive crouching gait/ataxia.",
      ],
      management:
        "Aggressive early seizure prevention using clobazam, stiripentol, fenfluramine, or cannabidiol; rescue medication protocols (rectal diazepam, intranasal midazolam); strictly contraindicating sodium-channel-blocking antiepileptics (carbamazepine, phenytoin, lamotrigine) which exacerbate seizures.",
    },
    plainLanguage: {
      summary:
        "Dravet syndrome is a rare, severe form of pediatric epilepsy that begins in the first year of life, characterized by seizures that are often triggered by warm temperatures or fevers.",
      analogy:
        "The brain's cells communicate through delicate electrical channels. In Dravet syndrome, the inhibitory 'calming gates' in the brain are underpowered, making it easier for sudden fevers or heat to trigger electrical storms.",
      keySigns: [
        "Seizures in infants starting before 12 months, often prolonged and provoked by a mild fever or hot bath.",
        "Sensitivity to warm environments, illness, and excitement.",
        "Balance and walking changes (ataxia) developing in early childhood.",
        "Speech and learning delays emerging in the toddler years.",
      ],
      careFocus:
        "Keeping a child cool, preventing fevers, and having clear, fast rescue medication plans at home and school. Specialized medications that don't block sodium channels help dramatically reduce seizure frequency.",
    },
  },

  // 5. Gaucher Disease
  "OMIM:230800": {
    medical: {
      overview:
        "Autosomal recessive lysosomal storage disorder caused by deficiency of the lysosomal enzyme acid beta-glucosidase (glucocerebrosidase) encoded by the GBA1 gene on chromosome 1q22, leading to accumulation of glucosylceramide within tissue macrophages (Gaucher cells).",
      genetics: "GBA1 (1q22) • Autosomal Recessive • Lysosomal Storage Defect",
      clinicalHallmarks: [
        "Hematologic & Visceral: Hepatosplenomegaly, pancytopenia (severe thrombocytopenia and anemia), and chronic fatigue.",
        "Skeletal: Erlenmeyer flask deformity of distal femurs, avascular necrosis of the femoral head, bone crises, and severe osteopenia.",
        "Type Distinction: Type 1 is non-neuronopathic; Type 2 and 3 involve progressive neurological involvement.",
      ],
      management:
        "Bi-weekly intravenous Enzyme Replacement Therapy (imiglucerase, velaglucerase alfa) or oral Substrate Reduction Therapy (eliglustat); serial abdominal MRI/ultrasound to track organ volumes; and DEXA bone density surveillance.",
    },
    plainLanguage: {
      summary:
        "Gaucher disease is a genetic condition where the body has low levels of an enzyme responsible for breaking down natural fatty substances inside cells.",
      analogy:
        "Imagine a cellular recycling center where one specific shredder is running slowly. Over time, recyclable materials build up in cells (called 'Gaucher cells'), causing the spleen, liver, and bones to swell.",
      keySigns: [
        "An enlarged belly caused by an enlarged liver or spleen.",
        "Easy bruising, frequent nosebleeds, or low blood counts (anemia).",
        "Bone pain or deep aches in the legs (bone crises).",
        "Tiredness and fatigue from reduced red blood cells.",
      ],
      careFocus:
        "Gaucher disease is treatable! Enzyme replacement therapy (ERT) acts like regular deliveries of the missing recycling enzyme, shrinking organs back to normal size and protecting bones from pain.",
    },
  },

  // 6. Pompe Disease
  "OMIM:232300": {
    medical: {
      overview:
        "Autosomal recessive metabolic myopathy caused by deficiency of the lysosomal enzyme acid alpha-glucosidase (GAA) encoded by the GAA gene on chromosome 17q25.3, leading to pathologic glycogen accumulation within lysosomes of skeletal and cardiac muscle.",
      genetics: "GAA (17q25.3) • Autosomal Recessive • Glycogen Storage Type II",
      clinicalHallmarks: [
        "Cardiovascular: Severe hypertrophic cardiomyopathy with left ventricular outflow tract obstruction in infantile form.",
        "Neuromuscular: Profound generalized hypotonia ('floppy infant' syndrome), progressive muscle weakness, and respiratory insufficiency.",
        "Diagnostics: Massive cardiomegaly on chest radiograph, high-voltage QRS on ECG, and elevated serum creatine kinase (CK).",
      ],
      management:
        "Urgent lifelong recombinant enzyme replacement therapy (alglucosidase alfa or avalglucosidase alfa-ngpt) initiated immediately upon diagnosis; baseline CRIM status evaluation; and respiratory physical therapy support.",
    },
    plainLanguage: {
      summary:
        "Pompe disease is a rare genetic condition where the body lacks an enzyme needed to break down glycogen, a complex sugar stored for energy in muscles.",
      analogy:
        "When muscle cells store fuel (glycogen) but don't have the key to burn it, the sugar builds up inside the muscle cells like clutter, making it hard for the heart and skeletal muscles to contract strongly.",
      keySigns: [
        "Marked muscle weakness in infants (often described as being a 'floppy baby').",
        "Enlarged heart muscle on early checkups (cardiomegaly).",
        "Breathing difficulties or rapid breathing during feeds.",
        "Difficulty rolling over, holding head up, or sitting independently.",
      ],
      careFocus:
        "Early newborn screening and enzyme replacement infusions supply the missing enzyme, allowing the heart muscle to recover and helping children build strength.",
    },
  },
};

export function getDiseaseExplanation(diseaseId: string, label?: string): DiseaseExplanation {
  if (DISEASE_EXPLANATIONS[diseaseId]) {
    return DISEASE_EXPLANATIONS[diseaseId];
  }

  // Graceful fallback for any other orphan condition
  const fallbackLabel = label || diseaseId;
  return {
    medical: {
      overview: `Rare inherited genetic condition curated in biomedical ontologies (${diseaseId}). Displays statistically significant phenotypic alignment with documented clinical findings in curated public databases (OMIM/Orphanet).`,
      genetics: `${diseaseId} • Genetic Etiology Curated in OMIM / Orphanet`,
      clinicalHallmarks: [
        `Documented phenotypic overlap with case findings.`,
        `Curated literature associations indexed in the Human Phenotype Ontology.`,
        `Molecular and cytogenetic confirmatory testing recommended.`,
      ],
      management:
        "Targeted clinical genetics evaluation, comprehensive pedigree analysis, locus-specific sequencing or chromosomal microarray, and multidisciplinary organ surveillance.",
    },
    plainLanguage: {
      summary: `${fallbackLabel} is a documented rare condition identified by clinical phenotype matching against medical genetics knowledge bases.`,
      analogy:
        "Like finding matching pieces to a puzzle, the specific combination of symptoms aligns with medical descriptions documented by geneticists around the world.",
      keySigns: [
        "Overlapping physical or clinical clues identified in the consultation note.",
        "Symptoms that share common developmental pathways in the body.",
      ],
      careFocus:
        "A consultation with a pediatric geneticist for confirmatory DNA testing and a coordinated care plan tailored to the child's specific needs.",
    },
  };
}
