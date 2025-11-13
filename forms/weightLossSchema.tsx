// forms/weightLossSchema.ts
export type Attachment = {
  name: string
  dataUrl: string
}

export type WeightAssessment = {
  about_ack?: boolean;
  name: string
  for_self: boolean
  age_18_to_85: boolean
  ethnicity: string[]
  pregnant_or_breastfeeding_or_planning: boolean
  pregnancy_details?: string
  height_cm?: number
  weight_kg?: number
  bmi?: number
  target_weight_kg?: number
  scale_photo?: Attachment
  full_body_photo?: Attachment
  weight_related_conditions: string[]
  smoke: boolean
  want_smoking_help?: boolean
  drink_alcohol: boolean
  want_alcohol_info?: boolean
  used_weight_loss_before: boolean
  weight_loss_details?: string
  higher_strength_evidence?: Attachment[]

  eating_disorder: boolean
  eating_disorder_details?: string
  has_conditions: string[]
  has_medicines: string[]
  oral_contraceptives: boolean
  oral_contraceptives_details?: string
  exercise_4_5_per_week: boolean
  exercise_details?: string
  daily_calories: 'lt1500' | '1500to2500' | 'gt2500'

  kidney_or_liver_impairment: boolean
  kidney_liver_details?: string
  other_medical_conditions: boolean
  other_medical_details?: string
  current_or_recent_meds: boolean
  current_recent_meds_details?: string
  allergies: boolean
  allergy_details?: string

  gp_name?: string
  gp_email?: string
  gp_practice?: string

  ack_needles_swabs_bin: boolean
  ack_first_attempt_delivery: boolean
  consent_scr_access: boolean
  ack_treatment_rules: boolean
  final_declaration: boolean
}

export const OPTIONS = {
  ethnicities: [
    'South Asian',
    'Chinese',
    'Middle Eastern',
    'Other Asian',
    'Black African',
    'African Caribbean',
    'None of the above',
  ],
  weightConditions: [
    'Acid reflux or GORD',
    'High blood pressure',
    'Erectile dysfunction',
    'Cardiovascular disease',
    'High cholesterol',
    'Knee or hip osteoarthritis',
    'Asthma',
    'COPD',
    'Obstructive sleep apnoea',
    'Polycystic ovary syndrome',
    'Perimenopause or menopause',
    'None of the above',
  ],
  medicalConditions: [
    'Cholestasis or chronic malabsorption',
    'Thyroid disease',
    'Thyroid cancer or MEN2 or family history',
    'Inflammatory bowel disease',
    'Gastroparesis',
    'Type 1 or Type 2 diabetes',
    'Gallbladder or bile problems',
    'Gallstones',
    'Pancreatitis',
    'Electrolyte imbalance',
    'Retinopathy',
  ],
  medicines: [
    'Anticoagulants such as warfarin or rivaroxaban',
    'Amiodarone',
    'Vitamins A D E K',
    'Ciclosporin',
    'Antiretrovirals such as tenofovir efavirenz abacavir emtricitabine',
    'Acarbose',
    'Epilepsy medication',
    'Diabetes or PCOS medication or insulin',
  ],
  calories: [
    { value: 'lt1500', label: 'Less than one thousand five hundred' },
    { value: '1500to2500', label: 'Between one thousand five hundred and two thousand five hundred' },
    { value: 'gt2500', label: 'More than two thousand five hundred' },
  ] as const,
}
