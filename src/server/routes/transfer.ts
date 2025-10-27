import { Router } from 'express';
import { transferService } from '../services/transfer.service';

export const transferRouter = Router();

/**
 * POST /api/transfer/file
 * Transfer a single file from Zoho Drive to SharePoint
 */
transferRouter.post('/file', async (req, res) => {
  try {
    const { zohoFileId, sharepointFolderPath } = req.body;

    if (!zohoFileId) {
      return res.status(400).json({
        success: false,
        error: 'zohoFileId is required'
      });
    }

    const result = await transferService.transferFile(
      zohoFileId,
      sharepointFolderPath || ''
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error transferring file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/transfer/batch
 * Transfer multiple files from Zoho Drive to SharePoint
 */
transferRouter.post('/batch', async (req, res) => {
  try {
    const { fileIds, sharepointFolderPath } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'fileIds array is required'
      });
    }

    const results = await transferService.transferBatch(
      fileIds,
      sharepointFolderPath || ''
    );

    res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Error in batch transfer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/transfer/folder
 * Transfer an entire folder from Zoho Drive to SharePoint
 */
transferRouter.post('/folder', async (req, res) => {
  try {
    const { zohoFolderId, sharepointFolderPath } = req.body;

    if (!zohoFolderId) {
      return res.status(400).json({
        success: false,
        error: 'zohoFolderId is required'
      });
    }

    const result = await transferService.transferFolder(
      zohoFolderId,
      sharepointFolderPath || ''
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error transferring folder:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/transfer/status/:transferId
 * Get transfer status (for future async implementation)
 */
transferRouter.get('/status/:transferId', async (req, res) => {
  try {
    const { transferId } = req.params;
    // Placeholder for future async transfer status tracking
    res.json({
      success: true,
      data: {
        transferId,
        status: 'completed',
        message: 'Status tracking not yet implemented'
      }
    });
  } catch (error: any) {
    console.error('Error getting transfer status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
