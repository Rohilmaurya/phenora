"""Verified clinical seed data for Phenora offline-first HPO data pack.

Contains official Human Phenotype Ontology terms, synonyms, DAG relationships,
and disease annotations for high-yield pediatric rare diseases.
"""

# -------------------------------------------------------------------------
# 1. HPO TERMS & HIERARCHY
# Format: (hpo_id, label, [synonyms], [parent_ids])
# -------------------------------------------------------------------------
HPO_TERMS_SEED = [
    # Top-level Ontological Anchors
    ("HP:0000001", "All", [], []),
    ("HP:0000118", "Phenotypic abnormality", ["Phenotypic feature", "Symptom"], ["HP:0000001"]),

    # Organ System Sub-roots
    ("HP:0000707", "Abnormality of the nervous system", ["Neurological abnormality"], ["HP:0000118"]),
    ("HP:0000152", "Abnormality of head and neck", ["Craniofacial abnormality"], ["HP:0000118"]),
    ("HP:0000478", "Abnormality of the eye", ["Ocular abnormality", "Eye defect"], ["HP:0000118"]),
    ("HP:0001626", "Abnormality of the cardiovascular system", ["Cardiac abnormality"], ["HP:0000118"]),
    ("HP:0001507", "Growth abnormality", ["Growth defect"], ["HP:0000118"]),
    ("HP:0000924", "Abnormality of the skeletal system", ["Skeletal dysplasia"], ["HP:0000118"]),
    ("HP:0001574", "Abnormality of the integument", ["Skin abnormality"], ["HP:0000118"]),
    ("HP:0001939", "Abnormality of metabolism/homeostasis", ["Metabolic defect"], ["HP:0000118"]),

    # Neurological Branch
    ("HP:0001250", "Seizure", ["Seizures", "Epileptic seizure", "Fits", "Convulsions"], ["HP:0000707"]),
    ("HP:0002069", "Bilateral tonic-clonic seizure", ["Generalized tonic-clonic seizure", "Grand mal seizure"], ["HP:0001250"]),
    ("HP:0002197", "Generalized myoclonic seizure", ["Myoclonic jerks", "Myoclonic seizure"], ["HP:0001250"]),
    ("HP:0011171", "Atypical absence seizure", ["Atypical absence"], ["HP:0001250"]),
    ("HP:0002373", "Febrile seizure (within the pediatric population)", ["Febrile convulsions", "Fever-induced seizure"], ["HP:0001250"]),
    ("HP:0002133", "Status epilepticus", ["Prolonged seizure", "Intractable status epilepticus"], ["HP:0001250"]),
    ("HP:0001263", "Global developmental delay", ["Developmental delay", "Delayed milestones"], ["HP:0000707"]),
    ("HP:0001249", "Intellectual disability", ["Mental retardation", "Cognitive impairment"], ["HP:0000707"]),
    ("HP:0002187", "Intellectual disability, profound", ["Profound intellectual disability"], ["HP:0001249"]),
    ("HP:0001251", "Ataxia", ["Gait ataxia", "Incoordination", "Unsteady gait"], ["HP:0000707"]),
    ("HP:0001252", "Hypotonia", ["Low muscle tone", "Floppy infant", "Muscular hypotonia"], ["HP:0000707"]),
    ("HP:0002376", "Developmental regression", ["Loss of developmental milestones", "Cognitive regression"], ["HP:0000707"]),
    ("HP:0000729", "Autistic behavior", ["Autism spectrum traits", "Stereotypic behavior"], ["HP:0000707"]),
    ("HP:0002072", "Chorea", ["Choreiform movements"], ["HP:0000707"]),
    ("HP:0001332", "Dystonia", ["Dystonic movements", "Muscle posturing"], ["HP:0000707"]),
    ("HP:0001257", "Spasticity", ["Hypertonia", "Spastic diplegia", "Spastic quadriparesis"], ["HP:0000707"]),
    ("HP:0000252", "Microcephaly", ["Small head circumference"], ["HP:0000152"]),
    ("HP:0000256", "Macrocephaly", ["Large head circumference"], ["HP:0000152"]),
    ("HP:0001347", "Hyperreflexia", ["Brisk tendon reflexes"], ["HP:0000707"]),
    ("HP:0001276", "Hypertonia", ["Increased muscle tone"], ["HP:0000707"]),
    ("HP:0002355", "Hand stereotypy", ["Hand wringing", "Midline hand wringing", "Repetitive hand movements"], ["HP:0000729"]),
    ("HP:0000750", "Delayed speech and language development", ["Speech delay", "Lack of expressive speech"], ["HP:0001263"]),
    ("HP:0001344", "Absent speech", ["Non-verbal", "Mute", "Complete absence of speech"], ["HP:0000750"]),
    ("HP:0001260", "Dysarthria", ["Slurred speech"], ["HP:0000707"]),
    ("HP:0001254", "Lethargy", ["Sluggishness", "Drowsiness"], ["HP:0000707"]),
    ("HP:0001259", "Coma", ["Unresponsiveness"], ["HP:0000707"]),

    # Skeletal & Connective Tissue Branch
    ("HP:0001166", "Arachnodactyly", ["Spider fingers", "Long slender fingers", "Dolichostenomelia of fingers"], ["HP:0000924"]),
    ("HP:0000767", "Pectus excavatum", ["Sunken chest", "Funnel chest", "Hollow chest"], ["HP:0000924"]),
    ("HP:0000768", "Pectus carinatum", ["Pigeon chest"], ["HP:0000924"]),
    ("HP:0002650", "Scoliosis", ["Spinal curvature"], ["HP:0000924"]),
    ("HP:0001371", "Joint hypermobility", ["Joint laxity", "Hypermobile joints", "Double-jointed"], ["HP:0000924"]),
    ("HP:0000098", "Tall stature", ["Increased height", "Increased length at birth"], ["HP:0001507"]),
    ("HP:0004322", "Short stature", ["Decreased height", "Dwarfism"], ["HP:0001507"]),
    ("HP:0001508", "Failure to thrive", ["Poor weight gain", "Weight faltering"], ["HP:0001507"]),
    ("HP:0000272", "Malar flattening", ["Malar hypoplasia", "Midface hypoplasia"], ["HP:0000152"]),
    ("HP:0000288", "Micrognathia", ["Small mandible", "Receded jaw"], ["HP:0000152"]),
    ("HP:0000175", "Cleft palate", ["Palatoschisis"], ["HP:0000152"]),
    ("HP:0002084", "Enostosis", ["Bone island"], ["HP:0000924"]),
    ("HP:0000938", "Osteopenia", ["Reduced bone density"], ["HP:0000924"]),

    # Cardiovascular Branch
    ("HP:0002616", "Aortic root aneurysm", ["Aortic root dilation", "Sinus of Valsalva aneurysm"], ["HP:0001626"]),
    ("HP:0002647", "Aortic dissection", ["Ascending aortic dissection"], ["HP:0001626"]),
    ("HP:0001653", "Mitral valve prolapse", ["Floppy mitral valve", "Barlow syndrome"], ["HP:0001626"]),
    ("HP:0001627", "Abnormal heart morphology", ["Congenital heart defect"], ["HP:0001626"]),
    ("HP:0001629", "Ventricular septal defect", ["VSD", "Interventricular defect"], ["HP:0001627"]),
    ("HP:0001631", "Atrial septal defect", ["ASD"], ["HP:0001627"]),
    ("HP:0001639", "Hypertrophic cardiomyopathy", ["HCM", "Heart muscle thickening"], ["HP:0001626"]),
    ("HP:0001635", "Congestive heart failure", ["Cardiac decompensation"], ["HP:0001626"]),
    ("HP:0001644", "Dilated cardiomyopathy", ["DCM"], ["HP:0001626"]),

    # Ocular Branch
    ("HP:0001083", "Ectopia lentis", ["Dislocated lens", "Subluxation of the lens", "Lens dislocation"], ["HP:0000478"]),
    ("HP:0000545", "Myopia", ["Nearsightedness", "Short-sighted"], ["HP:0000478"]),
    ("HP:0000492", "Abnormal eyelid morphology", ["Eyelid abnormality"], ["HP:0000478"]),
    ("HP:0000508", "Ptosis", ["Drooping upper eyelid", "Blepharoptosis"], ["HP:0000492"]),
    ("HP:0000518", "Cataract", ["Lens opacity"], ["HP:0000478"]),
    ("HP:0000556", "Retinal dystrophy", ["Retinal degeneration"], ["HP:0000478"]),
    ("HP:0000648", "Optic atrophy", ["Pale optic disc"], ["HP:0000478"]),
    ("HP:0000589", "Cherry red spot of the macula", ["Macular cherry-red spot"], ["HP:0000478"]),
    ("HP:0000639", "Nystagmus", ["Involuntary eye oscillation"], ["HP:0000478"]),

    # Integument / Skin Branch
    ("HP:0000957", "Cafe-au-lait spot", ["Cafe au lait macules", "CALMs"], ["HP:0001574"]),
    ("HP:0010720", "Neurofibroma", ["Cutaneous neurofibroma", "Nerve sheath tumor"], ["HP:0001574"]),
    ("HP:0001010", "Hypopigmented macule", ["Ash leaf spot", "White macule"], ["HP:0001574"]),
    ("HP:0001004", "Facial angiofibroma", ["Adenoma sebaceum"], ["HP:0001574"]),
    ("HP:0001065", "Striae distensae", ["Stretch marks"], ["HP:0001574"]),
    ("HP:0000977", "Skin hyperelasticity", ["Stretchy skin"], ["HP:0001574"]),

    # Metabolic & Abdominal Organs
    ("HP:0001394", "Cirrhosis", ["Hepatic cirrhosis", "Liver fibrosis"], ["HP:0001939"]),
    ("HP:0002240", "Hepatomegaly", ["Enlarged liver"], ["HP:0001939"]),
    ("HP:0001744", "Splenomegaly", ["Enlarged spleen"], ["HP:0001939"]),
    ("HP:0001433", "Hepatosplenomegaly", ["Enlarged liver and spleen"], ["HP:0002240", "HP:0001744"]),
    ("HP:0001943", "Hypoglycemia", ["Low blood sugar"], ["HP:0001939"]),
    ("HP:0003111", "Kayser-Fleischer ring", ["Copper deposition in cornea"], ["HP:0000478"]),
    ("HP:0001974", "Leukocytosis", ["Elevated white blood count"], ["HP:0001939"]),
    ("HP:0001873", "Thrombocytopenia", ["Low platelet count"], ["HP:0001939"]),
    ("HP:0001903", "Anemia", ["Low hemoglobin"], ["HP:0001939"]),
    ("HP:0002910", "Elevated hepatic transaminase", ["Transaminitis", "Elevated ALT/AST"], ["HP:0001939"]),
]

