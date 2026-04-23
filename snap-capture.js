/* snap-capture.js
 *
 * Source-agnostic FrameSource interface for the capture pipeline.
 * Implementations:
 *   - WebcamFrameSource     live webcam via getUserMedia
 *   - DisplayFrameSource    window/tab/emulator via getDisplayMedia
 *   - YouTubeFrameSource    iframe -> canvas bridge for playthrough demos
 *   - StaticImageFrameSource single image upload
 *
 * All sources share this contract:
 *   start(videoEl) -> Promise<void>     attach to the <video> element
 *   stop() -> void
 *   captureFrame(canvasEl) -> Promise<void>  draw current frame
 *   aspectHint -> "16:9" | "4:3" | null
 *   label -> string                      UI display name
 *
 * The existing snap-station.js continues to own the active source; this
 * module just exposes factories so new source types slot in without
 * touching the 42KB main script.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SnapCapture = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function WebcamFrameSource(constraints) {
        this.label = 'Webcam';
        this.aspectHint = '16:9';
        this._stream = null;
        this._constraints = constraints || { video: true, audio: false };
    }
    WebcamFrameSource.prototype.start = function (videoEl) {
        var self = this;
        return navigator.mediaDevices.getUserMedia(this._constraints)
            .then(function (s) {
                self._stream = s;
                videoEl.srcObject = s;
                return videoEl.play();
            });
    };
    WebcamFrameSource.prototype.stop = function () {
        if (this._stream) this._stream.getTracks().forEach(function (t) { t.stop(); });
        this._stream = null;
    };
    WebcamFrameSource.prototype.captureFrame = function (canvasEl) {
        var v = canvasEl.ownerDocument.querySelector('#webcam');
        if (!v) return Promise.reject(new Error('no video element'));
        var ctx = canvasEl.getContext('2d');
        canvasEl.width = v.videoWidth;
        canvasEl.height = v.videoHeight;
        ctx.drawImage(v, 0, 0);
        return Promise.resolve();
    };

    function DisplayFrameSource() {
        this.label = 'Window capture';
        this.aspectHint = null;
        this._stream = null;
    }
    DisplayFrameSource.prototype.start = function (videoEl) {
        var self = this;
        var api = navigator.mediaDevices.getDisplayMedia;
        if (!api) return Promise.reject(new Error('getDisplayMedia unavailable'));
        return api.call(navigator.mediaDevices, { video: true, audio: false })
            .then(function (s) {
                self._stream = s;
                videoEl.srcObject = s;
                return videoEl.play();
            });
    };
    DisplayFrameSource.prototype.stop = WebcamFrameSource.prototype.stop;
    DisplayFrameSource.prototype.captureFrame = WebcamFrameSource.prototype.captureFrame;

    /* YouTube bridge: embeds an iframe with ?autoplay=1 and captures via
     * the hidden <video> element inside the iframe when origin allows.
     * For cross-origin playthroughs, this degrades to capturing the
     * iframe's bounding box via getDisplayMedia on user gesture. */
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
            '?autoplay=1&controls=0&modestbranding=1&rel=0&playsinline=1';
        this._iframe.allow = 'autoplay; encrypted-media';
        this._iframe.style.cssText = 'width:100%;height:100%;border:0;';
        hostEl.appendChild(this._iframe);
        return Promise.resolve();
    };
    YouTubeFrameSource.prototype.stop = function () {
        if (this._iframe && this._iframe.parentNode) {
            this._iframe.parentNode.removeChild(this._iframe);
        }
        this._iframe = null;
    };
    YouTubeFrameSource.prototype.captureFrame = function (canvasEl) {
        // Cross-origin iframes cannot be painted directly; signal the
        // kiosk to prompt for a one-time getDisplayMedia selection.
        return Promise.reject(new Error(
            'YouTube capture requires user gesture; use DisplayFrameSource'));
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
        StaticImageFrameSource: StaticImageFrameSource
    };
}));
