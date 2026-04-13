import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api';

export default function ForumPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', tags: '' });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/forum');
      setPosts(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const createPost = async () => {
    try {
      await api.post('/api/forum', {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : []
      });
      setForm({ title: '', content: '', tags: '' });
      setShowForm(false);
      loadPosts();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const likePost = async (id) => {
    try {
      await api.patch(`/api/forum/${id}/like`);
      loadPosts();
    } catch (err) { console.error(err); }
  };

  const deletePost = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api.delete(`/api/forum/${id}`);
      loadPosts();
    } catch (err) { alert('Error deleting'); }
  };

  return (
    <>
      <Navbar />
      <div className="dashboard">
        <div className="page-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <h1>Community Forum</h1>
            <p>Share discussions and updates with the MediMesh community</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ New Post'}
          </button>
        </div>

        {showForm && (
          <div className="card" style={{marginBottom:'1.5rem'}}>
            <div className="card-header"><h2>Create New Post</h2></div>
            <div className="card-body">
              <div className="form-group"><label>Title</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Post title" /></div>
              <div className="form-group"><label>Content</label><textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="Write your post..." style={{minHeight:'120px'}} /></div>
              <div className="form-group"><label>Tags (comma separated)</label><input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="e.g. health, tips, discussion" /></div>
              <button className="btn btn-primary" onClick={createPost}>Publish Post</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : posts.length === 0 ? (
          <div className="card"><div className="card-body"><div className="empty-state"><div className="empty-icon">🌐</div><h3>No posts yet</h3><p>Be the first to start a discussion!</p></div></div></div>
        ) : (
          posts.map(post => (
            <div key={post._id} className="forum-post">
              <div className="forum-post-header">
                <div className="forum-author">
                  <div className="forum-avatar">{(post.authorName || '?')[0].toUpperCase()}</div>
                  <div>
                    <strong>{post.authorName}</strong>
                    <span className={`status-badge`} style={{marginLeft:'8px', background: post.authorRole === 'doctor' ? '#DBEAFE' : post.authorRole === 'admin' ? '#FEE2E2' : '#D1FAE5', color: '#1F2937', fontSize:'0.7rem'}}>{post.authorRole}</span>
                    <div className="forum-meta">{new Date(post.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>
              <h3>{post.title}</h3>
              <p>{post.content}</p>
              {post.tags && post.tags.length > 0 && (
                <div style={{display:'flex', gap:'6px', marginTop:'0.75rem', flexWrap:'wrap'}}>
                  {post.tags.map((tag, i) => (
                    <span key={i} style={{background:'var(--bg-light)', color:'var(--primary)', padding:'2px 10px', borderRadius:'12px', fontSize:'0.75rem', fontWeight:500}}>#{tag}</span>
                  ))}
                </div>
              )}
              <div className="forum-actions">
                <button onClick={() => likePost(post._id)}>👍 {post.likes || 0} Likes</button>
                {(post.authorId === user.userId || user.role === 'admin') && (
                  <button onClick={() => deletePost(post._id)} style={{color:'var(--danger)'}}>🗑️ Delete</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
