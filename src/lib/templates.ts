// Invoice template definitions — drive both the Settings preview and the PDF styling.

export type TemplateId = 'classic' | 'modern' | 'minimal';

export interface InvoiceTemplate {
  id: TemplateId;
  name: string;
  description: string;
  accent: [number, number, number];          // header / accent colour (RGB)
  tableTheme: 'striped' | 'grid' | 'plain';
  filledTotal: boolean;                       // total row: filled band vs. underlined
}

export const TEMPLATES: InvoiceTemplate[] = [
  { id: 'classic', name: 'Classic', description: 'Indigo header, striped rows', accent: [99, 102, 241], tableTheme: 'striped', filledTotal: true },
  { id: 'modern',  name: 'Modern',  description: 'Teal accent, grid lines',     accent: [13, 148, 136], tableTheme: 'grid',    filledTotal: true },
  { id: 'minimal', name: 'Minimal', description: 'Black & white, clean lines',  accent: [30, 41, 59],  tableTheme: 'plain',   filledTotal: false },
];

export function getTemplate(id?: string): InvoiceTemplate {
  return TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
}

// CSS rgb() string for the small HTML preview.
export const rgbCss = (c: [number, number, number]) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
