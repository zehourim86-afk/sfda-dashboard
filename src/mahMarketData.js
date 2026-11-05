// Demo seed data for the Market Intelligence page (MahMarketIntelligence.js).
// All figures, circular references and supplier records are illustrative sample data,
// not real SFDA, ZATCA or GASTAT records. The UI labels every tab as demo data.

// ── Opportunity Scout ────────────────────────────────
export const CATEGORY_REPORTS = [
  {
    key: 'omega3', name: 'Omega-3 / Fish oil', keywords: ['omega', 'fish oil'],
    market_size: 'SAR 420M (2025 est.)', growth: '+12% YoY', growth_direction: 'up',
    top_importers: ['Nordic Naturals (Norway)', 'BASF (Germany)', 'DSM Nutritional (Netherlands)'],
    sfda_registered_products: 847, avg_clearance_days: 18, rejection_rate: '4.2%',
    top_rejection_reasons: ['Missing Halal certificate', 'CoA not from accredited lab', 'Label Arabic translation missing'],
    cold_chain_required: false, halal_required: true,
    recommendation: 'GROWING — Strong demand driven by cardiovascular health awareness. Saudi Vision 2030 wellness initiatives supporting market expansion. Recommend entering with TGA/EU-certified supplier to minimize SFDA queries.',
    risk_level: 'LOW',
  },
  {
    key: 'probiotics', name: 'Probiotics', keywords: ['probiotic', 'lactobacillus'],
    market_size: 'SAR 180M (2025 est.)', growth: '+19% YoY', growth_direction: 'up',
    top_importers: ['Chr. Hansen (Denmark)', 'Lallemand (Canada)', 'BioGaia (Sweden)'],
    sfda_registered_products: 312, avg_clearance_days: 22, rejection_rate: '7.8%',
    top_rejection_reasons: ['Viability claims not substantiated', 'Storage condition mismatch', 'Missing stability study'],
    cold_chain_required: true, halal_required: true,
    recommendation: 'HIGH GROWTH — Underpenetrated category with significant upside. Higher rejection rate due to cold chain complexity. Recommend partnering with logistics provider with validated cold chain before committing.',
    risk_level: 'MEDIUM',
  },
  {
    key: 'collagen', name: 'Collagen', keywords: ['collagen'],
    market_size: 'SAR 290M (2025 est.)', growth: '+24% YoY', growth_direction: 'up',
    top_importers: ['Rousselot (France)', 'Gelita (Germany)', 'Nitta Gelatin (Japan)'],
    sfda_registered_products: 521, avg_clearance_days: 16, rejection_rate: '5.1%',
    top_rejection_reasons: ['Source declaration missing (bovine/marine)', 'Halal slaughter certificate required', 'Novel food claims'],
    cold_chain_required: false, halal_required: true,
    recommendation: 'FAST GROWING — Beauty-from-within trend driving strong growth among 25-45 female demographic. Source declaration is critical — marine collagen has simpler Halal pathway than bovine. High competition from Korean and Japanese brands.',
    risk_level: 'LOW',
  },
  {
    key: 'vitamind', name: 'Vitamin D', keywords: ['vitamin d', 'cholecalciferol'],
    market_size: 'SAR 340M (2025 est.)', growth: '+8% YoY', growth_direction: 'up',
    top_importers: ['DSM (Netherlands)', 'BASF (Germany)', 'Fermenta Biotech (India)'],
    sfda_registered_products: 1203, avg_clearance_days: 14, rejection_rate: '3.1%',
    top_rejection_reasons: ['Dosage exceeds OTC limit', 'Missing pharmacist dispensing note', 'CoA potency deviation'],
    cold_chain_required: false, halal_required: true,
    recommendation: 'MATURE MARKET — Saudi Arabia has one of the highest Vitamin D deficiency rates globally (up to 80% prevalence). Market is large but highly competitive with 1,200+ registered products. Differentiate on format (gummies, sublingual drops) rather than ingredient.',
    risk_level: 'LOW',
  },
  {
    key: 'sunscreen', name: 'Sunscreen', keywords: ['sunscreen', 'spf'],
    market_size: 'SAR 510M (2025 est.)', growth: '+15% YoY', growth_direction: 'up',
    top_importers: ["L'Oréal (France)", 'Beiersdorf (Germany)', 'Johnson & Johnson (USA)'],
    sfda_registered_products: 2841, avg_clearance_days: 19, rejection_rate: '6.3%',
    top_rejection_reasons: ['SPF claim not matching test report', 'UV filter not on SFDA permitted list', 'Stability test missing for Saudi climate'],
    cold_chain_required: false, halal_required: false,
    recommendation: "LARGE MARKET — Cosmetics category, governed by SFDA cosmetic regulations not food supplement rules. Key risk: UV filters must be on SFDA's permitted list (different from EU allowed list). Recommend pre-screening formula before ordering stock.",
    risk_level: 'MEDIUM',
  },
  {
    key: 'antiaging', name: 'Anti-aging serum', keywords: ['anti-aging', 'anti aging', 'antiaging', 'retinol'],
    market_size: 'SAR 380M (2025 est.)', growth: '+21% YoY', growth_direction: 'up',
    top_importers: ['Estée Lauder (USA)', 'Shiseido (Japan)', 'LVMH (France)'],
    sfda_registered_products: 1876, avg_clearance_days: 21, rejection_rate: '8.9%',
    top_rejection_reasons: ['Retinol concentration exceeds limit', 'Drug claim on cosmetic product', 'Missing dermatologist test for sensitive skin claim'],
    cold_chain_required: false, halal_required: false,
    recommendation: 'PREMIUM GROWTH — High-income Saudi consumers driving demand for clinical skincare. Highest rejection rate in cosmetics category due to borderline drug claims. Legal review of all claims before shipping is essential.',
    risk_level: 'MEDIUM',
  },
];

