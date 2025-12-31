const tabs = document.querySelectorAll('.tab');
const frames = document.querySelectorAll('.app-frame');
const indicator = document.getElementById('transferIndicator');
const indicatorText = document.getElementById('transferText');
const EXPORT_CHANNEL = 'snapstation-sync';

let exportChannel = null;
if ('BroadcastChannel' in window) {
    exportChannel = new BroadcastChannel(EXPORT_CHANNEL);
    exportChannel.addEventListener('message', (event) => {
        if (event.data?.type === 'snapstation-export-updated') {
            updateIndicator();
        }
    });
}

// Tab switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        frames.forEach(f => f.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(tab.dataset.target).classList.add('active');

        updateIndicator();
    });
});

// Monitor localStorage for transfer data
function updateIndicator() {
    const data = localStorage.getItem('snapstation-export');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            const count = parsed.images?.length || 0;
            indicatorText.textContent = `${count} snap${count !== 1 ? 's' : ''} ready to import`;
            indicator.classList.add('visible', 'has-data');
        } catch (e) {
            indicatorText.textContent = 'No snaps queued';
            indicator.classList.remove('has-data');
            indicator.classList.add('visible');
        }
    } else {
        indicatorText.textContent = 'No snaps queued';
        indicator.classList.remove('has-data');
        indicator.classList.add('visible');
        setTimeout(() => {
            if (!localStorage.getItem('snapstation-export')) {
                indicator.classList.remove('visible');
            }
        }, 2000);
    }
}

// Listen for storage changes from iframes
window.addEventListener('storage', updateIndicator);

// Refresh on visibility change (e.g., switching tabs)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateIndicator();
});

// Initial check
updateIndicator();
