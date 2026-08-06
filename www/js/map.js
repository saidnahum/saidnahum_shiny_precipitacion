// Inicialización del mapa y control de capas con Leaflet.js en javascript.
const COLORS = [
   "#440154", "#414487", "#2a788e", "#21918c",
   "#35b779", "#90d743", "#dbe120"
];
const MISSING_COLOR = "#cccccc";

let FILL_OPACITY = 0.7;

let dataLayers = [];

function getColor(value) {
   if (value === null || value === undefined) {
      return MISSING_COLOR;
   }

   const n = COLORS.length;
   const minVal = window.__MIN_VAL__;
   const maxVal = window.__MAX_VAL__;

   if (maxVal <= minVal) {
      return COLORS[Math.floor(n / 2)];
   }
   const t = (value - minVal) / (maxVal - minVal);
   const idx = Math.max(0, Math.min(n - 1, Math.floor(t * n)));
   return COLORS[idx];
}

// Funcion para inicializar el mapa con los datos GeoJSON proporcionados.
function initMap(geojsonData) {

   const initialZoom = (window.innerWidth < 768) ? 4 : 5;
   const map = L.map('map', {
      attributionControl: false
   }).setView([23, -102], initialZoom);

   map.addControl(new L.Control.FullScreen({ position: 'topleft' }));

   // Mapas base, por defecto se carga "Carto Positron" y se persiste la elección del usuario en localStorage.
   const baseMaps = {
      "Carto Positron": L.tileLayer(
         'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
         {
            attribution: '© OpenStreetMap, © CARTO',
            maxZoom: 19,
            subdomains: 'abcd'
         }
      ),
      "OpenStreetMap": L.tileLayer(
         'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
         {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
         }
      ),
      "Satélite (Esri)": L.tileLayer(
         'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
         {
            attribution: 'Tiles © Esri',
            maxZoom: 19
         }
      ),
      "Carto Dark Matter": L.tileLayer(
         'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
         {
            attribution: '© OpenStreetMap, © CARTO',
            maxZoom: 19,
            subdomains: 'abcd'
         }
      )
   };

   const BASEMAP_STORAGE_KEY = 'app.basemap';
   const DEFAULT_BASEMAP = 'Carto Positron';

   // Guardado el mapa base en localStorage del navegador.
   const savedBasemap = (function () {
      try {
         return localStorage.getItem(BASEMAP_STORAGE_KEY);
      } catch (e) {
         return null;
      }
   })();

   const initialBasemap =
      savedBasemap && baseMaps[savedBasemap] ? savedBasemap : DEFAULT_BASEMAP;
   baseMaps[initialBasemap].addTo(map);

   L.control.attribution({ prefix: '', position: 'bottomright' })
      .addTo(map);
   
   // Control de capas.
   let layerControl = L.control.layers(
      baseMaps, null, { position: 'topright', collapsed: true }
   ).addTo(map);

   map.on('baselayerchange', function (e) {
      try {
         localStorage.setItem(BASEMAP_STORAGE_KEY, e.name);
      } catch (e) {
         // localStorage may be unavailable (e.g. file:// protocol)
      }
   });

   // Control de opacidad
   const OpacityControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function () {
         const container = L.DomUtil.create(
            'div', 'leaflet-control opacity-control'
         );

         // Icono SVG del control de opacidad.
         const bulbIcon = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                  viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
               <path d="M9 21h6v-1H9v1zm3-19a7 7 0 0 0-4 12.74V17a1 1 0 0 0
                        1 1h6a1 1 0 0 0 1-1v-2.26A7 7 0 0 0 12 2zm-2 15v-1.5
                        a5 5 0 1 1 4 0V17H10z"/>
            </svg>
         `;

         const initialSliderValue = Math.round(FILL_OPACITY * 100);
         container.innerHTML = `
            <button type="button" class="opacity-icon-btn"
               title="Cambiar opacidad de los datos"
               aria-label="Abrir control de opacidad"
               aria-expanded="false">${bulbIcon}</button>
            <input type="range" min="0" max="100" step="10"
               value="${initialSliderValue}"
               class="opacity-slider"
               aria-label="Opacidad de los datos">
         `;

         L.DomEvent.disableClickPropagation(container);
         L.DomEvent.disableScrollPropagation(container);

         const iconBtn = container.querySelector('.opacity-icon-btn');
         iconBtn.addEventListener('click', function (e) {
            L.DomEvent.stop(e);
            const isOpen = container.classList.toggle('is-open');
            iconBtn.setAttribute('aria-expanded', String(isOpen));
         });

         return container;
      }
   });
   new OpacityControl().addTo(map);

   // Slider del control de opacidad.
   const slider = document.querySelector('.opacity-slider');
   const opacityContainer = document.querySelector('.opacity-control');
   if (slider) {
      slider.addEventListener('input', function () {
         FILL_OPACITY = Number(slider.value) / 100;
         dataLayers.forEach(function (l) {
            if (l) l.setStyle(styleFromDataLayer);
         });
      });
   }

   map.on('click', function () {
      if (opacityContainer && opacityContainer.classList.contains('is-open')) {
         opacityContainer.classList.remove('is-open');
         const btn = opacityContainer.querySelector('.opacity-icon-btn');
         if (btn) btn.setAttribute('aria-expanded', 'false');
      }
   });

   // Estado seleccionado desde el sidebar (puede ser null = toda la república).
   const selectedEstado = window.__SELECTED_ESTADO__;

   const LegendControl = L.Control.extend({
      options: { position: 'bottomleft' },
      onAdd: function () {
         const div = L.DomUtil.create(
            'div', 'leaflet-control map-legend-control'
         );
         L.DomEvent.disableClickPropagation(div);
         L.DomEvent.disableScrollPropagation(div);
         div.innerHTML = window.__LEGEND_HTML__ || '';
         return div;
      }
   });
   new LegendControl().addTo(map);

   // Renderizado de los datos GeoJSON en dos capas: Continental y Oceano. 
   // Se separan para permitir al usuario alternar entre ellas.
   try {
      const featuresByTipo = { Continental: [], Oceano: [] };
      (geojsonData.features || []).forEach(function (f) {
         const t = f.properties && f.properties.tipo;
         if (t === 'Continental' || t === 'Oceano') {
            featuresByTipo[t].push(f);
         } else {
            featuresByTipo.Continental.push(f);
         }
      });

      const overlayOptions = {
         renderer: L.svg({ padding: 0.5 }),
         smoothFactor: 0,
         style: function (feature) {
            return {
               fillColor: getColor(feature.properties.precipitacion_mm_anio),
               stroke: false,
               color: 'none',
               weight: 0,
               fillOpacity: FILL_OPACITY
            };
         },
         onEachFeature: function (feature, layer) {
            const popup = `
               <strong>hex_id:</strong> ${feature.properties.hex_id}<br>
               <strong>estado:</strong> ${feature.properties.estado}<br>
               <strong>tipo:</strong> ${feature.properties.tipo || 'N/D'}<br>
               <strong>precipitación:</strong> ${feature.properties.precipitacion_mm_anio} mm/año
            `;
            layer.bindPopup(popup);
         }
      };

      const continentalLayer = L.geoJSON(
         { type: 'FeatureCollection', features: featuresByTipo.Continental },
         overlayOptions
      );
      const oceanoLayer = L.geoJSON(
         { type: 'FeatureCollection', features: featuresByTipo.Oceano },
         overlayOptions
      );

      continentalLayer.addTo(map);
      dataLayers.push(continentalLayer);
      dataLayers.push(oceanoLayer);

      layerControl.addOverlay(continentalLayer, 'Continental');
      layerControl.addOverlay(oceanoLayer, 'Oceano');

     // Ajuste del zoom y centrado del mapa según el estado seleccionado, si aplica.
      if (selectedEstado) {
         const matching = geojsonData.features.filter(
            (f) => f.properties.estado === selectedEstado
         );
         if (matching.length > 0) {
            const fc = { type: 'FeatureCollection', features: matching };
            const bounds = L.geoJSON(fc).getBounds();
            if (bounds.isValid()) {
               map.fitBounds(bounds, { padding: [20, 20] });
            }
         }
      }
   } catch (err) {
      console.error('Error rendering map data:', err);
      document.getElementById('map').innerHTML =
         '<p class="map-error">Error al renderizar el mapa.</p>';
   }

   // Control para iniciar el tour guiado de la aplicación. 
   // Inicia en automático la primera vez que se carga la app, y luego el usuario puede iniciarlo manualmente.
   const TourControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function () {
         const infoIcon = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
               viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
               <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z"/>
            </svg>
         `;
         const container = L.DomUtil.create(
            'div', 'leaflet-control tour-control'
         );
         container.innerHTML = `
            <span class="tour-launcher">
               <button type="button" class="tour-icon-btn"
                  title="Iniciar tour"
                  aria-label="Iniciar tour guiado">${infoIcon}</button>
            </span>
         `;

         L.DomEvent.disableClickPropagation(container);
         L.DomEvent.disableScrollPropagation(container);
         const iconBtn = container.querySelector('.tour-icon-btn');
         iconBtn.addEventListener('click', function (e) {
            L.DomEvent.stop(e);
            if (window.__appTourIframe &&
               typeof window.__appTourIframe.start === 'function') {
               window.__appTourIframe.start();
            }
         });
         return container;
      }
   });
   new TourControl().addTo(map);

   // Notificación al iframe padre de que el mapa está listo.
   try {
      window.parent.postMessage({ type: 'map-ready' }, '*');
   } catch (_) { /* parent unreachable, e.g. file:// */ }
}