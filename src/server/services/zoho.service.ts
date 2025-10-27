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

      if (!this.accessToken) {
        throw new Error('Failed to get Zoho access token: Empty token received');
      }

      return this.accessToken;
    } catch (error) {
      throw new Error(`Failed to get Zoho access token: ${error}`);
    }
  }

  /**
   * Normalize Zoho API response to ZohoFile interface
   */
  private normalizeFile(item: any): ZohoFile {
    const attrs = item.attributes || item;
    return {
      id: item.id || attrs.id,
      name: attrs.name || item.name,
      type: attrs.type || item.type,
      size: attrs.size || item.size || 0,
      created_time: attrs.created_time || item.created_time,
      modified_time: attrs.modified_time || item.modified_time,
      parent_id: attrs.parent_id || item.parent_id,
    };
  }

  /**
   * List files in a folder
   */
  async listFiles(folderId: string = 'root'): Promise<ZohoFile[]> {
    const token = await this.getAccessToken();

    try {
      if (folderId === 'root') {
        // For root, we need to get team folders first, then list files from all of them
        const teamFolders = await this.getTeamFolders();

        if (teamFolders.length === 0) {
          return [];
        }

        // Get files from the first team folder
        const firstTeamFolder = teamFolders[0];
        const response = await this.apiClient.get(
          `/workdrive/api/v1/teamfolders/${firstTeamFolder.id}/files`,
          {
            headers: {
              Authorization: `Zoho-oauthtoken ${token}`,
            },
          }
        );

        const items = response.data.data || [];
        return items
          .filter((item: any) => {
            const type = item.attributes?.type || item.type;
            return type !== 'folder';
          })
          .map((item: any) => this.normalizeFile(item));
      } else {
        // For specific folder, use the files endpoint with parent_id
        const response = await this.apiClient.get(
          `/workdrive/api/v1/files`,
          {
            headers: {
              Authorization: `Zoho-oauthtoken ${token}`,
            },
            params: {
              parent_id: folderId,
            },
          }
        );

        const items = response.data.data || [];
        return items
          .filter((item: any) => {
            const type = item.attributes?.type || item.type;
            return type !== 'folder';
          })
          .map((item: any) => this.normalizeFile(item));
      }
    } catch (error: any) {
      console.error('Zoho API Error:', error.response?.data || error.message);
      throw new Error(`Failed to list Zoho files: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get team folders (workspaces)
   */
  private async getTeamFolders(): Promise<any[]> {
    const token = await this.getAccessToken();

    try {
      const response = await this.apiClient.get(
        '/workdrive/api/v1/teamfolders',
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
          },
        }
      );

      return response.data.data || [];
    } catch (error: any) {
      console.error('Error getting team folders:', error.response?.data || error.message);
      throw new Error(`Failed to get Zoho team folders: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * List folders
   */
  async listFolders(parentId: string = 'root'): Promise<ZohoFolder[]> {
    const token = await this.getAccessToken();

    try {
      if (parentId === 'root') {
        // For root, return team folders as the top-level folders
        return await this.getTeamFolders();
      } else {
        // For specific folder, use the files endpoint with parent_id
        const response = await this.apiClient.get(
          `/workdrive/api/v1/files`,
          {
            headers: {
              Authorization: `Zoho-oauthtoken ${token}`,
            },
            params: {
              parent_id: parentId,
            },
          }
        );

        const files = response.data.data || [];
        return files.filter((item: any) => item.attributes?.type === 'folder');
      }
    } catch (error: any) {
      console.error('Zoho API Error:', error.response?.data || error.message);
      throw new Error(`Failed to list Zoho folders: ${error.response?.data?.message || error.message}`);
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
