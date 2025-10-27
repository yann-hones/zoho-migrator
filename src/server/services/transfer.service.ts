import { zohoService } from './zoho.service';
import { sharepointService } from './sharepoint.service';

export interface TransferResult {
  success: boolean;
  fileName: string;
  zohoFileId: string;
  sharepointFileId?: string;
  error?: string;
  size?: number;
}

export interface BatchTransferResult {
  total: number;
  successful: number;
  failed: number;
  results: TransferResult[];
}

export class TransferService {
  /**
   * Transfer a single file from Zoho Drive to SharePoint
   */
  async transferFile(
    zohoFileId: string,
    sharepointFolderPath: string = ''
  ): Promise<TransferResult> {
    try {
      console.log(`Starting transfer for file ${zohoFileId}...`);

      // Get file details from Zoho
      const fileDetails = await zohoService.getFileDetails(zohoFileId);
      console.log(`File details retrieved: ${fileDetails.name} (${fileDetails.size} bytes)`);

      // Download file from Zoho
      const fileBuffer = await zohoService.downloadFile(zohoFileId);
      console.log(`File downloaded from Zoho: ${fileBuffer.length} bytes`);

      // Upload to SharePoint
      const sharepointFile = await sharepointService.uploadFile(
        fileBuffer,
        fileDetails.name,
        sharepointFolderPath
      );
      console.log(`File uploaded to SharePoint: ${sharepointFile.id}`);

      return {
        success: true,
        fileName: fileDetails.name,
        zohoFileId: zohoFileId,
        sharepointFileId: sharepointFile.id,
        size: fileDetails.size,
      };
    } catch (error: any) {
      console.error(`Transfer failed for file ${zohoFileId}:`, error);
      return {
        success: false,
        fileName: 'Unknown',
        zohoFileId: zohoFileId,
        error: error.message,
      };
    }
  }

  /**
   * Transfer multiple files in batch
   */
  async transferBatch(
    fileIds: string[],
    sharepointFolderPath: string = ''
  ): Promise<BatchTransferResult> {
    console.log(`Starting batch transfer of ${fileIds.length} files...`);

    const results: TransferResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const fileId of fileIds) {
      const result = await this.transferFile(fileId, sharepointFolderPath);
      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    console.log(`Batch transfer completed: ${successful} successful, ${failed} failed`);

    return {
      total: fileIds.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Transfer an entire folder recursively
   */
  async transferFolder(
    zohoFolderId: string,
    sharepointFolderPath: string = ''
  ): Promise<BatchTransferResult> {
    console.log(`Starting folder transfer for ${zohoFolderId}...`);

    try {
      // Get folder files
      const files = await zohoService.listFiles(zohoFolderId);
      console.log(`Found ${files.length} files in folder`);

      // Get subfolders
      const subfolders = await zohoService.listFolders(zohoFolderId);
      console.log(`Found ${subfolders.length} subfolders`);

      const allResults: TransferResult[] = [];
      let totalSuccessful = 0;
      let totalFailed = 0;

      // Transfer files in current folder
      if (files.length > 0) {
        const fileIds = files.map(f => f.id);
        const batchResult = await this.transferBatch(fileIds, sharepointFolderPath);
        allResults.push(...batchResult.results);
        totalSuccessful += batchResult.successful;
        totalFailed += batchResult.failed;
      }

      // Recursively transfer subfolders
      for (const subfolder of subfolders) {
        // Create subfolder in SharePoint
        const newFolderPath = sharepointFolderPath
          ? `${sharepointFolderPath}/${subfolder.name}`
          : subfolder.name;

        await sharepointService.createFolder(subfolder.name, sharepointFolderPath);
        console.log(`Created subfolder: ${newFolderPath}`);

        // Transfer subfolder contents
        const subfolderResult = await this.transferFolder(subfolder.id, newFolderPath);
        allResults.push(...subfolderResult.results);
        totalSuccessful += subfolderResult.successful;
        totalFailed += subfolderResult.failed;
      }

      console.log(`Folder transfer completed: ${totalSuccessful} successful, ${totalFailed} failed`);

      return {
        total: allResults.length,
        successful: totalSuccessful,
        failed: totalFailed,
        results: allResults,
      };
    } catch (error: any) {
      console.error(`Folder transfer failed:`, error);
      throw new Error(`Failed to transfer folder: ${error.message}`);
    }
  }
}

export const transferService = new TransferService();
