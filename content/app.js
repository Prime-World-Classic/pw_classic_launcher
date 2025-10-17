

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
		script.type = 'module';
        document.head.appendChild(script);
    });
}




window.addEventListener('DOMContentLoaded', async () => {

	await loadScript('content/modules/_modules.js').catch(console.error);

});
