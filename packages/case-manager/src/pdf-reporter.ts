import PDFDocument from 'pdfkit';
import { Pool } from 'pg';
import { Writable } from 'stream';

export class PDFReporter {
  constructor(private db: Pool) {}

  async generateCaseReport(caseId: string): Promise<Buffer> {
    const caseData = await this.getCaseData(caseId);
    if (!caseData) throw new Error('Case not found');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.buildReport(doc, caseData);
      doc.end();
    });
  }

  private buildReport(doc: PDFKit.PDFDocument, data: any): void {
    const colors = {
      primary: '#1e3a5f',
      accent: '#3b82f6',
      red: '#dc2626',
      green: '#16a34a',
      gray: '#64748b',
      lightgray: '#f1f5f9',
    };

    // ── Header ──
    doc.rect(0, 0, doc.page.width, 80).fill(colors.primary);
    doc.fill('white').fontSize(22).font('Helvetica-Bold')
      .text('⛓ ChainTrail', 50, 20);
    doc.fontSize(11).font('Helvetica')
      .text('Bitcoin AML Forensics Report', 50, 48);
    doc.text(`Generated: ${new Date().toISOString()}`, 300, 48, { align: 'right' });

    doc.moveDown(3);

    // ── Case Summary ──
    doc.fill(colors.primary).fontSize(16).font('Helvetica-Bold')
      .text('Case Summary', 50, doc.y);
    doc.moveDown(0.5);

    const priorityMap: Record<string, string> = {
      critical: colors.red, high: '#f97316',
      medium: '#eab308', low: colors.green,
    };
    const priorityColor = priorityMap[data.priority] || colors.gray;

    this.drawKeyValue(doc, 'Case ID', data.id, colors);
    this.drawKeyValue(doc, 'Title', data.title, colors);
    this.drawKeyValue(doc, 'Status', data.status.toUpperCase(), colors);
    this.drawKeyValue(doc, 'Priority', data.priority.toUpperCase(), colors);
    this.drawKeyValue(doc, 'Investigator', data.investigator || 'Unknown', colors);
    this.drawKeyValue(doc, 'Created', new Date(data.created_at).toLocaleDateString(), colors);
    this.drawKeyValue(doc, 'Updated', new Date(data.updated_at).toLocaleDateString(), colors);

    if (data.description) {
      doc.moveDown(0.5);
      doc.fill(colors.gray).fontSize(10).font('Helvetica')
        .text('Description:', 50, doc.y);
      doc.fill('#1a1a1a').text(data.description, 50, doc.y + 5, { width: 495 });
    }

    doc.moveDown(1.5);

    // ── Addresses ──
    if (data.addresses && data.addresses.length > 0) {
      doc.fill(colors.primary).fontSize(14).font('Helvetica-Bold')
        .text(`Addresses Under Investigation (${data.addresses.length})`, 50, doc.y);
      doc.moveDown(0.5);

      for (const addr of data.addresses) {
        if (doc.y > 700) doc.addPage();

        doc.rect(50, doc.y, 495, 45).fill(colors.lightgray).stroke('#e2e8f0');

        const roleColors: Record<string, string> = {
          suspect: colors.red, victim: colors.green,
          exchange: colors.accent, mixer: '#8b5cf6', unknown: colors.gray,
        };
        const roleColor = roleColors[addr.role] || colors.gray;

        doc.fill(roleColor).fontSize(8).font('Helvetica-Bold')
          .text(addr.role?.toUpperCase() || 'UNKNOWN', 58, doc.y - 40);
        doc.fill('#1a1a1a').fontSize(8).font('Courier')
          .text(addr.address, 58, doc.y - 28, { width: 430 });
        if (addr.label) {
          doc.fill(colors.gray).fontSize(8).font('Helvetica')
            .text(addr.label, 58, doc.y - 16);
        }
        doc.moveDown(0.3);
      }
      doc.moveDown(1);
    }

    // ── Notes ──
    if (data.notes && data.notes.length > 0) {
      if (doc.y > 650) doc.addPage();
      doc.fill(colors.primary).fontSize(14).font('Helvetica-Bold')
        .text(`Investigation Notes (${data.notes.length})`, 50, doc.y);
      doc.moveDown(0.5);

      for (const note of data.notes) {
        if (doc.y > 700) doc.addPage();
        doc.rect(50, doc.y, 495, 1).fill('#e2e8f0');
        doc.moveDown(0.3);
        doc.fill(colors.gray).fontSize(8).font('Helvetica')
          .text(`${note.author} — ${new Date(note.created_at).toLocaleString()}`, 50, doc.y);
        doc.fill('#1a1a1a').fontSize(10).font('Helvetica')
          .text(note.content, 50, doc.y + 4, { width: 495 });
        doc.moveDown(1);
      }
    }

    // ── Evidence ──
    if (data.evidence && data.evidence.length > 0) {
      if (doc.y > 650) doc.addPage();
      doc.fill(colors.primary).fontSize(14).font('Helvetica-Bold')
        .text(`Evidence (${data.evidence.length})`, 50, doc.y);
      doc.moveDown(0.5);

      for (const ev of data.evidence) {
        if (doc.y > 700) doc.addPage();
        doc.fill(colors.accent).fontSize(9).font('Helvetica-Bold')
          .text(`[${ev.type?.toUpperCase()}]`, 50, doc.y, { continued: true });
        doc.fill('#1a1a1a').font('Helvetica')
          .text(` ${ev.description || 'No description'}`, { width: 440 });
        if (ev.reference_id) {
          doc.fill(colors.gray).fontSize(8).font('Courier')
            .text(`Ref: ${ev.reference_id}`, 58, doc.y);
        }
        doc.moveDown(0.5);
      }
    }

    // ── Footer ──
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill(colors.primary);
      doc.fill('white').fontSize(8).font('Helvetica')
        .text(
          `ChainTrail v0.1.0 — Confidential — Page ${i + 1} of ${range.count}`,
          50, doc.page.height - 25, { align: 'center', width: doc.page.width - 100 }
        );
    }
  }

  private drawKeyValue(doc: any, key: string, value: string, colors: any): void {
    doc.fill(colors.gray).fontSize(9).font('Helvetica-Bold')
      .text(`${key}:`, 50, doc.y, { continued: true, width: 120 });
    doc.fill('#1a1a1a').font('Helvetica')
      .text(value, { width: 375 });
  }

  private async getCaseData(caseId: string): Promise<any> {
    const { rows } = await this.db.query(`
      SELECT c.*,
        json_agg(DISTINCT jsonb_build_object(
          'address', ca.address, 'label', ca.label,
          'role', ca.role, 'notes', ca.notes
        )) FILTER (WHERE ca.id IS NOT NULL) AS addresses,
        json_agg(DISTINCT jsonb_build_object(
          'id', cn.id, 'content', cn.content,
          'author', cn.author, 'created_at', cn.created_at
        )) FILTER (WHERE cn.id IS NOT NULL) AS notes,
        json_agg(DISTINCT jsonb_build_object(
          'id', ce.id, 'type', ce.type,
          'description', ce.description, 'reference_id', ce.reference_id
        )) FILTER (WHERE ce.id IS NOT NULL) AS evidence
      FROM cases c
      LEFT JOIN case_addresses ca ON ca.case_id = c.id
      LEFT JOIN case_notes cn ON cn.case_id = c.id
      LEFT JOIN case_evidence ce ON ce.case_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
    `, [caseId]);
    return rows[0] || null;
  }
}
