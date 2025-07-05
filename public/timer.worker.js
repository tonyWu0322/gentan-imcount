let timerId = null;
let remainingTime = 0;

self.onmessage = function(e) {
  const { command, value } = e.data;

  if (command === 'start') {
    remainingTime = value;

    if (timerId) {
      clearInterval(timerId);
    }

    timerId = setInterval(() => {
      remainingTime--;
      if (remainingTime <= 0) {
        self.postMessage({ type: 'tick', remainingTime: 0 });
        self.postMessage({ type: 'done' });
        if (timerId) {
          clearInterval(timerId);
          timerId = null;
        }
      } else {
        self.postMessage({ type: 'tick', remainingTime });
      }
    }, 1000);
  } else if (command === 'stop') {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }
}; 