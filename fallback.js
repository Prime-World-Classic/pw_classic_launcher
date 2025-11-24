window.addEventListener('DOMContentLoaded', () => {
  try {
    if (NativeAPI == null) {
    }
  } catch (e) {
    try {
      let spawn = require('child_process').spawn('../Tools/PW_NanoUpdater.exe');
      let downloadText = 'Выполняется загрузка файлов игры. Пожалуйста, подождите<br>';
      document.write(downloadText);

      spawn.stdout.on('data', (data) => {
        let progressDataElements = data.toString().substring(1).split('#');
        let json = JSON.parse(progressDataElements[0]);
        if (json.type) {
          if (json.type == 'bar') {
            document.body.innerHTML = downloadText + json.data + '<br>';
          }
        }
      });

      spawn.on('close', (code) => {
        nw.App.clearCache();

        nw.Window.get().reload();
      });
    } catch (ex) {
      document.write(ex);
    }
  }
});
