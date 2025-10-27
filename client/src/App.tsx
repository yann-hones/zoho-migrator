import React, { useState, useEffect } from 'react';
import { zohoApi, sharepointApi, transferApi } from './services/api';

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

function App() {
  const [zohoFiles, setZohoFiles] = useState<ZohoFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [sharepointFolder, setSharepointFolder] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [transferring, setTransferring] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<TransferProgress | null>(null);

  useEffect(() => {
    loadZohoFiles();
  }, []);

  const loadZohoFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const files = await zohoApi.listFiles();
      setZohoFiles(files);
    } catch (err: any) {
      setError(`Erreur lors du chargement des fichiers Zoho: ${err.message}`);
    } finally {
      setLoading(false);
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
    setSelectedFiles(new Set(zohoFiles.map(f => f.id)));
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
        const file = zohoFiles.find(f => f.id === fileId);
        setProgress({
          total: fileIds.length,
          current: currentIndex + 1,
          fileName: file?.name || 'Fichier inconnu',
        });

        await transferApi.transferFile(fileId, sharepointFolder);
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
                <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
                  <button className="btn btn-secondary" onClick={selectAll}>
                    Tout sélectionner
                  </button>
                  <button className="btn btn-secondary" onClick={deselectAll}>
                    Tout désélectionner
                  </button>
                  <button className="btn btn-secondary" onClick={loadZohoFiles}>
                    🔄 Actualiser
                  </button>
                </div>

                <div className="file-list">
                  {zohoFiles.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>
                      Aucun fichier trouvé
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
                          onClick={(e) => e.stopPropagation()}
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
                onChange={(e) => setSharepointFolder(e.target.value)}
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
                    .filter(f => selectedFiles.has(f.id))
                    .reduce((sum, f) => sum + f.size, 0)
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
