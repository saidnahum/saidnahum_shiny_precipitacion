# Precipitation 2050 Viewer

Aplicación web desarrollada con **Shiny para Python** para visualizar la precipitación media anual proyectada sobre México para el año **2050** bajo el escenario climático **CMIP6 SSP126**.

La aplicación presenta la información sobre una malla hexagonal de aproximadamente **10 km de resolución**, permitiendo explorar los datos mediante un mapa interactivo, consultar estadísticas básicas y descargar la información filtrada.

## Características

* 🗺️ Visualización interactiva mediante Leaflet.
* 📍 Filtrado por entidad federativa.
* 📊 Estadísticas descriptivas de la información filtrada.
* 🌎 Cambio de mapa base y capas complementarias.
* 🎨 Ajuste de transparencia de la capa de precipitación.
* 🧭 Recorrido guiado para nuevos usuarios.
* 📥 Exportación de datos filtrados en formato CSV.
* ⚡ Optimización mediante caché en memoria.

---

## Tecnologías utilizadas

### Backend

* Python 3
* Shiny para Python
* GeoPandas
* Pandas
* PyArrow (Parquet)

### Frontend

* HTML5
* CSS3
* JavaScript
* Leaflet
* Driver.js

---

## Estructura del proyecto

```text
.
├── app.py                  # Aplicación principal Shiny
├── src/
│   ├── data.py             # Carga y procesamiento de datos
│   ├── map.py              # Construcción del mapa
│   └── cache.py            # Caché en memoria
├── utils/
│   └── build_cache.py      # Generación del archivo Parquet
├── www/
│   ├── html/
│   ├── css/
│   └── js/
├── datos/
│   └── precip_hex.parquet
└── README.md
```

---

## Instalación

Clonar el repositorio:

```bash
git clone https://github.com/<usuario>/<repositorio>.git

cd <repositorio>
```

Crear un entorno virtual:

```bash
python -m venv .venv
```

Activarlo:

**Windows**

```bash
.venv\Scripts\activate
```

**Linux / macOS**

```bash
source .venv/bin/activate
```

Instalar dependencias:

```bash
pip install -r requirements.txt
```

---

## Ejecución

Iniciar la aplicación:

```bash
shiny run app.py
```

o

```bash
python app.py
```

según la configuración del proyecto.

---

## Datos

La aplicación utiliza un archivo consolidado en formato **Parquet**, generado previamente mediante:

```bash
python utils/build_cache.py
```

Este proceso integra la malla hexagonal con la información de precipitación para reducir los tiempos de carga durante la ejecución.

---

## Funcionalidades

* Selección de entidad federativa.
* Estadísticas descriptivas.
* Visualización sobre mapa interactivo.
* Cambio de mapa base.
* Control de transparencia.
* Recorrido guiado.
* Descarga de datos en CSV.

---

## Supuestos

* Los datos fueron previamente procesados y validados.
* La aplicación visualiza únicamente el escenario **CMIP6 SSP126** para el año **2050**.
* El archivo `precip_hex.parquet` debe existir antes de ejecutar la aplicación.

---

## Limitaciones

* No incluye comparación entre escenarios climáticos.
* No incorpora series temporales.
* La exportación se realiza únicamente en formato CSV.
* El rendimiento está optimizado para el tamaño actual del conjunto de datos.

---

## Futuras mejoras

* Comparación entre escenarios SSP.
* Visualización temporal.
* Exportación en formatos geoespaciales (GeoPackage, Shapefile).
* Soporte para conjuntos de datos de mayor tamaño mediante teselas vectoriales.
* Incorporación de análisis adicionales y herramientas de consulta.

---

## Licencia

Este proyecto fue desarrollado con fines demostrativos y educativos.
