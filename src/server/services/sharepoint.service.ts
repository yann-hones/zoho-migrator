import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';

export interface SharePointFile {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
}

export class SharePointService {
  private graphClient: AxiosInstance;
  private accessToken: string | null = null;
  private siteId: string | null = null;

  constructor() {
    this.graphClient = axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      timeout: 60000,
    });
  }

  /**
   * Get access token for Microsoft Graph API
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        `https://login.microsoftonline.com/${process.env.SHAREPOINT_TENANT_ID}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: process.env.SHAREPOINT_CLIENT_ID!,
          client_secret: process.env.SHAREPOINT_CLIENT_SECRET!,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;

      // Clear token after 50 minutes
      setTimeout(() => {
        this.accessToken = null;
      }, 50 * 60 * 1000);

      if (!this.accessToken) {
        throw new Error('Failed to get SharePoint access token: Empty token received');
      }

      return this.accessToken;
    } catch (error: any) {
      throw new Error(`Failed to get SharePoint access token: ${error.message}`);
    }
  }

  /**
   * Get SharePoint site ID
   */
  private async getSiteId(): Promise<string> {
    if (this.siteId) {
      return this.siteId;
    }

    const token = await this.getAccessToken();
    const siteUrl = process.env.SHAREPOINT_SITE_URL!;

    // Extract hostname and site path from URL
    const url = new URL(siteUrl);
    const hostname = url.hostname;
    const sitePath = url.pathname;

    try {
      const response = await this.graphClient.get(
        `/sites/${hostname}:${sitePath}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      this.siteId = response.data.id;

      if (!this.siteId) {
        throw new Error('Failed to get SharePoint site ID: Empty site ID received');
      }

      return this.siteId;
    } catch (error: any) {
      throw new Error(`Failed to get SharePoint site ID: ${error.message}`);
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folderPath: string = ''): Promise<SharePointFile[]> {
    const token = await this.getAccessToken();
    const siteId = await this.getSiteId();

    try {
      const endpoint = folderPath
        ? `/sites/${siteId}/drive/root:/${folderPath}:/children`
        : `/sites/${siteId}/drive/root/children`;

      const response = await this.graphClient.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.value || [];
    } catch (error: any) {
      throw new Error(`Failed to list SharePoint files: ${error.message}`);
    }
  }

  /**
   * Upload a file to SharePoint
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    folderPath: string = ''
  ): Promise<SharePointFile> {
    const token = await this.getAccessToken();
    const siteId = await this.getSiteId();

    try {
      // For files larger than 4MB, use resumable upload
      if (fileBuffer.length > 4 * 1024 * 1024) {
        return await this.uploadLargeFile(fileBuffer, fileName, folderPath);
      }

      // Simple upload for small files
      const endpoint = folderPath
        ? `/sites/${siteId}/drive/root:/${folderPath}/${fileName}:/content`
        : `/sites/${siteId}/drive/root:/${fileName}:/content`;

      const response = await this.graphClient.put(endpoint, fileBuffer, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to upload file to SharePoint: ${error.message}`);
    }
  }

  /**
   * Upload large files using resumable upload
   */
  private async uploadLargeFile(
    fileBuffer: Buffer,
    fileName: string,
    folderPath: string = ''
  ): Promise<SharePointFile> {
    const token = await this.getAccessToken();
    const siteId = await this.getSiteId();

    try {
      // Create upload session
      const endpoint = folderPath
        ? `/sites/${siteId}/drive/root:/${folderPath}/${fileName}:/createUploadSession`
        : `/sites/${siteId}/drive/root:/${fileName}:/createUploadSession`;

      const sessionResponse = await this.graphClient.post(
        endpoint,
        {
          item: {
            '@microsoft.graph.conflictBehavior': 'rename',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const uploadUrl = sessionResponse.data.uploadUrl;

      // Upload in chunks of 5MB
      const chunkSize = 5 * 1024 * 1024;
      let start = 0;

      while (start < fileBuffer.length) {
        const end = Math.min(start + chunkSize, fileBuffer.length);
        const chunk = fileBuffer.slice(start, end);

        await axios.put(uploadUrl, chunk, {
          headers: {
            'Content-Length': chunk.length,
            'Content-Range': `bytes ${start}-${end - 1}/${fileBuffer.length}`,
          },
        });

        start = end;
      }

      // Get the uploaded file details
      const fileResponse = await this.graphClient.get(
        folderPath
          ? `/sites/${siteId}/drive/root:/${folderPath}/${fileName}`
          : `/sites/${siteId}/drive/root:/${fileName}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return fileResponse.data;
    } catch (error: any) {
      throw new Error(`Failed to upload large file to SharePoint: ${error.message}`);
    }
  }

  /**
   * Create a folder
   */
  async createFolder(folderName: string, parentPath: string = ''): Promise<any> {
    const token = await this.getAccessToken();
    const siteId = await this.getSiteId();

    try {
      const endpoint = parentPath
        ? `/sites/${siteId}/drive/root:/${parentPath}:/children`
        : `/sites/${siteId}/drive/root/children`;

      const response = await this.graphClient.post(
        endpoint,
        {
          name: folderName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create folder in SharePoint: ${error.message}`);
    }
  }
}

export const sharepointService = new SharePointService();
