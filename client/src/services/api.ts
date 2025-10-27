import axios from 'axios';

const API_BASE = '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

// Zoho API
export const zohoApi = {
  listTeamFolders: async () => {
    const response = await apiClient.get(`/zoho/teamfolders`);
    return response.data.data;
  },

  listFiles: async (folderId: string = 'root') => {
    const response = await apiClient.get(`/zoho/files/${folderId}`);
    return response.data.data;
  },

  listFolders: async (parentId: string = 'root') => {
    const response = await apiClient.get(`/zoho/folders/${parentId}`);
    return response.data.data;
  },

  getFileDetails: async (fileId: string) => {
    const response = await apiClient.get(`/zoho/file/${fileId}`);
    return response.data.data;
  },

  downloadFile: async (fileId: string) => {
    const response = await apiClient.get(`/zoho/download/${fileId}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// SharePoint API
export const sharepointApi = {
  listFiles: async (folderPath: string = '') => {
    const response = await apiClient.get(`/sharepoint/files/${folderPath}`);
    return response.data.data;
  },

  createFolder: async (folderName: string, parentPath: string = '') => {
    const response = await apiClient.post('/sharepoint/folder', {
      folderName,
      parentPath,
    });
    return response.data.data;
  },
};

// Transfer API
export const transferApi = {
  transferFile: async (zohoFileId: string, sharepointFolderPath: string = '') => {
    const response = await apiClient.post('/transfer/file', {
      zohoFileId,
      sharepointFolderPath,
    });
    return response.data.data;
  },

  transferBatch: async (fileIds: string[], sharepointFolderPath: string = '') => {
    const response = await apiClient.post('/transfer/batch', {
      fileIds,
      sharepointFolderPath,
    });
    return response.data.data;
  },

  transferFolder: async (zohoFolderId: string, sharepointFolderPath: string = '') => {
    const response = await apiClient.post('/transfer/folder', {
      zohoFolderId,
      sharepointFolderPath,
    });
    return response.data.data;
  },

  getTransferStatus: async (transferId: string) => {
    const response = await apiClient.get(`/transfer/status/${transferId}`);
    return response.data.data;
  },
};

export default apiClient;
