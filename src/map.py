import html as html_lib
import json
from pathlib import Path
from src.cache import get_or_build as cached_geojson
from src.data import get_global_range

# Template HTML del mapa.
TEMPLATE_PATH = Path(__file__).parent.parent / "www" / "html" / "map.html"
MISSING_COLOR = "#cccccc"

# Creación del mapa
def build_map(
    gdf,
    value_col: str = "precipitacion_mm_anio",
    selected_estado: str | None = None,
) -> str:
    min_val, max_val = get_global_range(value_col)
    cache_key = selected_estado if selected_estado else "__all__"
    geojson_str = cached_geojson(gdf, cache_key)
    legend_html = build_legend(gdf, value_col=value_col)

    html = TEMPLATE_PATH.read_text()

    estado_js = (
        "null"
        if not selected_estado or selected_estado == "__all__"
        else f'"{html_lib.escape(selected_estado, quote=True)}"'
    )

    legend_js = json.dumps(legend_html)

    init_block = f"""
        <script>
            window.__MIN_VAL__ = {min_val};
            window.__MAX_VAL__ = {max_val};
            window.__SELECTED_ESTADO__ = {estado_js};
            window.__LEGEND_HTML__ = {legend_js};
            const GEOJSON_DATA = {geojson_str};
            initMap(GEOJSON_DATA);
        </script>
        <script src="/js/tour-iframe.js"></script>
    </body>
    """
    html = html.replace("</body>", init_block)

    escaped_html = html_lib.escape(html, quote=True)
    
    # Iframe del mapa
    iframe_html = (
        f'<iframe srcdoc="{escaped_html}" '
        f'id="map-iframe" class="map-iframe" '
        f'title="Mapa de precipitación" '
        f'allowfullscreen>'
        f'</iframe>'
    )
    return iframe_html

# Creación de la leyenda del mapa.
def build_legend(gdf, value_col: str = "precipitacion_mm_anio", palette=None) -> str:
    palette = palette or [
        "#440154", "#414487", "#2a788e", "#21918c",
        "#35b779", "#90d743", "#dbe120",
    ]
    
    min_val, max_val = get_global_range(value_col)

    swatches = "".join(
        f'<span class="legend-swatch" style="background:{c};"></span>'
        for c in palette
    )

    return f"""
        <div class="legend">
            <span class="legend-title">Precipitación (mm/año)</span>
            <div class="legend-bar">{swatches}</div>
            <span class="legend-scale">{min_val:,.0f} – {max_val:,.0f}</span>
        </div>
    """