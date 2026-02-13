import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Link as LinkIcon, Music, User, Image as ImageIcon, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const AdminPanel = ({ user, token, onBack }) => {
    const [formData, setFormData] = useState({
        url: '',
        title: '',
        artist: '',
        coverImage: ''
    });
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [uploadMode, setUploadMode] = useState('link'); // 'link' or 'file'

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: 'info', message: 'Processing... This may take a moment.' });

        try {
            const data = new FormData();
            data.append('title', formData.title);
            data.append('artist', formData.artist);
            data.append('coverImage', formData.coverImage);

            if (uploadMode === 'link') {
                if (!formData.url) throw new Error('URL is required');
                data.append('url', formData.url);
            } else {
                if (!file) throw new Error('Please select a file');
                data.append('audio', file);
            }

            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-auth-token': token
                }
            };

            const apiUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;
            const res = await axios.post(`${apiUrl}/api/admin/ingest`, data, config);
            setStatus({ type: 'success', message: `Successfully added "${res.data.title}"!` });
            setFormData({ url: '', title: '', artist: '', coverImage: '' });
            setFile(null);
        } catch (err) {
            setStatus({
                type: 'error',
                message: err.response?.data?.msg || err.message || 'Failed to ingest media.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-panel-container">
            <div className="admin-card">
                <div className="admin-header">
                    <h2>Admin Media Ingestion</h2>
                    <p>Upload a file or paste a link to add to library.</p>
                </div>

                <div className="mode-toggle">
                    <button
                        className={uploadMode === 'link' ? 'active' : ''}
                        onClick={() => setUploadMode('link')}
                    >
                        <LinkIcon size={16} /> Link
                    </button>
                    <button
                        className={uploadMode === 'file' ? 'active' : ''}
                        onClick={() => setUploadMode('file')}
                    >
                        <Upload size={16} /> Local File
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="admin-form">
                    {uploadMode === 'link' ? (
                        <div className="input-group">
                            <label><LinkIcon size={16} /> Media URL</label>
                            <input
                                type="text"
                                name="url"
                                value={formData.url}
                                onChange={handleChange}
                                placeholder="https://www.youtube.com/watch?v=..."
                                required={uploadMode === 'link'}
                            />
                        </div>
                    ) : (
                        <div className="input-group">
                            <label><Upload size={16} /> Select Audio File (.mp3)</label>
                            <input
                                type="file"
                                accept="audio/mpeg"
                                onChange={handleFileChange}
                                required={uploadMode === 'file'}
                                className="file-input"
                            />
                        </div>
                    )}

                    <div className="form-row">
                        <div className="input-group">
                            <label><Music size={16} /> Song Title</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="Enter song title"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label><User size={16} /> Artist Name</label>
                            <input
                                type="text"
                                name="artist"
                                value={formData.artist}
                                onChange={handleChange}
                                placeholder="Enter artist name"
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label><ImageIcon size={16} /> Cover Image URL (Optional)</label>
                        <input
                            type="text"
                            name="coverImage"
                            value={formData.coverImage}
                            onChange={handleChange}
                            placeholder="https://example.com/cover.jpg"
                        />
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? (
                            <><Loader2 className="spinner" size={18} /> Processing...</>
                        ) : (
                            <><Upload size={18} /> Ingest Media</>
                        )}
                    </button>
                </form>

                {status.message && (
                    <div className={`status-message ${status.type}`}>
                        {status.type === 'success' && <CheckCircle size={20} />}
                        {(status.type === 'error' || status.type === 'info') && <AlertCircle size={20} />}
                        <span>{status.message}</span>
                    </div>
                )}

                <button onClick={onBack} className="back-btn">Back to Player</button>
            </div>

            <style>{`
                .admin-panel-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 2rem;
                    min-height: calc(100vh - 80px);
                }
                .admin-card {
                    background: var(--card-bg, #ffffff);
                    padding: 2.5rem;
                    border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    width: 100%;
                    max-width: 600px;
                    transition: all 0.3s ease;
                }
                .dark-theme .admin-card {
                    background: #1e1e1e;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
                }
                .admin-header h2 {
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }
                .admin-header p {
                    color: var(--text-secondary);
                    margin-bottom: 2rem;
                }
                .mode-toggle {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    background: rgba(0,0,0,0.05);
                    padding: 0.5rem;
                    border-radius: 12px;
                }
                .dark-theme .mode-toggle {
                    background: rgba(255,255,255,0.05);
                }
                .mode-toggle button {
                    flex: 1;
                    padding: 0.6rem;
                    border: none;
                    background: transparent;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    transition: all 0.2s;
                }
                .mode-toggle button.active {
                    background: var(--accent-color, #6366f1);
                    color: white;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
                }
                .file-input {
                    padding: 0.5rem !important;
                    border: 2px dashed #ccc !important;
                }
                .dark-theme .file-input {
                    border-color: #444 !important;
                }
                .admin-form .input-group {
                    margin-bottom: 1.5rem;
                    display: flex;
                    flex-direction: column;
                }
                .input-group label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .input-group input {
                    padding: 0.8rem 1rem;
                    border: 2px solid #e0e0e0;
                    border-radius: 10px;
                    font-size: 1rem;
                    outline: none;
                    transition: border-color 0.3s;
                    background: var(--input-bg, #fff);
                    color: var(--text-primary);
                }
                .dark-theme .input-group input {
                    border-color: #333;
                    background: #2a2a2a;
                }
                .input-group input:focus {
                    border-color: var(--accent-color, #6366f1);
                }
                .form-row {
                    display: flex;
                    gap: 1.5rem;
                }
                .form-row .input-group {
                    flex: 1;
                }
                .submit-btn {
                    width: 100%;
                    padding: 1rem;
                    background: var(--accent-color, #6366f1);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 1.1rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 0.5rem;
                    transition: opacity 0.3s;
                    margin-top: 1rem;
                }
                .submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                .status-message {
                    margin-top: 1.5rem;
                    padding: 1rem;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                }
                .status-message.success { background: #dcfce7; color: #166534; }
                .status-message.error { background: #fee2e2; color: #991b1b; }
                .status-message.info { background: #e0f2fe; color: #075985; }
                
                .back-btn {
                    margin-top: 2rem;
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    font-weight: 500;
                    text-decoration: underline;
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spinner {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default AdminPanel;
