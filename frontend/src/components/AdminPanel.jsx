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
    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: 'info', message: 'Processing media... This may take a moment.' });

        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                }
            };
            const res = await axios.post(`http://${window.location.hostname}:3001/api/admin/ingest`, formData, config);
            setStatus({ type: 'success', message: `Successfully added "${res.data.title}"!` });
            setFormData({ url: '', title: '', artist: '', coverImage: '' });
        } catch (err) {
            setStatus({
                type: 'error',
                message: err.response?.data?.msg || 'Failed to ingest media. Please check the URL and try again.'
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
                    <p>Paste an audio or video link to add it to the library.</p>
                </div>

                <form onSubmit={handleSubmit} className="admin-form">
                    <div className="input-group">
                        <label><LinkIcon size={16} /> Media URL</label>
                        <input
                            type="text"
                            name="url"
                            value={formData.url}
                            onChange={handleChange}
                            placeholder="https://www.youtube.com/watch?v=..."
                            required
                        />
                    </div>

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

            <style jsx>{`
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
