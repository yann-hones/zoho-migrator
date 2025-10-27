import { Router } from 'express';
import { sharepointService } from '../services/sharepoint.service';

export const sharepointRouter = Router();

/**
 * GET /api/sharepoint/files/:folderPath?
 * List files in a SharePoint folder
 */
sharepointRouter.get('/files/*', async (req, res) => {
  try {
    const folderPath = req.params[0] || '';
    const files = await sharepointService.listFiles(folderPath);
    res.json({ success: true, data: files });
  } catch (error: any) {
    console.error('Error listing SharePoint files:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sharepoint/files
 * List files in root folder
 */
sharepointRouter.get('/files', async (req, res) => {
  try {
    const files = await sharepointService.listFiles();
    res.json({ success: true, data: files });
  } catch (error: any) {
    console.error('Error listing SharePoint files:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sharepoint/folder
 * Create a folder in SharePoint
 */
sharepointRouter.post('/folder', async (req, res) => {
  try {
    const { folderName, parentPath } = req.body;

    if (!folderName) {
      return res.status(400).json({ success: false, error: 'Folder name is required' });
    }

    const folder = await sharepointService.createFolder(folderName, parentPath);
    res.json({ success: true, data: folder });
  } catch (error: any) {
    console.error('Error creating SharePoint folder:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
