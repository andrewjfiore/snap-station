function initStickerSheet() {
    (function() {
    // Global variables
    window.groupImages = [];
    window.cropperInstances = [];
    window.cellGroups = new Array(16).fill(0);
    let activeStamp = null;

    // State
    window.currentMode = 'quad';
    let isSyncing = false;
    let syncFrameId = null;
    let interactionMode = null;
    let startX, startY, startLeft, startTop, startRotation, startFontSize, centerX, centerY, dragSrcIndex = null;
    let pendingStampFrame = null;
    let latestPointer = null;

    const EXPORT_CHANNEL = 'snapstation-sync';
    let exportChannel = null;
    if ('BroadcastChannel' in window) {
        exportChannel = new BroadcastChannel(EXPORT_CHANNEL);
    }

    function notifyExportUpdate() {
        if (exportChannel) {
            exportChannel.postMessage({ type: 'snapstation-export-updated', timestamp: Date.now() });
        }
    }

    // DOM Elements
    const gridEl = document.getElementById('sticker-grid');
    const uploadContainer = document.getElementById('upload-inputs');
    const bgLayer = document.getElementById('background-layer');
    const stampLayer = document.getElementById('stamp-layer');
    const paperElement = document.getElementById('paper');
    const helpModal = document.getElementById('help-modal');
    const helpModalCloseBtn = document.getElementById('helpModalCloseBtn');
    const helpModalContent = helpModal?.querySelector('.modal-content');
    const themeSelect = document.getElementById('theme-select');
    const bgSelect = document.getElementById('bg-select');
    const paperSizeSelect = document.getElementById('paper-size');
    const customBgInput = document.getElementById('custom-bg-input');
    const saveProjectBtn = document.getElementById('saveProjectBtn');
    const loadProjectBtn = document.getElementById('loadProjectBtn');
    const loadProjectInput = document.getElementById('load-project-input');
    const actionHelpBtn = document.getElementById('actionHelpBtn');
    const toggleOverlayInput = document.getElementById('toggle-overlay');
    const toggleWeatheredInput = document.getElementById('toggle-weathered');
    const toggleCrtInput = document.getElementById('toggle-crt');
    const bulkInput = document.getElementById('bulk-input');
    const importSnapsBtn = document.getElementById('importSnapsBtn');
    const bulkUploadBtn = document.getElementById('bulkUploadBtn');
    const printBtn = document.getElementById('printBtn');
    const saveOutputBtn = document.getElementById('saveOutputBtn');
    const cuttingTemplateBtn = document.getElementById('cuttingTemplateBtn');
    const customEmojiInput = document.getElementById('custom-emoji-input');
    const customEmojiAddBtn = document.getElementById('customEmojiAddBtn');
    const addTextStampBtn = document.getElementById('addTextStampBtn');
    const fullscreenCropModal = document.getElementById('fullscreen-crop-modal');
    const fullscreenCropCloseBtn = document.getElementById('fullscreenCropCloseBtn');
    const fullscreenCropZoomOutBtn = document.getElementById('fullscreenCropZoomOutBtn');
    const fullscreenCropZoomInBtn = document.getElementById('fullscreenCropZoomInBtn');
    const fullscreenCropResetBtn = document.getElementById('fullscreenCropResetBtn');
    const fullscreenCropDoneBtn = document.getElementById('fullscreenCropDoneBtn');

    // Cache cell selector
    const allCells = () => document.querySelectorAll('.cell');

    const bgPatterns = {
        hearts: `data:image/svg+xml;charset=utf-8,<svg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'><rect width='40' height='40' fill='%23FFB6C1'/><text x='0' y='15' font-size='15'>❤️</text><text x='20' y='35' font-size='15'>❤️</text><text x='20' y='15' font-size='15'>🫧</text><text x='0' y='35' font-size='15'>🫧</text></svg>`,
        stripes: `data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='40' height='40' fill='%23FFCB05'/%3E%3Cpath d='M0 40 L40 0 L20 0 L0 20 Z M40 40 L40 20 L20 40 Z' fill='black'/%3E%3C/svg%3E`,
        flowers: `data:image/svg+xml;charset=utf-8,<svg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'><rect width='40' height='40' fill='%23C1FFB6'/><text x='0' y='15' font-size='15'>🌿</text><text x='20' y='35' font-size='15'>🌿</text><text x='20' y='15' font-size='15'>🌸</text><text x='0' y='35' font-size='15'>🌸</text></svg>`
    };

    const stickerW = 26.6, stickerH = 20;
    const innerX = 1.25, innerY = 0.833;
    const innerW = 24.1, innerH = 17.5;
    const radius = 2.75;

    const overlayPath = `M ${innerX+radius} ${innerY} L ${innerX+innerW-radius} ${innerY} Q ${innerX+innerW} ${innerY} ${innerX+innerW} ${innerY+radius} L ${innerX+innerW} ${innerY+innerH-radius} Q ${innerX+innerW} ${innerY+innerH} ${innerX+innerW-radius} ${innerY+innerH} L ${innerX+radius} ${innerY+innerH} Q ${innerX} ${innerY+innerH} ${innerX} ${innerY+innerH-radius} L ${innerX} ${innerY+radius} Q ${innerX} ${innerY} ${innerX+radius} ${innerY} Z`;

    function init() {
        gridEl.innerHTML = '';
        window.cropperInstances = new Array(16).fill(null);

        for(let i=0; i<16; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${i}`;

            // Click to Select Cell (shows zoom controls)
            cell.addEventListener('click', function(e) {
                // Don't select if clicking on control buttons
                if (e.target.classList.contains('cell-control-btn')) return;

                // Deselect all cells
                document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
                // Select this cell
                this.classList.add('selected');
            });

            // Double Click Reset
            cell.addEventListener('dblclick', function() {
                const idx = parseInt(this.id.split('-')[1]);
                if (window.cropperInstances[idx]) {
                    window.cropperInstances[idx].reset();
                }
            });

            const imgContainer = document.createElement('div');
            imgContainer.className = 'img-container';
            const img = document.createElement('img');
            img.className = 'source-image';
            img.style.display = 'none';
            imgContainer.appendChild(img);
            cell.appendChild(imgContainer);

            const crtOverlay = document.createElement('div');
            crtOverlay.className = 'cell-effect-layer crt-cell-overlay';
            cell.appendChild(crtOverlay);

            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            overlay.innerHTML = `<svg viewBox="0 0 26.6 20"><path d="${overlayPath}" /></svg>`;
            cell.appendChild(overlay);

            // Cell Controls for Touch
            const controls = document.createElement('div');
            controls.className = 'cell-controls';

            const zoomOutBtn = document.createElement('button');
            zoomOutBtn.className = 'cell-control-btn';
            zoomOutBtn.title = 'Zoom Out';
            zoomOutBtn.type = 'button';
            zoomOutBtn.textContent = '−';
            zoomOutBtn.addEventListener('click', () => window.zoomCell(i, -0.1));

            const zoomInBtn = document.createElement('button');
            zoomInBtn.className = 'cell-control-btn';
            zoomInBtn.title = 'Zoom In';
            zoomInBtn.type = 'button';
            zoomInBtn.textContent = '+';
            zoomInBtn.addEventListener('click', () => window.zoomCell(i, 0.1));

            const fullscreenBtn = document.createElement('button');
            fullscreenBtn.className = 'cell-control-btn';
            fullscreenBtn.title = 'Edit Fullscreen';
            fullscreenBtn.type = 'button';
            fullscreenBtn.textContent = '🔍';
            fullscreenBtn.addEventListener('click', () => window.openFullscreenCrop(i));

            controls.append(zoomOutBtn, zoomInBtn, fullscreenBtn);
            cell.appendChild(controls);

            gridEl.appendChild(cell);
        }

        window.setMode('quad');

        window.addEventListener('mousedown', handleGlobalMouseDown);
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        window.addEventListener('touchstart', handleGlobalMouseDown);
        window.addEventListener('touchmove', handleGlobalMouseMove, {passive: false});
        window.addEventListener('touchend', handleGlobalMouseUp);

        // Initialize stamps with event delegation
        initStamps();
        bindUIActions();
    }

    function bindUIActions() {
        document.querySelectorAll('.mode-selector button').forEach((btn) => {
            btn.addEventListener('click', () => setMode(btn.dataset.mode));
        });

        if (themeSelect) {
            themeSelect.addEventListener('change', (event) => changeTheme(event.target.value));
        }

        if (bgSelect) {
            bgSelect.addEventListener('change', (event) => changeBackground(event.target.value));
        }

        if (paperSizeSelect) {
            paperSizeSelect.addEventListener('change', (event) => changePaperSize(event.target.value));
        }

        if (customBgInput) {
            customBgInput.addEventListener('change', handleCustomBackground);
        }

        if (saveProjectBtn) {
            saveProjectBtn.addEventListener('click', saveProject);
        }

        if (loadProjectBtn) {
            loadProjectBtn.addEventListener('click', () => loadProjectInput?.click());
        }

        if (loadProjectInput) {
            loadProjectInput.addEventListener('change', loadProject);
        }

        if (actionHelpBtn) {
            actionHelpBtn.addEventListener('click', toggleHelp);
        }

        if (helpModal) {
            helpModal.addEventListener('click', toggleHelp);
        }

        if (helpModalCloseBtn) {
            helpModalCloseBtn.addEventListener('click', toggleHelp);
        }

        if (helpModalContent) {
            helpModalContent.addEventListener('click', (event) => event.stopPropagation());
        }

        if (toggleOverlayInput) {
            toggleOverlayInput.addEventListener('change', toggleOverlay);
        }

        if (toggleWeatheredInput) {
            toggleWeatheredInput.addEventListener('change', toggleWeathered);
        }

        if (toggleCrtInput) {
            toggleCrtInput.addEventListener('change', toggleCRT);
        }

        if (importSnapsBtn) {
            importSnapsBtn.addEventListener('click', importFromSnapStation);
        }

        if (bulkUploadBtn) {
            bulkUploadBtn.addEventListener('click', () => bulkInput?.click());
        }

        if (bulkInput) {
            bulkInput.addEventListener('change', handleBulkUpload);
        }

        if (printBtn) {
            printBtn.addEventListener('click', printStickers);
        }

        if (saveOutputBtn) {
            saveOutputBtn.addEventListener('click', saveOutput);
        }

        if (cuttingTemplateBtn) {
            cuttingTemplateBtn.addEventListener('click', downloadCuttingTemplate);
        }

        if (customEmojiAddBtn) {
            customEmojiAddBtn.addEventListener('click', addCustomEmoji);
        }

        if (customEmojiInput) {
            customEmojiInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    addCustomEmoji();
                }
            });
        }

        if (addTextStampBtn) {
            addTextStampBtn.addEventListener('click', addTextStampFromInput);
        }

        if (fullscreenCropCloseBtn) {
            fullscreenCropCloseBtn.addEventListener('click', closeFullscreenCrop);
        }

        if (fullscreenCropZoomOutBtn) {
            fullscreenCropZoomOutBtn.addEventListener('click', () => zoomFullscreenCrop(-0.1));
        }

        if (fullscreenCropZoomInBtn) {
            fullscreenCropZoomInBtn.addEventListener('click', () => zoomFullscreenCrop(0.1));
        }

        if (fullscreenCropResetBtn) {
            fullscreenCropResetBtn.addEventListener('click', resetFullscreenCrop);
        }

        if (fullscreenCropDoneBtn) {
            fullscreenCropDoneBtn.addEventListener('click', closeFullscreenCrop);
        }

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) checkForPendingImports();
        });
    }

    // Stamp list - dynamically generated
    function initStamps() {
        const stamps = ['⚡','🔥','💧','🌱','❄️','🪨','🐉','🧪','🌀','🌩️','🎮','⭐','🎒','🧢','🔎','🏋️','⚔️','📍','📸','🤳','🎞️','📷','🖼️','🌿','🌋','🏜️','🌊','🌌','🪵','✨','💐','🍎','🔔','💫','😲','💤','⭐','📝','➕','🎯','👀','🚙','🛤️','🛰️','📡','🔍','🪈','🎶','🎵','💜','💙','💚','💛','🤍','🤎','🩷','🩵','🩶','😲','🥺','😳','🥰','😻','🤗','😇','🌸','🐾','🎀','🐱','🧸','👻','☠️','💀'];

        const container = document.getElementById('stamp-list-container');
        const customInput = container.querySelector('.custom-stamp-input');

        // Generate stamp buttons
        const buttonsHTML = stamps.map(stamp =>
            `<button class="btn-stamp-add" data-stamp="${stamp}" type="button">${stamp}</button>`
        ).join('');

        // Insert before custom input
        customInput.insertAdjacentHTML('beforebegin', buttonsHTML);

        // Event delegation for stamp buttons
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-stamp-add') && e.target.dataset.stamp) {
                window.addStamp(e.target.dataset.stamp);
            }
        });
    }

    // --- KONAMI CODE ---
    const konamiSeq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a', 'Enter'];
    let konamiIndex = 0;

    document.addEventListener('keydown', (e) => {
        if (e.key === konamiSeq[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiSeq.length) {
                unlock1UpTheme();
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });

    window.unlock1UpTheme = function() {
        const opt = document.getElementById('theme-1up-option');
        if(opt) {
            opt.removeAttribute('hidden');
            opt.removeAttribute('disabled');
            const select = document.getElementById('theme-select');
            select.value = '1-up';
            changeTheme('1-up');
            showToast('🍄 1-UP Theme Unlocked!');
        }
    };

    // --- THEME & WALLPAPER LOGIC ---
    const emojiConfigs = {
        hearts: ['💖', '🫧', '💘', '🧼'],
        vines: ['🌿', '🌸', '🍃', '🌻'],
        '1-up': ['🍄', '⭐', '🪙', '🐢', '❓']
    };

    const emojiWallpaper = document.getElementById('emojiWallpaper');

    function generateEmojiWallpaper(theme) {
        emojiWallpaper.innerHTML = '';
        if (!emojiConfigs[theme]) {
            emojiWallpaper.classList.remove('active');
            return;
        }

        const emojis = emojiConfigs[theme];
        for (let i = 0; i < 80; i++) {
            const span = document.createElement('span');
            span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            span.style.left = `${Math.random() * 100}%`;
            span.style.top = `${Math.random() * 100}%`;
            span.style.animationDelay = `${Math.random() * 8}s`;
            span.style.fontSize = `${Math.random() * 20 + 16}px`;
            emojiWallpaper.appendChild(span);
        }
        emojiWallpaper.classList.add('active');
    }

    function changeTheme(themeValue) {
        document.body.setAttribute('data-theme', themeValue);
        generateEmojiWallpaper(themeValue);
    }

    // --- VECTOR SVG EXPORT ---
    function downloadCuttingTemplate() {
        const paperSelect = document.getElementById('paper-size').value;
        let pW_mm = 152.4, pH_mm = 101.6, scalingFactor = 1.0;

        if (paperSelect === 'hagaki') {
            pW_mm = 148; pH_mm = 100;
        } else if (paperSelect === 'letter') {
            pW_mm = 279.4; pH_mm = 215.9; scalingFactor = 2.2;
        }

        const cellW = 26.6, cellH = 20, gap = 1;
        const effectiveCellW = cellW * scalingFactor;
        const effectiveCellH = cellH * scalingFactor;
        const effectiveGap = gap * scalingFactor;

        const gridTotalW = (effectiveCellW * 4) + (effectiveGap * 3);
        const gridTotalH = (effectiveCellH * 4) + (effectiveGap * 3);

        const marginLeft = (pW_mm - gridTotalW) / 2;
        const marginTop = (pH_mm - gridTotalH) / 2;

        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${pW_mm}mm" height="${pH_mm}mm" viewBox="0 0 ${pW_mm} ${pH_mm}">`;
        svgContent += `<rect x="0" y="0" width="${pW_mm}" height="${pH_mm}" fill="none" stroke="red" stroke-width="0.1" />`;

        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const x = marginLeft + (c * (effectiveCellW + effectiveGap));
                const y = marginTop + (r * (effectiveCellH + effectiveGap));
                svgContent += `<g transform="translate(${x}, ${y}) scale(${scalingFactor})">`;
                svgContent += `<path d="${overlayPath}" fill="none" stroke="black" stroke-width="${0.1/scalingFactor}" />`;
                svgContent += `</g>`;
            }
        }
        svgContent += `</svg>`;

        const blob = new Blob([svgContent], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'cutting-template.svg';
        link.click();
        URL.revokeObjectURL(url);
    }

    // --- PASTE FUNCTION ---
    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('visible');
        setTimeout(() => { toast.classList.remove('visible'); }, 4000);
    }

    // Global Paste Listener
    window.addEventListener('paste', function(e) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        const imageBlobs = [];

        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                imageBlobs.push(blob);
            }
        }

        if (imageBlobs.length > 0) {
            e.preventDefault();
            processPastedImages(imageBlobs);
            showToast(`Pasted ${imageBlobs.length} image(s)`);
        }
    });

    function processPastedImages(imageBlobs) {
        if (imageBlobs.length === 0) return;
        let targetMode;
        if (imageBlobs.length === 1) targetMode = 'single';
        else if (imageBlobs.length <= 4) targetMode = 'quad';
        else targetMode = 'unique';

        setMode(targetMode);
        setTimeout(() => {
            const numSlots = window.groupImages.length;
            imageBlobs.slice(0, numSlots).forEach((blob, index) => {
                if (window.groupImages[index] && window.groupImages[index].url) {
                    URL.revokeObjectURL(window.groupImages[index].url);
                }
                window.groupImages[index] = {
                    url: URL.createObjectURL(blob),
                    canvasData: null,
                    cropBoxData: null
                };
            });
            refreshGrid();
        }, 100);
    }

    // --- IMPORT FROM SNAP STATION ---
    function importFromSnapStation() {
        try {
            const data = localStorage.getItem('snapstation-export');
            if (!data) {
                showToast('No snaps queued. Select snaps in Snap Station and click "Send to Stickers".');
                return;
            }

            let parsed;
            try { parsed = JSON.parse(data); } catch (e) {
                showToast('Invalid data. Try again.');
                localStorage.removeItem('snapstation-export');
                notifyExportUpdate();
                return;
            }

            const images = parsed.images;

            if (!images || images.length === 0) {
                showToast('No images found.');
                localStorage.removeItem('snapstation-export');
                notifyExportUpdate();
                return;
            }

            // Set appropriate mode
            if (images.length === 1) setMode('single');
            else if (images.length <= 4) setMode('quad');
            else setMode('unique');

            // Wait for mode switch to complete, then load images
            setTimeout(() => {
                const numSlots = window.groupImages.length;
                images.slice(0, numSlots).forEach((dataUrl, index) => {
                    // Clean up old URL if it's a blob URL
                    if (window.groupImages[index] && window.groupImages[index].url && window.groupImages[index].url.startsWith('blob:')) {
                        URL.revokeObjectURL(window.groupImages[index].url);
                    }
                    // Data URLs work directly - no need to convert
                    window.groupImages[index] = {
                        url: dataUrl,
                        canvasData: null,
                        cropBoxData: null
                    };
                });
                refreshGrid();

                const imported = Math.min(images.length, numSlots);
                showToast(`Imported ${imported} snap${imported !== 1 ? 's' : ''}`);

                // Clear the export data after successful import
                localStorage.removeItem('snapstation-export');
                notifyExportUpdate();
            }, 150);
        } catch(e) {
            console.error("Import failed:", e);
            showToast("Failed to import snaps.");
        }
    }

    // Auto-check for pending imports
    function checkForPendingImports() {
        try {
            const data = localStorage.getItem('snapstation-export');
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    const count = parsed.images?.length || 0;
                    if (count > 0) {
                        showToast(`${count} snap${count !== 1 ? 's' : ''} ready to import. Click "Import Snaps".`);
                        return true;
                    }
                } catch (e) {}
            }
        } catch(e) {}
        return false;
    }

    // Check on load
    setTimeout(checkForPendingImports, 500);

    // Listen for storage changes from other tabs/frames
    window.addEventListener('storage', (e) => {
        if (e.key === 'snapstation-export') {
            checkForPendingImports();
        }
    });

    if (exportChannel) {
        exportChannel.addEventListener('message', (event) => {
            if (event.data?.type === 'snapstation-export-updated') {
                checkForPendingImports();
            }
        });
    }

    function toggleHelp() {
        if (!helpModal) return;
        const isOpen = helpModal.style.display === 'flex';
        helpModal.style.display = isOpen ? 'none' : 'flex';
        helpModal.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
    }

    function changePaperSize(size) {
        const root = document.documentElement;
        if(size === '4x6') {
            root.style.setProperty('--paper-width', '152.4mm'); root.style.setProperty('--paper-height', '101.6mm');
            root.style.setProperty('--cell-width', '26.6mm'); root.style.setProperty('--cell-height', '20mm');
            root.style.setProperty('--gap', '1mm');
        } else if(size === 'hagaki') {
            root.style.setProperty('--paper-width', '148mm'); root.style.setProperty('--paper-height', '100mm');
            root.style.setProperty('--cell-width', '26.6mm'); root.style.setProperty('--cell-height', '20mm');
            root.style.setProperty('--gap', '1mm');
        } else {
             root.style.setProperty('--paper-width', '279.4mm'); root.style.setProperty('--paper-height', '215.9mm');
             root.style.setProperty('--cell-width', '58.52mm'); root.style.setProperty('--cell-height', '44mm');
             root.style.setProperty('--gap', '2.2mm');
        }
    }

    function toggleWeathered() {
        const show = document.getElementById('toggle-weathered').checked;
        allCells().forEach(cell => cell.classList.toggle('weathered-active', show));
    }

    function toggleCRT() {
        const show = document.getElementById('toggle-crt').checked;
        allCells().forEach(cell => cell.classList.toggle('crt-active', show));
    }

    function clearImage(index) {
        if (window.groupImages[index] && window.groupImages[index].url) {
            // Only revoke blob URLs, not data URLs
            if (window.groupImages[index].url.startsWith('blob:')) {
                URL.revokeObjectURL(window.groupImages[index].url);
            }
        }
        window.groupImages[index] = null;
        const input = document.querySelector(`.file-input-wrapper[data-index="${index}"] input[type=file]`);
        if(input) input.value = '';
        refreshGrid();
    }

    // --- Custom Background Handling (Fixed Memory Leak) ---
    function handleCustomBackground(event) {
        const file = event.target.files[0]; if(!file) return;
        // Revoke old URL if stored
        if (bgLayer.dataset.customBgUrl) {
            URL.revokeObjectURL(bgLayer.dataset.customBgUrl);
        }
        const url = URL.createObjectURL(file);
        bgLayer.dataset.customBgUrl = url;
        bgLayer.style.backgroundImage = `url("${url}")`;
    }

    // --- Stamp Logic ---
    window.addStamp = function(emoji, x, y, size, rotation) {
        createStamp(emoji, x, y, size, rotation, false);
    };

    function addTextStampFromInput() {
        const text = document.getElementById('text-stamp-input').value;
        if(!text) return;
        const font = document.getElementById('text-font-select').value;
        const color = document.getElementById('text-color-input').value;
        createStamp(text, undefined, undefined, undefined, undefined, true, font, color);
        document.getElementById('text-stamp-input').value = '';
    }

    function addCustomEmoji() {
        const input = document.getElementById('custom-emoji-input');
        const emoji = input.value.trim();
        if(!emoji) {
            showToast('Please enter an emoji or text first');
            return;
        }
        window.addStamp(emoji);
        input.value = '';
    }

    function createStamp(contentStr, x, y, size, rotation, isText=false, font='', color='') {
        const wrapper = document.createElement('div');
        wrapper.className = 'stamp-wrapper';
        wrapper.dataset.isText = isText;
        if(isText) { wrapper.dataset.font = font; wrapper.dataset.color = color; }

        const paper = document.getElementById('paper');
        const initialX = x !== undefined ? x : (paper.offsetWidth / 2);
        const initialY = y !== undefined ? y : (paper.offsetHeight / 2);
        const initialSize = size !== undefined ? size : (isText ? '2rem' : '3rem');
        const initialRot = rotation !== undefined ? rotation : 0;

        wrapper.style.left = initialX + 'px';
        wrapper.style.top = initialY + 'px';
        wrapper.style.transform = `translate(-50%, -50%) rotate(${initialRot}deg)`;

        const content = document.createElement('div');
        content.className = 'stamp-content';
        content.innerText = contentStr;
        content.style.fontSize = initialSize;

        if(isText) {
            content.style.fontFamily = font;
            content.style.color = color;
            content.style.whiteSpace = 'nowrap';
            content.style.textShadow = '2px 2px 0px rgba(0,0,0,0.5)';
        }
        wrapper.appendChild(content);

        const controls = document.createElement('div');
        controls.className = 'stamp-controls';

        const createHandle = (cls, html, title) => {
            const el = document.createElement('div'); el.className = `handle ${cls}`; el.innerHTML = html; el.title = title;
            return el;
        };
        controls.appendChild(createHandle('handle-del', '×', 'Delete'));
        controls.appendChild(createHandle('handle-rot', '↻', 'Rotate'));
        controls.appendChild(createHandle('handle-sz', '↔', 'Resize'));

        wrapper.appendChild(controls);
        stampLayer.appendChild(wrapper);

        wrapper.addEventListener('mousedown', (e) => {
            e.stopPropagation(); selectStamp(wrapper);
            if (e.target.classList.contains('handle-del')) { wrapper.remove(); activeStamp = null; }
            else if (e.target.classList.contains('handle-rot')) { startInteraction(e, wrapper, 'rotate'); }
            else if (e.target.classList.contains('handle-sz')) { startInteraction(e, wrapper, 'resize'); }
            else { startInteraction(e, wrapper, 'drag'); }
        });

        wrapper.addEventListener('touchstart', (e) => {
            e.stopPropagation(); selectStamp(wrapper);
            const touch = e.touches[0];
            const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY, preventDefault: ()=>e.preventDefault() };
            if (e.target.classList.contains('handle-del')) { wrapper.remove(); activeStamp = null; }
            else if (e.target.classList.contains('handle-rot')) { startInteraction(fakeEvent, wrapper, 'rotate'); }
            else if (e.target.classList.contains('handle-sz')) { startInteraction(fakeEvent, wrapper, 'resize'); }
            else { startInteraction(fakeEvent, wrapper, 'drag'); }
        }, {passive: false});
    }

    function selectStamp(stamp) {
        document.querySelectorAll('.stamp-wrapper').forEach(el => el.classList.remove('selected'));
        stamp.classList.add('selected'); activeStamp = stamp;
    }

    function deselectAll() {
        document.querySelectorAll('.stamp-wrapper').forEach(el => el.classList.remove('selected'));
        activeStamp = null;
    }

    function startInteraction(e, wrapper, mode) {
        e.preventDefault();
        interactionMode = mode;
        startX = e.clientX; startY = e.clientY;
        startLeft = parseFloat(wrapper.style.left); startTop = parseFloat(wrapper.style.top);

        const st = window.getComputedStyle(wrapper);
        const tr = st.getPropertyValue("transform");
        let angle = 0;
        if (tr && tr !== 'none') {
            const values = tr.split('(')[1].split(')')[0].split(',');
            angle = Math.round(Math.atan2(values[1], values[0]) * (180/Math.PI));
        }
        startRotation = angle;
        const rect = wrapper.getBoundingClientRect();
        centerX = rect.left + rect.width / 2; centerY = rect.top + rect.height / 2;
        startFontSize = parseFloat(window.getComputedStyle(wrapper.querySelector('.stamp-content')).fontSize);
    }

    function handleGlobalMouseDown(e) {
        if (e.target.id === 'stamp-layer' || e.target.id === 'background-layer') {
            deselectAll();
            // Also deselect all cells when clicking on stamps or background
            document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
        }
        // Deselect cells when clicking outside of grid
        if (!e.target.closest('.cell') && !e.target.closest('.fullscreen-crop-modal')) {
            document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
        }
    }

    function handleGlobalMouseMove(e) {
        if (!activeStamp || !interactionMode) return;
        e.preventDefault();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        latestPointer = { clientX, clientY };

        if (!pendingStampFrame) {
            pendingStampFrame = requestAnimationFrame(() => {
                applyStampTransform();
                pendingStampFrame = null;
            });
        }
    }

    function applyStampTransform() {
        if (!activeStamp || !interactionMode || !latestPointer) return;
        const { clientX, clientY } = latestPointer;

        if (interactionMode === 'drag') {
            const dx = clientX - startX; const dy = clientY - startY;
            activeStamp.style.left = (startLeft + dx) + 'px';
            activeStamp.style.top = (startTop + dy) + 'px';
        } else if (interactionMode === 'resize') {
            const distStart = Math.hypot(startX - centerX, startY - centerY);
            const distNow = Math.hypot(clientX - centerX, clientY - centerY);
            const scale = distNow / distStart;
            const newSize = Math.max(10, startFontSize * scale);
            activeStamp.querySelector('.stamp-content').style.fontSize = newSize + 'px';
        } else if (interactionMode === 'rotate') {
            const angleStart = Math.atan2(startY - centerY, startX - centerX);
            const angleNow = Math.atan2(clientY - centerY, clientX - centerX);
            const angleChange = (angleNow - angleStart) * (180 / Math.PI);
            activeStamp.style.transform = `translate(-50%, -50%) rotate(${startRotation + angleChange}deg)`;
        }
    }

    function handleGlobalMouseUp() { interactionMode = null; }

    function refreshGrid() {
        window.cellGroups.fill(-1);
        if (window.currentMode === 'single') { window.cellGroups.fill(0); }
        else if (window.currentMode === 'unique') { for(let i=0; i<16; i++) window.cellGroups[i] = i; }
        else if (window.currentMode === 'quad') {
            const mapping = [[0, 1, 4, 5], [2, 3, 6, 7], [8, 9, 12, 13], [10, 11, 14, 15]];
            mapping.forEach((indices, groupIdx) => { indices.forEach(cellIdx => window.cellGroups[cellIdx] = groupIdx); });
        }

        for(let i=0; i<16; i++) {
            let imgData = null;
            let groupIdx = -1;
            if (window.currentMode === 'single') { imgData = window.groupImages[0]; groupIdx = 0; }
            else if (window.currentMode === 'unique') { imgData = window.groupImages[i]; groupIdx = i; }
            else { groupIdx = window.cellGroups[i]; imgData = window.groupImages[groupIdx]; }
            updateCell(i, imgData, groupIdx);
        }
        refreshButtonPreviews();
    }

    function updateCell(index, imgData, groupIdx) {
        const cell = document.getElementById(`cell-${index}`);
        const img = cell.querySelector('.img-container img.source-image');
        const currentUrl = img.getAttribute('src');
        const newUrl = (imgData && imgData.url) ? imgData.url : '';
        if (currentUrl === newUrl && window.cropperInstances[index]) return;
        if (window.cropperInstances[index]) { window.cropperInstances[index].destroy(); window.cropperInstances[index] = null; }

        if (newUrl) {
            img.src = newUrl; img.style.display = 'block';
            cell.classList.add('has-image'); // Show controls
            const cropper = new Cropper(img, {
                aspectRatio: stickerW / stickerH, viewMode: 1, dragMode: 'move', autoCropArea: 1, restore: false, guides: false, center: false, highlight: false, cropBoxMovable: false, cropBoxResizable: false, toggleDragModeOnDblclick: false, minContainerWidth: 100, minContainerHeight: 75, checkCrossOrigin: false, modal: false, background: false,
                ready: function() {
                    this.cropper.isCustomReady = true;
                    if (imgData.canvasData) try { this.cropper.setCanvasData(imgData.canvasData); } catch(e) {}
                    if (imgData.cropBoxData) try { this.cropper.setCropBoxData(imgData.cropBoxData); } catch(e) {}
                },
                crop: function() {
                    if (!isSyncing && this.cropper.isCustomReady) {
                        if (syncFrameId) cancelAnimationFrame(syncFrameId);
                        syncFrameId = requestAnimationFrame(() => {
                            try {
                                const cropData = this.cropper.getData();
                                const canvasData = this.cropper.getCanvasData();
                                const cropBoxData = this.cropper.getCropBoxData();
                                if (window.groupImages[groupIdx]) {
                                    window.groupImages[groupIdx].cropData = cropData;
                                    window.groupImages[groupIdx].canvasData = canvasData;
                                    window.groupImages[groupIdx].cropBoxData = cropBoxData;
                                }
                                syncCrops(index, groupIdx, cropData);
                            } catch(e) { isSyncing=false; }
                        });
                    }
                }
            });
            window.cropperInstances[index] = cropper; cropper.isCustomReady = false;
        } else {
            img.style.display = 'none';
            img.src = '';
            cell.classList.remove('has-image'); // Hide controls
        }
    }

    function syncCrops(sourceCellIndex, groupIdx, cropData) {
        isSyncing = true;
        for (let i = 0; i < 16; i++) {
            const target = window.cropperInstances[i];
            if (i !== sourceCellIndex && window.cellGroups[i] === groupIdx && target && target.isCustomReady) {
                try { target.setData(cropData); } catch(e) {
                    console.warn('Failed to sync crop data to cell', i, e);
                }
            }
        }
        isSyncing = false;
    }

    // Zoom controls for individual cells
    window.zoomCell = function(cellIndex, delta) {
        const cropper = window.cropperInstances[cellIndex];
        if (!cropper || !cropper.isCustomReady) return;

        try {
            const canvasData = cropper.getCanvasData();
            const currentZoom = canvasData.width / canvasData.naturalWidth;
            const newZoom = Math.max(0.1, Math.min(3, currentZoom + delta));

            cropper.zoomTo(newZoom);
        } catch(e) {
            console.warn('Zoom failed:', e);
        }
    };

    // Fullscreen crop modal
    let fullscreenCellIndex = null;
    let fullscreenCropper = null;

    window.openFullscreenCrop = function(cellIndex) {
        const cropper = window.cropperInstances[cellIndex];
        if (!cropper || !cropper.isCustomReady) return;

        fullscreenCellIndex = cellIndex;
        const modal = document.getElementById('fullscreen-crop-modal');
        const img = document.getElementById('fullscreen-crop-image');
        const cell = document.getElementById(`cell-${cellIndex}`);
        const sourceImg = cell.querySelector('.source-image');

        // Set image source
        img.src = sourceImg.src;

        // Show modal
        modal.classList.add('active');

        // Initialize cropper in modal
        setTimeout(() => {
            if (fullscreenCropper) {
                fullscreenCropper.destroy();
            }

            const groupIdx = window.cellGroups[cellIndex];
            const imgData = window.groupImages[groupIdx];

            fullscreenCropper = new Cropper(img, {
                aspectRatio: stickerW / stickerH,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                restore: false,
                guides: true,
                center: true,
                highlight: true,
                cropBoxMovable: false,
                cropBoxResizable: false,
                toggleDragModeOnDblclick: false,
                checkCrossOrigin: false,
                ready: function() {
                    // Restore saved crop data - prefer relative cropData for cross-container compatibility
                    if (imgData && imgData.cropData) {
                        try { this.cropper.setData(imgData.cropData); } catch(e) {
                            console.warn('Failed to restore cropData, trying fallback', e);
                            // Fallback to absolute data if relative fails
                            if (imgData.canvasData) {
                                try { this.cropper.setCanvasData(imgData.canvasData); } catch(e2) {}
                            }
                            if (imgData.cropBoxData) {
                                try { this.cropper.setCropBoxData(imgData.cropBoxData); } catch(e2) {}
                            }
                        }
                    } else if (imgData && imgData.canvasData) {
                        // Legacy: restore using absolute data
                        try { this.cropper.setCanvasData(imgData.canvasData); } catch(e) {}
                        if (imgData.cropBoxData) {
                            try { this.cropper.setCropBoxData(imgData.cropBoxData); } catch(e) {}
                        }
                    }
                    updateFullscreenZoomDisplay();
                },
                zoom: function() {
                    updateFullscreenZoomDisplay();
                }
            });
        }, 100);
    };

    function closeFullscreenCrop() {
        if (fullscreenCropper && fullscreenCellIndex !== null) {
            try {
                // Get crop data relative to the original image (not container-specific)
                const cropData = fullscreenCropper.getData();
                const canvasData = fullscreenCropper.getCanvasData();
                const cropBoxData = fullscreenCropper.getCropBoxData();
                const groupIdx = window.cellGroups[fullscreenCellIndex];

                // Update the group image data with both relative and absolute data
                if (window.groupImages[groupIdx]) {
                    window.groupImages[groupIdx].cropData = cropData;
                    window.groupImages[groupIdx].canvasData = canvasData;
                    window.groupImages[groupIdx].cropBoxData = cropBoxData;
                }

                // Apply to all croppers in the same group using relative data
                isSyncing = true;
                for (let i = 0; i < 16; i++) {
                    const target = window.cropperInstances[i];
                    if (window.cellGroups[i] === groupIdx && target && target.isCustomReady) {
                        try {
                            // Use setData with relative crop data for cross-container compatibility
                            target.setData(cropData);
                        } catch(e) {
                            console.warn('Failed to apply crop data to cell', i, e);
                        }
                    }
                }
                isSyncing = false;

                fullscreenCropper.destroy();
                fullscreenCropper = null;
            } catch(e) {
                console.warn('Error closing fullscreen crop:', e);
            }
        }

        fullscreenCropModal.classList.remove('active');
        fullscreenCellIndex = null;
    }

    function zoomFullscreenCrop(delta) {
        if (!fullscreenCropper) return;

        try {
            const canvasData = fullscreenCropper.getCanvasData();
            const currentZoom = canvasData.width / canvasData.naturalWidth;
            const newZoom = Math.max(0.1, Math.min(3, currentZoom + delta));

            fullscreenCropper.zoomTo(newZoom);
            updateFullscreenZoomDisplay();
        } catch(e) {
            console.warn('Zoom failed:', e);
        }
    }

    function resetFullscreenCrop() {
        if (!fullscreenCropper) return;
        fullscreenCropper.reset();
        updateFullscreenZoomDisplay();
    }

    function updateFullscreenZoomDisplay() {
        if (!fullscreenCropper) return;

        try {
            const canvasData = fullscreenCropper.getCanvasData();
            const zoom = canvasData.width / canvasData.naturalWidth;
            const zoomPercent = Math.round(zoom * 100);
            document.getElementById('fullscreen-zoom-display').textContent = zoomPercent + '%';
        } catch(e) {
            document.getElementById('fullscreen-zoom-display').textContent = '100%';
        }
    }

    function resetCrop(groupIdx) {
        isSyncing = true;
        if(window.groupImages[groupIdx]) {
            window.groupImages[groupIdx].canvasData = null;
            window.groupImages[groupIdx].cropBoxData = null;
        }
        for (let i = 0; i < 16; i++) {
            if (window.cellGroups[i] === groupIdx && window.cropperInstances[i]) {
                window.cropperInstances[i].reset();
            }
        }
        isSyncing = false;
    }

    function refreshButtonPreviews() {
        const buttons = document.querySelectorAll('.btn-upload');
        buttons.forEach((btn, idx) => {
            let existingPreview = btn.parentElement.querySelector('.btn-preview');
            if (!existingPreview) { existingPreview = document.createElement('img'); existingPreview.className = 'btn-preview'; btn.parentElement.prepend(existingPreview); }
            if (window.groupImages[idx] && window.groupImages[idx].url) { existingPreview.src = window.groupImages[idx].url; existingPreview.style.display = 'block'; }
            else { existingPreview.style.display = 'none'; }
        });
    }

    function setMode(mode) {
        window.currentMode = mode;
        document.querySelectorAll('.mode-selector button').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-${mode}`).classList.add('active');

        // Set dynamic grid attribute
        document.getElementById('upload-inputs').setAttribute('data-mode', mode);
        uploadContainer.innerHTML = '';

        let inputCount = (mode === 'quad') ? 4 : (mode === 'unique' ? 16 : 1);

        const oldImages = [...window.groupImages];
        window.groupImages = new Array(inputCount).fill(null);
        for(let i=0; i<Math.min(oldImages.length, inputCount); i++) { window.groupImages[i] = oldImages[i]; }

        for(let i=0; i<inputCount; i++) {
            const wrapper = document.createElement('div'); wrapper.className = 'file-input-wrapper'; wrapper.draggable = true; wrapper.dataset.index = i;
            wrapper.addEventListener('dragstart', handleDragStart); wrapper.addEventListener('dragover', handleDragOver); wrapper.addEventListener('dragleave', handleDragLeave); wrapper.addEventListener('drop', handleDrop); wrapper.addEventListener('dragend', handleDragEnd);

            const btn = document.createElement('div'); btn.className = 'btn-upload';

            // --- X BUTTON (DELETE) ---
            const delBtn = document.createElement('div');
            delBtn.className = 'btn-delete';
            delBtn.innerHTML = '<i class="fas fa-times"></i>';
            delBtn.title = 'Remove Image';
            delBtn.setAttribute('role', 'button');
            delBtn.tabIndex = 0;
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clearImage(i);
            });
            delBtn.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    clearImage(i);
                }
            });

            const refreshIconBox = document.createElement('div');
            refreshIconBox.className = 'refresh-icon-box';
            refreshIconBox.innerHTML = '<i class="fas fa-sync"></i>';

            const labelText = document.createElement('span');
            if (mode === 'single') labelText.innerHTML = `Upload Files<br><small>(JPG, PNG, GIF)</small>`;
            else if (mode === 'quad') labelText.innerHTML = `Upload Group ${i+1}<br><small>(JPG, PNG, GIF)</small>`;
            else labelText.innerHTML = `Image ${i+1}`;

            btn.appendChild(refreshIconBox);
            btn.appendChild(labelText);
            btn.appendChild(delBtn);

            const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png, image/jpeg, image/gif, image/webp, video/webm';
            input.setAttribute('aria-label', `Upload image ${i + 1}`);
            input.addEventListener('change', (e) => handleUpload(e, i));
            wrapper.appendChild(btn); wrapper.appendChild(input); uploadContainer.appendChild(wrapper);
        }
        refreshGrid();
    }

    function handleUpload(event, inputIndex) {
        const file = event.target.files[0]; if(!file) return;
        if (window.groupImages[inputIndex] && window.groupImages[inputIndex].url) URL.revokeObjectURL(window.groupImages[inputIndex].url);
        window.groupImages[inputIndex] = { url: URL.createObjectURL(file), canvasData: null, cropBoxData: null };
        refreshGrid();
    }

    function handleBulkUpload(event) {
        const files = Array.from(event.target.files); if(files.length === 0) return;
        if (files.length === 1) setMode('single'); else if (files.length <= 4) setMode('quad'); else setMode('unique');
        setTimeout(() => {
            files.slice(0, 16).forEach((file, index) => {
               if (index < window.groupImages.length) {
                   if (window.groupImages[index] && window.groupImages[index].url) URL.revokeObjectURL(window.groupImages[index].url);
                   window.groupImages[index] = { url: URL.createObjectURL(file), canvasData: null, cropBoxData: null };
               }
            });
            refreshGrid();
        }, 0);
    }

    function handleDragStart(e) { this.classList.add('dragging'); dragSrcIndex = parseInt(this.dataset.index); e.dataTransfer.effectAllowed = 'move'; }
    function handleDragOver(e) { if (e.preventDefault) e.preventDefault(); this.classList.add('drag-over'); e.dataTransfer.dropEffect = 'move'; return false; }
    function handleDragLeave() { this.classList.remove('drag-over'); }
    function handleDrop(e) {
        if (e.stopPropagation) e.stopPropagation(); this.classList.remove('drag-over');
        const dragDestIndex = parseInt(this.dataset.index);
        if (dragSrcIndex !== null && dragSrcIndex !== dragDestIndex) {
            const temp = window.groupImages[dragSrcIndex]; window.groupImages[dragSrcIndex] = window.groupImages[dragDestIndex]; window.groupImages[dragDestIndex] = temp;
            refreshGrid();
        }
        return false;
    }
    function handleDragEnd() { this.classList.remove('dragging'); document.querySelectorAll('.file-input-wrapper').forEach(col => { col.classList.remove('drag-over'); }); }

    function toggleOverlay() {
        const show = document.getElementById('toggle-overlay').checked;
        document.querySelectorAll('.overlay').forEach(o => { show ? o.classList.add('visible') : o.classList.remove('visible'); });
    }

    function changeBackground(value) {
        if (value === 'custom') { document.getElementById('custom-bg-input').click(); }
        else if (value === 'none') { bgLayer.style.backgroundImage = 'none'; }
        else if (bgPatterns[value]) { bgLayer.style.backgroundImage = `url("${bgPatterns[value]}")`; }
    }

    function urlToBase64(url) {
        return fetch(url).then(res => res.blob()).then(blob => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        });
    }

    async function saveProject() {
        const loadingOverlay = document.getElementById('loading-overlay');
        try {
            loadingOverlay.style.display = 'flex';
            const stamps = [];
            document.querySelectorAll('#stamp-layer .stamp-wrapper').forEach(el => {
                const st = window.getComputedStyle(el); const tr = st.getPropertyValue("transform");
                let angle = 0; if (tr && tr !== 'none') { const values = tr.split('(')[1].split(')')[0].split(','); angle = Math.round(Math.atan2(values[1], values[0]) * (180/Math.PI)); }
                const content = el.querySelector('.stamp-content');
                stamps.push({
                    text: content.innerText, left: parseFloat(el.style.left), top: parseFloat(el.style.top),
                    size: content.style.fontSize, rotation: angle,
                    isText: el.dataset.isText === 'true', font: el.dataset.font, color: el.dataset.color
                });
            });

            const savedImages = [];
            for (let i = 0; i < window.groupImages.length; i++) {
                if (window.groupImages[i] && window.groupImages[i].url) {
                    try { const b64 = await urlToBase64(window.groupImages[i].url); savedImages[i] = { b64: b64, canvasData: window.groupImages[i].canvasData, cropBoxData: window.groupImages[i].cropBoxData }; } catch (e) { savedImages[i] = null; }
                } else { savedImages[i] = null; }
            }
            const projectData = {
                theme: document.body.getAttribute('data-theme'), // Use data attribute
                bgValue: document.getElementById('bg-select').value,
                paperSize: document.getElementById('paper-size').value,
                mode: window.currentMode, images: savedImages, stamps: stamps
            };
            const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'snap-station-project.json';
            a.click();
            URL.revokeObjectURL(url);
            showToast('Project saved successfully!');
        } catch(err) {
            console.error('Project save error:', err);
            showToast('Failed to save project - file may be too large');
        } finally {
            loadingOverlay.style.display = 'none';
        }
    }

    function loadProject(event) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);

                // Validate project structure
                if (!data || typeof data !== 'object') {
                    throw new Error('Invalid project format');
                }

                if (data.theme) { document.getElementById('theme-select').value = data.theme; changeTheme(data.theme); }
                if (data.bgValue) { document.getElementById('bg-select').value = data.bgValue; changeBackground(data.bgValue); }
                if (data.paperSize) { document.getElementById('paper-size').value = data.paperSize; changePaperSize(data.paperSize); }
                if (data.mode) setMode(data.mode);

                if (Array.isArray(data.images)) {
                    window.groupImages.forEach(g => { if(g && g.url && g.url.startsWith('blob:')) URL.revokeObjectURL(g.url); });
                    window.groupImages = new Array(data.images.length).fill(null);
                    setTimeout(() => {
                        data.images.forEach((imgData, idx) => {
                            // Validate image data
                            if (imgData && imgData.b64 && typeof imgData.b64 === 'string' && imgData.b64.startsWith('data:')) {
                                window.groupImages[idx] = { url: imgData.b64, canvasData: imgData.canvasData, cropBoxData: imgData.cropBoxData };
                            }
                        });
                        refreshGrid();
                    }, 100);
                }

                stampLayer.innerHTML = '';
                if (Array.isArray(data.stamps)) {
                    data.stamps.forEach(s => {
                        if (s && s.text) {
                            createStamp(s.text, s.left, s.top, s.size, s.rotation, s.isText || false, s.font, s.color);
                        }
                    });
                }

                showToast('Project loaded successfully!');
            } catch (err) {
                console.error('Project load error:', err);
                showToast('Failed to load project - invalid or corrupted file');
            }
        };
        reader.readAsText(file); event.target.value = '';
    }

    async function saveOutput() {
        const format = document.getElementById('export-format').value;
        const loadingOverlay = document.getElementById('loading-overlay'); loadingOverlay.style.display = 'flex';
        document.body.classList.add('printing');
        document.querySelectorAll('.stamp-wrapper').forEach(el => el.classList.remove('selected')); activeStamp = null;

        const cells = document.querySelectorAll('.cell'); const tempImages = [];
        let gifWorkerUrl = null;
        if(format === 'gif') {
            try {
                const blob = await fetch('lib/gif.worker.js').then(r => r.blob());
                gifWorkerUrl = URL.createObjectURL(blob);
            } catch(e) {
                console.warn('GIF worker load failed, using direct path', e);
                gifWorkerUrl = 'lib/gif.worker.js';
            }
        }

        if(format !== 'gif') {
            cells.forEach((cell, index) => {
                const cropperInstance = window.cropperInstances[index];
                if (cropperInstance) {
                    // Get cropped canvas without forced dimensions to preserve actual crop
                    const canvas = cropperInstance.getCroppedCanvas({
                        imageSmoothingQuality: 'high',
                        fillColor: '#fff'
                    });
                    if (canvas) {
                        const img = document.createElement('img');
                        img.src = canvas.toDataURL('image/png');
                        img.className = 'temp-print-image';
                        // Ensure styles are explicit
                        img.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;';

                        const container = cell.querySelector('.img-container');
                        const cropperDiv = container.querySelector('.cropper-container');
                        if(cropperDiv) cropperDiv.style.display = 'none';
                        container.appendChild(img);
                        tempImages.push({ container, img, cropperDiv });
                    }
                }
            });
        } else {
            cells.forEach((cell, index) => {
                const cropper = window.cropperInstances[index];
                if (cropper) {
                    const container = cell.querySelector('.img-container'); const sourceImg = container.querySelector('.source-image'); const cropperDiv = container.querySelector('.cropper-container');
                    const cropData = cropper.getData(); const containerRect = container.getBoundingClientRect(); const scale = containerRect.width / cropData.width;
                    const wrapper = document.createElement('div'); wrapper.style.cssText = 'width:100%;height:100%;overflow:hidden;position:relative;'; wrapper.className = 'temp-gif-wrapper';
                    const animImg = sourceImg.cloneNode(true); animImg.style.cssText = `display:block;position:absolute;width:${sourceImg.naturalWidth * scale}px;height:${sourceImg.naturalHeight * scale}px;left:${-cropData.x * scale}px;top:${-cropData.y * scale}px;max-width:none;max-height:none;`;
                    if (cell.classList.contains('weathered-active')) animImg.classList.add('temp-weathered');
                    if(cropperDiv) cropperDiv.style.display = 'none'; wrapper.appendChild(animImg); container.appendChild(wrapper); tempImages.push({ container, img: wrapper, cropperDiv });
                }
            });
        }

        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            if (format === 'gif') {
                const gifOptions = { workers: 2, quality: 10, width: paperElement.offsetWidth * 1.5, height: paperElement.offsetHeight * 1.5 };
                if (gifWorkerUrl) { gifOptions.workerScript = gifWorkerUrl; }
                const gif = new GIF(gifOptions);
                const frameCount = 15;
                for (let i = 0; i < frameCount; i++) {
                     const canvas = await html2canvas(paperElement, { scale: 1.5, useCORS: true, logging: false, backgroundColor: null });
                     gif.addFrame(canvas, {delay: 100}); await new Promise(r => setTimeout(r, 100));
                }
                gif.on('finished', function(blob) {
                     const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.download = 'snap-station-stickers.gif'; link.href = url; link.click();
                     tempImages.forEach(item => { item.img.remove(); if (item.cropperDiv) item.cropperDiv.style.display = ''; });
                     if(gifWorkerUrl) URL.revokeObjectURL(gifWorkerUrl); loadingOverlay.style.display = 'none'; document.body.classList.remove('printing');
                });
                gif.render(); return;
            }

            const canvas = await html2canvas(paperElement, { scale: 3, useCORS: true });
            if (format === 'pdf') {
                const imgData = canvas.toDataURL('image/png'); const docStyle = getComputedStyle(document.documentElement);
                const pW = parseFloat(docStyle.getPropertyValue('--paper-width')); const pH = parseFloat(docStyle.getPropertyValue('--paper-height'));
                const orientation = pW > pH ? 'landscape' : 'portrait';
                const pdf = new jspdf.jsPDF({ orientation: orientation, unit: 'mm', format: [pW, pH] });
                pdf.addImage(imgData, 'PNG', 0, 0, pW, pH); pdf.save('snap-station-stickers.pdf');
            } else {
                const mimeType = format === 'jpg' ? 'image/jpeg' : (format === 'webp' ? 'image/webp' : 'image/png');
                canvas.toBlob(blob => {
                     const link = document.createElement('a'); link.download = `snap-station-stickers.${format}`;
                     link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href);
                }, mimeType, 0.95);
            }
        } catch (error) {
            console.error('Export error:', error);
            const errorMsg = error.message.includes('canvas') ? 'Failed to generate output - image may be too large' : 'Failed to generate output - please try a different format';
            showToast(errorMsg);
        } finally {
            if (format !== 'gif') { tempImages.forEach(item => { item.img.remove(); if (item.cropperDiv) item.cropperDiv.style.display = ''; }); loadingOverlay.style.display = 'none'; document.body.classList.remove('printing'); }
            if (gifWorkerUrl) {
                URL.revokeObjectURL(gifWorkerUrl);
            }
        }
    }

    // Print function for direct printing
    function printStickers() {
        // Deselect any selected stamps
        document.querySelectorAll('.stamp-wrapper').forEach(el => el.classList.remove('selected'));
        activeStamp = null;

        // Add print class to body for print-specific styles
        document.body.classList.add('printing');

        // Hide controls and UI elements during print
        const controlsEl = document.querySelector('.controls');
        const stampSelector = document.querySelector('.stamp-selector');
        const cuttingBtn = document.querySelector('#cuttingTemplateBtn');

        if (controlsEl) controlsEl.style.display = 'none';
        if (stampSelector) stampSelector.style.display = 'none';
        if (cuttingBtn) cuttingBtn.style.display = 'none';

        // Trigger browser print dialog
        setTimeout(() => {
            window.print();

            // Restore UI after print dialog closes
            setTimeout(() => {
                document.body.classList.remove('printing');
                if (controlsEl) controlsEl.style.display = '';
                if (stampSelector) stampSelector.style.display = '';
                if (cuttingBtn) cuttingBtn.style.display = '';
            }, 100);
        }, 100);
    }

    window.addEventListener('beforeunload', () => {
        window.groupImages.forEach((imgData) => {
            if (imgData?.url && imgData.url.startsWith('blob:')) {
                URL.revokeObjectURL(imgData.url);
            }
        });
        if (bgLayer.dataset.customBgUrl) {
            URL.revokeObjectURL(bgLayer.dataset.customBgUrl);
        }
        if (exportChannel) {
            exportChannel.close();
        }
    });

    init();
})();

/* * ADVANCED PRINTER GAMEPAD SUPPORT 
 * Features: Spatial Nav, Analog Support, Contextual Modes, Grabbing
 */
(function() {
    if (!window.navigator || !navigator.getGamepads) return;

    const PrinterGamepad = {
        gpIndex: null,
        lastButtons: [],
        focusedEl: null,
        elements: [],

        // Konami State
        konamiSeqGP: [12, 12, 13, 13, 14, 15, 14, 15, 1, 0, 9], // Up, Up, Down, Down, Left, Right, Left, Right, B, A, Start
        konamiIndexGP: 0,

        // State
        mode: 'MENU', // 'MENU', 'GRAB_STAMP'
        grabbedStamp: null,

        // Tuning
        deadzone: 0.5,
        navCooldown: 0,
        COOLDOWN_FRAMES: 8,
        moveSpeed: 5,

        // Visuals
        indicatorEl: document.getElementById('gp-mode-text'),
        indicatorContainer: document.getElementById('gp-indicator'),

        init: function() {
            window.addEventListener("gamepadconnected", (e) => {
                this.gpIndex = e.gamepad.index;
                this.startPolling();
                this.showIndicator("Controller Connected");
                this.refreshElements();
                this.focusBestInitial();
            });
            window.addEventListener("gamepaddisconnected", (e) => {
                if (this.gpIndex === e.gamepad.index) {
                    this.gpIndex = null;
                    this.hideIndicator();
                }
            });
        },

        showIndicator: function(msg) {
            if(this.indicatorEl) this.indicatorEl.textContent = msg;
            if(this.indicatorContainer) this.indicatorContainer.classList.add('visible');
        },

        hideIndicator: function() {
            if(this.indicatorContainer) this.indicatorContainer.classList.remove('visible');
        },

        refreshElements: function() {
            // Gather all interactive elements
            const selectors = [
                ".controls button",
                ".controls select",
                ".controls input",
                ".file-input-wrapper",
                ".stamp-wrapper", // Stamps are navigable
                ".modal-close",
                "#cuttingTemplateBtn"
            ];
            // Filter visible only
            this.elements = Array.from(document.querySelectorAll(selectors.join(",")))
                .filter(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && !el.disabled && el.offsetParent !== null;
                });
        },

        focusBestInitial: function() {
            if (this.elements.length > 0) {
                this.setFocus(this.elements[0]);
            }
        },

        setFocus: function(el) {
            if (this.focusedEl) {
                this.focusedEl.classList.remove('gamepad-focus');
                // Close stamp controls if leaving a stamp
                if(this.focusedEl.classList.contains('stamp-wrapper')) {
                    this.focusedEl.classList.remove('selected');
                }
            }
            this.focusedEl = el;
            if (this.focusedEl) {
                this.focusedEl.classList.add('gamepad-focus');
                this.focusedEl.focus({preventScroll: true});
                this.focusedEl.scrollIntoView({behavior: 'smooth', block: 'center'});

                // Stamp Logic
                if(this.focusedEl.classList.contains('stamp-wrapper')) {
                    this.focusedEl.classList.add('selected');
                    this.showIndicator("Stamp Selected (Press A to Grab)");
                } else {
                    this.showIndicator("Menu Mode");
                }
            }
        },

        startPolling: function() {
            const loop = () => {
                if (this.gpIndex !== null) {
                    this.checkInput();
                    requestAnimationFrame(loop);
                }
            };
            requestAnimationFrame(loop);
        },

        checkInput: function() {
            const gp = navigator.getGamepads()[this.gpIndex];
            if (!gp) return;

            // Konami Check
            this.checkKonami(gp);

            // 1. Context Switching (Grab Mode vs Menu Mode)
            if (this.mode === 'GRAB_STAMP' && this.grabbedStamp) {
                this.handleGrabInput(gp);
            } else {
                this.handleMenuInput(gp);
            }

            this.lastButtons = gp.buttons.map(b => ({ pressed: b.pressed }));
        },

        checkKonami: function(gp) {
            let pressedBtn = -1;
            for(let i=0; i<gp.buttons.length; i++) {
                if (this.justPressed(gp, i)) {
                    pressedBtn = i;
                    break;
                }
            }

            if (pressedBtn !== -1) {
                if (pressedBtn === this.konamiSeqGP[this.konamiIndexGP]) {
                    this.konamiIndexGP++;
                    if (this.konamiIndexGP === this.konamiSeqGP.length) {
                        if(window.unlock1UpTheme) window.unlock1UpTheme();
                        this.konamiIndexGP = 0;
                    }
                } else {
                    this.konamiIndexGP = 0;
                    if (pressedBtn === this.konamiSeqGP[0]) {
                        this.konamiIndexGP = 1;
                    }
                }
            }
        },

        handleMenuInput: function(gp) {
            // Cooldown for nav
            if (this.navCooldown > 0) this.navCooldown--;

            // --- Directional Input (D-Pad + Analog) ---
            let dx = 0, dy = 0;

            // D-Pad
            if (gp.buttons[12].pressed) dy = -1; // Up
            if (gp.buttons[13].pressed) dy = 1;  // Down
            if (gp.buttons[14].pressed) dx = -1; // Left
            if (gp.buttons[15].pressed) dx = 1;  // Right

            // Analog Stick (Axis 0, 1) with Deadzone
            if (Math.abs(gp.axes[0]) > this.deadzone) dx = gp.axes[0];
            if (Math.abs(gp.axes[1]) > this.deadzone) dy = gp.axes[1];

            // Execute Move if Cooldown ready and input exists
            if (this.navCooldown === 0 && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) {
                this.moveFocusGeometric(dx, dy);
                this.navCooldown = this.COOLDOWN_FRAMES;
            }

            // --- Buttons ---
            // A (0) - Select / Grab
            if (this.justPressed(gp, 0)) {
                if (this.focusedEl) {
                    if (this.focusedEl.classList.contains('stamp-wrapper')) {
                        // Enter Grab Mode
                        this.mode = 'GRAB_STAMP';
                        this.grabbedStamp = this.focusedEl;
                        this.grabbedStamp.classList.add('grabbed');
                        this.showIndicator("Grabbing Stamp (A to Drop, B to Delete)");
                    } else {
                        // Normal Click
                        this.focusedEl.click();
                    }
                }
            }

            // B (1) - Back / Close Modal
            if (this.justPressed(gp, 1)) {
                const visibleModal = document.querySelector('.modal-overlay[style*="display: flex"]');
                if (visibleModal) {
                    // Find close button
                    const closeBtn = visibleModal.querySelector('.modal-close');
                    if (closeBtn) closeBtn.click();
                } else if (this.focusedEl && this.focusedEl.classList.contains('stamp-wrapper')) {
                     // Deselect Stamp
                     this.focusedEl.classList.remove('selected');
                     // Find nearest non-stamp element to retreat to? Or just stay focused.
                }
            }
        },

        handleGrabInput: function(gp) {
            // Movement logic for Stamp
            let dx = 0, dy = 0;

            // D-Pad
            if (gp.buttons[12].pressed) dy = -1;
            if (gp.buttons[13].pressed) dy = 1;
            if (gp.buttons[14].pressed) dx = -1;
            if (gp.buttons[15].pressed) dx = 1;

            // Analog
            if (Math.abs(gp.axes[0]) > this.deadzone) dx = gp.axes[0];
            if (Math.abs(gp.axes[1]) > this.deadzone) dy = gp.axes[1];

            // Chording: Hold L1 (Btn 4) to speed up
            let speed = this.moveSpeed;
            if (gp.buttons[4].pressed) speed *= 3;

            if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                const rect = this.grabbedStamp.getBoundingClientRect();
                const parentRect = this.grabbedStamp.offsetParent.getBoundingClientRect();

                // Convert current left/top to pixels relative to parent
                let currentLeft = parseFloat(this.grabbedStamp.style.left) || (rect.left - parentRect.left);
                let currentTop = parseFloat(this.grabbedStamp.style.top) || (rect.top - parentRect.top);

                this.grabbedStamp.style.left = (currentLeft + dx * speed) + 'px';
                this.grabbedStamp.style.top = (currentTop + dy * speed) + 'px';
            }

            // A (0) - Drop
            if (this.justPressed(gp, 0)) {
                this.mode = 'MENU';
                this.grabbedStamp.classList.remove('grabbed');
                this.grabbedStamp = null;
                this.showIndicator("Stamp Dropped");
            }

            // B (1) - Delete
            if (this.justPressed(gp, 1)) {
                this.grabbedStamp.remove();
                this.mode = 'MENU';
                this.grabbedStamp = null;
                this.refreshElements();
                this.focusBestInitial();
                this.showIndicator("Stamp Deleted");
            }
        },

        // --- Geometric Navigation Logic ---
        moveFocusGeometric: function(dx, dy) {
            this.refreshElements(); // Ensure list is up to date

            if (!this.focusedEl) {
                this.focusBestInitial();
                return;
            }

            const currentRect = this.focusedEl.getBoundingClientRect();
            const cx = currentRect.left + currentRect.width / 2;
            const cy = currentRect.top + currentRect.height / 2;

            let bestCandidate = null;
            let minScore = Infinity;

            // Normalize direction vector
            const mag = Math.sqrt(dx*dx + dy*dy);
            const ndx = dx / mag;
            const ndy = dy / mag;

            for (let el of this.elements) {
                if (el === this.focusedEl) continue;

                const rect = el.getBoundingClientRect();
                const tcx = rect.left + rect.width / 2;
                const tcy = rect.top + rect.height / 2;

                // Vector to target
                const vbx = tcx - cx;
                const vby = tcy - cy;
                const dist = Math.sqrt(vbx*vbx + vby*vby);

                // Project vector onto direction (Dot Product)
                const dot = vbx * ndx + vby * ndy;

                // Must be in the general direction (dot product > 0)
                if (dot <= 0) continue;

                const rejSq = (dist*dist) - (dot*dot);

                const score = dist + (rejSq * 2);

                if (score < minScore) {
                    minScore = score;
                    bestCandidate = el;
                }
            }

            if (bestCandidate) {
                this.setFocus(bestCandidate);
            }
        },

        justPressed: function(gp, btnIndex) {
            return gp.buttons[btnIndex].pressed && !(this.lastButtons[btnIndex] && this.lastButtons[btnIndex].pressed);
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => PrinterGamepad.init());
    } else {
        PrinterGamepad.init();
    }
    })();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStickerSheet);
} else {
    initStickerSheet();
}