export const CATEGORY_QUICK_PICKS = ['Omega-3', 'Probiotics', 'Collagen', 'Vitamin D', 'Sunscreen SPF50+', 'Anti-aging serum'];

export function findCategoryReport(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return CATEGORY_REPORTS.find(r => r.keywords.some(k => q.includes(k))) || null;
}

// ── Supplier Intelligence ────────────────────────────
export const SUPPLIER_COUNTRIES = ['Norway', 'Germany', 'France', 'Denmark', 'Japan', 'South Korea', 'USA', 'India',
  'China', 'Netherlands', 'Sweden', 'Canada', 'UK', 'Australia'];

export const SUPPLIER_PROFILES = [
  {
    key: 'nordic', name: 'Nordic Naturals', country: 'Norway', keywords: ['nordic naturals', 'nordic'],
    ghad_status: 'VERIFIED', ghad_cr: 'CR-NO-2019-4471', blacklist_status: 'CLEAR',
    saudi_import_history: '47 shipments since 2021', rejection_rate: '2.1%', avg_compliance_score: 94,
    top_issues: ['Occasional CoA delay', 'Minor label updates needed'],
    certifications: ['NSF GMP', 'IFOS 5-star', 'Halal (IFANCA)'],
    recommendation: 'RECOMMENDED — Established supplier with strong Saudi track record. Low rejection rate and consistent documentation quality. Halal certification current until Dec 2026 — verify before next shipment.',
    risk_level: 'LOW',
  },
  {
    key: 'biolab', name: 'BioLab Korea', country: 'South Korea', keywords: ['biolab'],
    ghad_status: 'VERIFIED', ghad_cr: 'CR-KR-2022-8812', blacklist_status: 'CLEAR',
    saudi_import_history: '12 shipments since 2023', rejection_rate: '8.3%', avg_compliance_score: 71,
    top_issues: ['Korean CoA format not matching SFDA template', 'Stability data gaps for Saudi climate',
      'Halal certificate from non-SFDA-recognized body'],
    certifications: ['KGMP', 'ISO 22000'],
    recommendation: 'USE WITH CAUTION — Newer supplier with higher rejection rate. Main issue is Halal certification body — SFDA only recognizes specific bodies. Request re-certification with IFANCA or JAKIM before next shipment.',
    risk_level: 'MEDIUM',
  },
  {
    key: 'dsm', name: 'DSM', country: 'Netherlands', keywords: ['dsm'],
    ghad_status: 'VERIFIED', ghad_cr: 'CR-NL-2015-0033', blacklist_status: 'CLEAR',
    saudi_import_history: '203 shipments since 2018', rejection_rate: '1.4%', avg_compliance_score: 97,
    top_issues: ['Occasional HS code classification question'],
    certifications: ['ISO 9001', 'FSSC 22000', 'Halal (multiple bodies)', 'Kosher', 'EU GMP'],
    recommendation: 'HIGHLY RECOMMENDED — Global ingredient leader with one of the best Saudi clearance records in the database. Premium pricing but minimal clearance risk. Ideal anchor supplier for new market entrants.',
    risk_level: 'LOW',
  },
  {
    key: 'china', name: 'New supplier from China', country: 'China', keywords: ['china', 'chinese'],
    ghad_status: 'UNVERIFIED', ghad_cr: 'Not registered', blacklist_status: 'CLEAR',
    saudi_import_history: 'No history in MASAAR database', rejection_rate: 'Industry avg for China origin: 14.2%',
    avg_compliance_score: null,
    top_issues: ['GHAD verification required before first shipment', 'Halal certificate source must be verified with SFDA',
      'CoA must be from ISO 17025 accredited lab', 'China-origin products face enhanced SFDA scrutiny',
      'Arabic label translation quality commonly flagged'],
    certifications: [],
    recommendation: 'HIGH CAUTION — No MASAAR history for this supplier. China-origin food supplements have the highest rejection rate in Saudi Arabia (14.2% industry average). Recommend: 1) GHAD verification first, 2) Request full document package before ordering, 3) Start with small trial shipment. Contact your DEMARA advisor before proceeding.',
    risk_level: 'HIGH',
  },
];

