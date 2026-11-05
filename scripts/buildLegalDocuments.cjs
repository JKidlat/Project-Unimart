const fs = require('fs');
const path = require('path');

const srcTextFile = path.join(__dirname, '..', 'docs', 'Unimart_Legal_Documents_Ai.txt');
const content = fs.readFileSync(srcTextFile, 'utf8');
const lines = content.split(/\r?\n/);

const docDefs = [
  { num: 1, slug: 'terms', title: 'Terms and Conditions', category: 'General Terms', desc: 'Core terms governing platform access, user accounts, listings, and marketplace conduct.' },
  { num: 2, slug: 'privacy', title: 'Privacy Policy', category: 'Privacy & Data Protection', desc: 'Explains how personal information and student verification data are collected, protected, and used under Ghana Act 843.' },
  { num: 3, slug: 'refunds-returns', title: 'Refund and Returns Policy', category: 'Orders & Fulfillment', desc: 'Rules and guidelines for product inspection, reporting defective items, returns, and seller refunds.' },
  { num: 4, slug: 'delivery', title: 'Shipping, Delivery and Collection Policy', category: 'Orders & Fulfillment', desc: 'Guidelines for seller-arranged deliveries, campus meetups, collection arrangements, and transit costs.' },
  { num: 5, slug: 'seller-agreement', title: 'Seller Agreement', category: 'Seller & Verification', desc: 'Binding commitments, verification requirements, and responsibilities for approved student sellers in Ghana.' },
  { num: 6, slug: 'cookies', title: 'Cookie Policy', category: 'Privacy & Data Protection', desc: 'Information on strictly necessary cookies, analytics, advertising, and how to manage cookie preferences.' },
  { num: 7, slug: 'disclaimer', title: 'Marketplace Disclaimer', category: 'General Terms', desc: 'Clarifies Unimart’s role as an intermediary marketplace connecting independent student sellers with buyers.' },
  { num: 8, slug: 'disputes', title: 'Dispute Resolution and Complaints Policy', category: 'Disputes & Enforcement', desc: 'Procedures for reporting order issues, mediating conflicts between buyers and sellers, and appeals.' },
  { num: 9, slug: 'acceptable-use', title: 'Acceptable Use and Prohibited Products Policy', category: 'Marketplace Safety', desc: 'List of prohibited items, weapons, counterfeits, and required standards of acceptable platform conduct.' },
  { num: 10, slug: 'intellectual-property', title: 'Intellectual Property Policy', category: 'Marketplace Safety', desc: 'Guidelines on trademarks, copyrighted images, reporting infringements, and protecting rights holders.' },
  { num: 11, slug: 'payments-fees', title: 'Payment, Fees and Commission Policy', category: 'Orders & Fulfillment', desc: 'Details on direct buyer-to-seller payments (Cash, MoMo, Bank Transfer) and future fee disclosures.' },
  { num: 12, slug: 'account-suspension', title: 'Account Suspension and Termination Policy', category: 'Disputes & Enforcement', desc: 'Grounds for moderation, warnings, suspensions, graduation transitions, and account appeals.' },
  { num: 13, slug: 'student-verification', title: 'Student Verification and Seller Eligibility Policy', category: 'Seller & Verification', desc: 'Verification criteria, required student IDs, institutional email verification, and annual eligibility audits.' }
];

const markers = [];
lines.forEach((line, idx) => {
  for (let i = 1; i <= 13; i++) {
    if (line.startsWith('@1 ' + i + '.')) {
      markers.push({ num: i, start: idx });
    }
  }
  if (line.startsWith('@1 PART III')) {
    markers.push({ num: 14, start: idx });
  }
});

const docs = {};

for (let i = 0; i < docDefs.length; i++) {
  const def = docDefs[i];
  const startIdx = markers[i].start;
  const endIdx = markers[i + 1].start;
  const docLines = lines.slice(startIdx, endIdx);
  
  let version = '0.1';
  let effectiveDate = '[EFFECTIVE DATE]';
  
  const contentBodyLines = [];
  
  for (let j = 0; j < docLines.length; j++) {
    const rawLine = docLines[j].trim();
    if (rawLine.startsWith('Version:')) {
      const vMatch = rawLine.match(/Version:\s*([^\\]+)/i);
      if (vMatch) version = vMatch[1].trim();
      const dMatch = rawLine.match(/Effective date:\s*(.+)$/i);
      if (dMatch) effectiveDate = dMatch[1].trim();
    }
    
    let formatted = rawLine;
    if (formatted.startsWith('@1 ')) {
      formatted = '# ' + formatted.substring(3).trim();
    } else if (formatted.startsWith('@2 ')) {
      formatted = '## ' + formatted.substring(3).trim();
    } else if (formatted.startsWith('@3 ')) {
      formatted = '### ' + formatted.substring(3).trim();
    }
    // Replace backslash breaks with 2 trailing spaces and newline
    formatted = formatted.replace(/\\\s*/g, '  \n');
    
    contentBodyLines.push(formatted);
  }
  
  const fullContent = contentBodyLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  
  docs[def.slug] = {
    slug: def.slug,
    title: def.title,
    version,
    effectiveDate,
    description: def.desc,
    category: def.category,
    content: fullContent
  };
}

let tsCode = `/**
 * UNIMART CENTRAL LEGAL DOCUMENTS REPOSITORY
 * 
 * Single source of truth for all 13 legal policies and documents on the Unimart platform.
 * Any edits made in this file are reflected live across the entire website and all legal routes.
 * 
 * Jurisdiction: Ghana
 * Operating framework: Ghana Data Protection Act, 2012 (Act 843), Electronic Transactions Act, 2008 (Act 772)
 */

export interface LegalDocument {
  slug: string;
  title: string;
  version: string;
  effectiveDate: string;
  description: string;
  category: 'General Terms' | 'Privacy & Data Protection' | 'Orders & Fulfillment' | 'Seller & Verification' | 'Disputes & Enforcement' | 'Marketplace Safety';
  lastUpdated?: string;
  content: string;
}

export const legalDocuments: Record<string, LegalDocument> = {
`;

for (const [key, doc] of Object.entries(docs)) {
  const safeContent = doc.content
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
    
  tsCode += `  ${JSON.stringify(key)}: {
    slug: ${JSON.stringify(doc.slug)},
    title: ${JSON.stringify(doc.title)},
    version: ${JSON.stringify(doc.version)},
    effectiveDate: ${JSON.stringify(doc.effectiveDate)},
    description: ${JSON.stringify(doc.description)},
    category: ${JSON.stringify(doc.category)},
    content: \`${safeContent}\`
  },
\n`;
}

tsCode += `};

/**
 * Retrieve a legal document by its URL slug.
 */
export const getLegalDocument = (slug: string): LegalDocument | undefined => {
  return legalDocuments[slug];
};

/**
 * Retrieve all legal documents as an array.
 */
export const getAllLegalDocuments = (): LegalDocument[] => {
  return Object.values(legalDocuments);
};

/**
 * Retrieve documents grouped by category.
 */
export const getLegalDocumentsByCategory = (): Record<string, LegalDocument[]> => {
  const grouped: Record<string, LegalDocument[]> = {};
  for (const doc of Object.values(legalDocuments)) {
    if (!grouped[doc.category]) {
      grouped[doc.category] = [];
    }
    grouped[doc.category].push(doc);
  }
  return grouped;
};
`;

const destFile = path.join(__dirname, '..', 'src', 'content', 'legalDocuments.ts');
fs.writeFileSync(destFile, tsCode, 'utf8');
console.log('SUCCESS: Written to', destFile, 'Size:', fs.statSync(destFile).size);
