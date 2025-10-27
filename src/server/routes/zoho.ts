import { Router } from 'express';
import { zohoService } from '../services/zoho.service';

export const zohoRouter = Router();

/**
 * GET /api/zoho/teamfolders
 * List all Team Folders (workspaces)
 */
zohoRouter.get('/teamfolders', async (req, res) => {
  try {
    const teamFolders = await zohoService.getTeamFolders();
    res.json({ success: true, data: teamFolders });
  } catch (error: any) {
    console.error('Error listing Zoho Team Folders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/zoho/files/:folderId?
 * List files in a Zoho Drive folder
 */
zohoRouter.get('/files/:folderId?', async (req, res) => {
  try {
    const folderId = req.params.folderId || 'root';
    const files = await zohoService.listFiles(folderId);
    res.json({ success: true, data: files });
  } catch (error: any) {
    console.error('Error listing Zoho files:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/zoho/folders/:parentId?
 * List folders in Zoho Drive
 */
zohoRouter.get('/folders/:parentId?', async (req, res) => {
  try {
    const parentId = req.params.parentId || 'root';
    const folders = await zohoService.listFolders(parentId);
    res.json({ success: true, data: folders });
  } catch (error: any) {
    console.error('Error listing Zoho folders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/zoho/file/:fileId
 * Get file details
 */
zohoRouter.get('/file/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const fileDetails = await zohoService.getFileDetails(fileId);
    res.json({ success: true, data: fileDetails });
  } catch (error: any) {
    console.error('Error getting Zoho file details:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/zoho/download/:fileId
 * Download a file from Zoho Drive
 */
zohoRouter.get('/download/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const fileBuffer = await zohoService.downloadFile(fileId);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(fileBuffer);
  } catch (error: any) {
    console.error('Error downloading Zoho file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
