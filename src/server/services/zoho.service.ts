import axios, { AxiosInstance } from 'axios';

export interface ZohoFile {
  id: string;
  name: string;
  type: string;
  size: number;
  created_time: string;
  modified_time: string;
  parent_id: string;
}

export interface ZohoFolder {
  id: string;
  name: string;
  parent_id: string;
  created_time: string;
}

export class ZohoService {
  private apiClient: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.apiClient = axios.create({
      baseURL: process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com',
      timeout: 30000,
    });
  }

  /**
   * Get access token using refresh token
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        'https://accounts.zoho.com/oauth/v2/token',
        null,
        {
          params: {
            refresh_token: process.env.ZOHO_REFRESH_TOKEN,
            client_id: process.env.ZOHO_CLIENT_ID,
            client_secret: process.env.ZOHO_CLIENT_SECRET,
            grant_type: 'refresh_token',
          },
        }
      );

      this.accessToken = response.data.access_token;

      // Clear token after 50 minutes (tokens expire in 1 hour)
      setTimeout(() => {
        this.accessToken = null;
      }, 50 * 60 * 1000);

      return this.accessToken;
    } catch (error) {
      throw new Error(`Failed to get Zoho access token: ${error}`);
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folderId: string = 'root'): Promise<ZohoFile[]> {
    const token = await this.getAccessToken();

    try {
      const response = await this.apiClient.get(
        `/workdrive/api/v1/files/${folderId}/files`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
          },
        }
      );

      return response.data.data || [];
    } catch (error: any) {
      throw new Error(`Failed to list Zoho files: ${error.message}`);
    }
  }

  /**
   * List folders
   */
  async listFolders(parentId: string = 'root'): Promise<ZohoFolder[]> {
    const token = await this.getAccessToken();

    try {
      const response = await this.apiClient.get(
        `/workdrive/api/v1/files/${parentId}/files`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
          },
          params: {
            'filter[type]': 'folder',
          },
        }
      );

      return response.data.data || [];
    } catch (error: any) {
      throw new Error(`Failed to list Zoho folders: ${error.message}`);
    }
  }

  /**
   * Download a file
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    const token = await this.getAccessToken();

    try {
      const response = await this.apiClient.get(
        `/workdrive/api/v1/download/${fileId}`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
          },
          responseType: 'arraybuffer',
        }
      );

      return Buffer.from(response.data);
    } catch (error: any) {
      throw new Error(`Failed to download file from Zoho: ${error.message}`);
    }
  }

  /**
   * Get file details
   */
  async getFileDetails(fileId: string): Promise<ZohoFile> {
    const token = await this.getAccessToken();

    try {
      const response = await this.apiClient.get(
        `/workdrive/api/v1/files/${fileId}`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
          },
        }
      );

      return response.data.data;
    } catch (error: any) {
      throw new Error(`Failed to get file details from Zoho: ${error.message}`);
    }
  }
}

export const zohoService = new ZohoService();
