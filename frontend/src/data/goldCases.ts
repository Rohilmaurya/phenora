export interface GoldCase {
  id: string;
  name: string;
  geneOrCategory: string;
  expectedDisease: string;
  omimId: string;
  description: string;
  noteText: string;
}

export const GOLD_CASES: GoldCase[] = [
  {
    id: "SYN-PED-001",
    name: "Case 1: Dravet Syndrome",
    geneOrCategory: "SCN1A / Channelopathy",
    expectedDisease: "Dravet syndrome",
    omimId: "OMIM:607208",
    description: "Infant with fever-induced refractory status epilepticus and ataxia",
    noteText:
      "A 9-month-old infant presents to the pediatric neurology clinic following multiple episodes of febrile seizures. Recent events have progressed to prolonged status epilepticus requiring ICU admission. Examination reveals notable gait ataxia and developmental delay. Mother reports no history of seizures in the family.",
  },
  {
    id: "SYN-PED-002",
    name: "Case 2: Marfan Syndrome",
    geneOrCategory: "FBN1 / Connective Tissue",
    expectedDisease: "Marfan syndrome",
    omimId: "OMIM:154700",
    description: "Adolescent with tall stature, pectus deformity, and aortic root dilation",
    noteText:
      "A 14-year-old boy evaluated for chest deformity. Physical exam demonstrates distinct arachnodactyly with elongated digits, marked pectus excavatum, and joint hypermobility. Ophthalmologic examination reveals bilateral ectopia lentis. Transthoracic echocardiogram showed aortic root aneurysm.",
  },
  {
    id: "SYN-PED-003",
    name: "Case 3: Negation / Exclusion Test",
    geneOrCategory: "Safety Validation Case",
    expectedDisease: "No Positive Phenotypes (Excluded)",
    omimId: "N/A",
    description: "Pediatric checkup with multiple negated findings and family history only",
    noteText:
      "A 5-year-old female presents for routine wellness evaluation. Patient has no seizures, denies muscle weakness, and exhibits no developmental delay. Father has a documented history of hypertrophic cardiomyopathy. Neurological examination is entirely within normal limits with no ataxia.",
  },
  {
    id: "SYN-PED-004",
    name: "Case 4: Rett Syndrome",
    geneOrCategory: "MECP2 / Neurodevelopmental",
    expectedDisease: "Rett syndrome",
    omimId: "OMIM:312750",
    description: "Female toddler with rapid developmental regression and stereotypic hand movements",
    noteText:
      "A 2-year-old female presents for evaluation of developmental regression. Development was normal until approximately 14 months of age, followed by loss of acquired purposeful hand skills and loss of spoken language. Physical examination shows midline stereotypic hand wringing movements, deceleration of head growth consistent with acquired microcephaly, and prominent gait ataxia.",
  },
];
