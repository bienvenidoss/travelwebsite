import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import '../styles/fileUpload.css';

function FileUpload({ onFilesChange }) {
  const [previews, setPreviews] = useState([]);

  const onDrop = useCallback((acceptedFiles) => {
    const newPreviews = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setPreviews(prev => [...prev, ...newPreviews]);
    onFilesChange(acceptedFiles);
  }, [onFilesChange]);

  const removeFile = (index) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
    onFilesChange(previews.filter((_, i) => i !== index).map(p => p.file));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'video/*': ['.mp4', '.mov', '.avi']
    }
  });

  return (
    <div className="file-upload-container">
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        <p>Drag & drop images/videos here, or click to select files</p>
      </div>
      
      {previews.length > 0 && (
        <div className="preview-container">
          {previews.map((preview, index) => (
            <div key={preview.preview} className="preview-item">
              {preview.file.type.startsWith('image/') ? (
                <img
                  src={preview.preview}
                  alt={`Preview ${index}`}
                  className="preview-image"
                />
              ) : (
                <video
                  src={preview.preview}
                  className="preview-video"
                  controls
                />
              )}
              <button
                onClick={() => removeFile(index)}
                className="remove-file"
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileUpload; 