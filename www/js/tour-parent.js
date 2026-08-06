// Inicialización del tour de la app
(function () {
   'use strict';
   if (window.__appTour) return;

   window.addEventListener('message', function (e) {
      if (!e || !e.data) return;
      var d = e.data;
      var iframe = document.querySelector('.map-iframe');
      var cw = iframe && iframe.contentWindow;
      if (d.type === 'map-ready' && cw) {
         cw.postMessage({ type: 'parent-ready' }, '*');
      }
   });

   window.__appTour = {
      isFirstVisit: function () {
         try { return window.localStorage.getItem('app.tourSeen') !== '1'; }
         catch (e) { return true; }
      },
   };
})();
