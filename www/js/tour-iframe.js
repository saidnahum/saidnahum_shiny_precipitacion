// Funcionalidad principal del tour guiado de la aplicación. Se ejecuta dentro del iframe
(function () {
   'use strict';

   if (window.__appTourIframe) return;
   var parentDriver = window.parent && window.parent.driver && window.parent.driver.js;
   if (!parentDriver || !parentDriver.driver) {
      if (window.console && console.warn) {
         console.warn('[saidmontes] Driver.js not loaded in parent; tour disabled.');
      }
      return;
   }

   var driverFactory = parentDriver.driver;
   var TOUR_SEEN_KEY = 'app.tourSeen';

   // Pasos del tour guiado. Cada paso tiene un `id` único, un `target` que indica el elemento a resaltar 
   // (en el iframe o en el padre) y un `popover` con título, descripción y posición.
   var steps = [
      {
         id: 'app-title',
         target: 'parent:#app-title',
         popover: {
            title: 'Variable seleccionada',
            description: 'Precipitacion anual por muestreo en centroide de hexagono para escenario SSP126 año 2050',
            position: 'bottom',
         },
      },
      {
         id: 'description',
         target: 'parent:#control-description',
         popover: {
            title: 'Descripción',
            description: 'Resumen de la app y variable.',
            position: 'right',
         },
      },
      {
         id: 'estado',
         target: 'parent:#estado',
         popover: {
            title: 'Filtro por estado',
            description: 'Selecciona un estado o "Todos" para ver toda la república.',
            position: 'right',
         },
      },
      {
         id: 'stats',
         target: 'parent:#stats-card',
         popover: {
            title: 'Estadísticas',
            description: 'Resumen de los datos de precipitación para el estado actual.',
            position: 'right',
         },
      },
      {
         id: 'metadata',
         target: 'parent:#app-metadata-sidebar',
         popover: {
            title: 'Metadatos',
            description: 'Fuente, unidades, malla y cobertura.',
            position: 'right',
         },
      },
      {
         id: 'download',
         target: 'parent:#download-btn',
         popover: {
            title: 'Descargar CSV',
            description: 'Descarga el dataset filtrado, contiene hex_id, tipo, zona, estado, geometría y precipitacion.',
            position: 'right',
         },
      },
      {
         id: 'map',
         target: 'parent:#map-iframe',
         popover: {
            title: 'Mapa interactivo',
            description: 'Mapa creado con Leaflet. Haz zoom, arrastra y explora los hexágonos.',
            position: 'left',
         },
      },
      {
         id: 'basemap',
         target: 'iframe:.leaflet-control-layers',
         popover: {
            title: 'Selector de mapas base y capas',
            description: 'Cambia entre mapas y selecciona las capas de la parte continental u oceánica.',
            position: 'right',
         },
      },
      {
         id: 'fullscreen',
         target: 'iframe:.leaflet-control-zoom-fullscreen',
         popover: {
            title: 'Pantalla completa',
            description: 'Expande el mapa a pantalla completa.',
            position: 'right',
         },
      },
      {
         id: 'opacity',
         target: 'iframe:.opacity-control',
         popover: {
            title: 'Opacidad',
            description: 'Ajusta la opacidad del relleno de los hexágonos para ver el mapa base debajo.',
            position: 'right',
         },
      },
      {
         id: 'legend',
         target: 'iframe:.map-legend-control',
         popover: {
            title: 'Leyenda',
            description: 'Escala de colores Viridis con min, max y adaptada para daltonismo. La app es accesible para 3 tipos principales de daltonismo.',
            position: 'right',
         },
      },
      {
         id: 'tour-button',
         target: 'iframe:.tour-control',
         popover: {
            title: 'Vuelve a ver el tour',
            description: 'Cuando quieras, vuelve a abrir el recorrido guiado desde aquí.',
            position: 'right',
         },
      },
   ];

   var PROXY_ID = 'app-tour-proxy';
   var PROXY_BASE_STYLE = [
      'position: fixed',
      'top: 0',
      'left: 0',
      'width: 1px',
      'height: 1px',
      'pointer-events: none',
      'opacity: 0',
      'z-index: -1',
   ].join(';');

   // Funcion para resaltar elementos dentro del iframe del mapa.
   function createProxyInParent() {
      var pdoc = window.parent.document;
      var id = PROXY_ID + '-' + Math.random().toString(36).slice(2, 9);
      var p = pdoc.createElement('div');
      p.id = id;
      p.setAttribute('data-app-tour-proxy', '1');
      p.style.cssText = PROXY_BASE_STYLE;
      pdoc.body.appendChild(p);
      return p;
   }

   function syncProxyToIframeElement(proxy, iframeNode) {
      var ir = window.frameElement
         ? window.frameElement.getBoundingClientRect()
         : { left: 0, top: 0 };
      var r = iframeNode.getBoundingClientRect();
      proxy.style.left = (r.left + ir.left) + 'px';
      proxy.style.top = (r.top + ir.top) + 'px';
      proxy.style.width = r.width + 'px';
      proxy.style.height = r.height + 'px';
      return proxy;
   }

   // Función para que los pasos funcionen en el iframe y el padre.
   var proxyByStep = Object.create(null);
   function resolveTarget(targetStr, stepId) {
      var sep = targetStr.indexOf(':');
      var scope = targetStr.slice(0, sep);
      var selector = targetStr.slice(sep + 1);
      if (scope === 'parent') {
         return window.parent.document.querySelector(selector);
      }
      if (scope === 'iframe') {
         var node = window.document.querySelector(selector);
         if (!node) return null;
         var proxy = proxyByStep[stepId] || (proxyByStep[stepId] = createProxyInParent());
         return syncProxyToIframeElement(proxy, node);
      }
      return null;
   }

   var currentStepDefs = steps;
   function buildDriverSteps() {
      var isMobile = (window.parent.innerWidth < 768);
      currentStepDefs = steps.map(function (s) {
         if (isMobile && s.id === 'metadata') {
            return {
               id: s.id,
               target: 'parent:#footer-toggle',
               popover: s.popover,
            };
         }
         return s;
      });
      return currentStepDefs.map(function (s) {
         var popover = Object.assign({}, s.popover);
         if (isMobile) {
            if (s.id === 'app-title') popover.position = 'bottom';
            else if (s.id === 'description' ||
                     s.id === 'estado' ||
                     s.id === 'stats' ||
                     s.id === 'download') popover.position = 'bottom';
            else if (s.id === 'map') popover.position = 'bottom';
            else if (s.id === 'metadata') popover.position = 'top';
         }
         return {
            element: resolveTarget(s.target, s.id),
            popover: popover,
         };
      });
   }

   var builtSteps = buildDriverSteps();
   var driver = null;

   function createDriver() {
      if (driver) return driver;
      driver = driverFactory({
         animate: true,
         allowClose: true,
         stagePadding: 6,
         popoverClass: 'driverjs-saidmontes',
         overlayOpacity: 0.55,
         steps: builtSteps,
         onDestroyed: function () {
            try { window.parent.localStorage.setItem(TOUR_SEEN_KEY, '1'); } catch (e) {}
            var pdoc = window.parent.document;
            var proxies = pdoc.querySelectorAll('[data-app-tour-proxy="1"]');
            for (var i = 0; i < proxies.length; i++) {
               var p = proxies[i];
               if (p && p.parentNode) p.parentNode.removeChild(p);
            }
            proxyByStep = Object.create(null);
         },
      });
      return driver;
   }

   function refreshSteps() {
      for (var i = 0; i < builtSteps.length; i++) {
         var def = currentStepDefs[i];
         builtSteps[i].element = resolveTarget(def.target, def.id);
      }
   }

   function start() {
      var d = createDriver();
      refreshSteps();
      try {
         d.drive(0);
      } catch (e) {
         if (window.console && console.error) console.error('[saidmontes] drive failed:', e);
      }
   }

   function patchNavButtons() {
      var pdoc = window.parent.document;
      if (pdoc.__appTourNavObs) return;

      var obs = new MutationObserver(function () {
         var next = pdoc.querySelector('.driver-popover-next-btn');
         var prev = pdoc.querySelector('.driver-popover-prev-btn');
         [next, prev].forEach(function (btn) {
            if (!btn || btn.__saidmontesPatched) return;
            btn.__saidmontesPatched = true;
            btn.addEventListener('click', function () {
               refreshSteps();
            }, true);
         });
      });
      obs.observe(pdoc.body, { childList: true, subtree: true });
      pdoc.__appTourNavObs = obs;
   }

   window.addEventListener('message', function (e) {
      if (!e || !e.data) return;
      if (e.data.type === 'parent-ready') {
         var seen = false;
         try { seen = window.parent.localStorage.getItem(TOUR_SEEN_KEY) === '1'; } catch (e2) {}
         if (!seen) {
            setTimeout(function () { patchNavButtons(); start(); }, 100);
         }
      }
   });

   window.__appTourIframe = {
      start: function () { patchNavButtons(); start(); },
      _steps: steps,
   };

   if (window.console && console.info) {
      console.info('[saidmontes] tour-iframe.js loaded (' + steps.length + ' steps)');
   }
})();