export const SUPPLIER_QUICK_PICKS = [
  { label: 'Nordic Naturals', name: 'Nordic Naturals', country: 'Norway' },
  { label: 'BioLab Korea', name: 'BioLab Korea', country: 'South Korea' },
  { label: 'DSM Netherlands', name: 'DSM', country: 'Netherlands' },
  { label: 'New supplier from China', name: '', country: 'China' },
];

export const NEW_SUPPLIER_CHECKLIST = [
  'GHAD registration verification',
  'Blacklist check',
  'Halal certificate body verification',
  'Lab accreditation check (ISO 17025)',
  'Reference check with other Saudi importers',
];

// Matches by supplier name first; with no name, by country.
export function findSupplierProfile(name, country) {
  const n = name.trim().toLowerCase();
  if (n) return SUPPLIER_PROFILES.find(p => p.keywords.some(k => n.includes(k))) || null;
  if (country) return SUPPLIER_PROFILES.find(p => p.country === country) || null;
  return null;
}

// ── Flags ────────────────────────────────────────────
export const COUNTRY_FLAGS = {
  Norway: '🇳🇴', Germany: '🇩🇪', France: '🇫🇷', Denmark: '🇩🇰', Japan: '🇯🇵', 'South Korea': '🇰🇷',
  USA: '🇺🇸', India: '🇮🇳', China: '🇨🇳', Netherlands: '🇳🇱', Sweden: '🇸🇪', Canada: '🇨🇦',
  UK: '🇬🇧', Australia: '🇦🇺',
};

// ── Regulatory Radar ─────────────────────────────────
export const RADAR_SECTORS = ['Food Supplement', 'Cosmetics', 'Food'];
export const RADAR_TYPES = ['New requirement', 'Standard update', 'Recall', 'Deadline reminder'];
// Radar sector → product master sector, for "Your categories only"
export const RADAR_SECTOR_KEYS = { 'Food Supplement': 'food_supplement', Cosmetics: 'cosmetic', Food: 'food' };

