import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import { useAuth } from '../contexts/AuthContext';
import { saveEntry } from '../utils/storage';
import '../styles/newEntry.css';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function NewEntry() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    tags: '',
    files: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({
    uploading: false,
    currentFile: '',
    progress: 0,
    processedFiles: 0,
    totalFiles: 0,
    currentBatch: { start: 0, end: 0 }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  const validateFiles = (files) => {
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File ${file.name} is too large. Maximum size is 10MB.`);
      }
      
      const fileType = file.type.split('/')[0];
      if (fileType !== 'image' && fileType !== 'video') {
        throw new Error(`File ${file.name} is not a supported format. Please upload only images or videos.`);
      }
    }
  };

  const handleFilesChange = (files) => {
    try {
      validateFiles(files);
      setFormData(prev => ({
        ...prev,
        files
      }));
      setError(null);
      setUploadStatus(prev => ({
        ...prev,
        totalFiles: files.length
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUploadProgress = (progress) => {
    setUploadStatus(prev => ({
      ...prev,
      uploading: true,
      progress: progress.progress,
      processedFiles: progress.processed,
      currentBatch: progress.currentBatch,
      currentFile: `Processing files ${progress.currentBatch.start + 1} to ${progress.currentBatch.end} of ${progress.total}`
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError(null);
      setUploadStatus(prev => ({
        ...prev,
        uploading: true,
        progress: 0,
        processedFiles: 0
      }));

      if (formData.files.length === 0) {
        throw new Error('Please add at least one photo or video.');
      }

      await saveEntry(formData, handleUploadProgress);
      
      // Show 100% completion briefly before navigation
      setUploadStatus(prev => ({
        ...prev,
        progress: 100,
        processedFiles: prev.totalFiles,
        currentFile: 'Upload complete!'
      }));

      // Navigate after a brief delay to show completion
      setTimeout(() => {
        navigate('/map');
      }, 1000);

    } catch (error) {
      console.error('Error creating entry:', error);
      setError(error.message || 'Failed to create entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container">
        <h2>Please sign in to create a new entry</h2>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Create New Travel Entry</h2>
      <form onSubmit={handleSubmit} className="entry-form">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows="4"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="location">Location</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="tags">Tags (comma-separated)</label>
          <input
            type="text"
            id="tags"
            name="tags"
            value={formData.tags}
            onChange={handleInputChange}
            placeholder="e.g., beach, sunset, hiking"
          />
        </div>

        <div className="form-group">
          <label>Photos & Videos</label>
          <FileUpload onFilesChange={handleFilesChange} />
          <small className="help-text">
            Supported formats: JPEG, PNG, GIF, MP4, MOV, AVI (Max size: 10MB per file)
          </small>
        </div>

        {uploadStatus.uploading && (
          <div className="upload-status">
            <div className="current-file">
              {uploadStatus.currentFile}
            </div>
            <div className="upload-progress">
              <div 
                className="progress-bar" 
                style={{ width: `${uploadStatus.progress}%` }}
              />
              <span>
                {uploadStatus.processedFiles} of {uploadStatus.totalFiles} files ({Math.round(uploadStatus.progress)}%)
              </span>
            </div>
          </div>
        )}

        <button 
          type="submit" 
          className="submit-button" 
          disabled={loading || formData.files.length === 0}
        >
          {loading ? 'Creating Entry...' : 'Create Entry'}
        </button>
      </form>
    </div>
  );
}

export default NewEntry; 