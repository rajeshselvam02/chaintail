import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { CaseManager } from '@chaintail/case-manager';
import { PDFReporter } from '@chaintail/case-manager/src/pdf-reporter';

export function casesRouter(db: Pool): Router {
  const router = Router();
  const manager = new CaseManager(db);
  const reporter = new PDFReporter(db);

  // GET /api/cases
  router.get('/', async (req: Request, res: Response) => {
    try {
      const cases = await manager.getCases(req.query.status as string);
      return res.json({ count: cases.length, cases });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // POST /api/cases
  router.post('/', async (req: Request, res: Response) => {
    const { title, description, priority, investigator, tags } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    try {
      const c = await manager.createCase({ title, description, priority, investigator, tags });
      return res.status(201).json(c);
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // GET /api/cases/:id
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const c = await manager.getCase(req.params.id);
      if (!c) return res.status(404).json({ error: 'Case not found' });
      return res.json(c);
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // PATCH /api/cases/:id
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const c = await manager.updateCase(req.params.id, req.body);
      return res.json(c);
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // DELETE /api/cases/:id
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await manager.deleteCase(req.params.id);
      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // POST /api/cases/:id/addresses
  router.post('/:id/addresses', async (req: Request, res: Response) => {
    const { address, label, role, notes } = req.body;
    if (!address) return res.status(400).json({ error: 'address required' });
    try {
      const a = await manager.addAddress(req.params.id, { address, label, role, notes });
      return res.status(201).json(a);
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // POST /api/cases/:id/notes
  router.post('/:id/notes', async (req: Request, res: Response) => {
    const { content, author } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });
    try {
      const n = await manager.addNote(req.params.id, content, author);
      return res.status(201).json(n);
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // POST /api/cases/:id/evidence
  router.post('/:id/evidence', async (req: Request, res: Response) => {
    try {
      const e = await manager.addEvidence(req.params.id, req.body);
      return res.status(201).json(e);
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // GET /api/cases/:id/report.pdf
  router.get('/:id/report.pdf', async (req: Request, res: Response) => {
    try {
      const pdfBuffer = await reporter.generateCaseReport(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="case-${req.params.id}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  return router;
}
