import { useState, useEffect } from 'react';
import axios from 'axios';
import './Community.css';

export default function Community() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New Post Form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General Support');
  const [isPosting, setIsPosting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // New Comment Form
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [commentContent, setCommentContent] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('mm_token');
      const res = await axios.get('http://localhost:5000/api/community/posts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(res.data);
    } catch (err) {
      console.error('Failed to fetch community posts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!title || !content) return;
    setIsPosting(true);
    try {
      const token = localStorage.getItem('mm_token');
      const res = await axios.post('http://localhost:5000/api/community/posts', {
        title, content, category
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setPosts([res.data, ...posts]);
      setTitle('');
      setContent('');
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create post', err);
      alert('Error creating post: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsPosting(false);
    }
  };

  const handleUpvote = async (postId) => {
    try {
      const token = localStorage.getItem('mm_token');
      const res = await axios.put(`http://localhost:5000/api/community/posts/${postId}/upvote`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(posts.map(p => p._id === postId ? res.data : p));
    } catch (err) {
      console.error('Upvote failed', err);
    }
  };

  const handleAddComment = async (e, postId) => {
    e.preventDefault();
    if (!commentContent) return;
    try {
      const token = localStorage.getItem('mm_token');
      const res = await axios.post(`http://localhost:5000/api/community/posts/${postId}/comments`, {
        content: commentContent
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setPosts(posts.map(p => p._id === postId ? res.data : p));
      setCommentContent('');
      setActiveCommentPost(null);
    } catch (err) {
      console.error('Comment failed', err);
      alert('Error commenting: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return <div className="page"><div className="loading-spinner"><div className="spinner"></div></div></div>;
  }

  return (
    <div className="community-page page">
      <div className="container community-container">
        
        <div className="community-sidebar animate-fadeInUp">
          <div className="card sidebar-card">
            <span className="sidebar-icon">🌍</span>
            <h3>Safe Space</h3>
            <p>This is an anonymous forum. Share your journey, ask questions, and support others.</p>
            <button className="btn btn-primary btn-full" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel Post' : '✏️ Create Post'}
            </button>
          </div>
          <div className="card sidebar-card">
            <h4>Topics</h4>
            <ul className="topic-list">
              <li><span className="topic-dot" style={{background: '#818cf8'}}></span> General Support</li>
              <li><span className="topic-dot" style={{background: '#34d399'}}></span> Success Stories</li>
              <li><span className="topic-dot" style={{background: '#f472b6'}}></span> Anxiety</li>
              <li><span className="topic-dot" style={{background: '#fbbf24'}}></span> Depression</li>
            </ul>
          </div>
        </div>

        <div className="community-feed animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          
          {showForm && (
            <div className="create-post-card card">
              <h3>Create a New Discussion</h3>
              <form onSubmit={handleCreatePost}>
                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Title: e.g., Feeling overwhelmed today"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <select 
                    className="form-input" 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option>General Support</option>
                    <option>Success Stories</option>
                    <option>Anxiety</option>
                    <option>Depression</option>
                  </select>
                </div>
                <div className="form-group">
                  <textarea
                    className="form-input"
                    rows="4"
                    placeholder="Share your thoughts anonymously..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-secondary" disabled={isPosting}>
                  {isPosting ? 'Posting...' : 'Post Anonymously'}
                </button>
              </form>
            </div>
          )}

          {posts.length === 0 && !showForm ? (
            <div className="empty-state card">
              <h3>No Posts Yet</h3>
              <p>Be the first to start a conversation.</p>
            </div>
          ) : (
            <div className="posts-list">
              {posts.map(post => (
                <div key={post._id} className="post-card card">
                  <div className="post-vote-col">
                    <button className="upvote-btn" onClick={() => handleUpvote(post._id)}>▲</button>
                    <span className="upvote-count">{post.upvotes}</span>
                  </div>
                  <div className="post-content-col">
                    <div className="post-meta">
                      <span className="post-author">👤 {post.authorName}</span>
                      <span className="post-category badge">{post.category}</span>
                      <span className="post-time">{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h2 className="post-title">{post.title}</h2>
                    <p className="post-body">{post.content}</p>
                    
                    <div className="post-actions">
                      <button 
                        className="comment-toggle-btn"
                        onClick={() => setActiveCommentPost(activeCommentPost === post._id ? null : post._id)}
                      >
                        💬 {post.comments?.length || 0} Comments
                      </button>
                    </div>

                    {/* Comments Section */}
                    {activeCommentPost === post._id && (
                      <div className="comments-section">
                        {post.comments.length > 0 ? (
                          <div className="comments-list">
                            {post.comments.map(comment => (
                              <div key={comment._id} className="comment-item">
                                <span className="comment-author">👤 {comment.authorName}</span>
                                <p className="comment-text">{comment.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="no-comments">No comments yet. Be the first to reply!</p>
                        )}
                        
                        <form className="comment-form" onSubmit={(e) => handleAddComment(e, post._id)}>
                          <input
                            type="text"
                            className="form-input comment-input"
                            placeholder="Add a supportive comment..."
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                          />
                          <button type="submit" className="btn btn-primary btn-sm">Reply</button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
