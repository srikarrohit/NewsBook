import { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

// The app's standard image aspect ratio (width / height), matching how grid, post,
// and ad images are actually displayed across the reader app — keeps every uploaded
// image cropped consistently instead of leaving it to whatever the source photo was.
export const APP_IMAGE_ASPECT = 390 / 422;

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', reject);
    image.crossOrigin = 'anonymous';
    image.src = url;
  });
}

async function getCroppedBlob(imageSrc, cropPixels, fileName) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(new File([blob], fileName || 'cropped.jpg', { type: 'image/jpeg' })),
      'image/jpeg',
      0.92
    );
  });
}

export default function ImageCropModal({ imageSrc, fileName, aspect = APP_IMAGE_ASPECT, onCancel, onConfirm }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const file = await getCroppedBlob(imageSrc, croppedAreaPixels, fileName);
      onConfirm(file);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="crop-modal-overlay">
      <div className="crop-modal-card">
        <h3 className="crop-modal-title">Adjust image</h3>
        <div className="crop-modal-stage">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <input
          className="crop-modal-zoom"
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
        <div className="crop-modal-actions">
          <button className="submit-button cancel-button" onClick={onCancel} disabled={saving} type="button">
            Cancel
          </button>
          <button className="submit-button" onClick={handleConfirm} disabled={saving} type="button">
            {saving ? 'Applying...' : 'Use photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
