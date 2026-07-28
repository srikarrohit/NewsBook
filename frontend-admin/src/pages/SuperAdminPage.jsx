import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTiles } from '../context/TileContext';
import { apiGet, apiPost } from '../constants/apiUtil';
import { apiUploadImage } from '../constants/apiUploadImage';
import { normalizeRole } from '../constants/roleUtils';
import indiaLocations from '../constants/indiaLocations.json';

const STATES = Object.keys(indiaLocations).sort();
const districtsFor = (state) => (state && indiaLocations[state] ? [...indiaLocations[state]].sort() : []);

export default function SuperAdminPage() {
  const { user, logout, isLoading } = useAuth();
  const { tiles, fetchTiles } = useTiles();
  const navigate = useNavigate();

  const role = normalizeRole(user?.role);
  const isSuperAdmin = role === 'super_admin' || user?.username?.toLowerCase() === 'superadmin';

  const [adminAccounts, setAdminAccounts] = useState([]);
  const [adminAccountsLoading, setAdminAccountsLoading] = useState(false);
  const [adminAccountsError, setAdminAccountsError] = useState(null);

  const [newGridName, setNewGridName] = useState('');
  const [selectedGridImage, setSelectedGridImage] = useState(null);
  const [newGridPriority, setNewGridPriority] = useState('1');
  const [newGridState, setNewGridState] = useState('');
  const [newGridDistrict, setNewGridDistrict] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [existingTileId, setExistingTileId] = useState('');
  const [existingAdminUsername, setExistingAdminUsername] = useState('');
  const [existingAdminPassword, setExistingAdminPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isSuperAdmin) {
      navigate(role === 'admin' && user?.tileId ? `/admin/${user.tileId}` : '/login', { replace: true });
    }
  }, [isLoading, navigate, user, isSuperAdmin, role]);

  useEffect(() => {
    if (!isLoading) {
      fetchTiles();
      fetchAdminAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, fetchTiles]);

  const fetchAdminAccounts = async () => {
    setAdminAccountsLoading(true);
    setAdminAccountsError(null);
    try {
      const data = await apiGet(`/admin/list-admins?requestedBy=${encodeURIComponent(user.username)}`);
      setAdminAccounts(data || []);
    } catch (error) {
      setAdminAccountsError(error.message || 'Failed to load admin accounts');
    } finally {
      setAdminAccountsLoading(false);
    }
  };

  const registerGrid = async () => {
    if (!newGridName.trim() || !newAdminUsername.trim() || !newAdminPassword.trim() || !selectedGridImage || !newGridState || !newGridDistrict) {
      return setMessage({ type: 'error', text: 'Enter a grid name, state, district, upload an image, and provide admin credentials.' });
    }

    setLoading(true);
    try {
      const uploadRes = await apiUploadImage(selectedGridImage);
      const imageUrl = uploadRes.url || uploadRes.imageUrl || uploadRes.path;

      const res = await apiPost('/admin/register', {
        username: newAdminUsername.trim(),
        password: newAdminPassword,
        tileName: newGridName.trim(),
        tileImage: imageUrl,
        priority: Number(newGridPriority) || 0,
        state: newGridState,
        district: newGridDistrict,
        createdBy: user.username,
      });
      const createdTile = Array.isArray(res) && res[1] ? res[1] : res;
      setMessage({ type: 'success', text: `Grid and admin user created successfully. Tile id: ${createdTile?.id}` });
      setNewGridName('');
      setSelectedGridImage(null);
      setNewAdminUsername('');
      setNewAdminPassword('');
      setNewGridPriority('1');
      setNewGridState('');
      setNewGridDistrict('');
      fetchTiles();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to create grid.' });
    } finally {
      setLoading(false);
    }
  };

  const createAdminForTile = async () => {
    if (!existingTileId.trim() || !existingAdminUsername.trim() || !existingAdminPassword.trim()) {
      return setMessage({ type: 'error', text: 'Enter tile id, username and password.' });
    }

    setLoading(true);
    try {
      await apiPost('/admin/create-admin', {
        username: existingAdminUsername.trim(),
        password: existingAdminPassword,
        tileId: Number(existingTileId),
        createdBy: user.username,
      });
      setMessage({ type: 'success', text: 'New admin user created for the grid.' });
      setExistingAdminUsername('');
      setExistingAdminPassword('');
      setExistingTileId('');
      fetchAdminAccounts();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to create admin user.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-root">
      <div className="sa-content">
        <h1 className="heading">Super Admin Portal</h1>
        <p className="subheading">Register newspaper grids and manage admin users for each newspaper.</p>

        {message && <p className={message.type === 'error' ? 'error-text' : 'success-text'}>{message.text}</p>}

        <div className="segment">
          <h2 className="section-title">Register a new grid</h2>
          <input className="input" placeholder="Grid name" value={newGridName} onChange={(e) => setNewGridName(e.target.value)} />
          <select className="input" value={newGridState} onChange={(e) => { setNewGridState(e.target.value); setNewGridDistrict(''); }}>
            <option value="">Select state</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input" value={newGridDistrict} onChange={(e) => setNewGridDistrict(e.target.value)} disabled={!newGridState}>
            <option value="">Select district</option>
            {districtsFor(newGridState).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <label className="upload-button">
            {selectedGridImage ? 'Change Image' : 'Upload Image'}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setSelectedGridImage(e.target.files?.[0] || null)}
            />
          </label>
          {selectedGridImage && (
            <div className="image-preview">
              <img className="preview-image" src={URL.createObjectURL(selectedGridImage)} alt="Grid preview" />
              <button className="remove-button" onClick={() => setSelectedGridImage(null)}>Remove</button>
            </div>
          )}
          <input
            className="input"
            placeholder="Priority (lower appears first)"
            type="number"
            value={newGridPriority}
            onChange={(e) => setNewGridPriority(e.target.value)}
          />
          <input className="input" placeholder="Admin username" value={newAdminUsername} onChange={(e) => setNewAdminUsername(e.target.value)} autoCapitalize="none" />
          <input className="input" placeholder="Admin password" type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} />
          <button className="submit-button" onClick={registerGrid} disabled={loading}>
            {loading ? 'Registering...' : 'Register Grid'}
          </button>
        </div>

        <div className="segment">
          <h2 className="section-title">Create admin for existing grid</h2>
          <input className="input" placeholder="Existing tile id" type="number" value={existingTileId} onChange={(e) => setExistingTileId(e.target.value)} />
          <input className="input" placeholder="Admin username" value={existingAdminUsername} onChange={(e) => setExistingAdminUsername(e.target.value)} autoCapitalize="none" />
          <input className="input" placeholder="Admin password" type="password" value={existingAdminPassword} onChange={(e) => setExistingAdminPassword(e.target.value)} />
          <button className="submit-button" onClick={createAdminForTile} disabled={loading}>
            {loading ? 'Creating...' : 'Create Admin'}
          </button>
        </div>

        <div className="segment">
          <h2 className="section-title">Current newspaper grids</h2>
          {tiles.length === 0 ? (
            <p className="empty-text">No grids available yet.</p>
          ) : (
            tiles.map((tile) => (
              <div key={tile.id} className="tile-card" onClick={() => navigate(`/superadmin/grid/${tile.id}`)}>
                <div className="tile-name">{tile.name}</div>
                <div className="tile-details">Database ID: {tile.id}</div>
                <div className="tile-details">Tile ID: {tile.tileId}</div>
                <div className="tile-details">Location: {tile.district ?? '—'}, {tile.state ?? '—'}</div>
                <div className="tile-details">Priority: {tile.priority ?? 0}</div>
                <div className="tile-hint">Click to view admin account &amp; update</div>
              </div>
            ))
          )}
        </div>

        <div className="segment">
          <h2 className="section-title">All Admin Accounts</h2>
          {adminAccountsLoading && <p className="helper-text">Loading admin accounts...</p>}
          {adminAccountsError && <p className="error-text">{adminAccountsError}</p>}
          {!adminAccountsLoading && adminAccounts.length === 0 ? (
            <p className="empty-text">No admin accounts yet.</p>
          ) : (
            adminAccounts.map((account) => (
              <div key={account.id} className="tile-card no-hover">
                <div className="tile-name">{account.username}</div>
                <div className="tile-details">Password: {account.password}</div>
                <div className="tile-details">Tile ID: {account.tileId ?? '—'}</div>
                <div className="tile-details">Location: {account.district ?? '—'}, {account.state ?? '—'}</div>
              </div>
            ))
          )}
        </div>

        <button className="logout-button" onClick={() => { logout(); navigate('/login'); }}>
          Logout
        </button>
      </div>
    </div>
  );
}
