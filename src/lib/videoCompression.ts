export async function compressVideoFile(file: File): Promise<string> {
  // If raw file size is up to 680KB, return raw data URL directly to preserve 100% original video & audio sound
  if (file.size <= 680 * 1024) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  // Otherwise, perform client-side video frame capture while preserving original audio track via Web Audio API
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.playsInline = true;
    video.muted = false;
    video.volume = 1.0;
    const url = URL.createObjectURL(file);
    video.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    video.onloadedmetadata = async () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 380; // 380px max dimension for compact base64 payload fitting in Firestore
        let width = video.videoWidth || 360;
        let height = video.videoHeight || 640;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
          // Fallback if MediaRecorder or captureStream is missing
          const rawReader = new FileReader();
          rawReader.onload = () => {
            cleanup();
            resolve(rawReader.result as string);
          };
          rawReader.readAsDataURL(file);
          return;
        }

        // Get canvas stream for resized video frames
        const stream = canvas.captureStream(20);

        // Web Audio API stream capture for original video audio track
        let audioCtx: AudioContext | null = null;
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioCtx = new AudioContextClass();
            if (audioCtx.state === 'suspended') {
              await audioCtx.resume().catch(() => {});
            }
            const source = audioCtx.createMediaElementSource(video);
            const dest = audioCtx.createMediaStreamDestination();
            source.connect(dest);
            const audioTrack = dest.stream.getAudioTracks()[0];
            if (audioTrack) {
              stream.addTrack(audioTrack);
            }
          }
        } catch (audioErr) {
          console.warn('Web Audio capture notice:', audioErr);
        }

        let mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          if (MediaRecorder.isTypeSupported('video/webm')) {
            mimeType = 'video/webm';
          } else if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
          } else {
            mimeType = '';
          }
        }

        const recorderOptions: MediaRecorderOptions = {
          videoBitsPerSecond: 220000 // 220 kbps
        };
        if (mimeType) recorderOptions.mimeType = mimeType;

        const recorder = new MediaRecorder(stream, recorderOptions);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = () => {
          if (audioCtx) {
            audioCtx.close().catch(() => {});
          }
          const recordedBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
          const reader = new FileReader();
          reader.onload = () => {
            cleanup();
            resolve(reader.result as string);
          };
          reader.onerror = () => {
            cleanup();
            resolve(url);
          };
          reader.readAsDataURL(recordedBlob);
        };

        video.currentTime = 0;
        await video.play().catch(() => {
          // If unmuted playback fails due to autoplay policy, fallback to muted playback
          video.muted = true;
          return video.play().catch(() => {});
        });

        recorder.start(100);

        const startTime = Date.now();
        const maxDurationMs = 15000; // 15s max clip duration

        const drawFrame = () => {
          if (video.paused || video.ended || (Date.now() - startTime) >= maxDurationMs) {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
            video.pause();
            return;
          }
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
          }
          requestAnimationFrame(drawFrame);
        };

        drawFrame();
      } catch (err) {
        console.warn('Video compression fallback used:', err);
        const rawReader = new FileReader();
        rawReader.onload = () => {
          cleanup();
          resolve(rawReader.result as string);
        };
        rawReader.readAsDataURL(file);
      }
    };

    video.onerror = () => {
      cleanup();
      const rawReader = new FileReader();
      rawReader.onload = () => resolve(rawReader.result as string);
      rawReader.readAsDataURL(file);
    };
  });
}
