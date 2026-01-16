import { useState, useRef, useEffect } from 'react';
import { X, Camera, Upload, SwitchCamera } from 'lucide-react';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  title?: string;
}

const QRScanner = ({ isOpen, onClose, onScan, title = 'Scan QR Code' }: QRScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Không thể truy cập camera. Vui lòng cấp quyền hoặc upload ảnh QR.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create object URL for the image
    const imageUrl = URL.createObjectURL(file);

    // For now, pass the file URL to parent - backend team will handle actual QR parsing
    // This simulates a successful scan with placeholder data
    console.log('File selected:', file.name);
    
    // TODO: Backend team will implement actual QR parsing here
    // For now, we'll call onScan with a mock result after showing the image
    onScan(`FILE_UPLOAD:${file.name}`);
    
    // Clean up
    URL.revokeObjectURL(imageUrl);
  };

  const handleCaptureFrame = () => {
    if (!videoRef.current) return;

    // Create canvas to capture frame
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/png');
      
      // TODO: Backend team will implement actual QR parsing from this image data
      console.log('Frame captured, ready for QR parsing');
      
      // For now, simulate scan result
      onScan(`CAMERA_CAPTURE:${Date.now()}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-4 bg-gradient-to-b from-black/70 to-transparent">
        <h1 className="text-white font-semibold text-lg">{title}</h1>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Camera View */}
      <div className="h-full flex flex-col items-center justify-center">
        {error ? (
          <div className="text-center p-6">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <Camera className="w-10 h-10 text-white/60" />
            </div>
            <p className="text-white/80 text-sm mb-6">{error}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-white text-black rounded-xl font-semibold flex items-center gap-2 mx-auto"
            >
              <Upload className="w-5 h-5" />
              Upload ảnh QR
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Scan Frame Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-white/50 rounded-2xl relative">
                {/* Corner accents */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />
              </div>
            </div>

            {/* Scan line animation */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 overflow-hidden">
                <div className="w-full h-1 bg-primary animate-scan-line" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex justify-center items-center gap-6">
          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <Upload className="w-6 h-6 text-white" />
          </button>

          {/* Capture Button */}
          <button
            onClick={handleCaptureFrame}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
          >
            <div className="w-12 h-12 rounded-full border-4 border-black" />
          </button>

          {/* Switch Camera Button */}
          <button
            onClick={switchCamera}
            className="p-4 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <SwitchCamera className="w-6 h-6 text-white" />
          </button>
        </div>

        <p className="text-center text-white/60 text-sm mt-4">
          Đưa mã QR vào khung hình hoặc upload ảnh
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};

export default QRScanner;
