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

export interface ZohoTeamFolder {
  id: string;
  name: string;
  type: string;
  attributes: {
    name: string;
    created_time: string;
    modified_time: string;
  };
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

    const accountsDomain = process.env.ZOHO_ACCOUNTS_DOMAIN || 'https://accounts.zoho.com';
    const tokenUrl = `${accountsDomain}/oauth/v2/token`;

    console.log('🔑 Attempting to get Zoho access token...');
    console.log('Token URL:', tokenUrl);

    try {
      const response = await axios.post(
        tokenUrl,
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
      console.log('✅ Successfully obtained Zoho access token');

      // Clear token after 50 minutes (tokens expire in 1 hour)
      setTimeout(() => {
        this.accessToken = null;
      }, 50 * 60 * 1000);

      if (!this.accessToken) {
        throw new Error('Failed to get Zoho access token: Empty token received');
      }

      return this.accessToken;
    } catch (error: any) {
      console.error('❌ Failed to get Zoho access token');
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });

      if (error.response?.status === 403) {
        console.error('\n⚠️  Error 403 - Possible causes:');
        console.error('1. Wrong Zoho region - Try setting ZOHO_ACCOUNTS_DOMAIN in .env:');
        console.error('   - EU: https://accounts.zoho.eu');
        console.error('   - US: https://accounts.zoho.com (default)');
        console.error('   - IN: https://accounts.zoho.in');
        console.error('   - AU: https://accounts.zoho.com.au');
        console.error('   - CN: https://accounts.zoho.com.cn');
        console.error('2. Invalid refresh token');
        console.error('3. Invalid client_id or client_secret');
        console.error('4. Token has been revoked\n');
      }

      throw new Error(`Failed to get Zoho access token: ${error.message} (Status: ${error.response?.status})`);
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
   * Get all Team Folders (workspaces)
   */
  async getTeamFolders(): Promise<ZohoTeamFolder[]> {
    const token = await this.getAccessToken();

    try {
      console.log('🏢 Fetching Team Folders (workspaces)...');

      // Try the private folders endpoint which lists all accessible team folders
      const response = await this.apiClient.get(
        '/workdrive/api/v1/privatefolders',
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
          },
        }
      );

      const teamFolders = response.data.data || [];
      console.log(`✅ Found ${teamFolders.length} Team Folder(s)`);

      return teamFolders;
    } catch (error: any) {
      console.error('❌ Error getting team folders:', error.response?.data || error.message);
      throw new Error(`Failed to get Zoho team folders: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folderId: string = 'root'): Promise<ZohoFile[]> {
    const token = await this.getAccessToken();

    try {
      let endpoint: string;

      if (folderId === 'root') {
        // For root, return empty array - user should select a team folder first
        console.log('📂 Root level - please select a Team Folder');
        return [];
      } else {
        // For specific folder, list files in that folder
        endpoint = `/workdrive/api/v1/files/${folderId}/files`;
        console.log(`📂 Listing files in folder: ${folderId}`);
      }

      const response = await this.apiClient.get(endpoint, {
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
        },
      });

      console.log('✅ Successfully retrieved files from Zoho');

      const items = response.data.data || [];
      const files = items
        .filter((item: any) => {
          const attrs = item.attributes || item;
          const type = attrs.type || item.type;
          return type !== 'folder';
        })
        .map((item: any) => this.normalizeFile(item));

      console.log(`📊 Found ${files.length} file(s)`);
      return files;
    } catch (error: any) {
      console.error('❌ Zoho API Error:', error.response?.data || error.message);
      throw new Error(`Failed to list Zoho files: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * List folders (including Team Folders at root level)
   */
  async listFolders(parentId: string = 'root'): Promise<ZohoFolder[] | ZohoTeamFolder[]> {
    const token = await this.getAccessToken();

    try {
      if (parentId === 'root') {
        // For root, return Team Folders (workspaces)
        console.log('📁 Listing Team Folders at root level...');
        return await this.getTeamFolders();
      } else {
        // For specific parent folder, list sub-folders
        const endpoint = `/workdrive/api/v1/files/${parentId}/files`;
        console.log(`📁 Listing folders in parent: ${parentId}`);

        const response = await this.apiClient.get(endpoint, {
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
          },
        });

        const items = response.data.data || [];
        const folders = items.filter((item: any) => {
          const attrs = item.attributes || item;
          const type = attrs.type || item.type;
          return type === 'folder';
        });

        console.log(`📊 Found ${folders.length} folder(s)`);
        return folders;
      }
    } catch (error: any) {
      console.error('❌ Zoho API Error:', error.response?.data || error.message);
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
