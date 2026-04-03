import { useState, useCallback } from 'react';
import { formatBytes, calculateMonthlyCredits } from '../../utils/formatters';
import { addArchivedItem } from '../../utils/archiveUtils';
import { createArchiveBundle, downloadArchiveBundle, generateArchivePath, isMinioConfigured, getMinioConfig } from '../../services/minio';

export function ArchiveModal({ items, token, onClose, onComplete }) {
  const [step, setStep] = useState('confirm'); // confirm, exporting, complete
  const [progress, setProgress] = useState({ current: 0, total: 0, item: '', status: '' });
  const [archives, setArchives] = useState([]);
  const [error, setError] = useState(null);

  const minioConfig = getMinioConfig();

  const totalSize = items.reduce((sum, i) => sum + (i.size || 0), 0);
  const totalCredits = items.reduce((sum, i) => sum + calculateMonthlyCredits(i.size, i.type), 0);

  const handleExport = useCallback(async () => {
    setStep('exporting');
    setError(null);

    try {
      const result = await createArchiveBundle(token, items, setProgress);
      setArchives(result);

      // Mark items as archived locally
      result.forEach(archive => {
        if (archive.type !== 'error') {
          addArchivedItem(archive.item, archive.path);
        }
      });

      setStep('complete');
    } catch (err) {
      setError(err.message);
      setStep('confirm');
    }
  }, [token, items]);

  const handleDownload = useCallback(() => {
    downloadArchiveBundle(archives);
  }, [archives]);

  const handleClose = useCallback(() => {
    if (step === 'complete' && onComplete) {
      onComplete(archives);
    }
    onClose();
  }, [step, archives, onComplete, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            📦 Archive to MinIO
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 flex-1 overflow-auto">
          {step === 'confirm' && (
            <>
              <p className="text-gray-600 mb-4">
                Export and archive the following {items.length} item(s) to MinIO storage.
                This will save the data locally and mark them as archived.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{items.length}</div>
                    <div className="text-sm text-gray-500">Items</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{formatBytes(totalSize)}</div>
                    <div className="text-sm text-gray-500">Total Size</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{totalCredits.toFixed(1)}</div>
                    <div className="text-sm text-gray-500">Credits/mo Saved</div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-medium text-gray-900 mb-2">Items to archive:</h3>
                <div className="max-h-48 overflow-auto border rounded-lg">
                  {items.map(item => (
                    <div key={item.id} className="px-3 py-2 border-b last:border-b-0 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">{item.title}</div>
                        <div className="text-xs text-gray-500">{item.type} • {item.owner}</div>
                      </div>
                      <div className="text-sm text-gray-600">{formatBytes(item.size)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {!minioConfig.configured && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Note:</strong> MinIO is not configured. The archive will be downloaded as a JSON file.
                    To enable direct MinIO upload, set VITE_MINIO_* environment variables.
                  </p>
                </div>
              )}

              {minioConfig.configured && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-green-800 text-sm">
                    <strong>MinIO configured:</strong> {minioConfig.endpoint} / {minioConfig.bucket}
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}
            </>
          )}

          {step === 'exporting' && (
            <div className="py-8">
              <div className="text-center mb-4">
                <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">
                  Exporting {progress.current} of {progress.total}...
                </p>
                <p className="text-sm text-gray-500 mt-1">{progress.item}</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <>
              <div className="text-center py-4">
                <div className="text-4xl mb-2">✅</div>
                <h3 className="text-xl font-semibold text-gray-900">Archive Complete</h3>
                <p className="text-gray-600 mt-1">
                  {archives.filter(a => a.type !== 'error').length} items archived successfully
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Archive Summary:</h4>
                <div className="max-h-48 overflow-auto">
                  {archives.map((archive, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 text-sm">
                      <span className={archive.type === 'error' ? 'text-red-600' : 'text-gray-700'}>
                        {archive.type === 'error' ? '❌' : '✓'} {archive.item.title}
                      </span>
                      <span className="text-gray-500 text-xs">{archive.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-purple-800 text-sm mb-2">
                  Items are marked as archived in the dashboard. Download the archive bundle to store in MinIO:
                </p>
                <button
                  onClick={handleDownload}
                  className="w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  📥 Download Archive Bundle
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          {step === 'confirm' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Start Archive
              </button>
            </>
          )}
          {step === 'complete' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
