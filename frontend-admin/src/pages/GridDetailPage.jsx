import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTiles } from '../context/TileContext';
import { apiGet } from '../constants/apiUtil';
import { apiUploadImage } from '../constants/apiUploadImage';
import { normalizeRole } from '../constants/roleUtils';
import { API_BASE_URL } from '../constants/api';
import indiaLocations from '../constants/indiaLocations.json';

const STATES = Object.keys(indiaLocations).sort();
const districtsFor = (state) => (state && indiaLocations[state] ? [...indiaLocations[state]].sort() : []);
const formatImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  return `${API_BASE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
};

export default function GridDetailPage() {
  const { user, isLoading } = useAuth();
  const { getTileById, updateTile, fetchTiles } = useTiles();
  const { tileDbId } = useParams();
  const navigate = useNavigate();

  const tile = getTileById(Number(tileDbId));

  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsError, setAdminsError] = useState(null);

  const [gridName, setGridName] = useState('');
  const [gridTileId, setGridTileId] = useState('');
  const [gridPriority, setGridPriority] = useState('0');
  const [gridState, setGridState] = useState('');
  const [gridDistrict, setGridDistrict] = useState('');
  const [gridImageUrl, setGridImageUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const role = normalizeRole(user?.role);
  const isSuperAdmin = role === 'super_admin' || user?.username?.toLowerCase() === 'superadmin';

  useEffect(() => {
    if (isLoading) return;
    if (!isSuperAdmin) {
      navigate(role === 'admin' && user?.tileId ? `/admin/${user.tileId}` : '/login', { replace: true });
    }
  }, [isLoading, navigate, user, isSuperAdmin, role]);

  useEffect(() => {
    if (!isLoading) {
      fetchAdmins();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  useEffect(() => {
    if (tile) {
      setGridName(tile.name || '');
      setGridTileId(tile.tileId || '');
      setGridPriority(tile.priority != null ? String(tile.priority) : '0');
      setGridState(tile.state || '');
      setGridDistrict(tile.district || '');
      setGridImageUrl(tile.image || '');
      setSelectedImage(null);
    }
  }, [tile]);

  const fetchAdmins = async () => {
    setAdminsLoading(true);
    setAdminsError(null);
    try {
      const data = await apiGet(`/admin/list-admins?requestedBy=${encodeURIComponent(user.username)}`);
      setAdmins((data || []).filter((a) => Number(a.tileId) === Number(tileDbId)));
    } catch (error) {
      setAdminsError(error.message || 'Failed to load admin accounts');
    } finally {
      setAdminsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!gridName.trim() || !gridTileId.trim() || !gridPriority.trim()) {
      return setMessage({ type: 'error', text: 'Provide grid id, name, and priority.' });
    }

    setLoading(true);
    try {
      let imageUrl = gridImageUrl;
      if (selectedImage) {
        const uploadRes = await apiUploadImage(selectedImage);
        imageUrl = uploadRes.url || uploadRes.imageUrl || uploadRes.path;
      }

      await updateTile(Number(tileDbId), {
        tileId: gridTileId.trim(),
        name: gridName.trim(),
        image: imageUrl,
        priority: Number(gridPriority) || 0,
        state: gridState,
        district: gridDistrict,
      });
      await fetchTiles();
      navigate('/superadmin');
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to update grid.' });
    } finally {
      setLoading(false);
    }
  };

  if (!tile) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="admin-root">
      <div className="sa-content">
        <button className="upload-button" onClick={() => navigate('/superadmin')} style={{ marginBottom: 16 }}>
          Back
        </button>

        <h1 className="heading">{tile.name}</h1>
        <p className="subheading">Grid details, admin accounts, and update options.</p>

        {message && <p className={message.type === 'error' ? 'error-text' : 'success-text'}>{message.text}</p>}

        <div className="segment">
          <h2 className="section-title">Admins for this grid</h2>
          {adminsLoading && <p className="helper-text">Loading admin accounts...</p>}
          {adminsError && <p className="error-text">{adminsError}</p>}
          {!adminsLoading && admins.length === 0 ? (
            <p className="empty-text">No admin accounts found for this grid.</p>
          ) : (
            admins.map((account) => (
              <div key={account.id} className="tile-card no-hover">
                <div className="tile-name">{account.username}</div>
                <div className="tile-details">Password: {account.password}</div>
              </div>
            ))
          )}
        </div>

        <div className="segment">
          <h2 className="section-title">Update grid</h2>
          <input className="input" placeholder="Grid id (tileId)" value={gridTileId} onChange={(e) => setGridTileId(e.target.value)} autoCapitalize="none" />
          <input className="input" placeholder="Grid name" value={gridName} onChange={(e) => setGridName(e.target.value)} />
          <select
            className="input"
            value={gridState}
            onChange={(e) => { setGridState(e.target.value); setGridDistrict(''); }}
          >
            <option value="">Select state</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="input"
            value={gridDistrict}
            onChange={(e) => setGridDistrict(e.target.value)}
            disabled={!gridState}
          >
            <option value="">Select district</option>
            {districtsFor(gridState).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <label className="upload-button">
            {selectedImage ? 'Change Image' : 'Upload New Image'}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setSelectedImage(file);
                e.target.value = '';
              }}
            />
          </label>
          {selectedImage ? (
            <div className="image-preview">
              <img className="preview-image" src={URL.createObjectURL(selectedImage)} alt="Grid preview" />
              <button className="remove-button" onClick={() => setSelectedImage(null)}>Remove</button>
            </div>
          ) : gridImageUrl ? (
            <div className="image-preview">
              <img className="preview-image" src={formatImageUrl(gridImageUrl)} alt="Current grid" />
            </div>
          ) : null}
          <input
            className="input"
            placeholder="Priority (lower appears first)"
            type="number"
            value={gridPriority}
            onChange={(e) => setGridPriority(e.target.value)}
          />
          <div className="action-row">
            <button className="submit-button small-button" onClick={handleUpdate} disabled={loading}>
              {loading ? 'Updating...' : 'Update'}
            </button>
            <button className="submit-button cancel-button" onClick={() => navigate('/superadmin')} disabled={loading}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
