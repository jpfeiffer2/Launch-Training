(function() {
  if (window.launchTrainingSubmitExamRecord) return;

  const ENDPOINT = "https://script.google.com/macros/s/AKfycbzKjtjFU8msyHtWcK7ziV3ewSvQcW5AKcVtEAkAjMSe0srGBheWSUA7XLrLTR8inYyo-w/exec";
  const SECRET = "JonathanPfeiffer";

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  window.launchTrainingSubmitExamRecord = function(payload) {
    try {
      const record = Object.assign({}, payload || {});
      record.secret = SECRET;
      record.name = clean(record.name);
      record.parkLocation = clean(record.parkLocation);
      record.trainingProgram = clean(record.trainingProgram);
      record.examDay = clean(record.examDay);
      record.score = clean(record.score);
      record.percentage = clean(record.percentage);
      record.missedQuestions = clean(record.missedQuestions || 'None') || 'None';

      fetch(ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(record),
        keepalive: true
      }).catch(function(error) {
        console.warn('Google Sheets exam record submission failed.', error);
      });
    } catch (error) {
      console.warn('Google Sheets exam record submission could not be prepared.', error);
    }
  };
})();