export const RADAR_ITEMS = [
  {
    id: 'r1', title: 'SFDA updates permitted UV filter list for cosmetics', date: '28 Oct 2026',
    sector: 'Cosmetics', type: 'New requirement', impact: 'HIGH',
    summary: 'Three UV filters removed from permitted list effective 1 March 2027. Products containing Benzophenone-3 above 2.2%, PABA, or Homosalate above 7.3% must be reformulated or withdrawn.',
    action_required: 'Review all sunscreen formulas against updated permitted list. Products already in Saudi market have until 1 Sep 2027 to sell through.',
    sfda_ref: 'Circular 2026/COS/0441',
  },
  {
    id: 'r2', title: 'New Halal certification bodies recognized by SFDA', date: '15 Oct 2026',
    sector: 'Food Supplement', type: 'New requirement', impact: 'LOW',
    summary: 'SFDA adds 4 new recognized Halal certification bodies: BPJPH (Indonesia), MUI, CICOT (Thailand), and Turkey Diyanet. Products certified by these bodies now accepted without additional verification.',
    action_required: 'No action required. Beneficial for suppliers using these certification bodies.',
    sfda_ref: 'Circular 2026/FS/0389',
  },
  {
    id: 'r3', title: 'GSO 1943 updated — food supplement labelling', date: '2 Oct 2026',
    sector: 'Food Supplement', type: 'Standard update', impact: 'MEDIUM',
    summary: 'GSO 1943:2026 replaces GSO 1943:2019. Key changes: serving size must be in metric units only, warning statements expanded for products containing iron above 45mg/serving, mandatory QR code linking to full ingredient disclosure.',
    action_required: 'Labels must comply by 1 July 2027. Begin artwork update process now — Saudi artwork approval takes 3-4 months.',
    sfda_ref: 'GSO 1943:2026',
  },
  {
    // Fictional supplier and products: this is a demo recall, so it must not name a real company
    id: 'r4', title: 'Voluntary recall — 3 fish oil products (heavy metals)', date: '18 Sep 2026',
    sector: 'Food Supplement', type: 'Recall', impact: 'HIGH',
    summary: 'SFDA requests voluntary recall of 3 fish oil products from an example Norwegian supplier ("Nordvik Marine Oils") due to mercury levels exceeding permitted limits. Products: Omega Pure 1000mg, Omega Forte, Marine Selenium Plus.',
    action_required: 'If you import any affected products, check batch numbers against SFDA recall list immediately. Contact DEMARA if affected.',
    sfda_ref: 'Recall Notice 2026/0094',
  },
  {
    id: 'r5', title: 'SFDA: probiotics must declare CFU count at expiry', date: '5 Sep 2026',
    sector: 'Food Supplement', type: 'New requirement', impact: 'MEDIUM',
    summary: 'New requirement effective 1 Jan 2027: probiotic products must declare CFU (Colony Forming Units) count at end of shelf life, not at manufacture. Manufacturer overage to be declared separately.',
    action_required: 'Request updated stability data and label artwork from all probiotic suppliers before January shipments.',
    sfda_ref: 'Circular 2026/FS/0341',
  },
  {
    id: 'r6', title: 'SASO Saber mandatory for all cosmetic products', date: '20 Aug 2026',
    sector: 'Cosmetics', type: 'New requirement', impact: 'HIGH',
    summary: 'Effective 1 November 2026, all cosmetic products must have an active Saber certificate before customs release. Products arriving without Saber certificate will be held at port.',
    action_required: 'Verify Saber certificates for all cosmetic products in transit or planned for Q4 2026. Saber registration takes 2-4 weeks.',
    sfda_ref: 'Ministerial Decision 2026/1847',
  },
  {
    id: 'r7', title: 'New HS code classifications for collagen peptides', date: '10 Aug 2026',
    sector: 'Food Supplement', type: 'New requirement', impact: 'HIGH',
    summary: 'ZATCA reclassifies hydrolyzed collagen peptides from HS 3504.00 to HS 2106.90 effective 1 Jan 2027. Duty rate changes from 5% to 15%. Marine collagen retains 5% under separate subheading.',
    action_required: 'Review all collagen product HS codes with your customs broker before 1 Jan 2027. Marine vs bovine source distinction now financially significant.',
    sfda_ref: 'ZATCA Tariff Update 2026/T-441',
  },
  {
    id: 'r8', title: 'Saudi food supplement market size update — GASTAT', date: '1 Aug 2026',
    sector: 'Food Supplement', type: 'Standard update', impact: 'LOW',
    summary: 'GASTAT 2025 import data: food supplement imports reached SAR 2.1B, up 16% from 2024. Top categories: vitamins (38%), proteins (22%), omega-3 (18%), probiotics (12%), others (10%).',
    action_required: 'No regulatory action. Use for market sizing and investment planning.',
    sfda_ref: 'GASTAT Report 2026/TR-089',
  },
  {
    id: 'r9', title: 'Retinol concentration limits reduced for OTC cosmetics', date: '15 Jul 2026',
    sector: 'Cosmetics', type: 'New requirement', impact: 'HIGH',
    summary: 'SFDA reduces maximum retinol concentration for OTC cosmetics from 1% to 0.3% (face products) and from 0.5% to 0.05% (body products), aligning with EU Regulation 2022/1181. Prescription-only pathway available above these limits.',
    action_required: 'Audit all retinol products against new limits. Products above limit may not be cleared after 1 March 2027.',
    sfda_ref: 'Circular 2026/COS/0298',
  },
  {
    id: 'r10', title: 'Food import: country of origin labelling in Arabic mandatory', date: '3 Jul 2026',
    sector: 'Food', type: 'New requirement', impact: 'MEDIUM',
    summary: 'All food products must display country of origin in Arabic on primary label. English-only origin statements no longer accepted. Applies to all food categories including ingredients and food supplements classified as food.',
    action_required: 'Verify Arabic country of origin on all food product labels. Update artwork for any products showing English-only origin.',
    sfda_ref: 'GSO 9:2026 Amendment 3',
  },
];
