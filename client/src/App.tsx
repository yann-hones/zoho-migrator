import React, { useState, useEffect } from 'react';
import { zohoApi, transferApi } from './services/api';

interface ZohoTeamFolder {
  id: string;
  name: string;
  type: string;
  attributes: {
    name: string;
    created_time: string;
    modified_time: string;
  };
}

interface ZohoFolder {
  id: string;
  name: string;
  type: string;
  attributes?: {
    name: string;
    type: string;
  };
}

interface ZohoFile {
  id: string;
  name: string;
  type: string;
  size: number;
  created_time: string;
  modified_time: string;
}

interface TransferProgress {
  total: number;
  current: number;
  fileName: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

function App() {
  const [zohoTeamFolders, setZohoTeamFolders] = useState<ZohoTeamFolder[]>([]);
  const [zohoFolders, setZohoFolders] = useState<ZohoFolder[]>([]);
  const [zohoFiles, setZohoFiles] = useState<ZohoFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: 'root', name: '🏢 Team Folders' }]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [sharepointFolder, setSharepointFolder] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [transferring, setTransferring] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<TransferProgress | null>(null);

  useEffect(() => {
    loadZohoTeamFolders();
  }, []);

  const loadZohoTeamFolders = async () => {
    setLoading(true);
    setError(null);
    try {
      const teamFolders = await zohoApi.listTeamFolders();
      setZohoTeamFolders(teamFolders);
      setZohoFolders([]);
      setZohoFiles([]);
      setCurrentFolderId(null);
      setBreadcrumb([{ id: 'root', name: '🏢 Team Folders' }]);
    } catch (err: any) {
      setError(`Erreur lors du chargement des Team Folders: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = async (folderId: string, folderName: string) => {
    setLoading(true);
    setError(null);
    try {
      const [folders, files] = await Promise.all([
        zohoApi.listFolders(folderId),
        zohoApi.listFiles(folderId),
      ]);

      setZohoFolders(folders);
      setZohoFiles(files);
      setCurrentFolderId(folderId);
      setZohoTeamFolders([]);

      // Update breadcrumb
      const existingIndex = breadcrumb.findIndex((item: BreadcrumbItem) => item.id === folderId);
      if (existingIndex >= 0) {
        // Going back to an existing folder
        setBreadcrumb(breadcrumb.slice(0, existingIndex + 1));
      } else {
        // Going deeper
        setBreadcrumb([...breadcrumb, { id: folderId, name: folderName }]);
      }
    } catch (err: any) {
      setError(`Erreur lors du chargement du dossier: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === 0) {
      // Go back to root (Team Folders)
      loadZohoTeamFolders();
    } else {
      const item = breadcrumb[index];
      navigateToFolder(item.id, item.name);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const selectAll = () => {
    setSelectedFiles(new Set(zohoFiles.map((f: ZohoFile) => f.id)));
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleTransfer = async () => {
    if (selectedFiles.size === 0) {
      setError('Veuillez sélectionner au moins un fichier');
      return;
    }

    setTransferring(true);
    setError(null);
    setSuccess(null);
    setProgress({ total: selectedFiles.size, current: 0, fileName: '' });

    try {
      const fileIds = Array.from(selectedFiles);
      let currentIndex = 0;

      for (const fileId of fileIds) {
        const file = zohoFiles.find((f: ZohoFile) => f.id === fileId);
        setProgress({
          total: fileIds.length,
          current: currentIndex + 1,
          fileName: file?.name || 'Fichier inconnu',
        });

        await transferApi.transferFile(fileId as string, sharepointFolder);
        currentIndex++;
      }

      setSuccess(
        `✓ Transfert réussi: ${selectedFiles.size} fichier(s) transféré(s) vers SharePoint`
      );
      setSelectedFiles(new Set());
      setProgress(null);
    } catch (err: any) {
      setError(`Erreur lors du transfert: ${err.message}`);
      setProgress(null);
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Zoho Drive → SharePoint</h1>
        <p>Transférez vos fichiers facilement de Zoho Drive vers SharePoint</p>
      </header>

      <main className="main-content">
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="panel-container">
          <div className="panel">
            <h2>📁 Fichiers Zoho Drive</h2>

            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
                <p>Chargement des fichiers...</p>
              </div>
            ) : (
              <>
                {/* Breadcrumb Navigation */}
                <div style={{ marginBottom: '15px', padding: '10px', background: '#f7fafc', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                  {breadcrumb.map((item: BreadcrumbItem, index: number) => (
                    <React.Fragment key={item.id}>
                      <button
                        onClick={() => navigateToBreadcrumb(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: index === breadcrumb.length - 1 ? '#2d3748' : '#4299e1',
                          cursor: index === breadcrumb.length - 1 ? 'default' : 'pointer',
                          fontWeight: index === breadcrumb.length - 1 ? 'bold' : 'normal',
                          padding: '4px 8px',
                          borderRadius: '4px',
                        }}
                        disabled={index === breadcrumb.length - 1}
                      >
                        {item.name}
                      </button>
                      {index < breadcrumb.length - 1 && <span style={{ color: '#a0aec0' }}>›</span>}
                    </React.Fragment>
                  ))}
                </div>

                <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
                  <button className="btn btn-secondary" onClick={selectAll}>
                    Tout sélectionner
                  </button>
                  <button className="btn btn-secondary" onClick={deselectAll}>
                    Tout désélectionner
                  </button>
                  <button className="btn btn-secondary" onClick={() => navigateToBreadcrumb(0)}>
                    🔄 Actualiser
                  </button>
                </div>

                <div className="file-list">
                  {/* Team Folders (at root level) */}
                  {zohoTeamFolders.length > 0 && (
                    <>
                      {zohoTeamFolders.map(teamFolder => (
                        <div
                          key={teamFolder.id}
                          className="file-item"
                          onClick={() => navigateToFolder(teamFolder.id, teamFolder.attributes.name)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="file-info">
                            <span className="file-icon">🏢</span>
                            <div className="file-details">
                              <div className="file-name">{teamFolder.attributes.name}</div>
                              <div className="file-size">Team Folder</div>
                            </div>
                          </div>
                          <span style={{ color: '#a0aec0' }}>›</span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Folders (inside a team folder or subfolder) */}
                  {zohoFolders.length > 0 && (
                    <>
                      {zohoFolders.map(folder => (
                        <div
                          key={folder.id}
                          className="file-item"
                          onClick={() => navigateToFolder(folder.id, folder.attributes?.name || folder.name)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="file-info">
                            <span className="file-icon">📁</span>
                            <div className="file-details">
                              <div className="file-name">{folder.attributes?.name || folder.name}</div>
                              <div className="file-size">Dossier</div>
                            </div>
                          </div>
                          <span style={{ color: '#a0aec0' }}>›</span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Files */}
                  {zohoFiles.length === 0 && zohoTeamFolders.length === 0 && zohoFolders.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>
                      {currentFolderId ? 'Aucun fichier ou dossier trouvé' : 'Sélectionnez un Team Folder pour commencer'}
                    </div>
                  ) : (
                    zohoFiles.map(file => (
                      <div
                        key={file.id}
                        className={`file-item ${
                          selectedFiles.has(file.id) ? 'selected' : ''
                        }`}
                        onClick={() => toggleFileSelection(file.id)}
                      >
                        <div className="file-info">
                          <span className="file-icon">📄</span>
                          <div className="file-details">
                            <div className="file-name">{file.name}</div>
                            <div className="file-size">{formatFileSize(file.size)}</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={selectedFiles.has(file.id)}
                          onChange={() => toggleFileSelection(file.id)}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        />
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <div className="panel">
            <h2>📤 Destination SharePoint</h2>

            <div className="folder-input">
              <label htmlFor="folder-path">
                Chemin du dossier (optionnel)
              </label>
              <input
                id="folder-path"
                type="text"
                placeholder="ex: Documents/Migration"
                value={sharepointFolder}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSharepointFolder(e.target.value)}
                disabled={transferring}
              />
              <small style={{ color: '#718096', marginTop: '5px', display: 'block' }}>
                Laissez vide pour transférer à la racine
              </small>
            </div>

            <div style={{ marginTop: '20px', padding: '15px', background: 'white', borderRadius: '6px' }}>
              <h3 style={{ marginBottom: '10px', color: '#2d3748' }}>
                📊 Résumé
              </h3>
              <p style={{ color: '#4a5568' }}>
                <strong>Fichiers sélectionnés:</strong> {selectedFiles.size}
              </p>
              <p style={{ color: '#4a5568' }}>
                <strong>Taille totale:</strong>{' '}
                {formatFileSize(
                  zohoFiles
                    .filter((f: ZohoFile) => selectedFiles.has(f.id))
                    .reduce((sum: number, f: ZohoFile) => sum + f.size, 0)
                )}
              </p>
            </div>
          </div>
        </div>

        {progress && (
          <div className="progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              >
                {Math.round((progress.current / progress.total) * 100)}%
              </div>
            </div>
            <div className="progress-text">
              Transfert de: {progress.fileName} ({progress.current} / {progress.total})
            </div>
          </div>
        )}

        <div className="button-container">
          <button
            className="btn btn-primary"
            onClick={handleTransfer}
            disabled={transferring || selectedFiles.size === 0}
          >
            {transferring ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px' }}></div>
                Transfert en cours...
              </>
            ) : (
              <>
                🚀 Transférer vers SharePoint
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
