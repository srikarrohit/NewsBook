import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAds } from '../context/AdsContext';
import { useTiles } from '../context/TileContext';
import { normalizeRole } from '../constants/roleUtils';

const LEGACY_TAGS = ['tag news', 'tag ad'];
const displayTag = (tag) => (tag && !LEGACY_TAGS.includes(tag) ? tag : 'General');

export default function AdminTilePage() {
  const { user, logout, isLoading } = useAuth();
  const { getTileById, getPostsByTile, getArchivedPostsByTile } = useTiles();
  const { getAdsByTile, getArchivedAdsByTile } = useAds();
  const { tileId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [tile, setTile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [ads, setAds] = useState([]);
  const [archivedPosts, setArchivedPosts] = useState([]);
  const [archivedAds, setArchivedAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (!isLoading && user) {
      const role = normalizeRole(user.role);
      const isAdmin = role === 'admin';
      if (!isAdmin || Number(user.tileId) !== Number(tileId)) {
        navigate('/', { replace: true });
      }
    }
  }, [isLoading, navigate, tileId, user]);

  useEffect(() => {
    if (!tileId) return;
    const selected = getTileById(Number(tileId));
    setTile(selected || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getTileById, tileId]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tileId, location.key]);

  const loadData = async () => {
    if (!tileId) return;
    setLoading(true);
    try {
      const [postData, adData, archivedPostData, archivedAdData] = await Promise.all([
        getPostsByTile(tileId),
        getAdsByTile(tileId),
        getArchivedPostsByTile(tileId),
        getArchivedAdsByTile(tileId),
      ]);
      setPosts(postData || []);
      setAds(adData || []);
      setArchivedPosts(archivedPostData || []);
      setArchivedAds(archivedAdData || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to load admin data.' });
    } finally {
      setLoading(false);
    }
  };

  const totalViews = ads.reduce((sum, ad) => sum + (ad.views || 0), 0);
  const totalClicks = ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0);
  const overallCTR = totalViews ? ((totalClicks / totalViews) * 100).toFixed(2) : '0.00';

  const archivedTotalViews = archivedAds.reduce((sum, ad) => sum + (ad.views || 0), 0);
  const archivedTotalClicks = archivedAds.reduce((sum, ad) => sum + (ad.clicks || 0), 0);
  const archivedOverallCTR = archivedTotalViews ? ((archivedTotalClicks / archivedTotalViews) * 100).toFixed(2) : '0.00';

  const calculateCTR = (ad) => (ad.views ? ((ad.clicks / ad.views) * 100).toFixed(2) : '0.00');
  const calculateDismissalRate = (ad) => (ad.views ? ((ad.dismissals / ad.views) * 100).toFixed(2) : '0.00');

  const summaryCards = [
    { label: 'Posts', value: posts.length },
    { label: 'Ads', value: ads.length },
    { label: 'Tile ID', value: tileId },
  ];

  if (isLoading || !tile) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="admin-root">
      <div className="hero" style={{ backgroundImage: `url(${tile.uri})` }}>
        <div className="hero-overlay" />
        <div className="hero-text">
          <h1 className="hero-title">{tile.name}</h1>
          <p className="hero-subtitle">Dedicated admin page for your newspaper.</p>
        </div>
      </div>

      <div className="stat-row">
        {summaryCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="segment">
        <h2 className="section-title">Create Content</h2>
        <p className="empty-text">Write a post or ad on its own page, with a live preview before you publish.</p>
        {message && <p className={message.type === 'error' ? 'error-text' : 'success-text'}>{message.text}</p>}
        <button className="submit-button" onClick={() => navigate(`/compose/${tileId}`)}>
          Write a Post
        </button>
      </div>

      <div className="segment">
        <h2 className="section-title">Recent Posts</h2>
        {posts.length === 0 ? (
          <p className="empty-text">No posts created yet.</p>
        ) : (
          posts.map((item) => (
            <div key={item.id} className="card">
              <div className="card-title">{displayTag(item.tag)}</div>
              <div className="card-content">{item.content}</div>
            </div>
          ))
        )}
      </div>

      <div className="segment">
        <h2 className="section-title">Ad Analytics</h2>
        {ads.length === 0 ? (
          <p className="empty-text">No ads created yet.</p>
        ) : (
          <>
            <div className="analytics-summary-row">
              <div className="analytics-summary-card">
                <div className="analytics-summary-label">Total Views</div>
                <div className="analytics-summary-value">{totalViews}</div>
              </div>
              <div className="analytics-summary-card">
                <div className="analytics-summary-label">Total Clicks</div>
                <div className="analytics-summary-value">{totalClicks}</div>
              </div>
              <div className="analytics-summary-card">
                <div className="analytics-summary-label">CTR</div>
                <div className="analytics-summary-value">{overallCTR}%</div>
              </div>
            </div>
            {ads.map((item) => (
              <div key={item.id} className="card card-ad">
                <div className="card-title">Ad</div>
                <div className="card-content">{item.content}</div>
                <div className="ad-stats-grid">
                  <div className="ad-stat-box">
                    <div className="ad-stat-label">Views</div>
                    <div className="ad-stat-value">{item.views || 0}</div>
                  </div>
                  <div className="ad-stat-box">
                    <div className="ad-stat-label">Clicks</div>
                    <div className="ad-stat-value">{item.clicks || 0}</div>
                  </div>
                  <div className="ad-stat-box">
                    <div className="ad-stat-label">CTR %</div>
                    <div className="ad-stat-value">{calculateCTR(item)}</div>
                  </div>
                  <div className="ad-stat-box">
                    <div className="ad-stat-label">Dismissals</div>
                    <div className="ad-stat-value">{item.dismissals || 0}</div>
                  </div>
                  <div className="ad-stat-box">
                    <div className="ad-stat-label">Charges</div>
                    <div className="ad-stat-value">{item.charges || 0}</div>
                  </div>
                </div>
                <div className="dismissal-rate-text">Dismissal Rate: {calculateDismissalRate(item)}%</div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="segment">
        <h2 className="section-title">Archived News</h2>
        {archivedPosts.length === 0 ? (
          <p className="empty-text">No archived posts yet.</p>
        ) : (
          archivedPosts.map((item) => (
            <div key={item.id} className="card">
              <div className="card-title">{displayTag(item.tag)}</div>
              <div className="card-content">{item.content}</div>
            </div>
          ))
        )}
      </div>

      <div className="segment">
        <h2 className="section-title">Archived Ads</h2>
        {archivedAds.length === 0 ? (
          <p className="empty-text">No archived ads yet.</p>
        ) : (
          <>
            <div className="analytics-summary-row">
              <div className="analytics-summary-card">
                <div className="analytics-summary-label">Total Views</div>
                <div className="analytics-summary-value">{archivedTotalViews}</div>
              </div>
              <div className="analytics-summary-card">
                <div className="analytics-summary-label">Total Clicks</div>
                <div className="analytics-summary-value">{archivedTotalClicks}</div>
              </div>
              <div className="analytics-summary-card">
                <div className="analytics-summary-label">CTR</div>
                <div className="analytics-summary-value">{archivedOverallCTR}%</div>
              </div>
            </div>
            {archivedAds.map((item) => (
              <div key={item.id} className="card card-ad">
                <div className="card-title">Ad</div>
                <div className="card-content">{item.content}</div>
                <div className="ad-stats-grid">
                  <div className="ad-stat-box">
                    <div className="ad-stat-label">Views</div>
                    <div className="ad-stat-value">{item.views || 0}</div>
                  </div>
                  <div className="ad-stat-box">
                    <div className="ad-stat-label">Clicks</div>
                    <div className="ad-stat-value">{item.clicks || 0}</div>
                  </div>
                  <div className="ad-stat-box">
                    <div className="ad-stat-label">CTR %</div>
                    <div className="ad-stat-value">{calculateCTR(item)}</div>
                  </div>
                  <div className="ad-stat-box">
                    <div className="ad-stat-label">Dismissals</div>
                    <div className="ad-stat-value">{item.dismissals || 0}</div>
                  </div>
                  <div className="ad-stat-box">
                    <div className="ad-stat-label">Charges</div>
                    <div className="ad-stat-value">{item.charges || 0}</div>
                  </div>
                </div>
                <div className="dismissal-rate-text">Dismissal Rate: {calculateDismissalRate(item)}%</div>
              </div>
            ))}
          </>
        )}
      </div>

      <button className="logout-button" onClick={() => { logout(); navigate('/login'); }}>
        Logout
      </button>
    </div>
  );
}