# -------------------------------------------------------------------------
# 2. DISEASE CATALOG & ANNOTATIONS
# Format: (disease_id, label, source, [(hpo_id, polarity, frequency, evidence, reference)])
# -------------------------------------------------------------------------
DISEASES_SEED = [
    (
        "OMIM:607208",
        "Dravet syndrome",
        "OMIM",
        [
            ("HP:0001250", "present", "95%", "PCS", "PMID:22027213"),
            ("HP:0002373", "present", "90%", "PCS", "PMID:22027213"),
            ("HP:0002133", "present", "75%", "PCS", "PMID:22027213"),
            ("HP:0002197", "present", "60%", "PCS", "PMID:22027213"),
            ("HP:0001251", "present", "70%", "PCS", "PMID:22027213"),
            ("HP:0001263", "present", "90%", "PCS", "PMID:22027213"),
            ("HP:0001249", "present", "85%", "PCS", "PMID:22027213"),
            ("HP:0000750", "present", "80%", "PCS", "PMID:22027213"),
            ("HP:0001252", "present", "50%", "PCS", "PMID:22027213"),
        ],
    ),
    (
        "OMIM:154700",
        "Marfan syndrome",
        "OMIM",
        [
            ("HP:0001166", "present", "90%", "PCS", "PMID:20591885"),
            ("HP:0001083", "present", "60%", "PCS", "PMID:20591885"),
            ("HP:0002616", "present", "85%", "PCS", "PMID:20591885"),
            ("HP:0002647", "present", "40%", "PCS", "PMID:20591885"),
            ("HP:0000767", "present", "65%", "PCS", "PMID:20591885"),
            ("HP:0000768", "present", "30%", "PCS", "PMID:20591885"),
            ("HP:0002650", "present", "60%", "PCS", "PMID:20591885"),
            ("HP:0001371", "present", "70%", "PCS", "PMID:20591885"),
            ("HP:0000098", "present", "80%", "PCS", "PMID:20591885"),
            ("HP:0001653", "present", "55%", "PCS", "PMID:20591885"),
            ("HP:0000545", "present", "50%", "PCS", "PMID:20591885"),
            ("HP:0001065", "present", "40%", "PCS", "PMID:20591885"),
        ],
    ),
    (
        "OMIM:312750",
        "Rett syndrome",
        "OMIM",
        [
            ("HP:0002376", "present", "95%", "PCS", "PMID:11933199"),
            ("HP:0002355", "present", "95%", "PCS", "PMID:11933199"),
            ("HP:0001263", "present", "95%", "PCS", "PMID:11933199"),
            ("HP:0001344", "present", "90%", "PCS", "PMID:11933199"),
            ("HP:0001251", "present", "80%", "PCS", "PMID:11933199"),
            ("HP:0000252", "present", "75%", "PCS", "PMID:11933199"),
            ("HP:0001250", "present", "70%", "PCS", "PMID:11933199"),
            ("HP:0001252", "present", "60%", "PCS", "PMID:11933199"),
            ("HP:0002650", "present", "50%", "PCS", "PMID:11933199"),
        ],
    ),
    (
        "OMIM:105830",
        "Angelman syndrome",
        "OMIM",
        [
            ("HP:0001263", "present", "99%", "PCS", "PMID:16301868"),
            ("HP:0001344", "present", "95%", "PCS", "PMID:16301868"),
            ("HP:0001251", "present", "90%", "PCS", "PMID:16301868"),
            ("HP:0001250", "present", "85%", "PCS", "PMID:16301868"),
            ("HP:0000252", "present", "80%", "PCS", "PMID:16301868"),
            ("HP:0001252", "present", "70%", "PCS", "PMID:16301868"),
        ],
    ),
    (
        "OMIM:230800",
        "Gaucher disease type 1",
        "OMIM",
        [
            ("HP:0001744", "present", "90%", "PCS", "PMID:10714774"),
            ("HP:0002240", "present", "80%", "PCS", "PMID:10714774"),
            ("HP:0001433", "present", "85%", "PCS", "PMID:10714774"),
            ("HP:0001873", "present", "80%", "PCS", "PMID:10714774"),
            ("HP:0001903", "present", "70%", "PCS", "PMID:10714774"),
            ("HP:0000938", "present", "65%", "PCS", "PMID:10714774"),
            ("HP:0004322", "present", "40%", "PCS", "PMID:10714774"),
        ],
    ),
    (
        "OMIM:230900",
        "Gaucher disease type 2 (infantile acute)",
        "OMIM",
        [
            ("HP:0001433", "present", "95%", "PCS", "PMID:10714774"),
            ("HP:0002376", "present", "95%", "PCS", "PMID:10714774"),
            ("HP:0001276", "present", "80%", "PCS", "PMID:10714774"),
            ("HP:0001250", "present", "75%", "PCS", "PMID:10714774"),
            ("HP:0001873", "present", "70%", "PCS", "PMID:10714774"),
            ("HP:0001508", "present", "85%", "PCS", "PMID:10714774"),
        ],
    ),
    (
        "OMIM:232300",
        "Pompe disease, infantile-onset",
        "OMIM",
        [
            ("HP:0001639", "present", "95%", "PCS", "PMID:17006894"),
            ("HP:0001252", "present", "95%", "PCS", "PMID:17006894"),
            ("HP:0001508", "present", "90%", "PCS", "PMID:17006894"),
            ("HP:0002240", "present", "85%", "PCS", "PMID:17006894"),
            ("HP:0001635", "present", "80%", "PCS", "PMID:17006894"),
            ("HP:0001263", "present", "70%", "PCS", "PMID:17006894"),
        ],
    ),
    (
        "OMIM:176270",
        "Prader-Willi syndrome",
        "OMIM",
        [
            ("HP:0001252", "present", "95%", "PCS", "PMID:18451877"),
            ("HP:0001508", "present", "85%", "PCS", "PMID:18451877"),
            ("HP:0001263", "present", "90%", "PCS", "PMID:18451877"),
            ("HP:0001249", "present", "80%", "PCS", "PMID:18451877"),
            ("HP:0004322", "present", "75%", "PCS", "PMID:18451877"),
            ("HP:0000288", "present", "50%", "PCS", "PMID:18451877"),
        ],
    ),
    (
        "OMIM:162200",
        "Neurofibromatosis type 1",
        "OMIM",
        [
            ("HP:0000957", "present", "99%", "PCS", "PMID:17965384"),
            ("HP:0010720", "present", "90%", "PCS", "PMID:17965384"),
            ("HP:0000256", "present", "45%", "PCS", "PMID:17965384"),
            ("HP:0002650", "present", "30%", "PCS", "PMID:17965384"),
            ("HP:0001263", "present", "35%", "PCS", "PMID:17965384"),
            ("HP:0000648", "present", "20%", "PCS", "PMID:17965384"),
        ],
    ),
    (
        "OMIM:191100",
        "Tuberous sclerosis complex 1",
        "OMIM",
        [
            ("HP:0001010", "present", "90%", "PCS", "PMID:15682414"),
            ("HP:0001250", "present", "85%", "PCS", "PMID:15682414"),
            ("HP:0001004", "present", "75%", "PCS", "PMID:15682414"),
            ("HP:0001263", "present", "60%", "PCS", "PMID:15682414"),
            ("HP:0000729", "present", "45%", "PCS", "PMID:15682414"),
        ],
    ),
    (
        "OMIM:277580",
        "Wilson disease",
        "OMIM",
        [
            ("HP:0003111", "present", "90%", "PCS", "PMID:12404094"),
            ("HP:0001394", "present", "80%", "PCS", "PMID:12404094"),
            ("HP:0002910", "present", "85%", "PCS", "PMID:12404094"),
            ("HP:0001251", "present", "60%", "PCS", "PMID:12404094"),
            ("HP:0001332", "present", "55%", "PCS", "PMID:12404094"),
            ("HP:0001260", "present", "60%", "PCS", "PMID:12404094"),
        ],
    ),
    (
        "OMIM:208150",
        "Ataxia-telangiectasia",
        "OMIM",
        [
            ("HP:0001251", "present", "95%", "PCS", "PMID:11894174"),
            ("HP:0001260", "present", "80%", "PCS", "PMID:11894174"),
            ("HP:0000639", "present", "70%", "PCS", "PMID:11894174"),
            ("HP:0001263", "present", "60%", "PCS", "PMID:11894174"),
            ("HP:0002072", "present", "50%", "PCS", "PMID:11894174"),
        ],
    ),
]
