/* capture-sources.js  (restored from the reverted snap-capture.js, commit 99f7fe8)
 *
 * Source-agnostic FrameSource interface for the capture pipeline.
 * Implementations:
 *   - WebcamFrameSource     live webcam via getUserMedia
 *   - DisplayFrameSource    window/tab/emulator via getDisplayMedia
 *   - YouTubeFrameSource    iframe embed for attract-mode playthrough demos
 *   - StaticImageFrameSource single image upload
 *
 * All sources share this contract:
 *   start(videoEl) -> Promise<void>          attach to the <video> (or host) element
 *   stop() -> void
 *   captureFrame(canvasEl) -> Promise<void>  draw the current frame
 *   aspectHint -> "16:9" | "4:3" | null
 *   label -> string                          UI display name
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SnapCapture = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function drawVideoFrame(source, canvasEl) {
    var v = source._videoEl;
    if (!v || !v.videoWidth) return Promise.reject(new Error('no live video'));
    canvasEl.width = v.videoWidth;
    canvasEl.height = v.videoHeight;
    canvasEl.getContext('2d').drawImage(v, 0, 0);
    return Promise.resolve();
  }

  function stopStream(source) {
    if (source._stream) source._stream.getTracks().forEach(function (t) { t.stop(); });
    source._stream = null;
    source._videoEl = null;
  }

  function WebcamFrameSource(constraints) {
    this.label = 'Webcam';
    this.aspectHint = '16:9';
    this._stream = null;
    this._videoEl = null;
    this._constraints = constraints || { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };
  }
  WebcamFrameSource.prototype.start = function (videoEl) {
    var self = this;
    return navigator.mediaDevices.getUserMedia(this._constraints)
      .then(function (s) {
        self._stream = s;
        self._videoEl = videoEl;
        videoEl.srcObject = s;
        return videoEl.play();
      });
  };
  WebcamFrameSource.prototype.stop = function () { stopStream(this); };
  WebcamFrameSource.prototype.captureFrame = function (canvasEl) { return drawVideoFrame(this, canvasEl); };

  function DisplayFrameSource() {
    this.label = 'Window capture';
    this.aspectHint = null;
    this._stream = null;
    this._videoEl = null;
  }
  DisplayFrameSource.prototype.start = function (videoEl) {
    var self = this;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      return Promise.reject(new Error('getDisplayMedia unavailable'));
    }
    return navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: false })
      .then(function (s) {
        self._stream = s;
        self._videoEl = videoEl;
        videoEl.srcObject = s;
        return videoEl.play();
      });
  };
  DisplayFrameSource.prototype.stop = function () { stopStream(this); };
  DisplayFrameSource.prototype.captureFrame = function (canvasEl) { return drawVideoFrame(this, canvasEl); };

  /* YouTube bridge: embeds an iframe with autoplay for attract-mode demos.
   * Cross-origin iframes cannot be painted to canvas; capture from a YouTube
   * source degrades to DisplayFrameSource on user gesture. */
  function YouTubeFrameSource(videoId) {
    this.label = 'YouTube playthrough';
    this.aspectHint = '16:9';
    this.videoId = videoId;
    this._iframe = null;
  }
  YouTubeFrameSource.prototype.start = function (hostEl) {
    this._iframe = document.createElement('iframe');
    this._iframe.src = 'https://www.youtube-nocookie.com/embed/' +
      encodeURIComponent(this.videoId) +
      '?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=' +
      encodeURIComponent(this.videoId);
    this._iframe.allow = 'autoplay; encrypted-media';
    this._iframe.style.cssText = 'width:100%;height:100%;border:0;pointer-events:none;';
    this._iframe.title = 'Demo playthrough';
    hostEl.appendChild(this._iframe);
    return Promise.resolve();
  };
  YouTubeFrameSource.prototype.stop = function () {
    if (this._iframe && this._iframe.parentNode) this._iframe.parentNode.removeChild(this._iframe);
    this._iframe = null;
  };
  YouTubeFrameSource.prototype.captureFrame = function () {
    return Promise.reject(new Error('YouTube capture requires user gesture; use DisplayFrameSource'));
  };

  function StaticImageFrameSource(url) {
    this.label = 'Image upload';
    this.aspectHint = null;
    this.url = url;
    this._img = null;
  }
  StaticImageFrameSource.prototype.start = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { self._img = img; resolve(); };
      img.onerror = reject;
      img.src = self.url;
    });
  };
  StaticImageFrameSource.prototype.stop = function () { this._img = null; };
  StaticImageFrameSource.prototype.captureFrame = function (canvasEl) {
    if (!this._img) return Promise.reject(new Error('not started'));
    canvasEl.width = this._img.naturalWidth;
    canvasEl.height = this._img.naturalHeight;
    canvasEl.getContext('2d').drawImage(this._img, 0, 0);
    return Promise.resolve();
  };

  return {
    WebcamFrameSource: WebcamFrameSource,
    DisplayFrameSource: DisplayFrameSource,
    YouTubeFrameSource: YouTubeFrameSource,
    StaticImageFrameSource: StaticImageFrameSource,
  };
}));
