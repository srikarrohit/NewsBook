import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAds } from '../context/AdsContext';
import { useTiles } from '../context/TileContext';
import { apiUploadImage } from '../constants/apiUploadImage';
import { normalizeRole } from '../constants/roleUtils';

const TAG_OPTIONS = ['General', 'Politics', 'Sports', 'Business', 'Entertainment', 'Technology'];

export default function ComposePage() {
  const { user, isLoading } = useAuth();
  const { addPost } = useTiles();
  const { addAd } = useAds();
  const { tileId } = useParams();
  const navigate = useNavigate();

  const [selectedMode, setSelectedMode] = useState('post');
  const [selectedTag, setSelectedTag] = useState(TAG_OPTIONS[0]);
  const [content, setContent] = useState('');
  const [adContent, setAdContent] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (isLoading) return;
    const role = normalizeRole(user?.role);
    if (!user || role !== 'admin' || Number(user.tileId) !== Number(tileId)) {
      navigate('/', { replace: true });
    }
  }, [isLoading, navigate, tileId, user]);

  useEffect(() => {
    if (!selectedImage) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedImage);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  const activeText = selectedMode === 'post' ? content : adContent;
  const setActiveText = selectedMode === 'post' ? setContent : setAdContent;

  const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

  const toggleDictation = () => {
    if (!SpeechRecognition) {
      setMessage({ type: 'error', text: 'Speech-to-text is not supported in this browser.' });
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setActiveText((prev) => (prev ? prev + ' ' : '') + transcript.trim());
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handlePublish = async () => {
    if (!activeText.trim()) {
      return setMessage({ type: 'error', text: 'Please enter some content.' });
    }
    if (!selectedImage) {
      return setMessage({ type: 'error', text: 'Please select an image.' });
    }
    setLoading(true);
    try {
      const uploadRes = await apiUploadImage(selectedImage);
      const imageUrl = uploadRes.url || uploadRes.imageUrl || uploadRes.path;

      if (selectedMode === 'post') {
        await addPost(tileId, user.id, { content, image: imageUrl, tag: selectedTag });
      } else {
        await addAd(tileId, user.id, { content: adContent, image: imageUrl, tag: 'admin ad' });
      }
      navigate(`/admin/${tileId}`);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Publish failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-root">
      <div className="sa-content">
        <button className="upload-button" onClick={() => navigate(`/admin/${tileId}`)} style={{ marginBottom: 16 }}>
          Back
        </button>

        <h1 className="heading">Write a Post</h1>
        <p className="subheading">Compose your story and see exactly how it will look before publishing.</p>

        <div className="mode-row">
          <button
            className={`mode-button ${selectedMode === 'post' ? 'active' : ''}`}
            onClick={() => setSelectedMode('post')}
          >
            Post
          </button>
          <button
            className={`mode-button ${selectedMode === 'ad' ? 'active' : ''}`}
            onClick={() => setSelectedMode('ad')}
          >
            Ad
          </button>
        </div>

        {selectedMode === 'post' && (
          <div className="segment">
            <h2 className="section-title">Tag</h2>
            <div className="tag-row">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  className={`tag-button ${selectedTag === tag ? 'active' : ''}`}
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="segment">
          <h2 className="section-title">Content</h2>
          <label className="upload-button">
            {selectedImage ? 'Change Image' : 'Upload Image'}
            <input type="file" accept="image/*" hidden onChange={(e) => setSelectedImage(e.target.files?.[0] || null)} />
          </label>
          <textarea
            className="input textarea"
            placeholder={selectedMode === 'post' ? 'Write your news story...' : 'Write your ad copy...'}
            value={activeText}
            onChange={(e) => setActiveText(e.target.value)}
          />
          <button className="upload-button" onClick={toggleDictation} style={{ marginTop: 4 }}>
            {isListening ? 'Stop Dictation' : 'Dictate with Microphone'}
          </button>
          {message && <p className={message.type === 'error' ? 'error-text' : 'success-text'}>{message.text}</p>}
        </div>

        <div className="segment">
          <h2 className="section-title">Preview</h2>
          <div className="preview-card">
            <div className="preview-card-image-wrap">
              {imagePreviewUrl ? (
                <img className="preview-card-image" src={imagePreviewUrl} alt="Preview" />
              ) : (
                <div className="preview-card-image-placeholder">No image selected</div>
              )}
              <div className={`preview-card-tag ${selectedMode === 'ad' ? 'ad' : ''}`}>
                {selectedMode === 'post' ? selectedTag : 'AD'}
              </div>
            </div>
            <div className="preview-card-text">
              {activeText.trim() ? activeText : 'Your content will appear here as you type.'}
            </div>
          </div>
        </div>

        <button className="submit-button" onClick={handlePublish} disabled={loading}>
          {loading ? 'Publishing...' : selectedMode === 'post' ? 'Publish Post' : 'Publish Ad'}
        </button>
      </div>
    </div>
  );
}
